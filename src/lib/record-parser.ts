import { SECTION_LABELS } from './constants';
import { EMERGENCY_SECTIONS, WARD_SECTIONS, OUTPATIENT_SECTIONS } from './record-templates';
import { RecordMode } from './types';

function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[:#>]/g, '')
    .trim();
}

/**
 * Mapeia uma linha de título (ex: "#EVOLUÇÃO SALA VERMELHA SD 06/10:" ou "## Lista de Problemas")
 * para uma chave canônica única do sistema.
 */
export function identifySectionKey(rawTitle: string): string {
  const norm = normalizeTitle(rawTitle);

  // Tentar match por prefixes ou substrings clínicas comuns
  if (norm.startsWith('lista de problemas') || norm.startsWith('lista problemas') || norm === 'problemas') {
    return 'lista_problemas';
  }
  if (norm === 'id' || norm.startsWith('identificacao') || norm.startsWith('dados')) {
    return 'identificacao';
  }
  if (norm === 'hma' || norm.startsWith('hma') || norm.startsWith('historia da molestia') || norm.startsWith('historia da doenca')) {
    return 'hma';
  }
  if (norm.startsWith('admissao sala vermelha') || norm.startsWith('admissao')) {
    return 'admissao_sala_vermelha';
  }
  if (norm === 'qp' || norm.startsWith('queixa principal')) {
    return 'queixa_principal';
  }
  if (norm === 'am' || norm.startsWith('antecedentes medicos') || norm.startsWith('antecedentes médicos') || norm.startsWith('antecedentes pessoais') || norm.startsWith('antecedentes patologicos')) {
    return 'am';
  }
  if (norm.startsWith('antecedentes obstetricos')) {
    return 'antecedentes_obstetricos';
  }
  if (norm.startsWith('antecedentes familiares') || norm === 'af') {
    return 'antecedentes_familiares';
  }
  if (norm === 'muc' || norm.startsWith('medicacoes de uso atual') || norm.startsWith('medicações de uso atual') || norm.startsWith('medicacao de uso continuo') || norm.startsWith('medicação de uso contínuo') || norm.startsWith('medicacoes em uso') || norm.startsWith('medicações em uso')) {
    return 'muc';
  }
  if (norm === 'is' || norm.startsWith('interrogatorio sistematico') || norm.startsWith('interrogatório sistemático') || norm.startsWith('revisao de sistemas') || norm.startsWith('revisão de sistemas')) {
    return 'is';
  }
  if (norm.startsWith('habitos de vida') || norm.startsWith('hábitos de vida') || norm.startsWith('estilo de vida')) {
    return 'habitos_de_vida';
  }
  if (norm === 'hps' || norm.startsWith('hps') || norm.startsWith('psicossocial') || norm.startsWith('historia psicossocial') || norm.startsWith('história psicossocial') || norm.startsWith('antecedentes sociofamiliares')) {
    return 'hps';
  }
  if (norm === 'alergias' || norm === 'alergia') {
    return 'alergias';
  }
  if (norm.startsWith('exame fisico admissonal') || norm.startsWith('exame fisico admissional') || norm.startsWith('exame fisico da admissao')) {
    return 'exame_fisico_admissional';
  }
  if (norm.startsWith('evolucao')) {
    return 'evolucao_do_dia';
  }
  if (norm === 'atb' || norm.startsWith('antibiotico') || norm.startsWith('antibioticoterapia')) {
    return 'atb';
  }
  if (norm.startsWith('dispositivos/antimicrobianos')) {
    return 'dispositivos_antimicrobianos';
  }
  if (norm.startsWith('dispositivos')) {
    return 'dispositivos';
  }
  if (norm.startsWith('sinais vitais') || norm === 'ssvv') {
    return 'sinais_vitais';
  }
  if (norm.startsWith('exame fisico') || norm === 'ef') {
    return 'exame_fisico';
  }
  if (norm.startsWith('exames complementares') || norm.startsWith('exames laboratoriais') || norm.startsWith('exames')) {
    return 'exames_complementares';
  }
  if (norm.startsWith('condutas') || norm.startsWith('conduta') || norm.startsWith('plano terapeutico')) {
    return 'condutas';
  }
  if (norm.startsWith('hipoteses') || norm.startsWith('hipóteses')) {
    return 'hipoteses_diagnosticas';
  }

  // Fallback para slug seguro
  return norm.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'outros';
}

