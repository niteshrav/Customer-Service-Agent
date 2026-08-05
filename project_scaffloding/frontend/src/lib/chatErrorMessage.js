/**
 * Maps fetch/API failures to user-friendly chat copy (no raw "Failed to fetch").
 */
export function formatChatError(err) {
  const msg = String(err?.message || "").trim();
  if (!msg || msg === "Failed to fetch" || err?.name === "TypeError") {
    return "Could not reach the assistant. Check that the backend is running (port 3101), then try again.";
  }
  if (/OPENAI_API_KEY|not set/i.test(msg)) {
    return "The assistant is not configured yet. Add OPENAI_API_KEY in backend/.env and restart the API.";
  }
  return msg;
}
