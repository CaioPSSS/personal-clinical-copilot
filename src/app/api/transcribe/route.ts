import { NextRequest, NextResponse } from 'next/server';
import Groq, { toFile } from 'groq-sdk';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 300;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    let fileBuffer: Buffer;
    let fileName: string;
    let fileType: string | undefined;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const { storagePath, fileName: reqFileName } = await req.json();
      if (!storagePath || !reqFileName) {
        return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
      }

      fileName = reqFileName;

      const supabase = await createClient();
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('medical-files')
        .download(storagePath);

      if (downloadError || !fileData) {
        console.error('Erro ao baixar arquivo do storage:', downloadError);
        return NextResponse.json(
          { error: 'Falha ao recuperar o arquivo de áudio para transcrição.' },
          { status: 500 }
        );
      }

      const arrayBuffer = await fileData.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      fileType = fileData.type || undefined;
    } else {
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
      }

      fileName = file.name;
      fileType = file.type;

      // Convert generic File object to Buffer
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }

    const groqFile = await toFile(fileBuffer, fileName, { type: fileType });

    const transcription = await groq.audio.transcriptions.create({
      file: groqFile,
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'pt',
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error('Erro na transcrição:', error);
    return NextResponse.json(
      { error: 'Falha ao transcrever o áudio.' },
      { status: 500 }
    );
  }
}
