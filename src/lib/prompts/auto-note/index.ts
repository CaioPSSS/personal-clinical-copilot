import { AutoNoteContext, DocumentInput } from './types';
import { getBaseSystemInstructions } from './base';
import { SOURCE_HIERARCHY_RULES } from './sources';
import { PROBLEM_LIST_RULES } from './problem-list';
import { MEDICAL_ABBREVIATIONS_GUIDE } from './abbreviations';
import { EMERGENCY_MODE_INSTRUCTIONS } from './mode-emergencia';
import { WARD_MODE_INSTRUCTIONS } from './mode-enfermaria';
import { ANONYMIZED_FEW_SHOT_EXAMPLES } from './examples';

export * from './types';

/**
 * Constrói o System Prompt modular completo para geração de prontuário.
 */
export function buildAutoNoteSystemPrompt(ctx: AutoNoteContext): string {
  const parts: string[] = [
    getBaseSystemInstructions(ctx),
    SOURCE_HIERARCHY_RULES,
    PROBLEM_LIST_RULES,
    MEDICAL_ABBREVIATIONS_GUIDE,
    ctx.mode === 'emergencia_uti' ? EMERGENCY_MODE_INSTRUCTIONS : WARD_MODE_INSTRUCTIONS,
    ANONYMIZED_FEW_SHOT_EXAMPLES,
  ];

  return parts.join('\n\n---\n\n');
}

/**
 * Rótulos descritivos dos tipos de documento para a IA entender o contexto de cada anexo.
 */
const SOURCE_LABELS: Record<string, string> = {
  evolucao_anterior: 'EVOLUÇÃO DE PLANTÃO ANTERIOR / DIA ANTERIOR (MESMO INTERNAMENTO)',
  internamento_previo: 'PRONTUÁRIO DE INTERNAMENTO ANTIGO / PREGRESSO (EXTRAIR APENAS ANTECEDENTES)',
  laboratorio: 'EXAME LABORATORIAL / GASOMETRIA',
  imagem_laudo: 'LAUDO DE EXAME DE IMAGEM / ECG',
  prescricao: 'PRESCRIÇÃO MÉDICA / CONTROLES DE ENFERMAGEM (DVA, ATB, DISPOSITIVOS, HGT)',
  outro: 'DOCUMENTO COMPLEMENTAR',
  auto: 'DOCUMENTO ANEXO',
};

/**
 * Monta o User Prompt com todas as entradas categorizadas e rotuladas.
 */
export function buildAutoNoteUserPrompt(options: {
  currentRecordText?: string | null;
  newTranscriptions?: string | null;
  documents?: DocumentInput[];
  todayStr: string;
  shift: 'SD' | 'SN';
}): string {
  const parts: string[] = [];

  // 1. Prontuário existente salvo no sistema (se houver)
  if (options.currentRecordText && options.currentRecordText.trim().length > 0) {
    parts.push(`=== PRONTUÁRIO ATUALMENTE SALVO NO SISTEMA ===\n${options.currentRecordText.trim()}`);
  }

  // 2. Documentos e Fotos categorizados
  if (options.documents && options.documents.length > 0) {
    options.documents.forEach((doc, idx) => {
      const typeLabel = SOURCE_LABELS[doc.type] || 'DOCUMENTO CLÍNICO';
      const dateHeader = doc.date ? ` | DATA IDENTIFICADA: ${doc.date}` : '';
      const patientHeader = doc.detectedPatientName ? ` | PACIENTE NO DOC: ${doc.detectedPatientName}` : '';
      
      parts.push(
        `=== ANEXO ${idx + 1}/${options.documents!.length}: [${typeLabel}${dateHeader}${patientHeader}] ===\n${doc.text}`
      );
    });
  }

  // 3. Informações mais recentes ditas/digitadas pelo médico agora
  if (options.newTranscriptions && options.newTranscriptions.trim().length > 0) {
    parts.push(
      `=== FALA OU ANOTAÇÃO DO MÉDICO NO PLANTÃO DE HOJE (${options.todayStr} - TURNO ${options.shift}) [FONTE PRIORITÁRIA DE ESTADO ATUAL] ===\n${options.newTranscriptions.trim()}`
    );
  }

  if (parts.length === 0) {
    return 'Nenhuma informação fornecida. Retorne esqueleto em branco com N/A nas seções.';
  }

  parts.push(
    'Com base nas fontes acima e respeitando com rigor as regras de hierarquia e estilo definidas, gere o prontuário médico completo atualizado e o bloco ===CONFERIR=== ao final.'
  );

  return parts.join('\n\n');
}

/**
 * Fallback estático para manter compatibilidade com códigos legados
 */
export const AUTO_NOTE_SYSTEM_PROMPT = `Você é um escriba médico profissional. Sua tarefa é produzir um prontuário médico estruturado e atualizado em Português (Brasil).`;
