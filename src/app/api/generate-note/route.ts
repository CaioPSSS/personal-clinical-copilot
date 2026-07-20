import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import {
  AUTO_NOTE_SYSTEM_PROMPT,
  buildAutoNoteUserPrompt,
} from '@/lib/prompts/auto-note';

export const maxDuration = 300;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Custom proxy para lidar com falhas de rate limit no Vercel AI SDK
function withFallback(primary: any, fallbackModel: any): any {
  return {
    ...primary,
    async doGenerate(options: any) {
      try { return await primary.doGenerate(options); }
      catch (err) { return await fallbackModel.doGenerate(options); }
    },
    async doStream(options: any) {
      try { return await primary.doStream(options); }
      catch (err) { return await fallbackModel.doStream(options); }
    }
  };
}

export async function POST(req: Request) {
  try {
    const { patientId, transcriptionText, imagePaths } = await req.json();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Não autenticado', { status: 401 });
    }

    // Buscar prontuário atual (se existir)
    const { data: currentRecord } = await supabase
      .from('medical_records')
      .select('record_data')
      .eq('patient_id', patientId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    // Montar o conteúdo atual como texto
    let currentRecordText: string | null = null;
    if (currentRecord?.record_data) {
      const data = currentRecord.record_data as Record<string, string>;
      currentRecordText = Object.entries(data)
        .filter(([, v]) => v && v !== 'Não informado')
        .map(([k, v]) => `## ${k}\n${v}`)
        .join('\n\n');
    }

    // Processar imagens pendentes, se houver
    const publicImageUrls: string[] = [];
    if (imagePaths && imagePaths.length > 0) {
      for (const path of imagePaths) {
        // Gerar URL assinada válida por 1 hora para o OpenRouter poder ler
        const { data, error } = await supabase.storage
          .from('medical-files')
          .createSignedUrl(path, 3600);

        if (data?.signedUrl) {
          publicImageUrls.push(data.signedUrl);
        } else if (error) {
          console.error('Erro ao gerar url assinada:', error);
        }
      }
    }

    const userPromptText = buildAutoNoteUserPrompt(
      currentRecordText,
      transcriptionText || null,
      null
    );

    // Montar as mensagens com suporte multimodal
    const contentParts: any[] = [{ type: 'text', text: userPromptText }];

    for (const url of publicImageUrls) {
      contentParts.push({ type: 'image', image: new URL(url) });
    }

    const messages: any[] = [
      {
        role: 'user',
        content: contentParts,
      }
    ];

    const result = streamText({
      model: withFallback(
        openrouter.chat('google/gemma-4-31b-it:free'),
        openrouter.chat('google/gemma-4-26b-a4b-it:free')
      ),
      system: AUTO_NOTE_SYSTEM_PROMPT,
      messages: messages,
      onFinish: async ({ text }) => {
        // Agora o salvamento é feito no frontend após confirmação do usuário
        console.log('Geração concluída. Aguardando revisão do usuário.');
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Erro na geração do prontuário:', error);
    return new Response('Erro interno', { status: 500 });
  }
}

function parseRecordSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionMap: Record<string, string> = {
    'queixa principal': 'queixa_principal',
    'qp': 'queixa_principal',
    'história da moléstia atual': 'historia_doenca_atual',
    'hma': 'historia_doenca_atual',
    'revisão de sistemas': 'revisao_de_sistemas',
    'antecedentes pessoais': 'antecedentes_pessoais',
    'antecedentes familiares': 'antecedentes_familiares',
    'hábitos de vida': 'habitos_de_vida',
    'medicações em uso': 'medicacoes_em_uso',
    'alergias': 'alergias',
    'exame físico': 'exame_fisico',
    'hipóteses diagnósticas': 'hipoteses_diagnosticas',
    'plano terapêutico': 'plano_terapeutico',
  };

  const regex = /^##\s+(.+?)(?:\s*\(.*?\))?\s*$/gm;
  const matches = [...text.matchAll(regex)];

  for (let i = 0; i < matches.length; i++) {
    const title = matches[i][1].trim().toLowerCase();
    const startIdx = matches[i].index! + matches[i][0].length;
    const endIdx = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const content = text.slice(startIdx, endIdx).trim();

    const key = sectionMap[title];
    if (key) {
      sections[key] = content;
    }
  }

  return sections;
}
