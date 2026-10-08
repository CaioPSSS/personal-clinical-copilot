import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseRecordSections } from '@/lib/record-parser';
import { RecordMode } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { patientId, text, recordMode, hasTranscriptions, fileIds } = await req.json();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!patientId || !text) {
      return NextResponse.json({ error: 'Dados insuficientes' }, { status: 400 });
    }

    // 1. Parsear o texto em seções para manter compatibilidade com consultas JSONB
    const recordData = parseRecordSections(text);

    // 2. Verificar versão anterior
    const { data: existing } = await supabase
      .from('medical_records')
      .select('id, version')
      .eq('patient_id', patientId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const newVersion = existing ? existing.version + 1 : 1;

    // 3. Salvar prontuário (criando nova versão no histórico com record_text)
    if (existing) {
      await supabase
        .from('medical_records')
        .update({
          record_text: text,
          record_data: recordData,
          record_mode: (recordMode as RecordMode) || 'enfermaria',
          version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('medical_records').insert({
        user_id: user.id,
        patient_id: patientId,
        record_text: text,
        record_data: recordData,
        record_mode: (recordMode as RecordMode) || 'enfermaria',
        version: 1,
      });
    }

    // 4. Marcar transcrições como processadas
    if (hasTranscriptions) {
      await supabase
        .from('transcriptions')
        .update({ processed: true })
        .eq('patient_id', patientId)
        .eq('user_id', user.id)
        .eq('processed', false);
    }

    // 5. Corrigir Bug E: Marcar imagens/arquivos como processados!
    if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
      await supabase
        .from('files')
        .update({ processed: true })
        .in('id', fileIds)
        .eq('patient_id', patientId)
        .eq('user_id', user.id);
    } else {
      // Se não especificou IDs, marca todos os arquivos pendentes do paciente
      await supabase
        .from('files')
        .update({ processed: true })
        .eq('patient_id', patientId)
        .eq('user_id', user.id)
        .eq('processed', false);
    }

    return NextResponse.json({ success: true, version: newVersion });
  } catch (error: any) {
    console.error('Erro ao salvar prontuário:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
