/**
 * Module: Inquiry thread + CRM + actions
 *
 * Fetches inquiry by URL param, messages, optional CRM; compose/send message or approve resolution depending on role and state.
 */
/**
 * Module: Inquiry detail
 *
 * Thread, CRM panel, send message, customer approve when applicable.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { InquiryApi } from "../api/client";
import { getUser } from "../lib/auth";

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
      setError(err.message || "Failed to load inquiry");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [inquiryId]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) {
      setError("Message body must not be empty");
      return;
    }
    setError("");
    try {
      await InquiryApi.sendMessage(inquiryId, text);
      setBody("");
      await load();
    } catch (err) {
      setError(err.message || "Failed to send message");
    }
  }

  async function approveInquiry() {
    if (!inquiry) return;
    if (role !== "customer") return;
    setApproving(true);
    setError("");
    try {
      await InquiryApi.approveInquiry(inquiry.inquiry_id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to approve inquiry");
    } finally {
      setApproving(false);
    }
  }

  const canCustomerApprove =
    role === "customer" &&
    inquiry?.status === "open" &&
    inquiry?.issue_addressed === true &&
    inquiry?.customer_approved === false;

  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 className="title">Inquiry {inquiryId}</h2>
          <Link to="/dashboard">Back to dashboard</Link>
        </div>
        {error && <div className="error">{error}</div>}
        {loading ? <p>Loading...</p> : inquiry ? (
          <div className="grid">
            <div><strong>Status:</strong> {inquiry.status}</div>
            <div><strong>Customer ID:</strong> {inquiry.customer_id}</div>
            <div><strong>Accessible:</strong> {String(inquiry.accessible)}</div>
            <div><strong>Issue identified:</strong> {String(inquiry.issue_identified)}</div>
            <div><strong>Issue addressed:</strong> {String(inquiry.issue_addressed)}</div>
            {role === "customer" && (
              <div><strong>Customer approved:</strong> {String(inquiry.customer_approved)}</div>
            )}
          </div>
        ) : <p>Inquiry not found.</p>}
      </div>

      <div className="card">
        <h3 className="title">CRM Context</h3>
        {loading ? <p>Loading CRM...</p> : customer ? (
          <div className="grid">
            <div><strong>Name:</strong> {customer.name}</div>
            <div><strong>Email:</strong> {customer.email}</div>
            <div><strong>Account status:</strong> {customer.account_status}</div>
          </div>
        ) : <p>No CRM context available for this inquiry.</p>}
      </div>

      <div className="card">
        <h3 className="title">Messages</h3>
        {messages.length === 0 ? <p>No messages yet.</p> : (
          <div className="grid">
            {messages.map((m) => (
              <div key={m.id} className="metric">
                <div className="label">{m.sender_type} — {new Date(m.created_at).toLocaleString()}</div>
                <div>{m.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {role !== "customer" ? (
        <div className="card">
          <h3 className="title">Send response</h3>
          <form className="form" onSubmit={sendMessage}>
            <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write response..." />
            <button className="btn" disabled={!body.trim()}>Send</button>
          </form>
        </div>
      ) : (
        <div className="card">
          <h3 className="title">Customer approval</h3>
          {canCustomerApprove ? (
            <button className="btn secondary" onClick={approveInquiry} disabled={approving}>
              {approving ? "Approving..." : "Approve resolution"}
            </button>
          ) : (
            <p>Approval is available only after the issue is addressed.</p>
          )}
        </div>
      )}
    </>
  );
}
