/**
 * Module: Landing — demo-ready public page with role previews.
 */
import { Link } from "react-router-dom";

const DEMO_ROLES = [
  {
    key: "customer",
    title: "Customer",
    tagline: "Self-service portal",
    icon: "C",
    summary: "Submit inquiries, track resolution, and approve when your issue is addressed.",
    bullets: ["Submit new queries", "Approve addressed cases", "Personal inquiry history"],
    email: "demo-customer@csa.local",
  },
  {
    key: "agent",
    title: "Support agent",
    tagline: "Assigned work bucket",
    icon: "A",
    summary: "Pick up inquiries, reply in-thread, and drive cases toward customer sign-off.",
    bullets: ["Assigned inquiry queue", "CRM + message thread", "Workflow progress flags"],
    email: "demo@csa.local",
  },
  {
    key: "management",
    title: "Management",
    tagline: "Org-wide oversight",
    icon: "M",
    summary: "Monitor KPIs, unassigned queue depth, and resolution health across the organization.",
    bullets: ["Organization metrics", "Unassigned open count", "Search all inquiries"],
    email: "demo-management@csa.local",
  },
];

const CAPABILITIES = [
  { label: "Demo roles", value: "3", hint: "Customer · Agent · Lead" },
  { label: "AI modes", value: "2", hint: "LLM + RAG with Sources" },
  { label: "Workflow steps", value: "4", hint: "Access → Approved" },
  { label: "Stack", value: "Full", hint: "React · Express · Postgres" },
];

const SHOWCASE = [
  {
    index: "01",
    icon: "✦",
    title: "LLM Assistant",
    body: "Context-aware product help on every page — scoped for guests and signed-in operators.",
  },
  {
    index: "02",
    icon: "⎙",
    title: "RAG with Citations",
    body: "Retrieve playbook docs, answer from evidence, and show Sources for auditability.",
  },
  {
    index: "03",
    icon: "▤",
    title: "Role Dashboards",
    body: "Tailored metrics, filters, and actions for customer, agent, and management personas.",
  },
  {
    index: "04",
    icon: "⟳",
    title: "CRM + Workflow",
    body: "Message threads, CRM context, agent replies, and customer approval to close the loop.",
  },
];

const FLOW = [
  { step: "1", title: "Customer submits", body: "A new inquiry enters the queue with CRM context attached." },
  { step: "2", title: "Agent responds", body: "Support identifies the issue, replies in-thread, and marks progress." },
  { step: "3", title: "Issue addressed", body: "Workflow flags show identification and resolution steps completed." },
  { step: "4", title: "Customer approves", body: "Only after approval does the inquiry close as resolved." },
];

