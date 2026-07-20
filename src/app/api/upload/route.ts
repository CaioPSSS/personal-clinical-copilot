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

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const patientId = formData.get('patientId') as string;
    const category = formData.get('category') as 'audio' | 'image' | 'document';

    if (!file || !patientId) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${user.id}/${patientId}/${timestamp}_${safeName}`;

    // Upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('medical-files')
      .upload(storagePath, file);

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Salvar metadados na tabela files
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        user_id: user.id,
        patient_id: patientId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        category: category || 'document',
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ file: fileRecord, storagePath });
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json({ error: 'Falha no upload.' }, { status: 500 });
  }
}
