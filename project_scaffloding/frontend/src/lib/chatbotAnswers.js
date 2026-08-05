/**
 * Module: Legacy local chatbot stubs (optional / tests)
 *
 * answerFor maps simple keyword patterns to static help text; primary product chat goes through ChatApi → backend LLM/RAG.
 */
export function answerFor(question, pathname, authed) {
  const q = (question || "").toLowerCase();
  if (!authed && /inquir|crm|dashboard|message|resolve/.test(q)) {
    return "Please login first to access inquiry, CRM, and dashboard features.";
  }
  if (/password|strong/.test(q)) {
    return "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
  }
  if (/register|signup/.test(q)) {
    return "Go to Register, create your account, then you will be redirected to Login with a success message.";
  }
  if (/login|sign in/.test(q)) {
    return "Use your registered email and password. On success, you will be redirected to the dashboard.";
  }
  if (/where am i|page|screen/.test(q)) {
    return `You are currently on ${pathname}.`;
  }
  if (authed) {
    return "You can open an inquiry from Dashboard, view CRM context, and send a response from Inquiry Detail.";
  }
  return "I can help with navigation: Home, Login, Registration, and password requirements.";
}
