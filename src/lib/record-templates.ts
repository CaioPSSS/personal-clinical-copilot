import { Patient, RecordMode } from './types';
import { calculateAge } from './helpers';

export interface SectionDefinition {
  key: string;
  title: string;
  aliases: string[];
  requiredInMode?: RecordMode[];
}

export const EMERGENCY_SECTIONS: SectionDefinition[] = [
  {
    key: 'lista_problemas',
    title: 'LISTA DE PROBLEMAS',
    aliases: ['lista de problemas', 'problemas', 'lista problemas', 'lista_problemas'],
    requiredInMode: ['emergencia_uti'],
  },
  {
    key: 'hma',
    title: 'HMA',
    aliases: ['hma', 'historia da molestia atual', 'história da moléstia atual', 'historia da doenca atual'],
    requiredInMode: ['emergencia_uti'],
  },
  {
    key: 'admissao_sala_vermelha',
    title: 'ADMISSÃO SALA VERMELHA',
    aliases: ['admissão sala vermelha', 'admissao sala vermelha', 'admissao', 'admissão'],
  },
  {
    key: 'am',
    title: 'AM',
    aliases: ['am', 'antecedentes medicos', 'antecedentes médicos', 'antecedentes pessoais'],
  },
  {
    key: 'muc',
    title: 'MUC',
    aliases: ['muc', 'medicacoes de uso continuo', 'medicações de uso contínuo', 'medicacoes em uso', 'medicações em uso'],
  },
  {
    key: 'alergias',
    title: 'ALERGIAS',
    aliases: ['alergias', 'alergia'],
  },
  {
    key: 'exame_fisico_admissional',
    title: 'EXAME FÍSICO ADMISSONAL',
    aliases: ['exame fisico admissional', 'exame físico admissional', 'exame fisico da admissao', 'exame físico da admissão', 'exame fisico admissonal', 'exame físico admissonal'],
  },
  {
    key: 'evolucao_do_dia',
    title: 'EVOLUÇÃO',
    aliases: ['evolucao', 'evolução', 'evolucao sala vermelha', 'evolução sala vermelha', 'evolucao uti', 'evolução uti', 'evolucao do dia'],
  },
  {
    key: 'atb',
    title: 'ATB',
    aliases: ['atb', 'antibioticos', 'antibióticos', 'antibioticoterapia'],
  },
  {
    key: 'dispositivos',
    title: 'DISPOSITIVOS',
    aliases: ['dispositivos', 'dispositivos em uso'],
  },
  {
    key: 'exames_complementares',
    title: 'EXAMES COMPLEMENTARES',
    aliases: ['exames complementares', 'exames complementare', 'exames laboratoriais', 'laboratorio', 'laboratorial'],
  },
  {
    key: 'condutas',
    title: 'CONDUTAS',
    aliases: ['condutas', 'conduta', 'plano terapeutico', 'plano terapêutico', 'vigilancias', 'vigilâncias'],
    requiredInMode: ['emergencia_uti'],
  },
];

