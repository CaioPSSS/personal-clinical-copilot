import type { LanguageModel } from 'ai';

/**
 * Encapsula múltiplos modelos de IA com fallback em cascata.
 * Tenta o modelo primário e faz fallback automático para os modelos subsequentes em caso de falha de conexão,
 * ou se o stream for encerrado prematuramente sem emitir nenhum conteúdo.
 */
export function withFallback(...args: any[]): any {
  const models = args.filter(Boolean);

  if (models.length === 0) {
    throw new Error('[AI Fallback] Nenhum modelo fornecido.');
  }

  if (models.length === 1) {
    return models[0];
  }

  return {
    ...models[0],
    async doGenerate(options: any) {
      let lastError: any;
      for (let i = 0; i < models.length; i++) {
        try {
          return await models[i].doGenerate(options);
        } catch (err) {
          lastError = err;
          console.warn(`[AI Fallback] Modelo ${i} falhou em doGenerate, tentando próximo modelo:`, err);
        }
      }
      throw lastError;
    },

    async doStream(options: any) {
      for (let i = 0; i < models.length; i++) {
        const currentModel = models[i];
        const isLast = i === models.length - 1;

        try {
          const result = await currentModel.doStream(options);

          if (isLast) {
            return result;
          }

          // Intercepta a stream para detectar encerramento precoce/sem tokens ou chunk de erro antes de produzir qualquer texto
          const originalStream = result.stream;
          let hasEmittedContent = false;
          let reader: ReadableStreamDefaultReader<any> | null = originalStream.getReader();

          const wrappedStream = new ReadableStream({
            async start(controller) {
              try {
                while (true) {
                  const { done, value } = await reader!.read();
                  if (done) {
                    if (!hasEmittedContent && i < models.length - 1) {
                      console.warn(
                        `[AI Fallback] Modelo ${i} terminou stream sem emitir conteúdo. Executando fallback...`
                      );
                      reader = null;
                      const nextResult = await withFallback(...models.slice(i + 1)).doStream(options);
                      const nextReader = nextResult.stream.getReader();
                      while (true) {
                        const nextChunk = await nextReader.read();
                        if (nextChunk.done) break;
                        controller.enqueue(nextChunk.value);
                      }
                      controller.close();
                      return;
                    }
                    controller.close();
                    return;
                  }

                  if (value.type === 'text-delta' || value.type === 'tool-call') {
                    hasEmittedContent = true;
                  } else if (value.type === 'error' && !hasEmittedContent && i < models.length - 1) {
                    console.warn(
                      `[AI Fallback] Modelo ${i} emitiu chunk de erro antes de emitir conteúdo:`,
                      value.error
                    );
                    reader = null;
                    const nextResult = await withFallback(...models.slice(i + 1)).doStream(options);
                    const nextReader = nextResult.stream.getReader();
                    while (true) {
                      const nextChunk = await nextReader.read();
                      if (nextChunk.done) break;
                      controller.enqueue(nextChunk.value);
                    }
                    controller.close();
                    return;
                  }

                  controller.enqueue(value);
                }
              } catch (streamErr) {
                if (!hasEmittedContent && i < models.length - 1) {
                  console.warn(
                    `[AI Fallback] Modelo ${i} lançou exceção na leitura da stream. Tentando fallback...`,
                    streamErr
                  );
                  try {
                    const nextResult = await withFallback(...models.slice(i + 1)).doStream(options);
                    const nextReader = nextResult.stream.getReader();
                    while (true) {
                      const nextChunk = await nextReader.read();
                      if (nextChunk.done) break;
                      controller.enqueue(nextChunk.value);
                    }
                    controller.close();
                    return;
                  } catch (fallbackErr) {
                    controller.error(fallbackErr);
                  }
                } else {
                  controller.error(streamErr);
                }
              }
            },
            cancel(reason) {
              if (reader) reader.cancel(reason);
            },
          });

          return {
            ...result,
            stream: wrappedStream,
          };
        } catch (err) {
          console.warn(`[AI Fallback] Modelo ${i} falhou na inicialização do stream (doStream):`, err);
          if (isLast) throw err;
        }
      }
    },
  };
}
