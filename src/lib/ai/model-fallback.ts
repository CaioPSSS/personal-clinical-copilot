import type { LanguageModel } from 'ai';

/**
 * Encapsula múltiplos modelos de IA com fallback em cascata rápido e direto.
 * Tenta os modelos em ordem. Se o modelo atual falhar na conexão HTTP (ex: 429 Rate Limit, 503 Unavailable),
 * ele salta imediatamente para o próximo modelo da lista sem descartar respostas nem desperdiçar tempo/créditos.
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
          return res;
        } catch (err) {
          lastError = err;
          console.warn(`[AI Fallback] Modelo ${i} falhou em doGenerate:`, err);
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
          console.warn(`[AI Fallback] Modelo ${i} falhou em doStream:`, err);
        }
      }
      throw lastError;
    },
  };
}
