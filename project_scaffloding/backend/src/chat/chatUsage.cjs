/**
 * Module: LLM usage extraction and cost estimate
 *
 * extractUsageFromAiMessage reads LangChain usage_metadata / response_metadata; estimateCostUsd applies rough model rates for telemetry.
 */
function extractUsageFromAiMessage(aiMsg) {
  if (!aiMsg || typeof aiMsg !== "object") return null;
  const um = aiMsg.usage_metadata;
  if (um && typeof um === "object") {
    const pt = um.input_tokens ?? um.prompt_tokens;
    const ct = um.output_tokens ?? um.completion_tokens;
    const tt = um.total_tokens;
    if (pt != null || ct != null || tt != null) {
      return {
        prompt_tokens: Number(pt ?? 0),
        completion_tokens: Number(ct ?? 0),
        total_tokens: Number(tt ?? (Number(pt ?? 0) + Number(ct ?? 0))),
      };
    }
  }
  const tu = aiMsg.response_metadata?.tokenUsage;
  if (tu && typeof tu === "object") {
    return {
      prompt_tokens: Number(tu.promptTokens ?? 0),
      completion_tokens: Number(tu.completionTokens ?? 0),
      total_tokens: Number(tu.totalTokens ?? 0),
    };
  }
  return null;
}

/** Rough USD estimate per 1M tokens (adjust when provider pricing changes). */
const MODEL_RATES_USD_PER_1M = {
  "gemini-flash-latest": { input: 0.1, output: 0.4 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
};

function estimateCostUsd(modelName, promptTokens, completionTokens) {
  const key =
    typeof modelName === "string" && MODEL_RATES_USD_PER_1M[modelName] ? modelName : "gemini-flash-latest";
  const r = MODEL_RATES_USD_PER_1M[key];
  const pt = Number(promptTokens) || 0;
  const ct = Number(completionTokens) || 0;
  return (pt / 1e6) * r.input + (ct / 1e6) * r.output;
}

module.exports = { extractUsageFromAiMessage, estimateCostUsd, MODEL_RATES_USD_PER_1M };
