import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatRecordDataToText } from '@/lib/record-parser';
import {
  buildAutoNoteSystemPrompt,
  buildAutoNoteUserPrompt,
  DocumentInput,
} from '@/lib/prompts/auto-note';
import { buildPatientHeader } from '@/lib/record-templates';
import { Patient, RecordMode, FileRecord } from '@/lib/types';
import { AI_MODELS, getModelChain } from '@/lib/ai/models-config';

export const maxDuration = 300;

function getBrasiliaDateAndShift(): { todayStr: string; shift: 'SD' | 'SN' } {
  // Ajuste para o fuso UTC-3 (Horário de Brasília)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const brasiliaTime = new Date(utc - 3 * 3600000);

  const dd = String(brasiliaTime.getDate()).padStart(2, '0');
  const mm = String(brasiliaTime.getMonth() + 1).padStart(2, '0');
  const yyyy = brasiliaTime.getFullYear();
  const hours = brasiliaTime.getHours();

  const todayStr = `${dd}/${mm}/${yyyy}`;
  const shift: 'SD' | 'SN' = hours >= 7 && hours < 19 ? 'SD' : 'SN';

  return { todayStr, shift };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const patientId = body.patientId;
    const transcriptionText = body.transcriptionText || body.transcriptText;
    const requestedMode = body.mode as RecordMode | undefined;
    const fileIds: string[] = body.fileIds || [];
    const imagePaths: string[] = body.imagePaths || [];

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 1. Buscar paciente
    const { data: patientData, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .eq('user_id', user.id)
      .single();

    if (patientError || !patientData) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    const patient = patientData as Patient;
    const mode: RecordMode = requestedMode || patient.record_mode || 'enfermaria';
    const { todayStr, shift } = getBrasiliaDateAndShift();

    // 2. Buscar prontuário atual (se existir)
    const { data: currentRecord } = await supabase
      .from('medical_records')
      .select('record_text, record_data')
      .eq('patient_id', patientId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    let currentRecordText: string | null = null;
    if (currentRecord?.record_text) {
      currentRecordText = currentRecord.record_text;
    } else if (currentRecord?.record_data) {
      currentRecordText = formatRecordDataToText(currentRecord.record_data as Record<string, string>, mode);
    }

    // 3. Processar arquivos anexos (textos já extraídos ou pendentes)
    const documentInputs: DocumentInput[] = [];
    const publicImageUrls: string[] = [];

    // Buscar metadados de arquivos do banco se foram informados fileIds
    if (fileIds.length > 0) {
      const { data: filesData } = await supabase
        .from('files')
        .select('*')
        .in('id', fileIds)
        .eq('user_id', user.id);

      if (filesData && filesData.length > 0) {
        for (const file of filesData as FileRecord[]) {
          if (file.extracted_text && file.extracted_text.trim().length > 0) {
            documentInputs.push({
              type: file.source_type || 'auto',
              date: file.document_date,
              text: file.extracted_text,
              fileName: file.file_name,
              detectedPatientName: file.detected_patient_name,
            });
          } else if (file.storage_path) {
            // Imagem ainda não extraída: gerar URL assinada para envio multimodal
            const { data } = await supabase.storage
              .from('medical-files')
              .createSignedUrl(file.storage_path, 3600);
            if (data?.signedUrl) {
              publicImageUrls.push(data.signedUrl);
            }
          }
        }
      }
    } else if (imagePaths && imagePaths.length > 0) {
      for (const path of imagePaths) {
        const { data } = await supabase.storage
          .from('medical-files')
          .createSignedUrl(path, 3600);
        if (data?.signedUrl) {
          publicImageUrls.push(data.signedUrl);
        }
      }
    }

    const systemPrompt = buildAutoNoteSystemPrompt({
      mode,
      todayStr,
      shift,
      patient,
    });

    const userPromptText = buildAutoNoteUserPrompt({
      currentRecordText,
      newTranscriptions: transcriptionText || null,
      documents: documentInputs,
      todayStr,
      shift,
    });

    const contentParts: any[] = [{ type: 'text', text: userPromptText }];

    for (const url of publicImageUrls) {
      contentParts.push({ type: 'image', image: url });
    }

    const result = await generateText({
      model: getModelChain(AI_MODELS.NOTE_GENERATION),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: contentParts,
        },
      ],
    });

    let rawOutput = result.text || '';

    if (!rawOutput || rawOutput.trim().length === 0) {
      return NextResponse.json(
        { error: 'A IA não gerou nenhum conteúdo. Tente novamente.' },
        { status: 500 }
      );
    }

    // 4. Separar o bloco ===CONFERIR===
    let noteText = rawOutput;
    let warnings: string[] = [];

    const conferirIndex = rawOutput.indexOf('===CONFERIR===');
    if (conferirIndex !== -1) {
      noteText = rawOutput.substring(0, conferirIndex).trim();
      const conferirContent = rawOutput.substring(conferirIndex + '===CONFERIR==='.length).trim();
      if (conferirContent) {
        warnings = conferirContent
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0 && !line.toLowerCase().includes('nenhuma pendência'));
      }
    }

    // 5. Garantir cabeçalho determinístico padronizado
    const deterministicHeader = buildPatientHeader(patient, mode, { today: todayStr, shift });
    
    // Se a saída não começar com o cabeçalho padronizado ou similar, prefixar
    if (!noteText.toUpperCase().includes(patient.full_name.toUpperCase().slice(0, 10))) {
      noteText = `${deterministicHeader}\n\n${noteText}`;
    }

    // 6. Se o modo for emergência / UTI: determinismo de CAIXA ALTA (MAIÚSCULO)
    if (mode === 'emergencia_uti') {
      noteText = noteText.toLocaleUpperCase('pt-BR');
    }

    return NextResponse.json({
      text: noteText,
      warnings,
      mode,
    });
  } catch (error: any) {
    console.error('Erro na geração do prontuário:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno na geração do prontuário.' },
      { status: 500 }
    );
  }
}
