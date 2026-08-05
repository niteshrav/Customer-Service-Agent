/**
 * Module: Chat history compression
 *
 * When message count exceeds maxMessages, replaces older turns with one truncated summary line; keeps recent tail for the LLM context window.
 *
 * @param {Array<{ role: string, content: string }>} messages ordered oldest-first
 * @param {{ maxMessages?: number, maxPriorSummaryChars?: number }} opts
 */
function compressHistoryRows(messages, { maxMessages = 16, maxPriorSummaryChars = 1500 } = {}) {
  const list = Array.isArray(messages) ? messages : [];
  if (list.length <= maxMessages) return list;

  const reserved = 1;
  const tailCount = maxMessages - reserved;
  const tail = list.slice(-tailCount);
  const head = list.slice(0, list.length - tailCount);
  const body = head.map((m) => `${m.role}: ${m.content}`).join("\n");
  const truncated =
    body.length > maxPriorSummaryChars
      ? `${body.slice(0, Math.max(0, maxPriorSummaryChars - 20))}\n...[truncated]`
      : body;

  return [{ role: "user", content: `[Earlier in this conversation]\n${truncated}` }, ...tail];
}

module.exports = { compressHistoryRows };
