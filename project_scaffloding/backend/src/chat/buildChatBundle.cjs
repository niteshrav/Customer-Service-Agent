/**
 * Module: Production chat stack factory
 *
 * Async buildChatBundle(pool): wires Gemini or OpenAI LLM + embeddings, optional Redis caches,
 * resilient LLM, RAG, Postgres conversation store, telemetry, daily budget, createChatService.
 */
const {
  createDefaultLlm,
  createDefaultEmbedQuery,
  resolveChatProvider,
  defaultChatModelName,
} = require("./llmProvider.cjs");
const { createPgRagRetriever } = require("./pgRagRetriever.cjs");
const { createQdrantRagRetriever } = require("./qdrantRagRetriever.cjs");
const { createQdrantClientFromEnv } = require("./qdrantClientFactory.cjs");
const { wrapRagRetrieverWithCache } = require("./ragRetrieverCache.cjs");
const { createChatTelemetry } = require("./chatTelemetry.cjs");
const { createDailyTokenBudget } = require("./chatDailyBudget.cjs");
const { createPgChatConversationStore } = require("./pgChatConversationStore.cjs");
const { createChatService } = require("./createChatService.cjs");
const { wrapLlmWithResilience } = require("./llmResilience.cjs");
const { wrapLlmWithTimeout } = require("./llmTimeout.cjs");
const { toAsyncTtlCache, createRedisJsonCache, connectRedisOptional, TtlCache } = require("./chatAsyncCache.cjs");

function parseIntEnv(name, defaultVal) {
  const v = process.env[name];
  if (v === undefined || v === "") return defaultVal;
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : defaultVal;
}

/**
 * Async factory: telemetry, optional Redis caches, resilient LLM, RAG, chat service.
 * @param {import("pg").Pool} pool
 * @param {{ llmFactory?: () => { invoke: (input: unknown, options?: unknown) => Promise<unknown> }, embedQueryFactory?: () => (text: string) => Promise<number[]> }} [options]
 */
