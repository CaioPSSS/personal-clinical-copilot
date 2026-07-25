import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseRecordSections } from '@/lib/record-parser';

export async function POST(req: NextRequest) {
  try {
    const { patientId, text, hasTranscriptions } = await req.json();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Parsear o texto gerado/editado em seções
    const recordData = parseRecordSections(text);

    // Verificar se já existe um registro
    const { data: existing } = await supabase
      .from('medical_records')
      .select('id, version')
      .eq('patient_id', patientId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      await supabase
        .from('medical_records')
        .update({
          record_data: recordData,
          version: existing.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('medical_records').insert({
        user_id: user.id,
        patient_id: patientId,
        record_data: recordData,
        version: 1,
      });
    }

    // Marcar transcrições como processadas, se houve alguma no lote
    if (hasTranscriptions) {
      await supabase
        .from('transcriptions')
        .update({ processed: true })
        .eq('patient_id', patientId)
        .eq('user_id', user.id)
        .eq('processed', false);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar prontuário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
