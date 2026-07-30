import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { buildChatSystemPrompt } from '@/lib/prompts/chat';
import { withFallback } from '@/lib/ai/model-fallback';

export const maxDuration = 300;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, patientId } = await req.json();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Não autenticado', { status: 401 });
    }

    // Buscar prontuário e evidence note
    const [recordRes, evidenceRes] = await Promise.all([
      supabase
        .from('medical_records')
        .select('record_data')
        .eq('patient_id', patientId)
        .eq('user_id', user.id)
        .order('version', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('evidence_notes')
        .select('content')
        .eq('patient_id', patientId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    let recordText = '';
    if (recordRes.data?.record_data) {
      const data = recordRes.data.record_data as Record<string, string>;
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

    const systemPrompt = buildChatSystemPrompt(
      recordText,
      evidenceRes.data?.content || null
    );

    // Mapear manualmente para garantir que o texto de mensagens de UI (content ou parts) seja extraído
    const coreMessages = messages.map((m: any) => {
      let textContent = typeof m.content === 'string' ? m.content : '';
      if (!textContent && Array.isArray(m.parts)) {
        textContent = m.parts
          .filter((p: any) => p.type === 'text' && p.text)
          .map((p: any) => p.text)
          .join('\n');
      }
      return {
        role: m.role,
        content: textContent,
      };
    });

    const result = streamText({
      model: withFallback(
        openrouter.chat('google/gemma-4-31b-it:free'),
        openrouter.chat('google/gemma-4-31b-it'),
        openrouter.chat('qwen/qwen3.6-35b-a3b'),
        openrouter.chat('google/gemma-4-26b-a4b-it'),
        openrouter.chat('google/gemma-3-27b-it'),
        openrouter.chat('meta-llama/llama-3.3-70b-instruct'),
        openrouter.chat('deepseek/deepseek-chat')
      ),
      system: systemPrompt,
      messages: coreMessages,
      tools: {
        proposeRecordEdit: {
          description: 'Propõe uma edição no prontuário médico. A IA deve usar essa ferramenta SEMPRE que o usuário pedir para alterar, corrigir ou adicionar informações ao prontuário médico. Você deve enviar o texto completo e atualizado da seção afetada.',
          parameters: z.object({
            section: z.string().describe('O nome exato da seção afetada do Prontuário Atual. Ex: História da Moléstia Atual, Evolução do Dia, Condutas Feitas/Planejadas, etc.'),
            newContent: z.string().describe('O texto Markdown completo e atualizado para esta seção, incorporando as edições solicitadas.'),
            reason: z.string().describe('Justificativa breve para a mudança, para o usuário entender o que foi feito.'),
          }),
          // Não possui execute no servidor. Será enviado ao cliente para confirmação.
        } as any,
        searchMedicalInfo: openrouter.tools.webSearch({
          engine: 'perplexity',
          maxResults: 3,
        } as any),
      },
      maxSteps: 3,
      onFinish: async ({ text }: { text: string }) => {
        // Salvar a última mensagem do assistant no DB
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage) {
          await supabase.from('chat_messages').insert([
            {
              user_id: user.id,
              patient_id: patientId,
              role: 'user',
              content: lastUserMessage.content,
            },
            {
              user_id: user.id,
              patient_id: patientId,
              role: 'assistant',
              content: text,
            },
          ]);
        }
      },
    } as any);

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Erro no chat:', error);
    return new Response('Erro interno', { status: 500 });
  }
}
