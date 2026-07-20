export interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  contact_phone: string | null;
  notes: string | null;
  bed_number: string | null;
  room_number: string | null;
  admission_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalRecord {
  id: string;
  user_id: string;
  patient_id: string;
  record_data: MedicalRecordData;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface MedicalRecordData {
  queixa_principal?: string;
  historia_doenca_atual?: string;
  revisao_de_sistemas?: string;
  antecedentes_pessoais?: string;
  antecedentes_familiares?: string;
  habitos_de_vida?: string;
  medicacoes_em_uso?: string;
  alergias?: string;
  exame_fisico?: string;
  hipoteses_diagnosticas?: string;
  plano_terapeutico?: string;
  [key: string]: string | undefined;
}

export interface Transcription {
  id: string;
  user_id: string;
  patient_id: string;
  audio_file_path: string | null;
  transcript_text: string;
  duration_seconds: number | null;
  processed: boolean;
  created_at: string;
}

export interface EvidenceNote {
  id: string;
  user_id: string;
  patient_id: string;
  content: string;
  reasoning: string | null;
  references: Record<string, unknown>[];
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  patient_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface FileRecord {
  id: string;
  user_id: string;
  patient_id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  storage_path: string;
  category: 'audio' | 'image' | 'document';
  processed?: boolean;
  created_at: string;
}
