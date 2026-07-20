import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

function parseRecordSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionMap: Record<string, string> = {
    Identificação: 'identificacao',
    'Queixa Principal': 'queixa_principal',
    'História da Moléstia Atual': 'historia_doenca_atual',
    'Antecedentes Pessoais': 'antecedentes_pessoais',
    Alergias: 'alergias',
    'Medicação de Uso Contínuo': 'medicacoes_uso_continuo',
    'Antecedentes Familiares': 'antecedentes_familiares',
    'Hábitos de Vida': 'habitos_de_vida',
    'Exame Físico': 'exame_fisico',
    'Evolução do Dia': 'evolucao_do_dia',
    'Exames Laboratoriais': 'exames_laboratoriais',
    'Exames de Imagem': 'exames_imagem',
    'Condutas Feitas/Planejadas': 'condutas',
  };

  let currentKey: string | null = null;
  let currentContent: string[] = [];

  const lines = text.split('\n');

  for (const line of lines) {
    const match = line.match(/^##\s+(.*)/);
    if (match) {
      if (currentKey) {
        sections[currentKey] = currentContent.join('\n').trim();
      }
      const rawTitle = match[1].trim();
      currentKey = sectionMap[rawTitle] || rawTitle.toLowerCase().replace(/ /g, '_');
      currentContent = [];
    } else if (currentKey) {
      currentContent.push(line);
    }
  }

  if (currentKey) {
    sections[currentKey] = currentContent.join('\n').trim();
  }

  return sections;
}