/**
 * Converte o texto (Markdown ou padrão hospitalar com #SEÇÃO:) em um dicionário estruturado.
 */
export function parseRecordSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  if (!text) return sections;

  let currentKey: string | null = null;
  let currentContent: string[] = [];

  const lines = text.split('\n');

  for (const line of lines) {
    // Detecta cabeçalhos:
    // "#SEÇÃO:" ou "# SEÇÃO:" ou "## SEÇÃO"
    // Não deve disparar em subtítulos como "> LABORATÓRIO:" ou ">> GASOMETRIA:" ou "P1." ou "A:"
    const headerMatch = line.match(/^#{1,2}\s*([^#\n:][^\n]*?)\s*:?\s*$/);
    
    // Ignorar marcadores como "# " sozinhos ou linhas de comentário markdown
    if (headerMatch && !line.trim().startsWith('>')) {
      const rawTitle = headerMatch[1].trim();
      
      // Checar se não é uma linha acidental (como "#" vazio)
      if (rawTitle.length > 1) {
        if (currentKey) {
          sections[currentKey] = currentContent.join('\n').trim();
        }
        currentKey = identifySectionKey(rawTitle);
        currentContent = [];
        continue;
      }
    }

    if (currentKey) {
      currentContent.push(line);
    } else {
      // Conteúdo que precede o primeiro cabeçalho (como a linha de Dados / Leito)
      if (line.trim().length > 0) {
        if (!sections['identificacao']) {
          sections['identificacao'] = line.trim();
        } else {
          sections['identificacao'] += '\n' + line.trim();
        }
      }
    }
  }

  if (currentKey) {
    sections[currentKey] = currentContent.join('\n').trim();
  }

  return sections;
}

/**
 * Substitui cirurgicamente o conteúdo de uma seção dentro do texto integral do prontuário,
 * preservando a ordem e o restante do documento.
 */
export function replaceRecordSection(
  fullText: string,
  targetSection: string,
  newContent: string
): string {
  if (!fullText) return newContent;

  const targetKey = identifySectionKey(targetSection);
  const lines = fullText.split('\n');
  const resultLines: string[] = [];

  let inTargetSection = false;
  let replaced = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^#{1,2}\s*([^#\n:][^\n]*?)\s*:?\s*$/);

    if (headerMatch && !line.trim().startsWith('>')) {
      const detectedKey = identifySectionKey(headerMatch[1].trim());

      if (detectedKey === targetKey) {
        // Encontrou o cabeçalho da seção alvo
        inTargetSection = true;
        replaced = true;
        resultLines.push(line); // Mantém o cabeçalho exato original
        resultLines.push(newContent.trim());
        continue;
      } else if (inTargetSection) {
        // Entrou na próxima seção, sai da seção alvo
        inTargetSection = false;
      }
    }

    if (!inTargetSection) {
      resultLines.push(line);
    }
  }

  // Se a seção não existia antes, anexa ao final
  if (!replaced) {
    const headerTitle = SECTION_LABELS[targetKey] || targetSection.toUpperCase();
    resultLines.push('');
    resultLines.push(`#${headerTitle}:`);
    resultLines.push(newContent.trim());
  }

  return resultLines.join('\n');
}

/**
 * Formata um dicionário de dados de volta para texto estruturado, respeitando a ordem do modo.
 */
