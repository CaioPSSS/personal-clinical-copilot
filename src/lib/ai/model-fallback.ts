import type { LanguageModel } from 'ai';

/**
 * Encapsula múltiplos modelos de IA com fallback em cascata inteligente.
 * Tenta os modelos em ordem e faz fallback automático se:
 * 1. O modelo falhar na inicialização/handshake HTTP (ex: 429 Rate Limit, 503 Unavailable).
 * 2. O stream conectar com HTTP 200 (ex: provedor Crusoe em 29ms), mas encerrar sem produzir nenhum conteúdo (0 tokens/erro).
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
      let lastError: any;
      for (let i = 0; i < models.length; i++) {
        const currentModel = models[i];
        const isLast = i === models.length - 1;

        try {
          const result = await currentModel.doStream(options);

          if (isLast) {
            return result;
          }

          // Inspecionar os primeiros chunks do stream para confirmar a presença de conteúdo real
          const reader = result.stream.getReader();
          const bufferedChunks: any[] = [];
          let hasContent = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            bufferedChunks.push(value);

            if (value.type === 'text-delta' || value.type === 'tool-call') {
              hasContent = true;
              break; // Conteúdo confirmado! Pode encerrar o buffer e transmitir.
            }

            if (value.type === 'error') {
              break; // Stream retornou um objeto de erro
            }
          }

          // Se o stream fechou ou deu erro sem emitir nenhum token de texto/ferramenta:
          if (!hasContent) {
            console.warn(
              `[AI Fallback] Modelo ${i} (${currentModel.modelId || 'desconhecido'}) encerrou stream sem conteúdo (resposta vazia/200 instantâneo). Tentando próximo modelo...`
            );
            reader.releaseLock();
            continue; // Tenta o próximo modelo do fallback!
          }

          // Se houve conteúdo válido, recria o stream retransmitindo o buffer e o restante do leitor
          const passthroughStream = new ReadableStream({
            async start(controller) {
              for (const chunk of bufferedChunks) {
                controller.enqueue(chunk);
              }
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    controller.close();
                    break;
                  }
                  controller.enqueue(value);
                }
              } catch (err) {
                controller.error(err);
              }
            },
            cancel(reason) {
              reader.cancel(reason);
            },
          });

          return {
            ...result,
            stream: passthroughStream,
          };
        } catch (err) {
          lastError = err;
          console.warn(`[AI Fallback] Modelo ${i} falhou na inicialização do stream (doStream):`, err);
          if (isLast) throw err;
        }
      }
      throw lastError;
    },
  };
}
