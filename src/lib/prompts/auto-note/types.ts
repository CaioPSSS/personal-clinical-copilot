import { Patient, RecordMode, SourceDocumentType } from '@/lib/types';

export interface AutoNoteContext {
  mode: RecordMode;
  docType?: 'admissao' | 'evolucao';
  todayStr: string; // Ex: '08/10/2026'
  shift: 'SD' | 'SN';
  patient: Patient;
}

export interface DocumentInput {
  type: SourceDocumentType;
  date?: string | null;
  text: string;
  fileName?: string;
  detectedPatientName?: string | null;
}
