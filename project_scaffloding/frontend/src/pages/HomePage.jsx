/**
 * Module: Landing — professional customer-ops + AI demo composition.
 */
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="home">
      <section className="home-hero" aria-label="Introduction">
        <div className="home-hero-copy">
          <p className="brand-kicker">LLM · RAG · customer operations</p>
          <h1 className="home-title">Customer Service Agent</h1>
          <p className="home-subtitle">
            Resolve inquiries with role-based workflows, CRM context, and grounded AI assistance.
          </p>
          <div className="home-cta-row">
            <Link className="btn" to="/login">
              Login to demo
            </Link>
            <Link className="btn secondary" to="/register">
              Register
            </Link>
          </div>
        </div>

        <div className="home-hero-visual" aria-hidden="true">
          <div className="hero-console">
            <div className="hero-console-top">
              <span className="hero-console-name">CSA Assistant</span>
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
              <p className="hero-source">Source · public-inquiry-workflow</p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="showcase-heading">
        <div className="section-head">
          <h2 id="showcase-heading" className="section-title">
            What this demo showcases
          </h2>
          <p className="section-lead">
            After login, open AI Chat and compare LLM product help with RAG grounded replies.
          </p>
        </div>

        <ol className="showcase-list">
          <li className="showcase-item">
            <span className="showcase-index" aria-hidden="true">
              01
            </span>
            <div>
              <h3>LLM Assistant</h3>
              <p>Context-aware product help on every page — scoped answers for operators and guests.</p>
            </div>
          </li>
          <li className="showcase-item">
            <span className="showcase-index" aria-hidden="true">
              02
            </span>
            <div>
              <h3>RAG with Citations</h3>
              <p>Retrieve from the knowledge corpus, answer from evidence, and surface Sources for trust.</p>
            </div>
          </li>
          <li className="showcase-item">
            <span className="showcase-index" aria-hidden="true">
              03
            </span>
            <div>
              <h3>Inquiry Dashboard</h3>
              <p>Role-scoped metrics and inquiry lists for customer, agent, and management personas.</p>
            </div>
          </li>
          <li className="showcase-item">
            <span className="showcase-index" aria-hidden="true">
              04
            </span>
            <div>
              <h3>CRM + Guided Workflow</h3>
              <p>Thread messages, CRM context, agent replies, and customer approval to close the loop.</p>
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}
