import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { buildEvidenceNoteSystemPrompt, ConductDepth } from '@/lib/prompts/evidence-note';
import { openrouter, AI_MODELS, getModelChain } from '@/lib/ai/models-config';
import { Patient, RecordMode } from '@/lib/types';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const patientId = body.patientId;
    const depth: ConductDepth = (body.depth as ConductDepth) || 'grand_rounds';

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Não autenticado', { status: 401 });
    }

    // Buscar as informações atuais do prontuário e do paciente
    const [patientRes, recordRes] = await Promise.all([
      supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('medical_records')
        .select('record_data, record_text, record_mode')
        .eq('patient_id', patientId)
        .eq('user_id', user.id)
        .order('version', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const currentRecord = recordRes.data;

    if (!currentRecord) {
      return new Response('Prontuário não encontrado. Gere o prontuário primeiro.', {
        status: 400,
      });
    }

    const patient = patientRes.data as Patient | null;
    const mode = (currentRecord.record_mode || patient?.record_mode || 'enfermaria') as RecordMode;
    const specialty = patient?.specialty || null;

    let recordText = '';
    if (currentRecord?.record_text) {
      recordText = currentRecord.record_text;
    } else if (currentRecord?.record_data) {
      const data = currentRecord.record_data as Record<string, string>;
      const { formatRecordDataToText } = await import('@/lib/record-parser');
      recordText = formatRecordDataToText(data, mode);
    }

    const systemPrompt = buildEvidenceNoteSystemPrompt({
      mode,
      specialty,
      patientName: patient?.full_name,
      depth,
    });

    const isGrandRounds = depth === 'grand_rounds';
    const specLabel = specialty || 'Clínica Médica';

    const promptText =
      mode === 'ambulatorio'
        ? isGrandRounds
          ? `Você é o Professor Titular e Consultor Clínico Sênior. Analise com profundidade acadêmica a anamnese ambulatorial do(a) paciente ${patient?.full_name || ''} no Ambulatório de ${specLabel}.
Utilize a ferramenta de busca para consultar diretrizes vigentes das sociedades especializadas (SBC, ESC, ADA, SBEM, SBPT, SBN, KDIGO, etc.) e os grandes ensaios clínicos (Landmark Trials).
Ministre a AULA CLÍNICA APROFUNDADA completa com todas as 10 seções obrigatórias (da representação do problema à farmacologia comentada e pérolas clínicas):\n\n${recordText}`
          : `Analise o seguinte caso ambulatorial de ${specLabel} e gere a lista de problemas e a conduta clínica objetiva e direta:\n\n${recordText}`
        : isGrandRounds
        ? `Você é o Professor Titular e Consultor Clínico Sênior. Analise com profundidade acadêmica o prontuário hospitalar do(a) paciente ${patient?.full_name || ''}.
Utilize a ferramenta de busca para consultar diretrizes oficiais e ensaios clínicos seminais. Ministre a AULA CLÍNICA APROFUNDADA completa:\n\n${recordText}`
        : `Analise o seguinte caso clínico e gere a lista de problemas e conduta clínica direta:\n\n${recordText}`;

    const result = streamText({
      model: getModelChain(AI_MODELS.CONDUCT),
      system: systemPrompt,
      prompt: promptText,
      tools: {
        searchMedicalGuidelines: openrouter.tools.webSearch({
          engine: 'exa',
          maxResults: 5,
          maxCharacters: 5000,
        } as any),
      },
      toolChoice: 'required',
      maxSteps: isGrandRounds ? 5 : 3,
      onFinish: async ({ text, toolResults }: any) => {
        // Extrair todas as URLs encontradas nas pesquisas para salvar
        const searchReferences: { title: string; url: string }[] = [];
        if (toolResults) {
          for (const tr of toolResults) {
            if (tr.toolName === 'searchMedicalGuidelines' && tr.result?.results) {
              for (const r of tr.result.results) {
                // Evitar duplicatas
                if (r.url && !searchReferences.some((sr) => sr.url === r.url)) {
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
