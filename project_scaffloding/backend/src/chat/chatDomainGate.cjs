/**
 * Module: Chat domain gate (topic routing)
 *
 * Decides if a question may proceed to the model: greetings and disallowed topics short-circuit with fixed copy;
 * persona/product/workflow UX and customer-service domain pass through. Exports domainGate and classifier helpers for tests.
 */
function normalize(q) {
  return String(q || "").trim().toLowerCase();
}

/** Friendly pivot for short social openers (still no LLM — keeps scope clear). */
const MSG_GREETING =
  "Hi — I'm doing well. I'm scoped to this app's customer service flows: inquiries, approvals, and timelines. What would you like to know about those?";

/** Login / API / implementation questions — distinct from generic off-topic. */
const MSG_AUTH_TECH =
  "I can't help with login steps, passwords, or technical implementation details in chat. Use the Sign in or Register pages for account access.";

/** Weather, trivia, etc. — not the same copy as greetings or auth. */
const MSG_OFF_TOPIC =
  "That topic is outside what I cover here. Ask about customer inquiries, issue resolution, customer approval, or timelines instead.";

function isCasualGreetingOrSocial(q) {
  const t = String(q || "")
    .trim()
    .replace(/\s+/g, " ");
  if (t.length > 96) return false;
  const n = t.toLowerCase();
  if (/^(hi|hello|hey|howdy|yo)\s*[!?.]*$/i.test(n)) return true;
  if (/^(hi|hello|hey)\s*[,!\s]+(there|everyone|team)\s*[!?.]*$/i.test(n)) return true;
  if (/^how (are )?you(\s+doing)?\s*\??[!?.]*$/i.test(n)) return true;
  if (/^(hi|hello|hey)\b[,!\s]+how (are )?you/.test(n)) return true;
  if (/^(hi|hello|hey)\b[,!\s]+how'?s it going/.test(n)) return true;
  if (/^(hi|hello|hey)\b[,!\s]+how you doing/.test(n)) return true;
  if (/^how'?s it going\s*\??[!?.]*$/i.test(n)) return true;
  if (/^what'?s up\s*\??[!?.]*$/i.test(n)) return true;
  if (/^good (morning|afternoon|evening)\b/i.test(n) && n.length < 48) return true;
  if (/^(thanks|thank you|thx|ty)\s*[!?.]*$/i.test(n)) return true;
  if (/^(bye|goodbye|see you)\s*[!?.]*$/i.test(n) && n.length < 32) return true;
  return false;
}

function hasForbiddenAuthOrTechDetails(q) {
  // We block login/account/API/implementation details (no URLs, endpoints, tokens, keys, etc.)
  return (
    /(authorization|bearer)\s*/.test(q) ||
    /\btoken\b/.test(q) ||
    /\bapi\b/.test(q) ||
    /\bendpoint\b/.test(q) ||
    /\bheader\b/.test(q) ||
    /\benv\b/.test(q) ||
    /\bapi key\b/.test(q) ||
    /\bopenai\b/.test(q) ||
    /\blangchain\b/.test(q) ||
    /\bpassword\b/.test(q) ||
    /\blogin\b/.test(q) ||
    /\bsign in\b/.test(q) ||
    /\bregister\b/.test(q) ||
    /\bimplementation\b/.test(q) ||
    /\bhow (the )?system\b/.test(q) ||
    /\bsystem prompt\b/.test(q) ||
    /\bsql\b/.test(q) ||
    /\bbackend code\b/.test(q)
  );
}

/**
 * Meta / persona / app entry questions answered by the model using the CSA Assistant persona
 * (not hard-coded guardrails). Checked before auth-tech and off-domain rules.
 */
function isPersonaMetaNavigationOrOnboarding(question) {
  const q = normalize(question);
  if (q.length > 220) return false;

  if (
    /\bwhat (are )?you\b/.test(q) ||
    /\bwho are you\b/.test(q) ||
    /\b(your name|what('?s| is) your name)\b/.test(q) ||
    /\bwhat do you do\b/.test(q) ||
    /\bwhat can you (do|help)\b/.test(q) ||
    /\bhow can you help\b/.test(q) ||
    /\btell me about (you|yourself)\b/.test(q)
  ) {
    return true;
  }

  if (
    /\benter the app\b/.test(q) ||
    /\b(get|gain) access to (the )?app\b/.test(q) ||
    /\bwhat should i do to enter\b/.test(q) ||
    /\bhow (do i|to|can i) (start|get started|begin( here)?)\b/.test(q) ||
    /\bfirst time (here|using (the )?app)\b/.test(q) ||
    /\bhow (do i|to) use (this )?app\b/.test(q) ||
    /\bwhere (do i|to|can i) (go to )?(sign in|log ?in|login|register)\b/.test(q) ||
    /\bhow (do i|to) (sign in|log ?in|login)\b/.test(q) ||
    /\bhow (do i|to) (sign up|register|create (an )?account)\b/.test(q)
  ) {
    return true;
  }

  return false;
}

/**
 * High-level “what is this product / how do I use it” questions (non-technical).
 * Composed with {@link isPersonaMetaNavigationOrOnboarding} as {@link allowsNonTechnicalAppGuidance}.
 */
function isGeneralProductOnboardingQuestion(question) {
  const q = normalize(question);
  if (q.length > 280) return false;

  if (
    /\bwhat (is|does) (this|the) (app|application|site|product|tool)\b/.test(q) ||
    /\bwhat is this (app|application|site) (for|about)\b/.test(q) ||
    /\bwhat can i (do here|do in this app|use this (app )?for)\b/.test(q) ||
    /\bwhat can i do on (this|the) (page|screen|home|login|dashboard)\b/.test(q) ||
    /\bwhat (is|does) (this|the) (page|screen)\b/.test(q) ||
    /\b(explain|describe) (this|the) (page|screen)\b/.test(q) ||
    /\bhow (do i|to|does one) use (this )?(app|application|site)\b/.test(q) ||
    /\bpurpose of (this )?(app|application|tool|site)\b/.test(q) ||
    /\b(explain|describe|overview|summary|introduction) (of |to )?(this )?(the )?(app|application|product|site)\b/.test(q) ||
    /\b(customer service agent|csa (assistant|app))\b/.test(q) ||
    /\bwhat (are|is) (the )?(main )?features (of|in) (this|the) (app|application)\b/.test(q) ||
    /\bwhat (pages|screens|areas) (does|can|do) (this|the) (app|application)\b/.test(q) ||
    /\bwhat is (the )?dashboard\b/.test(q) ||
    /\bwhere (do i|to|can i) (find|go for)\b/.test(q) &&
      /\b(dashboard|inquir|account|register|sign in|home|help)\b/.test(q) ||
    /\bdo i need (an )?account\b/.test(q) ||
    /\bwhy (do i|should i) (register|sign up|sign in|log ?in)\b/.test(q) ||
    /\bpassword (policy|requirements|rules)\b/.test(q) ||
    /\bstrong password\b/.test(q) ||
    /\bwhat (kind of|is a) (good )?password\b/.test(q) ||
    /\bhow (does|do) (the )?(app )?work\b/.test(q) ||
    /\bis this (app )?(safe|secure)\b/.test(q)
  ) {
    return true;
  }

  if (/\bwho (is this (app )?for|can use (this|the app))\b/.test(q)) return true;

  return false;
}

/** Pass domain gate to LLM: persona/meta/onboarding plus general product help (still no technical/auth bypass). */
function allowsNonTechnicalAppGuidance(question) {
  return isPersonaMetaNavigationOrOnboarding(question) || isGeneralProductOnboardingQuestion(question);
}

/**
 * In-app workflow / UX questions (non-technical) that should get CSA Assistant persona answers on any page.
 * Complements {@link isAllowedCustomerServiceDomain} for surfaces like dashboard metrics and step-by-step flows.
 */
function isPersonaWorkflowOrAppSurfaceQuestion(question) {
  const q = normalize(question);
  if (q.length > 320) return false;

  if (/\bwhat (are|is|do) (the )?(dashboard )?metrics\b/.test(q)) return true;
  if (/\bhow (do i|to|can i) (use|navigate|get to|open) (the )?dashboard\b/.test(q)) return true;
  if (/\bwhat does (the )?dashboard (show|display|tell)\b/.test(q)) return true;

  if (
    /\bmetrics\b/.test(q) &&
    (/(inquir|inquiries|inquiry)\b/.test(q) || /\b(dashboard|operational|volume|outcome|status)\b/.test(q))
  ) {
    return true;
  }

  if (
    /\b(step|steps|walk ?me through|walkthrough)\b/.test(q) &&
    (/(inquir|inquiries|inquiry)\b/.test(q) ||
      /\b(approval|resolution|close|closed|dashboard|this app|customer service)\b/.test(q))
  ) {
    return true;
  }

  if (
    /\bhow does (the )?(workflow|process) work\b/.test(q) &&
    (/(inquir|inquiries|inquiry)\b/.test(q) || /\b(approval|resolution|this app|customer)\b/.test(q))
  ) {
    return true;
  }

  if (
    /\bwhat (should i|do i) do (first|next)\b/.test(q) &&
    (/(inquir|inquiries|inquiry)\b/.test(q) || /\b(agent|dashboard|this app)\b/.test(q))
  ) {
    return true;
  }

  return false;
}

/** Widen persona path: onboarding/product plus explicit in-app workflow UX (any page). */
function allowsPersonaOrWorkflowGuidance(question) {
  return allowsNonTechnicalAppGuidance(question) || isPersonaWorkflowOrAppSurfaceQuestion(question);
}

function isProtectedInquiryAccessIntent(q) {
  // Guest asking to view/list/open protected inquiry/CRM features.
  return (
    /(show|view|list|open|access|my)\b/.test(q) &&
    /(inquiry|inquiries|inquir|crm|dashboard|message|messages|approve|resolve)/.test(q)
  );
}

function isAllowedCustomerServiceDomain(q) {
  // Allow only customer service inquiry handling / approval workflow / timeline concepts.
  return (
    /(timeline|history|chronological|events)\b/.test(q) ||
    /(issue addressed|issue_addressed|customer approval|customer_approved|approved)\b/.test(q) ||
    /\bclosed\b/.test(q) ||
    /\bresolved\b/.test(q) ||
    /(inquir|inquiries|inquiry)\b/.test(q) ||
    /(crm context|customer id|customer_id)\b/.test(q) ||
    /(send response|responses|message|messages|my bucket|open queries|closed queries)\b/.test(q) ||
    /(approve resolution|approve|resolution)/.test(q)
  );
}

/**
 * Domain gate short-circuit:
 * - If question is protected access intent for a guest -> short-circuit sign-in message
 * - Casual greetings -> short-circuit friendly pivot (no LLM)
 * - If {@link allowsPersonaOrWorkflowGuidance} -> pass through to LLM (persona + product/onboarding/workflow UX)
 * - If question contains login/account/API/implementation details -> short-circuit refusal
 * - If question is outside allowed customer-service domain -> short-circuit refusal
 *
 * @param {{ question: string, role: string }} input
 * @returns {{ shortCircuit: true, reply: string } | { shortCircuit: false }}
 */
function domainGate({ question, role }) {
  const q = normalize(question);
  const isGuest = role === "guest";

  if (isGuest && isProtectedInquiryAccessIntent(q)) {
    return { shortCircuit: true, reply: "Sign in first to access inquiry features." };
  }

  if (isCasualGreetingOrSocial(question)) {
    return { shortCircuit: true, reply: MSG_GREETING };
  }

  if (allowsPersonaOrWorkflowGuidance(question)) {
    return { shortCircuit: false };
  }

  if (hasForbiddenAuthOrTechDetails(q)) {
    return { shortCircuit: true, reply: MSG_AUTH_TECH };
  }

  if (!isAllowedCustomerServiceDomain(q)) {
    return { shortCircuit: true, reply: MSG_OFF_TOPIC };
  }

  return { shortCircuit: false };
}

module.exports = {
  domainGate,
  MSG_GREETING,
  MSG_AUTH_TECH,
  MSG_OFF_TOPIC,
  isCasualGreetingOrSocial,
  isPersonaMetaNavigationOrOnboarding,
  isGeneralProductOnboardingQuestion,
  allowsNonTechnicalAppGuidance,
  isPersonaWorkflowOrAppSurfaceQuestion,
  allowsPersonaOrWorkflowGuidance,
};

