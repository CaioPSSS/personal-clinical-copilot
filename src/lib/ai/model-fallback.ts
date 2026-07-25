import type { LanguageModel } from 'ai';

/**
 * Encapsula dois modelos de IA. Tenta o modelo primário e faz fallback automático para o secundário em caso de falha ou erro de taxa de requisição.
 */
export function withFallback(
  primary: LanguageModel | any,
  fallbackModel: LanguageModel | any
): any {
  return {
    ...primary,
    async doGenerate(options: any) {
      try {
        return await primary.doGenerate(options);
      } catch (err) {
        console.warn('[AI Fallback] Modelo primário falhou, tentando fallback:', err);
        return await fallbackModel.doGenerate(options);
      }
    },
    async doStream(options: any) {
      try {
        return await primary.doStream(options);
      } catch (err) {
        console.warn('[AI Fallback] Modelo primário falhou no stream, tentando fallback:', err);
        return await fallbackModel.doStream(options);
      }
    },
  };
}
