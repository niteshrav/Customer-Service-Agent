/**
 * Module: LLM resilience wrapper
 *
 * Retries transient provider/network errors with backoff, then enforces a circuit breaker (reject while open, half-open probe after cooldown).
 * wrapLlmWithResilience(llm, options) returns an object with the same invoke surface.
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Heuristic: provider/network issues worth retrying.
 */
function isTransientLlmError(err) {
  if (!err) return false;
  const status = err.status ?? err.response?.status ?? err.statusCode;
  if (status === 429 || status === 502 || status === 503 || status === 504) return true;
  const code = err.code;
  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "EAI_AGAIN") return true;
  const msg = String(err.message || err).toLowerCase();
  if (msg.includes("timeout") || msg.includes("rate limit") || msg.includes("socket") || msg.includes("network")) return true;
  return false;
}

/**
 * Retry transient failures with exponential backoff; circuit opens after consecutive post-retry failures.
 * Always returns an object shaped like an AIMessage (never throws from invoke).
 */
function wrapLlmWithResilience(
  llm,
  {
    maxAttempts = 3,
    baseDelayMs = 100,
    maxDelayMs = 8000,
    failureThreshold = 5,
    resetTimeoutMs = 60_000,
    fallbackMessage = "The assistant is temporarily unavailable. Please try again in a moment.",
    isTransient = isTransientLlmError,
    telemetry = null,
  } = {}
) {
  if (!llm || typeof llm.invoke !== "function") throw new Error("llm with invoke() is required");

  let consecutiveFailures = 0;
  /** @type {"closed" | "open" | "half_open"} */
  let state = "closed";
  let openedAt = 0;

  return {
    async invoke(input, options) {
      if (state === "open") {
        if (Date.now() - openedAt < resetTimeoutMs) {
          if (telemetry) telemetry.recordCircuitRejection();
          return { content: fallbackMessage, response_metadata: { circuit_open: true } };
        }
        state = "half_open";
      }

      const probeFromHalfOpen = state === "half_open";
      let lastErr = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const out = await llm.invoke(input, options);
          consecutiveFailures = 0;
          state = "closed";
          return out;
        } catch (e) {
          lastErr = e;
          const retryable = isTransient(e) && attempt < maxAttempts;
          if (retryable) {
            if (telemetry) telemetry.recordLlmRetry();
            const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
            const jitter = Math.random() * cap * 0.15;
            await sleep(cap + jitter);
            continue;
          }
          break;
        }
      }

      if (probeFromHalfOpen) {
        state = "open";
        openedAt = Date.now();
        if (telemetry) telemetry.recordCircuitOpen();
      } else {
        consecutiveFailures += 1;
        if (consecutiveFailures >= failureThreshold) {
          state = "open";
          openedAt = Date.now();
          if (telemetry) telemetry.recordCircuitOpen();
        }
      }

      return {
        content: fallbackMessage,
        response_metadata: {
          llm_degraded: true,
          circuit_half_open_failed: probeFromHalfOpen,
          last_error: lastErr ? String(lastErr.message || lastErr).slice(0, 200) : undefined,
        },
      };
    },
  };
}

module.exports = { wrapLlmWithResilience, isTransientLlmError, sleep };
