/**
 * Module: Instant persona replies for common demo/onboarding chips (no LLM call).
 */
function norm(q) {
  return String(q || "").trim().toLowerCase();
}

function onPage(pathname, prefix) {
  const p = String(pathname || "/");
  return p === prefix || p.startsWith(`${prefix}/`);
}

/**
 * @returns {string|null}
 */
function resolvePersonaQuickReply({ question, pathname, role }) {
  const q = norm(question);

  if (/^what is this app for\??$/.test(q)) {
    return [
      "Customer Service Agent is a demo workspace for handling customer inquiries end-to-end.",
      "Sign in to use the dashboard, view CRM context, message threads, and customer approval.",
      "Open AI Chat anytime: LLM for quick product help, or RAG for doc-grounded answers with Sources.",
    ].join(" ");
  }

  if (/^what is the password policy\??$/.test(q) || /^what (is a|is the) (good )?strong password\??$/.test(q)) {
    return "Passwords must be at least 8 characters and include uppercase, lowercase, a number, and a special character.";
  }

  if (/^how do i use this app\??$/.test(q)) {
    return [
      "Register or sign in, open Dashboard to see inquiries for your role, then open an inquiry for messages and CRM context.",
      "Customers can approve resolution; agents and management work the inquiry queue.",
      "Use AI Chat (LLM or RAG) on any page for guided help.",
    ].join(" ");
  }

  if (/^what does the dashboard show\??$/.test(q)) {
    if (role === "customer") {
      return "Your dashboard lists your inquiries with status, workflow progress, and links to open each thread.";
    }
    if (role === "agent") {
      return "The agent dashboard shows your inquiry bucket, KPI counts, a needs-attention queue, and searchable filters.";
    }
    if (role === "lead" || role === "admin") {
      return "Management sees organization-wide inquiry metrics, open vs resolved counts, and the full inquiry table.";
    }
    return "After sign-in, the dashboard shows inquiry metrics, filters, and your role-scoped inquiry list.";
  }

  if (/^what can i do on this page\??$/.test(q)) {
    if (onPage(pathname, "/login") || onPage(pathname, "/register")) {
      return "On this page you can sign in or register. After login, use Dashboard for inquiries and AI Chat for guided help.";
    }
    if (onPage(pathname, "/dashboard")) {
      return "Search and filter inquiries, review metrics, open inquiry details, and use AI Chat in RAG mode for workflow docs.";
    }
    if (onPage(pathname, "/inquiries")) {
      return "Read the message thread, view CRM customer context, send a response (agent/management), or approve resolution (customer).";
    }
    return "Browse the home overview, sign in to open the inquiry workspace, or ask AI Chat about this page.";
  }

  if (/^when is an inquiry closed\??$/.test(q)) {
    return "An inquiry is closed (resolved) only after the customer approves the resolution — marking issue addressed alone does not close it.";
  }

  if (/^how does customer approval work\??$/.test(q)) {
    return "When an agent marks the issue addressed, the customer reviews the inquiry and approves. Approval sets status to resolved and closes the case.";
  }

  if (/^what should an agent do first\??$/.test(q)) {
    return "Open the assigned inquiry, confirm CRM context, acknowledge the customer in the thread, identify the issue, then work toward resolution before requesting customer approval.";
  }

  return null;
}

module.exports = { resolvePersonaQuickReply };
