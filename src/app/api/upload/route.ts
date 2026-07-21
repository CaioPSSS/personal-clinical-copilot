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

    let patientId: string;
    let category: 'audio' | 'image' | 'document';
    let fileName: string;
    let fileType: string;
    let fileSize: number;
    let storagePath: string;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      patientId = body.patientId;
      category = body.category;
      fileName = body.fileName;
      fileType = body.fileType;
      fileSize = body.fileSize;
      storagePath = body.storagePath;
    } else {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      patientId = formData.get('patientId') as string;
      category = formData.get('category') as 'audio' | 'image' | 'document';

      if (!file || !patientId) {
        return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
      }

      fileName = file.name;
      fileType = file.type;
      fileSize = file.size;

      const timestamp = Date.now();
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      storagePath = `${user.id}/${patientId}/${timestamp}_${safeName}`;

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('medical-files')
        .upload(storagePath, file);

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }
    }

    if (!patientId || !storagePath || !fileName) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    // Salvar metadados na tabela files
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        user_id: user.id,
        patient_id: patientId,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
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
