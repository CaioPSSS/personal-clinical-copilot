import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // Converter o arquivo para um buffer/base64
    const buffer = Buffer.from(await file.arrayBuffer());

    // Fazer a chamada ao modelo de visão gratuito do OpenRouter
    const { text } = await generateText({
      model: openrouter.chat('meta-llama/llama-3.2-11b-vision-instruct:free'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Descreva detalhadamente o conteúdo desta imagem médica ou página de prontuário. Se houver texto (exames, receitas, anotações clínicas), transcreva tudo com precisão. Retorne APENAS o texto transcrito e a descrição clínica útil.',
            },
            {
              type: 'image',
              image: buffer,
            },
          ],
        },
      ],
    });

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Erro na análise da imagem:', error);
    return NextResponse.json({ error: error.message || 'Falha na análise da imagem.' }, { status: 500 });
  }
}
