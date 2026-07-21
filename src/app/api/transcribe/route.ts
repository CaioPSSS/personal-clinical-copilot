import { NextRequest, NextResponse } from 'next/server';
import Groq, { toFile } from 'groq-sdk';

export const maxDuration = 300;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // Convert generic File object to Buffer and then to Uploadable using toFile
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const groqFile = await toFile(buffer, file.name, { type: file.type });

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
