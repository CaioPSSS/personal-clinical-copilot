import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { withFallback } from './model-fallback';

/**
 * Cliente OpenRouter configurado centralmente com headers de identificação
 * e política estrita de privacidade de dados clínicos.
 */
export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': 'https://personal-clinical-copilot.local',
    'X-Title': 'Personal Clinical Copilot',
  },
});

/**
 * Roster centralizado de modelos de IA ordenados por especialidade e cascata de fallback.
 * Todos os modelos selecionados operam abaixo do teto de US$ 0,50 / milhão de tokens.
 */
export const AI_MODELS = {
  /**
   * Geração de Prontuário / Evolução Médica:
   * Prioriza altíssima fidelidade textual, formatação estruturada e ausência de alucinações.
   * 1. Claude Haiku 5.5: Topo em seguimento de instruções clínicas e síntese documental em PT-BR.
   * 2. GPT-6 Luna: Excelente raciocínio e aderência a seções obrigatórias.
   * 3. DeepSeek V4.1 Flash: Custo ultra-baixo ($0.27/M) e ótima capacidade clínica geral.
   * 4. MiMo-V2.6-Pro: Modelo MoE 1T parâmetros para tarefas complexas como fallback final.
   */
  NOTE_GENERATION: [
    'anthropic/claude-haiku-5.5',
    'openai/gpt-6-luna',
    'deepseek/deepseek-v4.1-flash',
    'xiaomi/mimo-v2.6-pro',
  ],

  /**
   * Visão Computacional / OCR Clínico:
   * Extração de texto de fotos de prontuários antigos, evoluções manuscritas de plantão e exames.
   * Modelos nativamente multimodais com suporte a imagens em alta resolução.
   */
  IMAGE_ANALYSIS: [
    'anthropic/claude-haiku-5.5',
    'deepseek/deepseek-v4.1-flash',
    'xiaomi/mimo-v2.6-pro',
  ],

  /**
   * Chat Clínico Interativo:
   * Resposta rápida em streaming e capacidade de invocar tools de edição cirúrgica e pesquisa web.
   */
  CHAT: [
    'openai/gpt-6-luna',
    'anthropic/claude-haiku-5.5',
    'deepseek/deepseek-v4.1-flash',
  ],

  /**
   * Conduta Baseada em Evidências:
   * Raciocínio fisiopatológico aprofundado com busca ativa de diretrizes via web search (Exa/Perplexity).
   */
  CONDUCT: [
    'openai/gpt-6-luna',
    'xiaomi/mimo-v2.6-pro',
    'deepseek/deepseek-v4.1-flash',
  ],

  /**
   * Relatório Semanal / Aula Clínica (Job Noturno/Cron):
   * Execução assíncrona com processamento em lote (batch ~50% desconto), fallback para modelo padrão.
   */
  WEEKLY_REPORT: [
    'anthropic/claude-haiku-5.5:batch',
    'anthropic/claude-haiku-5.5',
    'deepseek/deepseek-v4.1-flash',
  ],
} as const;

export type ModelSystemType = keyof typeof AI_MODELS;

/**
 * Cria uma instância de modelo OpenRouter configurada com conformidade LGPD
 * (data_collection: 'deny' para proibir treinamento com dados de saúde do paciente).
 */
export function createClinicalModel(modelId: string, customSettings?: Record<string, any>) {
  return openrouter.chat(modelId, {
    provider: {
      data_collection: 'deny',
    },
    ...customSettings,
  });
}

/**
 * Retorna uma cadeia de modelos com fallback automático entre os modelos do sistema configurado.
 */
export function getModelChain(
  modelIds: readonly string[] | string[],
  customSettings?: Record<string, any>
) {
  const models = modelIds.map((id) => createClinicalModel(id, customSettings));
  return withFallback(...models);
}
