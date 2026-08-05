/**
 * Module: Marketing / landing page
 *
 * Public hero and feature overview with links to login and register.
 */
/**
 * Module: Landing page (public marketing hero and links).
 */
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-badge">
            <span className="dot" aria-hidden="true" />
            Customer Ops Platform
          </div>
          <h1 className="home-title">Customer Service Agent</h1>
          <p className="home-subtitle">
            Handle customer inquiries, retrieve CRM context, and resolve issues with a guided workflow.
          </p>
          <div className="row">
            <Link className="btn" to="/login">Login</Link>
            <Link className="btn secondary" to="/register">Register</Link>
          </div>
        </div>
        <div className="home-hero-art" aria-hidden="true">
          <div className="art-card">
            <div className="art-row">
              <div className="art-pill" />
              <div className="art-pill short" />
            </div>
            <div className="art-metrics">
              <div className="art-metric" />
              <div className="art-metric" />
              <div className="art-metric" />
            </div>
            <div className="art-line" />
            <div className="art-line small" />
          </div>
        </div>
      </section>

      <section className="home-section">
        <h2 className="section-title">Features</h2>
        <div className="grid grid-2">
          <div className="feature">
            <div className="feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 6.5C4 5.12 5.12 4 6.5 4h11C18.88 4 20 5.12 20 6.5v11c0 1.38-1.12 2.5-2.5 2.5h-11C5.12 20 4 18.88 4 17.5v-11Z" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M7 8h10M7 12h10M7 16h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>Inquiry Dashboard</h3>
            <p>View incoming inquiries and track status at a glance.</p>
          </div>
          <div className="feature">
            <div className="feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M4 20c1.6-3.6 5-6 8-6s6.4 2.4 8 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M18 7h3M19.5 5.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>CRM Context Retrieval</h3>
            <p>Fetch the right customer details to respond confidently.</p>
          </div>
          <div className="feature">
            <div className="feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12.5 10 17l9-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 7h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M4 10h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>Guided Response Workflow</h3>
            <p>Compose and send responses from a single inquiry screen.</p>
          </div>
          <div className="feature">
            <div className="feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3 19 6v6c0 5-3 8.5-7 9-4-.5-7-4-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M9.2 12.2 11 14l3.8-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Secure Access</h3>
            <p>Protected routes ensure only authenticated users can access inquiries.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