export const WARD_SECTIONS: SectionDefinition[] = [
  {
    key: 'dados_admissao',
    title: 'Dados',
    aliases: ['dados', 'dados cadastrais', 'identificacao', 'identificação'],
  },
  {
    key: 'lista_problemas',
    title: 'Lista de Problemas',
    aliases: ['lista de problemas', 'problemas', 'lista problemas'],
  },
  {
    key: 'queixa_principal',
    title: 'Queixa Principal',
    aliases: ['queixa principal', 'qp'],
  },
  {
    key: 'historia_doenca_atual',
    title: 'História da Moléstia Atual',
    aliases: ['historia da molestia atual', 'história da moléstia atual', 'hma', 'historia da doenca atual'],
  },
  {
    key: 'evolucao_do_dia',
    title: 'Evolução',
    aliases: ['evolucao', 'evolução', 'evolucao medica', 'evolução médica', 'evolucao do dia'],
  },
  {
    key: 'antecedentes_pessoais',
    title: 'Antecedentes Pessoais',
    aliases: ['antecedentes pessoais', 'am', 'antecedentes medicos'],
  },
  {
    key: 'antecedentes_obstetricos',
    title: 'Antecedentes Obstétricos',
    aliases: ['antecedentes obstetricos', 'antecedentes obstétricos'],
  },
  {
    key: 'antecedentes_familiares',
    title: 'Antecedentes Familiares',
    aliases: ['antecedentes familiares', 'af'],
  },
  {
    key: 'habitos_de_vida',
    title: 'Hábitos de Vida',
    aliases: ['habitos de vida', 'hábitos de vida'],
  },
  {
    key: 'psicossocial',
    title: 'Psicossocial',
    aliases: ['psicossocial'],
  },
  {
    key: 'medicacoes_uso_continuo',
    title: 'Medicação de Uso Contínuo',
    aliases: ['medicacao de uso continuo', 'medicação de uso contínuo', 'muc', 'medicacoes em uso'],
  },
  {
    key: 'alergias',
    title: 'Alergias',
    aliases: ['alergias', 'alergia'],
  },
  {
    key: 'dispositivos_antimicrobianos',
    title: 'Dispositivos/Antimicrobianos em Uso',
    aliases: ['dispositivos/antimicrobianos em uso', 'dispositivos', 'antimicrobianos', 'atb'],
  },
  {
    key: 'sinais_vitais',
    title: 'Sinais Vitais',
    aliases: ['sinais vitais', 'ssvv'],
  },
  {
    key: 'exame_fisico',
    title: 'Exame Físico',
    aliases: ['exame fisico', 'exame físico'],
  },
  {
    key: 'exames_complementares',
    title: 'Exames Complementares',
    aliases: ['exames complementares', 'exames laboratoriais', 'exames'],
  },
  {
    key: 'condutas',
    title: 'Plano Terapêutico',
    aliases: ['plano terapeutico', 'plano terapêutico', 'condutas', 'conduta'],
  },
];

/**
 * Constrói o cabeçalho padronizado e determinístico de acordo com o modo clínico e cadastro do paciente.
 */
export function buildPatientHeader(
  patient: Patient,
  mode: RecordMode = 'enfermaria',
  options?: {
    today?: string;
    shift?: 'SD' | 'SN';
  }
): string {
  const age = patient.date_of_birth ? calculateAge(patient.date_of_birth) : null;
  const ageStr = age !== null ? `${age} ANOS` : '';

  // Formatação de data de admissão
  let admStr = '';
  if (patient.admission_date) {
    try {
      const d = new Date(patient.admission_date);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        admStr = `${dd}/${mm}/${yy}`;
      }
    } catch {
      admStr = '';
    }
  }

  if (mode === 'emergencia_uti') {
    const leito = (patient.bed_number || 'S/L').toUpperCase();
    const nome = (patient.full_name || 'PACIENTE').toUpperCase();
    let header = `LEITO ${leito} – ${nome}`;
    if (ageStr) header += `, ${ageStr}`;
    if (admStr) header += ` >> ADM ${admStr}`;
    return header;
  }

  // Modo Enfermaria
  const genderCode = patient.gender
    ? patient.gender.toLowerCase().startsWith('m')
      ? 'M'
      : patient.gender.toLowerCase().startsWith('f')
      ? 'F'
      : patient.gender
    : '';

  const parts: string[] = [];
  if (genderCode) parts.push(genderCode);
  if (age !== null) parts.push(`${age} anos`);
  if (patient.institution) parts.push(patient.institution);
  if (patient.bed_number) parts.push(`Leito ${patient.bed_number}`);
  if (patient.room_number) parts.push(`Quarto ${patient.room_number}`);
  if (admStr) parts.push(`Internamento: ${admStr}`);

  return `Dados: ${parts.join(' | ')}`;
}
