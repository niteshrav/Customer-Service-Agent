/**
 * Module: Chat request telemetry (in-memory counters)
 *
 * Records requests, guardrail blocks, LLM calls, cache hits/misses, token totals, latency histograms.
 * snapshot() backs GET /api/chat/metrics when configured.
 */
function createChatTelemetry() {
  const state = {
    requests_total: 0,
    guardrail_blocks: 0,
    llm_invocations: 0,
    response_cache_hits: 0,
    response_cache_misses: 0,
    retrieval_cache_hits: 0,
    retrieval_cache_misses: 0,
    embed_cache_hits: 0,
    embed_cache_misses: 0,
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
    estimated_cost_usd_total: 0,
    budget_blocks: 0,
    llm_retries: 0,
    circuit_opens: 0,
    circuit_rejections: 0,
    mode_llm_total: 0,
    mode_rag_total: 0,
    request_latency_ms_sum: 0,
    request_latency_ms_count: 0,
    request_latency_ms_max: 0,
  };

  return {
    snapshot: () => ({ ...state }),
    recordRequest() {
      state.requests_total += 1;
    },
    recordGuardrailBlock() {
      state.guardrail_blocks += 1;
    },
    recordModeUsage(mode) {
      if (mode === "rag") state.mode_rag_total += 1;
      else state.mode_llm_total += 1;
    },
    recordRequestLatencyMs(ms) {
      const n = Number(ms);
      if (!Number.isFinite(n) || n < 0) return;
      state.request_latency_ms_sum += n;
      state.request_latency_ms_count += 1;
      if (n > state.request_latency_ms_max) state.request_latency_ms_max = n;
    },
    recordLlmInvocation(usage, costUsd) {
      state.llm_invocations += 1;
      if (usage) {
        state.total_prompt_tokens += usage.prompt_tokens || 0;
        state.total_completion_tokens += usage.completion_tokens || 0;
      }
      if (typeof costUsd === "number") state.estimated_cost_usd_total += costUsd;
    },
    recordResponseCacheHit() {
      state.response_cache_hits += 1;
    },
    recordResponseCacheMiss() {
      state.response_cache_misses += 1;
    },
    recordRetrievalCacheHit() {
      state.retrieval_cache_hits += 1;
    },
    recordRetrievalCacheMiss() {
      state.retrieval_cache_misses += 1;
    },
    recordEmbedCacheHit() {
      state.embed_cache_hits += 1;
    },
    recordEmbedCacheMiss() {
      state.embed_cache_misses += 1;
    },
    recordBudgetBlock() {
      state.budget_blocks += 1;
    },
    recordLlmRetry() {
      state.llm_retries += 1;
    },
    recordCircuitOpen() {
      state.circuit_opens += 1;
    },
    recordCircuitRejection() {
      state.circuit_rejections += 1;
    },
  };
}

module.exports = { createChatTelemetry };
