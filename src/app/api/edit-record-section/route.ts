import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
      .select('id, version, record_data')
      .eq('patient_id', patientId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Prontuário não encontrado' }, { status: 404 });
    }

    // Identificar a chave real do record_data correspondente ao 'section'
    const recordData = existing.record_data as Record<string, string>;
    const sectionMap: Record<string, string> = {
      'Queixa Principal (QP)': 'queixa_principal',
      'História da Moléstia Atual (HMA)': 'historia_doenca_atual',
      'Revisão de Sistemas': 'revisao_de_sistemas',
      'Antecedentes Pessoais': 'antecedentes_pessoais',
      'Antecedentes Familiares': 'antecedentes_familiares',
      'Hábitos de Vida': 'habitos_de_vida',
      'Medicações em Uso': 'medicacoes_em_uso',
      Alergias: 'alergias',
      'Exame Físico': 'exame_fisico',
      'Hipóteses Diagnósticas': 'hipoteses_diagnosticas',
      'Plano Terapêutico': 'plano_terapeutico',
    };

    let targetKey = sectionMap[section];
    if (!targetKey) {
      // Tentar match exato com as chaves existentes
      const keys = Object.keys(recordData);
      const exactMatch = keys.find(k => k.toLowerCase() === section.toLowerCase());
      if (exactMatch) targetKey = exactMatch;
      else targetKey = section.toLowerCase().replace(/ /g, '_');
    }

    // Atualizar o JSON
    const newRecordData = {
      ...recordData,
      [targetKey]: newContent,
    };

    // Salvar nova versão
    await supabase
      .from('medical_records')
      .update({
        record_data: newRecordData,
        version: existing.version + 1,
      })
      .eq('id', existing.id);

    return NextResponse.json({ success: true, updatedKey: targetKey });
  } catch (error) {
    console.error('Erro ao atualizar seção do prontuário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
