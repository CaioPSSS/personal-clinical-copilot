import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { identifySectionKey, replaceRecordSection, formatRecordDataToText } from '@/lib/record-parser';

export async function POST(req: NextRequest) {
  try {
    const { patientId, section, newContent } = await req.json();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar prontuário atual
    const { data: existing } = await supabase
      .from('medical_records')
      .select('id, version, record_data, record_text, record_mode')
      .eq('patient_id', patientId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Prontuário não encontrado' }, { status: 404 });
    }

    const recordData = (existing.record_data as Record<string, string>) || {};
    const targetKey = identifySectionKey(section);

    // 1. Atualizar o objeto JSON
    const newRecordData = {
      ...recordData,
      [targetKey]: newContent,
    };

    // 2. Atualizar cirurgicamente o record_text
    let newRecordText = existing.record_text;
    if (newRecordText) {
      newRecordText = replaceRecordSection(newRecordText, section, newContent);
    } else {
      newRecordText = formatRecordDataToText(newRecordData, existing.record_mode || 'enfermaria');
    }

    // 3. Salvar nova versão
    await supabase
      .from('medical_records')
      .update({
        record_data: newRecordData,
        record_text: newRecordText,
        version: existing.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    return NextResponse.json({ success: true, updatedKey: targetKey });
  } catch (error: any) {
    console.error('Erro ao atualizar seção do prontuário:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
