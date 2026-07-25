import { SECTION_LABELS } from './constants';

const SECTION_REVERSE_MAP: Record<string, string> = {
  'identificação': 'identificacao',
  'queixa principal': 'queixa_principal',
  'qp': 'queixa_principal',
  'história da moléstia atual': 'historia_doenca_atual',
  'hma': 'historia_doenca_atual',
  'antecedentes pessoais': 'antecedentes_pessoais',
  'alergias': 'alergias',
  'medicação de uso contínuo': 'medicacoes_uso_continuo',
  'medicações em uso': 'medicacoes_uso_continuo',
  'antecedentes familiares': 'antecedentes_familiares',
  'hábitos de vida': 'habitos_de_vida',
  'exame físico': 'exame_fisico',
  'evolução do dia': 'evolucao_do_dia',
  'exames laboratoriais': 'exames_laboratoriais',
  'exames de imagem': 'exames_imagem',
  'condutas feitas/planejadas': 'condutas',
  'condutas': 'condutas',
  'plano terapêutico': 'condutas',
  'hipóteses diagnósticas': 'hipoteses_diagnosticas',
};

/**
 * Converte o texto Markdown gerado pela IA ou editado pelo usuário em um dicionário estruturado de seções.
 */
export function parseRecordSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let currentKey: string | null = null;
  let currentContent: string[] = [];

  const lines = text.split('\n');

  for (const line of lines) {
    const match = line.match(/^##\s+(.*)/);
    if (match) {
      if (currentKey) {
        sections[currentKey] = currentContent.join('\n').trim();
      }
      const rawTitle = match[1].trim().toLowerCase();
      currentKey = SECTION_REVERSE_MAP[rawTitle] || rawTitle.replace(/ /g, '_');
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

/**
 * Formata um dicionário de dados do prontuário para texto Markdown amigável para envio como contexto no chat/IA.
 */
export function formatRecordDataToText(recordData: Record<string, string>): string {
  return Object.entries(recordData)
    .filter(([, v]) => v && v !== 'Não informado' && v !== 'Não avaliado')
    .map(([k, v]) => `## ${SECTION_LABELS[k] || k}\n${v}`)
    .join('\n\n');
}
