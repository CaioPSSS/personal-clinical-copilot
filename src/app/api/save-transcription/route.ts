import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { patientId, transcriptText, audioFilePath } = await req.json();

    const { data, error } = await supabase
      .from('transcriptions')
      .insert({
        user_id: user.id,
        patient_id: patientId,
        transcript_text: transcriptText,
        audio_file_path: audioFilePath || null,
        processed: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ transcription: data });
  } catch (error) {
    console.error('Erro ao salvar transcrição:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
