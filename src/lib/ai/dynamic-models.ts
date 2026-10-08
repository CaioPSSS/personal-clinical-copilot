import { openrouter, createClinicalModel } from './models-config';

// Preços padrão por 1M de tokens (prompt + completion) como fallback offline
const DEFAULT_PRICES: Record<string, number> = {
  'openai/gpt-6-luna': 0.35,
  'xiaomi/mimo-v2.6-pro': 1.30,
  'deepseek/deepseek-v4.1-flash': 0.27,
  'anthropic/claude-haiku-5.5': 0.35,
};

let cachedPrices: { data: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // Cache de 1 hora

async function getOpenRouterPrices(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedPrices && now - cachedPrices.timestamp < CACHE_TTL_MS) {
    return cachedPrices.data;
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const prices: Record<string, number> = { ...DEFAULT_PRICES };

    if (json.data && Array.isArray(json.data)) {
      for (const item of json.data) {
        if (item.id && item.pricing) {
          const promptPrice = parseFloat(item.pricing.prompt || '0') * 1000000;
          const completionPrice = parseFloat(item.pricing.completion || '0') * 1000000;
          prices[item.id] = promptPrice + completionPrice;
        }
      }
    }

    cachedPrices = { data: prices, timestamp: now };
    return prices;
  } catch (err) {
    console.warn('[OpenRouter Pricing] Falha ao buscar preços dinâmicos, utilizando fallback padrão:', err);
    return DEFAULT_PRICES;
  }
}

/**
 * Seleciona dinamicamente a ordem dos modelos para conduta clínica com base nos preços em tempo real da OpenRouter.
 * Regras:
 * 1. Escolhe o menor preço entre Luna, MiniMax M3 e DeepSeek V4 Pro como 1ª opção.
 * 2. Qualquer modelo do trio (Luna/MiniMax) que for MAIS BARATO que o DeepSeek V4 Pro entra ANTES dele.
 * 3. O DeepSeek V4 Flash entra imediatamente ANTES de qualquer modelo que for MAIS CARO que o DeepSeek V4 Pro.
 */
export async function getDynamicConductModels(): Promise<any[]> {
  const prices = await getOpenRouterPrices();

  const lunaId = 'openai/gpt-6-luna';
  const mimoId = 'xiaomi/mimo-v2.6-pro';
  const haikuId = 'anthropic/claude-haiku-5.5';
  const flashId = 'deepseek/deepseek-v4.1-flash';

  const getPrice = (id: string) => prices[id] ?? DEFAULT_PRICES[id] ?? 999;

  // 1. Ordenar o grupo principal pelo menor preço
  const mainGroup = [lunaId, haikuId, mimoId].sort(
    (a, b) => getPrice(a) - getPrice(b)
  );

  const mimoPrice = getPrice(mimoId);
  const resultModelIds: string[] = [];
  let flashInserted = false;

  // 2. Inserir Flash imediatamente antes de qualquer modelo mais caro que o MiMo Pro
  for (const modelId of mainGroup) {
    if (!flashInserted && getPrice(modelId) > mimoPrice) {
      resultModelIds.push(flashId);
      flashInserted = true;
    }
    resultModelIds.push(modelId);
  }

  // Se nenhum modelo for mais caro que o MiMo Pro, o Flash entra no final
  if (!flashInserted) {
    resultModelIds.push(flashId);
  }

  console.log(
    '[Dynamic Models] Sequência calculada dinamicamente:',
    resultModelIds.map((id) => `${id} ($${getPrice(id).toFixed(2)}/M)`).join(' -> ')
  );

  return resultModelIds.map((id) => createClinicalModel(id));
}
