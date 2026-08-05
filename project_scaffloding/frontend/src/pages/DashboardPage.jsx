/**
 * Module: Authenticated dashboard
 *
 * Loads InquiryApi metrics + inquiry list; role-specific columns (e.g. customer approve); links to inquiry detail.
 */
/**
 * Module: Dashboard
 *
 * Inquiry list plus role-scoped metrics from InquiryApi.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InquiryApi } from "../api/client";
import { getUser } from "../lib/auth";

export default function DashboardPage() {
  const user = getUser();
  const role = user?.role || "agent";
  const [inquiries, setInquiries] = useState([]);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newQuery, setNewQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [list, metricsPayload] = await Promise.all([InquiryApi.list(), InquiryApi.metrics()]);
      setInquiries(list.inquiries || []);
      setDashboardMetrics(metricsPayload);
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submitQuery(e) {
    e.preventDefault();
    const text = newQuery.trim();
    if (!text) return;
    setSubmitting(true);
    setError("");
    try {
      await InquiryApi.createInquiry(text);
      setNewQuery("");
      await load();
    } catch (err) {
      setError(err.message || "Failed to create inquiry");
    } finally {
      setSubmitting(false);
    }
  }

  async function approve(inquiryId) {
    setApprovingId(inquiryId);
    setError("");
    try {
      await InquiryApi.approveInquiry(inquiryId);
      await load();
    } catch (err) {
      setError(err.message || "Failed to approve inquiry");
    } finally {
      setApprovingId("");
    }
  }

  const openLabel = role === "customer" ? "Open queries" : "Open inquiries";
  const closedLabel = role === "customer" ? "Closed queries" : "Resolved inquiries";

  function canCustomerApprove(inq) {
    return (
      role === "customer" &&
      inq.status === "open" &&
      inq.issue_addressed === true &&
      inq.customer_approved === false
    );
  }

  return (
    <>
      <div className="card">
        <h2 className="title">Dashboard</h2>
        <p className="muted-line">
          Signed in as <strong>{user?.full_name || user?.email || "user"}</strong>
          {role ? <> · role <code>{role}</code></> : null}
        </p>
        {error && <div className="error">{error}</div>}
      </div>

      <div className="card demo-ai-strip" role="region" aria-label="AI demo tip">
        <div className="demo-ai-strip-title">AI demo tip</div>
        <p className="demo-ai-strip-body">
          Open <strong>AI Chat</strong> (bottom-right). Use <strong>LLM</strong> for product help,
          then switch to <strong>RAG</strong> and ask about inquiry approval — citations appear when
          the knowledge base returns sources. Expand the panel for presentations.
        </p>
      </div>

      {dashboardMetrics?.inquiries && (
        <div className="card grid grid-auto-metrics">
          <div className="metric">
            <div className="label">Total inquiries</div>
            <div className="value">{dashboardMetrics.inquiries.total}</div>
          </div>
          <div className="metric">
            <div className="label">{openLabel}</div>
            <div className="value">{dashboardMetrics.inquiries.open}</div>
          </div>
          <div className="metric">
            <div className="label">{closedLabel}</div>
            <div className="value">{dashboardMetrics.inquiries.resolved}</div>
          </div>
          {dashboardMetrics.scope === "organization" && (
            <div className="metric">
              <div className="label">Open (unassigned)</div>
              <div className="value">{dashboardMetrics.inquiries.open_unassigned}</div>
            </div>
          )}
          <div className="metric">
            <div className="label">
              {role === "customer" ? "Awaiting your approval" : "Awaiting customer approval"}
            </div>
            <div className="value">{dashboardMetrics.inquiries.awaiting_customer_approval}</div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="title">
          {role === "customer" ? "Your inquiries" : role === "agent" ? "My bucket" : "Inquiries"}
        </h3>

        {role === "customer" && (
          <form className="form" onSubmit={submitQuery}>
            <h4 className="title" style={{ fontSize: 16, marginTop: 8 }}>Submit new query</h4>
            <textarea
              className="textarea"
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              placeholder="Describe your issue..."
              disabled={submitting}
            />
            <button className="btn secondary" disabled={submitting || !newQuery.trim()}>
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </form>
        )}

        {loading ? (
          <p>Loading inquiries...</p>
        ) : inquiries.length === 0 ? (
          <p>No inquiries available.</p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Inquiry ID</th><th>Customer ID</th><th>Status</th><th>Accessible</th><th>Issue identified</th><th>Issue addressed</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((i) => (
                  <tr key={i.id}>
                    <td>{i.inquiry_id}</td>
                    <td>{i.customer_id}</td>
                    <td>{i.status}</td>
                    <td>{String(i.accessible)}</td>
                    <td>{String(i.issue_identified)}</td>
                    <td>{String(i.issue_addressed)}</td>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        {canCustomerApprove(i) && (
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => approve(i.inquiry_id)}
                            disabled={approvingId === i.inquiry_id}
                          >
                            {approvingId === i.inquiry_id ? "Approving..." : "Approve"}
                          </button>
                        )}
                        <Link to={`/inquiries/${encodeURIComponent(i.inquiry_id)}`}>View</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
