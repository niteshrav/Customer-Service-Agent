/**
 * Maps fetch/API failures to user-friendly chat copy (no raw "Failed to fetch").
 */
export function formatChatError(err) {
  if (err?.name === "AbortError") {
    return "Request cancelled or timed out. Try again — demo chips like “What is this app for?” answer instantly.";
  }
  const msg = String(err?.message || "").trim();
  if (!msg || msg === "Failed to fetch" || err?.name === "TypeError") {
    return "Could not reach the assistant. Check that the backend is running (port 3101), then try again.";
  }
  if (/GEMINI_API_KEY|google.*api.?key/i.test(msg)) {
    return "The assistant is not configured yet. Add GEMINI_API_KEY in backend/.env and restart the API.";
  }
  if (/OPENAI_API_KEY|not set/i.test(msg)) {
    return "The assistant is not configured yet. Add OPENAI_API_KEY or GEMINI_API_KEY in backend/.env and restart the API.";
  }
  if (/Daily assistant token limit|budget/i.test(msg)) {
    return "Daily assistant token limit reached. Try again tomorrow, or ask an admin to raise the limit.";
  }
  if (/temporarily unavailable/i.test(msg)) {
    return "The AI model is busy right now. Try again in a moment, or switch to RAG — retrieved Sources may still answer your question.";
  }
  return msg;
}