async function buildChatBundle(pool, options = {}) {
  const provider = resolveChatProvider();
  const modelName = defaultChatModelName(provider);
  const llmFactory = options.llmFactory ?? (() => createDefaultLlm());
  const embedQueryFactory = options.embedQueryFactory ?? (() => createDefaultEmbedQuery());

  console.log(`[chat] provider=${provider} model=${modelName}`);

  const telemetry = createChatTelemetry();
  const maxHistory = parseIntEnv("CHAT_MAX_HISTORY_MESSAGES", 16);
  const historyPriorSummaryMaxChars = parseIntEnv("CHAT_HISTORY_PRIOR_SUMMARY_MAX_CHARS", 1500);
  const responseTtl = parseIntEnv("CHAT_RESPONSE_CACHE_TTL_MS", 300_000);
  const embedTtl = parseIntEnv("CHAT_EMBED_CACHE_TTL_MS", 120_000);
  const retrievalTtl = parseIntEnv("CHAT_RETRIEVAL_CACHE_TTL_MS", 120_000);
  const maxEntries = parseIntEnv("CHAT_CACHE_MAX_ENTRIES", 500);
  const dailyBudgetLimit = parseIntEnv("CHAT_DAILY_TOKEN_BUDGET_PER_KEY", 0);
  const promptVersion = (process.env.CHAT_PROMPT_VERSION && String(process.env.CHAT_PROMPT_VERSION).trim()) || "v1";

  const redisUrl = process.env.REDIS_URL && String(process.env.REDIS_URL).trim();
  const redisClient = await connectRedisOptional(redisUrl);

  let responseCache = null;
  if (responseTtl > 0) {
    if (redisClient) {
      const rc = createRedisJsonCache(redisClient, "csa:chat:resp:", responseTtl);
      responseCache = { get: (k) => rc.get(k), set: (k, v) => rc.set(k, v) };
    } else {
      const rc = new TtlCache({ defaultTtlMs: responseTtl, maxEntries });
      const asyncRc = toAsyncTtlCache(rc);
      responseCache = { get: (k) => asyncRc.get(k), set: (k, v) => asyncRc.set(k, v) };
    }
  }

  const llmFallbackMessage =
    (process.env.CHAT_LLM_FALLBACK_MESSAGE && String(process.env.CHAT_LLM_FALLBACK_MESSAGE).trim()) ||
    "The assistant is temporarily unavailable. Please try again in a moment.";

  const timedLlm = wrapLlmWithTimeout(llmFactory(), {
    timeoutMs: parseIntEnv("CHAT_LLM_TIMEOUT_MS", 15_000),
  });
  const llm = wrapLlmWithResilience(timedLlm, {
    maxAttempts: parseIntEnv("CHAT_LLM_RETRY_MAX_ATTEMPTS", 2),
    baseDelayMs: parseIntEnv("CHAT_LLM_RETRY_BASE_MS", 100),
    maxDelayMs: parseIntEnv("CHAT_LLM_RETRY_MAX_MS", 8000),
    failureThreshold: parseIntEnv("CHAT_CIRCUIT_FAILURE_THRESHOLD", 5),
    resetTimeoutMs: parseIntEnv("CHAT_CIRCUIT_RESET_MS", 60_000),
    fallbackMessage: llmFallbackMessage,
    telemetry,
  });

  const corpusVersion = (process.env.RAG_CORPUS_VERSION && String(process.env.RAG_CORPUS_VERSION).trim()) || "v1";
  const qdrantUrl = process.env.QDRANT_URL && String(process.env.QDRANT_URL).trim();
  const qdrantKey = process.env.QDRANT_API_KEY && String(process.env.QDRANT_API_KEY).trim();
  const useQdrant = Boolean(qdrantUrl && qdrantKey);

  let ragRetriever = null;
  try {
    const embedQuery = embedQueryFactory();
    let base;
    if (useQdrant) {
      const qClient = createQdrantClientFromEnv();
      const collectionName =
        (process.env.QDRANT_COLLECTION && String(process.env.QDRANT_COLLECTION).trim()) || "csa_rag";
      base = createQdrantRagRetriever({
        client: qClient,
        collectionName,
        embedQuery,
        corpusVersion,
      });
    } else {
      base = createPgRagRetriever({ pool, embedQuery });
    }
    let embedCache;
    let retrievalCache;
    if (redisClient) {
      embedCache = createRedisJsonCache(redisClient, "csa:chat:emb:", embedTtl);
      retrievalCache = createRedisJsonCache(redisClient, "csa:chat:ret:", retrievalTtl);
    } else {
      embedCache = toAsyncTtlCache(new TtlCache({ defaultTtlMs: embedTtl, maxEntries }));
      retrievalCache = toAsyncTtlCache(new TtlCache({ defaultTtlMs: retrievalTtl, maxEntries }));
    }
    ragRetriever = wrapRagRetrieverWithCache(base, {
      embedCache,
      retrievalCache,
      corpusVersion,
      telemetry,
    });
  } catch (e) {
    console.warn("[chat] RAG retriever disabled:", e?.message || e);
  }

  const dailyBudget = createDailyTokenBudget({ maxTokensPerDay: dailyBudgetLimit });
  const conversationStore = createPgChatConversationStore({ pool });

  const chatService = createChatService({
    llm,
    conversationStore,
    ragRetriever,
    responseCache,
    telemetry,
    dailyBudget,
    maxHistoryMessages: maxHistory,
    historyPriorSummaryMaxChars,
    llmModelName: modelName,
    promptVersion,
    llmFallbackMessage,
  });

  async function close() {
    if (redisClient) {
      try {
        await redisClient.quit();
      } catch {
        /* ignore */
      }
    }
  }

  return { chatService, telemetry, redisClient, close, provider, modelName };
}

module.exports = { buildChatBundle };
