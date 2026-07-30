import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { withFallback } from '@/lib/ai/model-fallback';
import { formatRecordDataToText } from '@/lib/record-parser';
import {
  AUTO_NOTE_SYSTEM_PROMPT,
  buildAutoNoteUserPrompt,
} from '@/lib/prompts/auto-note';

export const maxDuration = 300;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const patientId = body.patientId;
    const transcriptionText = body.transcriptionText || body.transcriptText;
    const imagePaths = body.imagePaths;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Não autenticado', { status: 401 });
    }

    // Buscar prontuário atual (se existir)
    const { data: currentRecord } = await supabase
      .from('medical_records')
      .select('record_data')
      .eq('patient_id', patientId)
      .eq('user_id', user.id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    // Montar o conteúdo atual como texto
    let currentRecordText: string | null = null;
    if (currentRecord?.record_data) {
      currentRecordText = formatRecordDataToText(currentRecord.record_data as Record<string, string>);
    }

    // Processar imagens pendentes, se houver
    const publicImageUrls: string[] = [];
    if (imagePaths && imagePaths.length > 0) {
      for (const path of imagePaths) {
        const { data, error } = await supabase.storage
          .from('medical-files')
          .createSignedUrl(path, 3600);

        if (data?.signedUrl) {
          publicImageUrls.push(data.signedUrl);
        } else if (error) {
          console.error('Erro ao gerar url assinada:', error);
        }
      }
    }

    const userPromptText = buildAutoNoteUserPrompt(
      currentRecordText,
      transcriptionText || null,
      null
    );

    const contentParts: any[] = [{ type: 'text', text: userPromptText }];

    for (const url of publicImageUrls) {
      contentParts.push({ type: 'image', image: url });
    }

    const messages: any[] = [
      {
        role: 'user',
        content: contentParts,
      },
    ];

    const result = streamText({
      model: withFallback(
        openrouter.chat('google/gemma-4-31b-it:free'),
        openrouter.chat('google/gemma-4-31b-it'),
        openrouter.chat('google/gemma-4-26b-a4b-it'),
        openrouter.chat('qwen/qwen3.6-35b-a3b'),
        openrouter.chat('google/gemma-3-27b')
      ),
      system: AUTO_NOTE_SYSTEM_PROMPT,
      messages: messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Erro na geração do prontuário:', error);
    return new Response('Erro interno', { status: 500 });
  }
}