export function formatRecordDataToText(
  recordData: Record<string, string>,
  mode: RecordMode = 'enfermaria'
): string {
  if (!recordData) return '';

  const orderDefs =
    mode === 'emergencia_uti'
      ? EMERGENCY_SECTIONS
      : mode === 'ambulatorio'
      ? OUTPATIENT_SECTIONS
      : WARD_SECTIONS;
  const processedKeys = new Set<string>();
  const outputBlocks: string[] = [];

  // 1. Inserir cabeçalho / identificação primeiro se existir
  if (recordData['identificacao'] || recordData['dados_admissao'] || recordData['id']) {
    const headerVal = recordData['identificacao'] || recordData['dados_admissao'] || recordData['id'];
    if (headerVal && headerVal !== 'Não informado' && headerVal !== 'N/A') {
      if (mode === 'ambulatorio') {
        outputBlocks.push(`#ID:\n${headerVal}`);
      } else {
        outputBlocks.push(headerVal);
      }
      processedKeys.add('identificacao');
      processedKeys.add('dados_admissao');
      processedKeys.add('id');
    }
  }

  // 2. Inserir as seções conhecidas na ordem recomendada do modo
  for (const sec of orderDefs) {
    if (processedKeys.has(sec.key)) continue;

    // Buscar valor tanto pela chave principal quanto por aliases comuns
    let val = recordData[sec.key];
    if (!val) {
      if (sec.key === 'hma') val = recordData['historia_doenca_atual'] || recordData['queixa_principal'];
      else if (sec.key === 'historia_doenca_atual') val = recordData['hma'];
      else if (sec.key === 'am') val = recordData['antecedentes_pessoais'];
      else if (sec.key === 'antecedentes_pessoais') val = recordData['am'];
      else if (sec.key === 'muc') val = recordData['medicacoes_em_uso'] || recordData['medicacoes_uso_continuo'];
      else if (sec.key === 'medicacoes_em_uso' || sec.key === 'medicacoes_uso_continuo') val = recordData['muc'];
      else if (sec.key === 'is') val = recordData['revisao_de_sistemas'];
      else if (sec.key === 'revisao_de_sistemas') val = recordData['is'];
      else if (sec.key === 'hps') val = recordData['psicossocial'] || recordData['antecedentes_familiares'];
      else if (sec.key === 'psicossocial') val = recordData['hps'];
    }

    if (val && val !== 'Não informado' && val !== 'N/A') {
      const prefix = mode === 'enfermaria' ? `## ${sec.title}` : `#${sec.title}:`;
      outputBlocks.push(`${prefix}\n${val}`);
      processedKeys.add(sec.key);
      if (sec.key === 'hma') {
        processedKeys.add('historia_doenca_atual');
        processedKeys.add('queixa_principal');
      }
      if (sec.key === 'historia_doenca_atual') processedKeys.add('hma');
      if (sec.key === 'am') processedKeys.add('antecedentes_pessoais');
      if (sec.key === 'antecedentes_pessoais') processedKeys.add('am');
      if (sec.key === 'muc') {
        processedKeys.add('medicacoes_em_uso');
        processedKeys.add('medicacoes_uso_continuo');
      }
      if (sec.key === 'medicacoes_em_uso' || sec.key === 'medicacoes_uso_continuo') processedKeys.add('muc');
      if (sec.key === 'is') processedKeys.add('revisao_de_sistemas');
      if (sec.key === 'revisao_de_sistemas') processedKeys.add('is');
      if (sec.key === 'hps') {
        processedKeys.add('psicossocial');
        processedKeys.add('antecedentes_familiares');
      }
      if (sec.key === 'psicossocial') processedKeys.add('hps');
    }
  }

  // 3. Qualquer outra chave adicional que tenha sobrado
  for (const [key, val] of Object.entries(recordData)) {
    if (processedKeys.has(key)) continue;
    if (val && val !== 'Não informado' && val !== 'N/A') {
      const label = SECTION_LABELS[key] || key.replace(/_/g, ' ').toUpperCase();
      const prefix = mode === 'enfermaria' ? `## ${label}` : `#${label}:`;
      outputBlocks.push(`${prefix}\n${val}`);
    }
  }

  return outputBlocks.join('\n\n');
}
