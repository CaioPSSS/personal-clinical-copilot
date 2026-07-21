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

    const { fileName, patientId } = await req.json();

    if (!fileName || !patientId) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${user.id}/${patientId}/${timestamp}_${safeName}`;

    // Criar uma URL de upload assinada que bypassa restrições de escrita de RLS do cliente
    const { data, error } = await supabase.storage
      .from('medical-files')
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      console.error('Erro ao criar Signed Upload URL:', error);
      return NextResponse.json(
        { error: error?.message || 'Falha ao gerar URL de upload autorizada.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      storagePath,
    });
  } catch (error) {
    console.error('Erro no endpoint get-upload-url:', error);
    return NextResponse.json({ error: 'Falha interna ao preparar upload.' }, { status: 500 });
  }
}
