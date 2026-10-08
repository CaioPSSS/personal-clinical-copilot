import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { fileId, sourceType, extractedText } = await req.json();

    if (!fileId) {
      return NextResponse.json({ error: 'fileId é obrigatório' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const updatePayload: Record<string, any> = {};
    if (sourceType !== undefined) updatePayload.source_type = sourceType;
    if (extractedText !== undefined) updatePayload.extracted_text = extractedText;

    const { error } = await supabase
      .from('files')
      .update(updatePayload)
      .eq('id', fileId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Erro ao atualizar arquivo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Erro em update-file:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
