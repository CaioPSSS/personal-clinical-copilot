import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { withFallback } from '@/lib/ai/model-fallback';
import { formatRecordDataToText } from '@/lib/record-parser';
import {
  WEEKLY_REPORT_SYSTEM_PROMPT,
  buildWeeklyReportPrompt,
} from '@/lib/prompts/weekly-report';

export const maxDuration = 300;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // 1. Obter a data do último relatório semanal do usuário (se houver)
    const { data: lastReports } = await supabase
      .from('weekly_reports')
      .select('created_at, patient_ids')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastReportDate = lastReports && lastReports.length > 0
      ? new Date(lastReports[0].created_at).toISOString()
      : new Date(0).toISOString();

    // 2. Buscar pacientes criados ou com prontuário atualizado desde o último relatório
    const { data: updatedRecords } = await supabase
      .from('medical_records')
      .select('patient_id, record_data, updated_at')
      .eq('user_id', user.id)
      .gt('updated_at', lastReportDate);

    // Mapear pacientes únicos que possuem prontuário atualizado
    const patientMap = new Map<string, any>();
    if (updatedRecords) {
      for (const rec of updatedRecords) {
        if (!patientMap.has(rec.patient_id)) {
          patientMap.set(rec.patient_id, rec);
        }
      }
    }

    const eligiblePatientIds = Array.from(patientMap.keys());
    const caseCount = eligiblePatientIds.length;

    // Regra: Mínimo de 3 casos acumulados para gerar a aula
    const forceGenerate = req.nextUrl.searchParams.get('force') === 'true';

    if (caseCount < 3 && !forceGenerate) {
      return NextResponse.json({
        success: false,
        message: `Acumulado ${caseCount} de 3 casos necessários. Aguardando novos atendimentos para gerar o relatório semanal.`,
        accumulatedCases: caseCount,
        requiredCases: 3,
      });
    }

    if (caseCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhum paciente novo ou atualizado para gerar o relatório.',
        accumulatedCases: 0,
        requiredCases: 3,
      });
    }

    // 3. Carregar dados completos dos pacientes elegíveis (dados demográficos e evidências)
    const { data: patients } = await supabase
      .from('patients')
      .select('*')
      .in('id', eligiblePatientIds)
      .eq('user_id', user.id);

    const { data: evidenceNotes } = await supabase
      .from('evidence_notes')
      .select('patient_id, content')
      .in('patient_id', eligiblePatientIds)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const evidenceMap = new Map<string, string>();
    if (evidenceNotes) {
      for (const ev of evidenceNotes) {
        if (!evidenceMap.has(ev.patient_id)) {
          evidenceMap.set(ev.patient_id, ev.content);
        }
      }
    }

    // Montar payload de entrada para o DeepSeek
    const casesData = eligiblePatientIds.map((pId) => {
      const patientObj = patients?.find((p) => p.id === pId);
      const recObj = patientMap.get(pId);
      const recordText = recObj?.record_data
        ? formatRecordDataToText(recObj.record_data)
        : null;

      return {
        patientName: patientObj?.full_name || 'Paciente',
        age: patientObj?.date_of_birth
          ? new Date().getFullYear() - new Date(patientObj.date_of_birth).getFullYear()
          : null,
        gender: patientObj?.gender || null,
        chiefComplaint: recObj?.record_data?.queixa_principal || null,
        recordText,
        evidenceText: evidenceMap.get(pId) || null,
      };
    });

    // 4. Executar geração via DeepSeek (sem Web Search)
    const prompt = buildWeeklyReportPrompt(casesData);

    const model = withFallback(
      openrouter.chat('deepseek/deepseek-v4-pro'),
      openrouter.chat('google/gemma-4-31b-it')
    );

    const result = await generateText({
      model,
      system: WEEKLY_REPORT_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 6000,
    });

    const reportContent = result.text;
    const nowStr = new Date().toISOString();
    const title = `Aula Clínica Semanal — ${new Date().toLocaleDateString('pt-BR')} (${caseCount} casos)`;

    // 5. Salvar na tabela weekly_reports
    const { data: savedReport, error: saveError } = await supabase
      .from('weekly_reports')
      .insert({
        user_id: user.id,
        title,
        content: reportContent,
        case_count: caseCount,
        patient_ids: eligiblePatientIds,
        period_start: lastReportDate,
        period_end: nowStr,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Erro ao salvar relatório semanal:', saveError);
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      report: savedReport,
    });
  } catch (error: any) {
    console.error('Erro ao gerar relatório semanal:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha interna ao gerar aula semanal.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
