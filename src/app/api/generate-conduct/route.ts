import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { EVIDENCE_NOTE_SYSTEM_PROMPT } from '@/lib/prompts/evidence-note';

export const maxDuration = 60;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

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

    // Buscar prontuário completo
    const { data: record } = await supabase
      .from('medical_records')
      .select('record_data')
      .eq('patient_id', patientId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (!record) {
      return new Response('Prontuário não encontrado. Gere o prontuário primeiro.', {
        status: 400,
      });
    }

    // Montar o caso clínico
    const recordData = record.record_data as Record<string, string>;
    const caseText = Object.entries(recordData)
      .filter(([, v]) => v && v !== 'Não informado')
      .map(([k, v]) => `## ${k}\n${v}`)
      .join('\n\n');

    const result = streamText({
      model: openrouter.chat('google/gemma-4-31b-it:free'),
      system: EVIDENCE_NOTE_SYSTEM_PROMPT,
      prompt: `Analise o seguinte caso clínico e gere a conduta baseada em evidências:\n\n${caseText}`,
      tools: {
        searchMedicalGuidelines: {
          description:
            'Busca diretrizes médicas e evidências clínicas atualizadas na internet. Use para fundamentar diagnósticos e condutas.',
          parameters: z.object({
            query: z
              .string()
              .describe(
                'A consulta de busca em português. Ex: "diretriz pneumonia adquirida comunidade 2024"'
              ),
          }),
          execute: async ({ query }: { query: string }) => {
            try {
              const res = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  api_key: process.env.TAVILY_API_KEY,
                  query: query,
                  search_depth: 'advanced',
                  max_results: 5,
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
                    snippet: r.content?.slice(0, 300),
                  })
                ),
              };
            } catch {
              return { answer: 'Erro na busca.', results: [] };
            }
          },
        } as any,
      },
      maxSteps: 5,
      onFinish: async ({ text }: { text: string }) => {
        // Salvar evidence note no banco
        await supabase.from('evidence_notes').insert({
          user_id: user.id,
          patient_id: patientId,
          content: text,
          reasoning: null,
          search_references: [],
        });
      },
    } as any);

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Erro ao gerar conduta:', error);
    return new Response('Erro interno', { status: 500 });
  }
}
