const test = require("node:test");
const assert = require("node:assert/strict");
const {
  domainGate,
  isPersonaMetaNavigationOrOnboarding,
  isGeneralProductOnboardingQuestion,
  allowsNonTechnicalAppGuidance,
  isPersonaWorkflowOrAppSurfaceQuestion,
  allowsPersonaOrWorkflowGuidance,
} = require("../../src/chat/chatDomainGate.cjs");

test("isPersonaMetaNavigationOrOnboarding detects meta / name / capability asks", () => {
  assert.equal(isPersonaMetaNavigationOrOnboarding("What is your name?"), true);
  assert.equal(isPersonaMetaNavigationOrOnboarding("What are you doing?"), true);
  assert.equal(isPersonaMetaNavigationOrOnboarding("Who are you"), true);
  assert.equal(isPersonaMetaNavigationOrOnboarding("What can you help with?"), true);
});

test("isPersonaMetaNavigationOrOnboarding detects app entry and registration phrasing", () => {
  assert.equal(isPersonaMetaNavigationOrOnboarding("What should I do to enter the app"), true);
  assert.equal(isPersonaMetaNavigationOrOnboarding("How to register for the app"), true);
  assert.equal(isPersonaMetaNavigationOrOnboarding("How do I sign in?"), true);
});

test("isPersonaMetaNavigationOrOnboarding is false for unrelated trivia", () => {
  assert.equal(isPersonaMetaNavigationOrOnboarding("Who won the world cup?"), false);
  assert.equal(isPersonaMetaNavigationOrOnboarding("What is the weather in Paris?"), false);
});

test("isGeneralProductOnboardingQuestion detects app overview and safe password-policy asks", () => {
  assert.equal(isGeneralProductOnboardingQuestion("What is this app for?"), true);
  assert.equal(isGeneralProductOnboardingQuestion("What can I do here?"), true);
  assert.equal(isGeneralProductOnboardingQuestion("What can I do on this page?"), true);
  assert.equal(isGeneralProductOnboardingQuestion("Explain this page"), true);
  assert.equal(isGeneralProductOnboardingQuestion("How do I use this application?"), true);
  assert.equal(isGeneralProductOnboardingQuestion("What is the password policy for registration?"), true);
  assert.equal(isGeneralProductOnboardingQuestion("What is the dashboard?"), true);
  assert.equal(isGeneralProductOnboardingQuestion("Who is this app for?"), true);
});

test("domainGate allows page-context demo questions for guests", () => {
  const r = domainGate({ question: "What can I do on this page?", role: "guest" });
  assert.equal(r.shortCircuit, false);
});

test("isGeneralProductOnboardingQuestion is false for unrelated or technical probes", () => {
  assert.equal(isGeneralProductOnboardingQuestion("Who won the world cup?"), false);
  assert.equal(isGeneralProductOnboardingQuestion("What is the REST API URL for login?"), false);
});

test("allowsNonTechnicalAppGuidance unions persona and general product", () => {
  assert.equal(allowsNonTechnicalAppGuidance("What is your name?"), true);
  assert.equal(allowsNonTechnicalAppGuidance("What is this app for?"), true);
  assert.equal(allowsNonTechnicalAppGuidance("Who won the world cup?"), false);
});

test("isPersonaWorkflowOrAppSurfaceQuestion detects dashboard/metrics and step workflows", () => {
  assert.equal(isPersonaWorkflowOrAppSurfaceQuestion("What are the dashboard metrics?"), true);
  assert.equal(isPersonaWorkflowOrAppSurfaceQuestion("How do I use the dashboard?"), true);
  assert.equal(isPersonaWorkflowOrAppSurfaceQuestion("Walk me through closing an inquiry"), true);
  assert.equal(isPersonaWorkflowOrAppSurfaceQuestion("How does the workflow work for approvals in this app?"), true);
});

test("isPersonaWorkflowOrAppSurfaceQuestion is false for unrelated topics", () => {
  assert.equal(isPersonaWorkflowOrAppSurfaceQuestion("What is the weather in Paris?"), false);
  assert.equal(isPersonaWorkflowOrAppSurfaceQuestion("Walk me through baking bread"), false);
});

test("allowsPersonaOrWorkflowGuidance extends product onboarding with workflow UX", () => {
  assert.equal(allowsPersonaOrWorkflowGuidance("What is this app for?"), true);
  assert.equal(allowsPersonaOrWorkflowGuidance("What are the dashboard metrics for inquiries?"), true);
  assert.equal(allowsPersonaOrWorkflowGuidance("Who won the world cup?"), false);
});

test("domainGate lets guests through for persona workflow (not off-topic)", () => {
  const r = domainGate({ question: "How do I navigate the dashboard?", role: "guest" });
  assert.equal(r.shortCircuit, false);
});
