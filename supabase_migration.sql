-- ==============================================================================
-- MIGRAÇÃO DE BANCO DE DADOS: MODOS CLÍNICOS E INGESTÃO MULTI-DOCUMENTOS
-- Execute este script no SQL Editor do painel do Supabase (supabase.com/dashboard)
-- ==============================================================================

-- 1. Tabela PATIENTS: suporte ao modo de atendimento e data de admissão/internação
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS record_mode TEXT DEFAULT 'enfermaria',
ADD COLUMN IF NOT EXISTS admission_date DATE;

-- 2. Tabela MEDICAL_RECORDS: suporte ao modo do prontuário e texto completo monospaçado
ALTER TABLE medical_records 
ADD COLUMN IF NOT EXISTS record_mode TEXT DEFAULT 'enfermaria',
ADD COLUMN IF NOT EXISTS record_text TEXT;

-- 3. Tabela FILES: suporte à classificação de documentos, OCR e metadados de extração
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS extracted_text TEXT,
ADD COLUMN IF NOT EXISTS document_date TEXT,
ADD COLUMN IF NOT EXISTS detected_patient_name TEXT,
ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false;

-- 4. Recarregar o cache do schema do PostgREST imediatamente
NOTIFY pgrst, 'reload schema';
