import type { LanguageModel } from 'ai';

/**
 * Encapsula múltiplos modelos de IA com fallback em cascata e retentativas duplas (2x por modelo).
 * Tenta até 2 vezes cada modelo. Se o modelo falhar (HTTP error) ou retornar texto vazio/0 tokens,
 * aguarda 250ms e tenta novamente antes de saltar para o próximo modelo da lista.
 */
export function withFallback(...args: any[]): any {
  const models = args.filter(Boolean);

  if (models.length === 0) {
    throw new Error('[AI Fallback] Nenhum modelo fornecido.');
  }

  if (models.length === 1) {
    return models[0];
  }

  const RETRIES_PER_MODEL = 2;

  return {
    ...models[0],
    async doGenerate(options: any) {
      let lastError: any;
      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        const modelName = model.modelId || `Modelo ${i}`;

        for (let attempt = 1; attempt <= RETRIES_PER_MODEL; attempt++) {
          try {
            const res = await model.doGenerate(options);
            if (res && res.text && res.text.trim().length > 0) {
              return res;
            }
            console.warn(
              `[AI Fallback] ${modelName} (tentativa ${attempt}/${RETRIES_PER_MODEL}) retornou texto vazio.`
            );
          } catch (err) {
            lastError = err;
            console.warn(
              `[AI Fallback] ${modelName} (tentativa ${attempt}/${RETRIES_PER_MODEL}) falhou:`,
              err
            );
          }

          if (attempt < RETRIES_PER_MODEL) {
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        }
      }
      if (lastError) throw lastError;
      throw new Error('[AI Fallback] Nenhum modelo retornou texto válido após retentativas.');
    },

    async doStream(options: any) {
      let lastError: any;
      for (let i = 0; i < models.length; i++) {
        const currentModel = models[i];
        const isLast = i === models.length - 1;
        const modelName = currentModel.modelId || `Modelo ${i}`;

        for (let attempt = 1; attempt <= RETRIES_PER_MODEL; attempt++) {
          try {
            const result = await currentModel.doStream(options);

            if (isLast && attempt === RETRIES_PER_MODEL) {
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
                `[AI Fallback] ${modelName} (tentativa ${attempt}/${RETRIES_PER_MODEL}) encerrou stream sem conteúdo.`
              );
              reader.releaseLock();
              if (attempt < RETRIES_PER_MODEL) {
                await new Promise((resolve) => setTimeout(resolve, 250));
                continue;
              }
              break; // Pula para o próximo modelo se esgotou as retentativas
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
            console.warn(
              `[AI Fallback] ${modelName} (tentativa ${attempt}/${RETRIES_PER_MODEL}) falhou no doStream:`,
              err
            );
            if (attempt < RETRIES_PER_MODEL) {
              await new Promise((resolve) => setTimeout(resolve, 250));
            }
          }
        }
      }
      throw lastError;
    },
  };
}
