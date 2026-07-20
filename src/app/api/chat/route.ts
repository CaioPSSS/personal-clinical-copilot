import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { buildChatSystemPrompt } from '@/lib/prompts/chat';

export const maxDuration = 60;

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

    let recordText: string | null = null;
    if (recordRes.data?.record_data) {
      const data = recordRes.data.record_data as Record<string, string>;
      recordText = Object.entries(data)
        .filter(([, v]) => v && v !== 'Não informado')
        .map(([k, v]) => `## ${k}\n${v}`)
        .join('\n\n');
    }

    const systemPrompt = buildChatSystemPrompt(
      recordText,
      evidenceRes.data?.content || null
    );

    const result = streamText({
      model: openrouter.chat('google/gemma-4-31b-it:free'),
      system: systemPrompt,
      messages,
      tools: {
        searchMedicalInfo: {
          description: 'Busca informações médicas na internet.',
          parameters: z.object({
            query: z.string().describe('Consulta de busca médica em português'),
          }),
          execute: async ({ query }: { query: string }) => {
            try {
               const res = await fetch('https://api.tavily.com/search', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                   api_key: process.env.TAVILY_API_KEY,
                   query,
                   search_depth: 'basic',
                   max_results: 3,
                   include_answer: true,
                 }),
               });
               const data = await res.json();
               return {
                 answer: data.answer || '',
                 results: (data.results || []).map(
                   (r: { title: string; url: string; content: string }) => ({
                     title: r.title,
                     url: r.url,
                     snippet: r.content?.slice(0, 200),
                   })
                 ),
               };
            } catch {
               return { answer: 'Erro na busca.', results: [] };
            }
          },
        } as any,
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
