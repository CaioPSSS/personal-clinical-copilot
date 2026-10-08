import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AI_MODELS, getModelChain } from '@/lib/ai/models-config';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    let fileBuffer: Buffer | null = null;
    let fileId: string | null = null;
    let storagePath: string | null = null;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      fileId = body.fileId;
      storagePath = body.storagePath;

      if (storagePath) {
        const { data, error } = await supabase.storage
          .from('medical-files')
          .download(storagePath);
        if (error || !data) {
          throw new Error('Falha ao baixar imagem do storage: ' + (error?.message || 'Arquivo não encontrado'));
        }
        fileBuffer = Buffer.from(await data.arrayBuffer());
      }
    } else {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      fileId = (formData.get('fileId') as string) || null;
      if (file) {
        fileBuffer = Buffer.from(await file.arrayBuffer());
      }
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: 'Nenhum arquivo de imagem fornecido.' }, { status: 400 });
    }

    // Marca como em processamento se tiver ID
    if (fileId) {
      await supabase
        .from('files')
        .update({ extraction_status: 'processing' })
        .eq('id', fileId)
        .eq('user_id', user.id);
    }

    const extractionPrompt = `Você é um perito em transcrição médica documental e caligrafia clínica hospitalar.
Sua missão é extrair TODO o conteúdo desta imagem de prontuário, exame, receita ou evolução com fidelidade cirúrgica.

REGRAS:
1. Transcreva todos os dados clínicos legíveis (sinais vitais, HGT, medicamentos, doses, exames laboratoriais com datas, anotações de evolução).
2. Não tente adivinhar caligrafias incompreensíveis ou números cortados: coloque [ILEGÍVEL] no ponto exato.
3. Se houver nome de paciente visível no cabeçalho ou carimbo, registre.
4. Identifique o tipo provável do documento: "Evolução de Plantão Anterior", "Prontuário Antigo", "Exame Laboratorial / Gasometria", "Laudo de Imagem / ECG", ou "Prescrição".

Retorne a transcrição em texto claro e organizado.`;

    const { text } = await generateText({
      model: getModelChain(AI_MODELS.IMAGE_ANALYSIS),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: extractionPrompt,
            },
            {
              type: 'image',
              image: fileBuffer,
            },
          ],
        },
      ],
    });

    // Salvar extração na tabela files se fileId foi fornecido
    if (fileId && text) {
      await supabase
        .from('files')
        .update({
          extracted_text: text,
          extraction_status: 'done',
        })
        .eq('id', fileId)
        .eq('user_id', user.id);
    }

    return NextResponse.json({ text, fileId });
  } catch (error: any) {
    console.error('Erro na análise da imagem:', error);
    return NextResponse.json({ error: error.message || 'Falha na análise da imagem.' }, { status: 500 });
  }
}
