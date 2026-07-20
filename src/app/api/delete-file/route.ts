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

    const { fileId, storagePath } = await req.json();

    if (!fileId || !storagePath) {
      return NextResponse.json({ error: 'ID ou path ausente.' }, { status: 400 });
    }

    // Deletar do Storage
    const { error: storageError } = await supabase.storage
      .from('medical-files')
      .remove([storagePath]);

    if (storageError) {
      console.error('Erro ao deletar arquivo do storage:', storageError);
      return NextResponse.json({ error: 'Falha ao remover arquivo do servidor.' }, { status: 500 });
    }

    // Deletar do Banco
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', user.id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
