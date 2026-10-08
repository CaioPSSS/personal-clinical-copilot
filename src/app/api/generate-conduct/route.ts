import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { EVIDENCE_NOTE_SYSTEM_PROMPT } from '@/lib/prompts/evidence-note';
import { openrouter, AI_MODELS, getModelChain } from '@/lib/ai/models-config';

export const maxDuration = 300;

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
      .select('record_data, record_text, record_mode')
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
    if (currentRecord?.record_text) {
      recordText = currentRecord.record_text;
    } else if (currentRecord?.record_data) {
      const data = currentRecord.record_data as Record<string, string>;
      const { formatRecordDataToText } = await import('@/lib/record-parser');
      recordText = formatRecordDataToText(data, currentRecord.record_mode || 'enfermaria');
    }

    const result = streamText({
      model: getModelChain(AI_MODELS.CONDUCT),
      system: EVIDENCE_NOTE_SYSTEM_PROMPT,
      prompt: `Analise o seguinte caso clínico e gere a conduta baseada em evidências:\n\n${recordText}`,
      tools: {
        searchMedicalGuidelines: openrouter.tools.webSearch({
          engine: 'exa',
          maxResults: 4,
          maxCharacters: 4000,
        } as any),
      },
      toolChoice: 'required',
      maxSteps: 3,
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
