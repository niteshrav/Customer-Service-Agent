/**
 * Module: LLM invoke timeout — fail fast so resilience can retry or fall back.
 */

function wrapLlmWithTimeout(llm, { timeoutMs = 45_000 } = {}) {
  if (!llm || typeof llm.invoke !== "function") throw new Error("llm with invoke() is required");
  const ms = Number(timeoutMs);
  const limit = Number.isFinite(ms) && ms > 0 ? ms : 45_000;

  return {
    async invoke(input, options) {
      let timer;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error(`LLM invoke timed out after ${limit}ms`);
          err.code = "ETIMEDOUT";
          reject(err);
        }, limit);
      });
      try {
        return await Promise.race([llm.invoke(input, options), timeout]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

module.exports = { wrapLlmWithTimeout };
