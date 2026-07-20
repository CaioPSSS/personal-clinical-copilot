import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { EVIDENCE_NOTE_SYSTEM_PROMPT } from '@/lib/prompts/evidence-note';

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
    const { patientId } = await req.json();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Não autenticado', { status: 401 });
    }

    // Buscar as informações atuais do prontuário
    const { data: currentRecord } = await supabase
      .from('medical_records')
      .select('record_data')
      .eq('patient_id', patientId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (!currentRecord) {
      return new Response('Prontuário não encontrado. Gere o prontuário primeiro.', {
        status: 400,
      });
    }

    let recordText = '';
    if (currentRecord?.record_data) {
      const data = currentRecord.record_data as Record<string, string>;
      const labelMap: Record<string, string> = {
        identificacao: 'Identificação',
        queixa_principal: 'Queixa Principal',
        historia_doenca_atual: 'História da Moléstia Atual',
        antecedentes_pessoais: 'Antecedentes Pessoais',
        alergias: 'Alergias',
        medicacoes_uso_continuo: 'Medicação de Uso Contínuo',
        antecedentes_familiares: 'Antecedentes Familiares',
        habitos_de_vida: 'Hábitos de Vida',
        exame_fisico: 'Exame Físico',
        evolucao_do_dia: 'Evolução do Dia',
        exames_laboratoriais: 'Exames Laboratoriais',
        exames_imagem: 'Exames de Imagem',
        condutas: 'Condutas Feitas/Planejadas',
      };

      recordText = Object.entries(data)
        .filter(([, v]) => v && v !== 'Não informado')
        .map(([k, v]) => `## ${labelMap[k] || k}\n${v}`)
        .join('\n\n');
    }

    const result = streamText({
      model: withFallback(
        openrouter.chat('google/gemma-4-31b-it'),
        openrouter.chat('google/gemma-4-26b-a4b-it')
      ),
      system: EVIDENCE_NOTE_SYSTEM_PROMPT,
      prompt: `Analise o seguinte caso clínico e gere a conduta baseada em evidências:\n\n${recordText}`,
      tools: {
        searchMedicalGuidelines: openrouter.tools.webSearch({
          engine: 'exa',
          maxResults: 5,
          searchContextSize: 'medium',
        } as any),
      },
      toolChoice: 'required',
      maxSteps: 5,
      onFinish: async ({ text, toolResults }: any) => {
        // Extrair todas as URLs encontradas nas pesquisas para salvar
        const searchReferences: { title: string; url: string }[] = [];
        if (toolResults) {
          for (const tr of toolResults) {
            if (tr.toolName === 'searchMedicalGuidelines' && tr.result?.results) {
              for (const r of tr.result.results) {
                // Evitar duplicatas
                if (r.url && !searchReferences.some(sr => sr.url === r.url)) {
                  searchReferences.push({ title: r.title || r.url, url: r.url });
                }
              }
            }
          }
        }

        // Salvar evidence note no banco
        await supabase.from('evidence_notes').insert({
          user_id: user.id,
          patient_id: patientId,
          content: text,
          reasoning: null,
          search_references: searchReferences,
        });
      },
    } as any);

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Erro ao gerar conduta:', error);
    return new Response('Erro interno', { status: 500 });
  }
}
