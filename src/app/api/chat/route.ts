import { streamText } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { buildChatSystemPrompt } from '@/lib/prompts/chat';
import { openrouter, AI_MODELS, getModelChain } from '@/lib/ai/models-config';

export const maxDuration = 300;

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
        .select('record_data, record_text, record_mode')
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
    if (recordRes.data?.record_text) {
      recordText = recordRes.data.record_text;
    } else if (recordRes.data?.record_data) {
      const data = recordRes.data.record_data as Record<string, string>;
      const { formatRecordDataToText } = await import('@/lib/record-parser');
      recordText = formatRecordDataToText(data, recordRes.data.record_mode || 'enfermaria');
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
      model: getModelChain(AI_MODELS.CHAT),
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