export default function HomePage() {
  return (
    <div className="home">
      <section className="home-hero" aria-label="Introduction">
        <div className="home-hero-copy">
          <p className="brand-kicker">LLM · RAG · customer operations</p>
          <h1 className="home-title">Customer Service Agent</h1>
          <p className="home-subtitle">
            A production-style demo for role-based inquiry workflows, CRM context, and grounded AI assistance —
            ready to share with stakeholders.
          </p>
          <div className="home-trust" aria-label="Demo highlights">
            <span className="home-trust-item">3 demo roles</span>
            <span className="home-trust-dot" aria-hidden="true" />
            <span className="home-trust-item">LLM + RAG chat</span>
            <span className="home-trust-dot" aria-hidden="true" />
            <span className="home-trust-item">Live inquiry CRM</span>
          </div>
          <div className="home-cta-row">
            <Link className="btn" to="/login">
              Login to demo
            </Link>
            <Link className="btn secondary" to="/login?demo=agent">
              Quick start · Agent
            </Link>
          </div>
          <p className="home-demo-hint">
            Demo password for all roles: <code>Demo1!csa</code>
          </p>
        </div>

        <div className="home-hero-visual" aria-hidden="true">
          <div className="hero-console">
            <div className="hero-console-top">
              <div className="hero-console-brand">
                <span className="hero-console-dot" />
                <span className="hero-console-name">CSA Assistant</span>
              </div>
              <span className="hero-console-modes">
                <span>LLM</span>
                <span className="is-on">RAG</span>
              </span>
            </div>
            <div className="hero-console-thread">
              <p className="hero-line user">When is an inquiry closed?</p>
              <p className="hero-line bot">
                Closed only after customer approval — with sources from your playbook.
              </p>
              <div className="hero-console-sources">
                <span className="hero-source-pill">public-inquiry-workflow</span>
                <span className="hero-source-pill is-muted">agent-playbook</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-stats" aria-label="Platform snapshot">
        {CAPABILITIES.map((cap) => (
          <article key={cap.label} className="home-stat">
            <div className="home-stat-value">{cap.value}</div>
            <div className="home-stat-label">{cap.label}</div>
            <div className="home-stat-hint">{cap.hint}</div>
          </article>
        ))}
      </section>

      <section className="home-section home-section--panel" aria-labelledby="roles-heading">
        <div className="section-head section-head--center">
          <p className="section-eyebrow">Interactive demo</p>
          <h2 id="roles-heading" className="section-title">
            Try each demo role
          </h2>
          <p className="section-lead">
            One click opens a pre-seeded account — each role sees a different dashboard, metrics scope, and actions.
          </p>
        </div>

        <div className="home-role-grid">
          {DEMO_ROLES.map((role) => (
            <article key={role.key} className={`home-role-card home-role-card--${role.key}`}>
              <div className="home-role-card-banner">
                <span className="home-role-icon" aria-hidden="true">
                  {role.icon}
                </span>
                <div>
                  <p className="home-role-tagline">{role.tagline}</p>
                  <h3>{role.title}</h3>
                </div>
              </div>
              <p className="home-role-summary">{role.summary}</p>
              <ul className="home-role-bullets">
                {role.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="home-role-email">
                <span className="home-role-email-label">Demo email</span>
                <code>{role.email}</code>
              </p>
              <Link className={`btn home-role-cta home-role-cta--${role.key}`} to={`/login?demo=${role.key}`}>
                Enter as {role.title} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="showcase-heading">
        <div className="section-head">
          <p className="section-eyebrow">Capabilities</p>
          <h2 id="showcase-heading" className="section-title">
            What this demo showcases
          </h2>
          <p className="section-lead">
            After login, open AI Chat (bottom-right) and compare LLM product help with RAG grounded replies.
          </p>
        </div>

        <div className="home-feature-grid">
          {SHOWCASE.map((item) => (
            <article key={item.index} className="home-feature-card">
              <div className="home-feature-card-top">
                <span className="home-feature-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="home-feature-index">{item.index}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-flow card" aria-labelledby="flow-heading">
        <div className="section-head">
          <p className="section-eyebrow">Lifecycle</p>
          <h2 id="flow-heading" className="section-title">
            End-to-end resolution flow
          </h2>
          <p className="section-lead">
            Every persona sees the same inquiry lifecycle with role-appropriate actions at each step.
          </p>
        </div>
        <ol className="home-flow-steps">
          {FLOW.map((item, idx) => (
            <li key={item.step} className="home-flow-step">
              <span className="home-flow-num" aria-hidden="true">
                {item.step}
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
              {idx < FLOW.length - 1 ? <span className="home-flow-connector" aria-hidden="true" /> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="home-cta-band" aria-label="Get started">
        <div className="home-cta-band-inner">
          <div>
            <p className="home-cta-band-kicker">Evaluator ready</p>
            <h2 className="home-cta-band-title">Ready to explore the demo?</h2>
            <p className="home-cta-band-lead">
              Pre-seeded accounts, live Postgres CRM, and CSA Assistant — no local setup required for reviewers.
            </p>
          </div>
          <div className="home-cta-band-actions">
            <Link className="btn home-cta-band-btn" to="/login">
              Open demo login
            </Link>
            <Link className="btn secondary home-cta-band-btn-secondary" to="/register">
              Register new account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
