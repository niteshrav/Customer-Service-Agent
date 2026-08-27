/**
 * Module: Inquiry detail — thread, CRM, send/approve actions.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { InquiryApi } from "../api/client";
import { getUser } from "../lib/auth";
import { formatTs, getInquiryDisplayStatus } from "../lib/inquiryDisplay";
import { toast } from "../lib/toast";
import { StatusBadge, FlagPill } from "../components/StatusBadge";
import { Skeleton } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";

export default function InquiryDetailPage() {
  const { inquiryId } = useParams();
  const user = getUser();
  const role = user?.role || "agent";
  const [inquiry, setInquiry] = useState(null);
  const [messages, setMessages] = useState([]);
  const [customer, setCustomer] = useState(undefined);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(false);
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const detail = await InquiryApi.detail(inquiryId);
      setInquiry(detail.inquiry);
      setMessages(detail.messages || []);
      const crm = await InquiryApi.crm(inquiryId);
      setCustomer(crm.customer);
    } catch (err) {
      const msg = err.message || "Failed to load inquiry";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [inquiryId]);

  useEffect(() => {
    const el = threadEndRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, loading]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) {
      setError("Message body must not be empty");
      toast.warning("Message body must not be empty");
      return;
    }
    setError("");
    setSending(true);
    try {
      await InquiryApi.sendMessage(inquiryId, text);
      setBody("");
      toast.success("Response sent");
      await load();
    } catch (err) {
      const msg = err.message || "Failed to send message";
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  async function approveInquiry() {
    if (!inquiry) return;
    if (role !== "customer") return;
    setApproving(true);
    setError("");
    try {
      await InquiryApi.approveInquiry(inquiry.inquiry_id);
      toast.success("Resolution approved");
      await load();
    } catch (err) {
      const msg = err.message || "Failed to approve inquiry";
      setError(msg);
      toast.error(msg);
    } finally {
      setApproving(false);
    }
  }

  const canCustomerApprove =
    role === "customer" &&
    inquiry?.status === "open" &&
    inquiry?.issue_addressed === true &&
    inquiry?.customer_approved === false;

  const display = getInquiryDisplayStatus(inquiry);

  return (
    <div className="page-inquiry">
      <div className="card">
        <div className="page-header-row">
          <div>
            <p className="breadcrumb">
              <Link to="/dashboard">Dashboard</Link>
              <span aria-hidden="true"> / </span>
              <span>{inquiryId}</span>
            </p>
            <h2 className="title">Inquiry {inquiryId}</h2>
          </div>
          <Link className="btn secondary btn-compact" to="/dashboard">
            Back to dashboard
          </Link>
        </div>
        {error && (
          <div className="alert alert-error" role="alert">
            <span>{error}</span>
            <button type="button" className="btn secondary btn-compact" onClick={() => load()}>
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <div className="detail-grid">
            <Skeleton style={{ height: 18, width: "40%" }} />
            <Skeleton style={{ height: 18, width: "55%" }} />
            <Skeleton style={{ height: 18, width: "35%" }} />
          </div>
        ) : inquiry ? (
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Workflow</span>
              <StatusBadge tone={display.tone}>{display.label}</StatusBadge>
            </div>
            <div className="detail-item">
              <span className="detail-label">Customer ID</span>
              <strong>{inquiry.customer_id}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-label">Accessible</span>
              <FlagPill on={!!inquiry.accessible} label={String(inquiry.accessible)} />
            </div>
            <div className="detail-item">
              <span className="detail-label">Issue identified</span>
              <FlagPill on={!!inquiry.issue_identified} label={String(inquiry.issue_identified)} />
            </div>
            <div className="detail-item">
              <span className="detail-label">Issue addressed</span>
              <FlagPill on={!!inquiry.issue_addressed} label={String(inquiry.issue_addressed)} />
            </div>
            {role === "customer" && (
              <div className="detail-item">
                <span className="detail-label">Customer approved</span>
                <FlagPill on={!!inquiry.customer_approved} label={String(inquiry.customer_approved)} />
              </div>
            )}
          </div>
        ) : (
          <EmptyState title="Inquiry not found." body="It may have been removed or you may not have access." />
        )}
      </div>

      <div className="card">
        <h3 className="title">CRM Context</h3>
        {loading ? (
          <div className="detail-grid">
            <Skeleton style={{ height: 16, width: "50%" }} />
            <Skeleton style={{ height: 16, width: "60%" }} />
          </div>
        ) : customer ? (
          <div className="crm-card">
            <div className="crm-avatar" aria-hidden="true">
              {(customer.name || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="crm-body">
              <div className="crm-name">{customer.name}</div>
              <div className="crm-meta">{customer.email}</div>
              <div className="crm-meta">
                Account: <StatusBadge tone={customer.account_status === "active" ? "success" : "neutral"}>{customer.account_status}</StatusBadge>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="No CRM context available for this inquiry." />
        )}
      </div>

      <div className="card">
        <h3 className="title">Messages</h3>
        {messages.length === 0 ? (
          <EmptyState title="No messages yet." body="Agent responses will appear here." />
        ) : (
          <div className="message-thread" aria-live="polite">
            {messages.map((m) => (
              <article key={m.id} className={`message-bubble sender-${m.sender_type}`}>
                <header className="message-meta">
                  <span className="message-sender">{m.sender_type}</span>
                  <time dateTime={m.created_at}>{formatTs(m.created_at)}</time>
                </header>
                <p className="message-body">{m.body}</p>
              </article>
            ))}
            <div ref={threadEndRef} />
          </div>
        )}
      </div>

      {role !== "customer" ? (
        <div className="card">
          <h3 className="title">Send response</h3>
          <form className="form" onSubmit={sendMessage}>
            <label className="field">
              <span className="field-label">Response</span>
              <textarea
                className="textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write response..."
                disabled={sending}
                required
              />
            </label>
            <button className="btn" disabled={!body.trim() || sending}>
              {sending ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Sending…
                </>
              ) : (
                "Send"
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="card">
          <h3 className="title">Customer approval</h3>
          {canCustomerApprove ? (
            <button className="btn" onClick={approveInquiry} disabled={approving}>
              {approving ? "Approving..." : "Approve resolution"}
            </button>
          ) : (
            <p className="muted-line">Approval is available only after the issue is addressed.</p>
          )}
        </div>
      )}
    </div>
  );
}
