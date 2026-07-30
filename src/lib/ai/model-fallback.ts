import type { LanguageModel } from 'ai';

/**
 * Encapsula múltiplos modelos de IA com fallback em cascata inteligente.
 * Tenta os modelos em ordem e faz fallback automático se:
 * 1. O modelo falhar na inicialização/chamada (ex: 429 Rate Limit, 503 Unavailable).
 * 2. O modelo responder com texto/resultado vazio (ex: 0 tokens / resposta em branco).
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
          const res = await models[i].doGenerate(options);
          // Verificar se o modelo gerou texto não-vazio
          if (res && res.text && res.text.trim().length > 0) {
            return res;
          }
          console.warn(`[AI Fallback] Modelo ${i} (${models[i].modelId || 'desconhecido'}) retornou resposta sem texto. Tentando próximo modelo...`);
        } catch (err) {
          lastError = err;
          console.warn(`[AI Fallback] Modelo ${i} falhou em doGenerate:`, err);
        }
      }
      if (lastError) throw lastError;
      throw new Error('[AI Fallback] Nenhum modelo retornou texto válido.');
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
              break;
            }

            if (value.type === 'error') {
              break;
            }
          }

          if (!hasContent) {
            console.warn(
              `[AI Fallback] Modelo ${i} (${currentModel.modelId || 'desconhecido'}) encerrou stream sem conteúdo. Tentando próximo modelo...`
            );
            reader.releaseLock();
            continue;
          }

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
