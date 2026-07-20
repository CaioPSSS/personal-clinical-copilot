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

    const { transcriptionId, newText } = await req.json();

    if (!transcriptionId || !newText) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from('transcriptions')
      .update({ transcript_text: newText })
      .eq('id', transcriptionId)
      .eq('user_id', user.id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao editar transcrição:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
