import type { LanguageModel } from 'ai';

/**
 * Encapsula múltiplos modelos de IA com fallback em cascata.
 * Tenta os modelos em ordem e faz fallback automático se o modelo atual falhar
 * na conexão HTTP ou atingir limites de taxa (ex: 429 Rate Limit, 503 Unavailable).
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
        try {
          return await models[i].doStream(options);
        } catch (err) {
          lastError = err;
          console.warn(`[AI Fallback] Modelo ${i} falhou na inicialização do stream (doStream):`, err);
        }
      }
      throw lastError;
    },
  };
}
