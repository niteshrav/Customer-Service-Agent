/**
 * Role-specific dashboard copy and styling tokens for demo personas.
 */
export function getDashboardTheme(role) {
  const isManagement = role === "lead" || role === "admin";

  if (role === "customer") {
    return {
      heroClass: "dash-hero--customer",
      kicker: "Customer workspace",
      headline: "Customer dashboard",
      blurb:
        "Submit questions, follow resolution progress, and approve when your issue is addressed.",
      listTitle: "Your inquiries",
      aiTip:
        "Ask CSA Assistant how customer approval works, or switch to RAG for workflow docs with Sources.",
      quickActions: [
        { id: "submit", label: "New inquiry", hint: "Scroll to form" },
        { id: "awaiting", label: "Awaiting approval", hint: "Filter ready items" },
      ],
    };
  }

  if (isManagement) {
    return {
      heroClass: "dash-hero--management",
      kicker: "Management overview",
      headline: "Management dashboard",
      blurb:
        "Monitor inquiry volume, unassigned queue depth, and resolution health across the org.",
      listTitle: "Inquiries",
      aiTip:
        "Use RAG mode in AI Chat for playbook-backed guidance on escalation and closure policies.",
      quickActions: [
        { id: "open", label: "Open queue", hint: "Active work" },
        { id: "awaiting", label: "Pending approval", hint: "Customer sign-off" },
        { id: "all", label: "All inquiries", hint: "Full org list" },
      ],
    };
  }

  return {
    heroClass: "dash-hero--agent",
    kicker: "Agent workspace",
    headline: "Agent dashboard",
    blurb:
      "Work assigned inquiries, update the thread, and move cases toward customer approval.",
    listTitle: "My bucket",
    aiTip:
      "Try RAG for “What should an agent do first?” — answers include Sources from the agent playbook.",
    quickActions: [
      { id: "open", label: "Open cases", hint: "Needs work" },
      { id: "in_progress", label: "In progress", hint: "Identified issues" },
      { id: "awaiting", label: "Awaiting approval", hint: "Customer pending" },
    ],
  };
}

export function roleNavLabel(role) {
  if (role === "customer") return "Customer";
  if (role === "agent") return "Agent";
  if (role === "lead") return "Management";
  if (role === "admin") return "Admin";
  return "User";
}
