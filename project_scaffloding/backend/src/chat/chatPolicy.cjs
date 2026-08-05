/**
 * Module: Chat policy short-circuit (highest-priority refusals)
 *
 * Blocks prompts that ask for agent internals, implementation extraction, or tech-stack probes before domainGate.
 * policyShortCircuit returns either continue or a fixed refusal reply (no LLM call).
 */
function normalize(q) {
  return String(q || "").trim().toLowerCase();
}

/**
 * Policy short-circuit. If disallowed/protected, return a fixed reply and skip LLM.
 *
 * @param {{ question: string, role: string }} input
 * @returns {{ shortCircuit: true, reply: string } | { shortCircuit: false }}
 */
function policyShortCircuit({ question, role }) {
  const q = normalize(question);

  const asksAgentInternals =
    /agent internals|under the hood|how the agent|system prompt|implementation details|backend code|database schema|sql/i.test(q);

  const asksTechStackOrImplementation =
    /\b(tech stack|technology stack|postgresql|postgres database|what (language|framework)|how is (this|it|the app) built|source code|github repo)\b/i.test(q);

  if (asksTechStackOrImplementation) {
    return {
      shortCircuit: true,
      reply: "I can't share internal agent details.",
    };
  }

  if (asksAgentInternals) {
    return {
      shortCircuit: true,
      reply: "I can't share internal agent details.",
    };
  }

  return { shortCircuit: false };
}

module.exports = { policyShortCircuit };

