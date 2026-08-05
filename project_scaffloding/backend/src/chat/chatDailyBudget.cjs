/**
 * Module: Daily LLM token budget
 *
 * createDailyTokenBudget({ maxTokensPerDay }): per-key UTC-day counter; canProceed/consume used around llm.invoke to cap spend.
 */
function createDailyTokenBudget({ maxTokensPerDay = 0 } = {}) {
  /** @type {Map<string, { day: string, tokens: number }>} */
  const usage = new Map();

  function utcDay() {
    return new Date().toISOString().slice(0, 10);
  }

  function rowFor(key) {
    const d = utcDay();
    let row = usage.get(key);
    if (!row || row.day !== d) {
      row = { day: d, tokens: 0 };
      usage.set(key, row);
    }
    return row;
  }

  return {
    isEnabled: () => Number(maxTokensPerDay) > 0,

    canProceed(key) {
      if (!Number(maxTokensPerDay) || Number(maxTokensPerDay) <= 0) return true;
      const row = rowFor(key);
      return row.tokens < Number(maxTokensPerDay);
    },

    /** Record tokens after a successful LLM call. */
    consume(key, totalTokens) {
      if (!Number(maxTokensPerDay) || Number(maxTokensPerDay) <= 0) return;
      const row = rowFor(key);
      row.tokens += Number(totalTokens) || 0;
    },
  };
}

module.exports = { createDailyTokenBudget };
