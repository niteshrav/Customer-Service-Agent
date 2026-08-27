/**
 * Module: Dashboard — metrics, create inquiry, searchable/filterable inquiry table.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { InquiryApi } from "../api/client";
import { getUser } from "../lib/auth";
import { formatTs, getInquiryDisplayStatus } from "../lib/inquiryDisplay";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { toast } from "../lib/toast";
import { StatusBadge, FlagPill } from "../components/StatusBadge";
import { MetricSkeleton, TableSkeleton } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";

import { getDashboardTheme, roleNavLabel } from "../lib/dashboardTheme";

function roleLabel(role) {
  if (role === "customer") return "Customer";
  if (role === "agent") return "Support agent";
  if (role === "lead") return "Team lead";
  if (role === "admin") return "Admin";
  return role || "User";
}

function handleQuickAction(actionId, { applyMetricFilter, submitRef }) {
  if (actionId === "submit") {
    submitRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    submitRef.current?.querySelector("textarea")?.focus();
    return;
  }
  const filterMap = {
    open: "open",
    awaiting: "awaiting",
    in_progress: "in_progress",
    all: "all",
  };
  if (filterMap[actionId]) applyMetricFilter(filterMap[actionId]);
}

function WorkflowSteps({ inq }) {
  const steps = [
    { key: "accessible", on: !!inq.accessible, label: "Access" },
    { key: "identified", on: !!inq.issue_identified, label: "Identified" },
    { key: "addressed", on: !!inq.issue_addressed, label: "Addressed" },
    { key: "approved", on: !!inq.customer_approved || inq.status === "resolved", label: "Approved" },
  ];
  const done = steps.filter((s) => s.on).length;
  return (
    <div className="workflow-track" aria-label="Workflow progress">
      <div className="workflow-track-bar" aria-hidden="true">
        <span style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <div className="workflow-steps">
        {steps.map((s) => (
          <span key={s.key} className={`workflow-step ${s.on ? "is-on" : ""}`} title={s.label}>
            <span className="workflow-dot" aria-hidden="true" />
            <span className="workflow-step-label">{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const FILTER_LABELS = {
  all: "All statuses",
  open: "Open",
  in_progress: "In progress",
  awaiting: "Awaiting approval",
  resolved: "Resolved",
};

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
  const [lastSynced, setLastSynced] = useState(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 280);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("created_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const submitRef = useRef(null);

  const theme = useMemo(() => getDashboardTheme(role), [role]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [list, metricsPayload] = await Promise.all([InquiryApi.list(), InquiryApi.metrics()]);
      setInquiries(list.inquiries || []);
      setDashboardMetrics(metricsPayload);
      setLastSynced(new Date());
    } catch (err) {
      const msg = err.message || "Failed to load dashboard";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, sortKey, pageSize]);

  async function submitQuery(e) {
    e.preventDefault();
    const text = newQuery.trim();
    if (!text) return;
    setSubmitting(true);
    setError("");
    try {
      await InquiryApi.createInquiry(text);
      setNewQuery("");
      toast.success("Inquiry submitted");
      await load();
    } catch (err) {
      const msg = err.message || "Failed to create inquiry";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function approve(inquiryId) {
    setApprovingId(inquiryId);
    setError("");
    try {
      await InquiryApi.approveInquiry(inquiryId);
      toast.success("Inquiry approved");
      await load();
    } catch (err) {
      const msg = err.message || "Failed to approve inquiry";
      setError(msg);
      toast.error(msg);
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

  const attentionItems = useMemo(() => {
    return inquiries
      .filter((i) => {
        if (role === "customer") {
          return (
            i.status === "open" && i.issue_addressed === true && i.customer_approved === false
          );
        }
        return i.status === "open" && i.issue_addressed && !i.customer_approved;
      })
      .slice(0, 4);
  }, [inquiries, role]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let rows = [...inquiries];

    if (statusFilter === "open") rows = rows.filter((i) => i.status === "open");
    if (statusFilter === "resolved") rows = rows.filter((i) => i.status === "resolved");
    if (statusFilter === "awaiting") {
      rows = rows.filter((i) => i.status === "open" && i.issue_addressed && !i.customer_approved);
    }
    if (statusFilter === "in_progress") {
      rows = rows.filter((i) => i.status === "open" && i.issue_identified && !i.issue_addressed);
    }

    if (q) {
      rows = rows.filter(
        (i) =>
          String(i.inquiry_id || "").toLowerCase().includes(q) ||
          String(i.customer_id || "").toLowerCase().includes(q) ||
          String(i.status || "").toLowerCase().includes(q) ||
          getInquiryDisplayStatus(i).label.toLowerCase().includes(q),
      );
    }

    rows.sort((a, b) => {
      if (sortKey === "id_asc") return String(a.inquiry_id).localeCompare(String(b.inquiry_id));
      if (sortKey === "id_desc") return String(b.inquiry_id).localeCompare(String(a.inquiry_id));
      if (sortKey === "created_asc") {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return rows;
  }, [inquiries, debouncedSearch, statusFilter, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const resolutionRate = useMemo(() => {
    const total = dashboardMetrics?.inquiries?.total || 0;
    const resolved = dashboardMetrics?.inquiries?.resolved || 0;
    if (!total) return null;
    return Math.round((resolved / total) * 100);
  }, [dashboardMetrics]);

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setSortKey("created_desc");
    setPage(1);
    setPageSize(10);
  }

  function applyMetricFilter(key) {
    setStatusFilter(key);
    setPage(1);
  }

  const displayName = user?.full_name || user?.email || "user";
  const listTitle = theme.listTitle;

  return (
    <div className={`page-dashboard page-dashboard--${role === "lead" || role === "admin" ? "management" : role}`}>
      <section className={`dash-hero card ${theme.heroClass}`}>
        <div className="dash-hero-main">
          <p className="dash-kicker">{theme.kicker}</p>
          <h2 className="title dash-title">{theme.headline}</h2>
          <p className="muted-line dash-subtitle">{theme.blurb}</p>
          <p className="muted-line dash-subtitle dash-signed-in">
            Signed in as <strong>{displayName}</strong>
          </p>
          <div className="dash-chips" aria-label="Session context">
            <span className="dash-chip dash-chip-role">{roleLabel(role)}</span>
            <span className="dash-chip dash-chip-nav">{roleNavLabel(role)} view</span>
            {dashboardMetrics?.scope ? (
              <span className="dash-chip">Scope · {dashboardMetrics.scope.replace(/_/g, " ")}</span>
            ) : null}
            {lastSynced ? (
              <span className="dash-chip dash-chip-muted">Updated {formatTs(lastSynced.toISOString())}</span>
            ) : null}
          </div>
          <div className="dash-quick-actions" role="group" aria-label="Quick filters">
            {theme.quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="dash-quick-action"
                onClick={() => handleQuickAction(action.id, { applyMetricFilter, submitRef })}
              >
                <span className="dash-quick-action-label">{action.label}</span>
                <span className="dash-quick-action-hint">{action.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="dash-hero-aside">
          {resolutionRate != null ? (
            <div className="dash-resolution" aria-label="Resolution rate">
              <div className="dash-resolution-value">{resolutionRate}%</div>
              <div className="dash-resolution-label">Resolved</div>
              <div className="dash-resolution-bar" aria-hidden="true">
                <span style={{ width: `${resolutionRate}%` }} />
              </div>
            </div>
          ) : (
            <p className="muted-line dash-hero-hint">
              Track open work, approvals, and inquiry progress in one place.
            </p>
          )}
        </div>
      </section>

      {error && (
        <div className="alert alert-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn secondary btn-compact" onClick={() => load()}>
            Retry
          </button>
        </div>
      )}

      <aside className="card demo-ai-strip dash-ai-tip" role="region" aria-label="AI demo tip">
        <div className="dash-ai-tip-inner">
          <div className="dash-ai-tip-icon" aria-hidden="true">✦</div>
          <div>
            <div className="demo-ai-strip-title">CSA Assistant — live on this page</div>
            <p className="demo-ai-strip-body">{theme.aiTip}</p>
          </div>
        </div>
      </aside>

      {loading && !dashboardMetrics ? (
        <MetricSkeleton />
      ) : dashboardMetrics?.inquiries ? (
        <div className="grid grid-auto-metrics dash-metrics" role="group" aria-label="Inquiry metrics">
          <button
            type="button"
            className={`metric metric-btn ${statusFilter === "all" ? "is-active" : ""}`}
            onClick={() => applyMetricFilter("all")}
          >
            <div className="label">Total inquiries</div>
            <div className="value">{dashboardMetrics.inquiries.total}</div>
            <div className="metric-hint">All in scope</div>
          </button>
          <button
            type="button"
            className={`metric metric-btn tone-open ${statusFilter === "open" ? "is-active" : ""}`}
            onClick={() => applyMetricFilter("open")}
          >
            <div className="label">{openLabel}</div>
            <div className="value">{dashboardMetrics.inquiries.open}</div>
            <div className="metric-hint">Needs attention</div>
          </button>
          <button
            type="button"
            className={`metric metric-btn tone-success ${statusFilter === "resolved" ? "is-active" : ""}`}
            onClick={() => applyMetricFilter("resolved")}
          >
            <div className="label">{closedLabel}</div>
            <div className="value">{dashboardMetrics.inquiries.resolved}</div>
            <div className="metric-hint">Closed successfully</div>
          </button>
          {dashboardMetrics.scope === "organization" && (
            <div className="metric tone-neutral">
              <div className="label">Open (unassigned)</div>
              <div className="value">{dashboardMetrics.inquiries.open_unassigned}</div>
              <div className="metric-hint">Lead queue</div>
            </div>
          )}
          <button
            type="button"
            className={`metric metric-btn tone-warning ${statusFilter === "awaiting" ? "is-active" : ""}`}
            onClick={() => applyMetricFilter("awaiting")}
          >
            <div className="label">
              {role === "customer" ? "Awaiting your approval" : "Awaiting customer approval"}
            </div>
            <div className="value">{dashboardMetrics.inquiries.awaiting_customer_approval}</div>
            <div className="metric-hint">{role === "customer" ? "Ready for you" : "Waiting on customer"}</div>
          </button>
        </div>
      ) : null}

      {attentionItems.length > 0 && (
        <section className="card dash-attention" aria-label="Needs attention">
          <div className="page-header-row">
            <div>
              <h3 className="subtitle" style={{ marginBottom: 4 }}>
                {role === "customer" ? "Ready for your approval" : "Needs attention"}
              </h3>
              <p className="muted-line">
                {role === "customer"
                  ? "These inquiries have been addressed and are waiting on your confirmation."
                  : "Addressed inquiries waiting on customer approval."}
              </p>
            </div>
            <button type="button" className="btn secondary btn-compact" onClick={() => applyMetricFilter("awaiting")}>
              View all
            </button>
          </div>
          <ul className="dash-attention-list">
            {attentionItems.map((i) => (
              <li key={i.id || i.inquiry_id} className="dash-attention-item">
                <div>
                  <Link className="table-link" to={`/inquiries/${encodeURIComponent(i.inquiry_id)}`}>
                    {i.inquiry_id}
                  </Link>
                  <span className="dash-attention-meta">
                    {i.customer_id}
                    {i.created_at ? ` · ${formatTs(i.created_at)}` : ""}
                  </span>
                </div>
                <div className="dash-attention-actions">
                  {canCustomerApprove(i) && (
                    <button
                      type="button"
                      className="btn secondary btn-compact"
                      onClick={() => approve(i.inquiry_id)}
                      disabled={approvingId === i.inquiry_id}
                    >
                      {approvingId === i.inquiry_id ? "Approving..." : "Approve"}
                    </button>
                  )}
                  <Link className="btn secondary btn-compact" to={`/inquiries/${encodeURIComponent(i.inquiry_id)}`}>
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card dash-inbox">
        <div className="page-header-row">
          <div>
            <h3 className="title" style={{ marginBottom: 4 }}>
              {listTitle}
            </h3>
            <p className="muted-line">
              {filtered.length} shown
              {inquiries.length !== filtered.length ? ` · ${inquiries.length} total loaded` : ""}
            </p>
          </div>
        </div>

        {role === "customer" && (
          <form ref={submitRef} className="form inquiry-create-form inquiry-create-form--prominent" onSubmit={submitQuery}>
            <div className="inquiry-create-head">
              <h4 className="subtitle">Submit new query</h4>
              <p className="muted-line">Describe your issue — an agent will pick it up from the queue.</p>
            </div>
            <label className="field">
              <span className="field-label">Describe your issue</span>
              <textarea
                className="textarea"
                value={newQuery}
                onChange={(e) => setNewQuery(e.target.value)}
                placeholder="Describe your issue..."
                disabled={submitting}
                required
              />
            </label>
            <button className="btn" disabled={submitting || !newQuery.trim()}>
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Submitting...
                </>
              ) : (
                "Submit"
              )}
            </button>
          </form>
        )}

        <div className="toolbar" role="search">
          <label className="field toolbar-search">
            <span className="sr-only">Search inquiries</span>
            <input
              className="input input-search"
              type="search"
              placeholder="Search by inquiry, customer, or status…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search inquiries"
            />
          </label>
          <label className="field">
            <span className="sr-only">Filter by status</span>
            <select
              className="input select"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="awaiting">Awaiting approval</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
          <label className="field">
            <span className="sr-only">Sort</span>
            <select
              className="input select"
              aria-label="Sort inquiries"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              <option value="created_desc">Newest first</option>
              <option value="created_asc">Oldest first</option>
              <option value="id_asc">Inquiry ID A–Z</option>
              <option value="id_desc">Inquiry ID Z–A</option>
            </select>
          </label>
          <button type="button" className="btn secondary btn-compact" onClick={resetFilters}>
            Reset filters
          </button>
        </div>

        {(statusFilter !== "all" || search.trim()) && (
          <div className="dash-active-filters" aria-label="Active filters">
            {statusFilter !== "all" && (
              <span className="dash-filter-pill">
                {FILTER_LABELS[statusFilter] || statusFilter}
                <button
                  type="button"
                  className="dash-filter-pill-clear"
                  aria-label={`Clear ${FILTER_LABELS[statusFilter]} filter`}
                  onClick={() => setStatusFilter("all")}
                >
                  ×
                </button>
              </span>
            )}
            {search.trim() && (
              <span className="dash-filter-pill">
                Search: {search.trim()}
                <button
                  type="button"
                  className="dash-filter-pill-clear"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No inquiries available."
            body={
              inquiries.length
                ? "Try clearing search or filters."
                : role === "customer"
                  ? "Submit a new query to get started."
                  : "No inquiries in your current scope."
            }
          />
        ) : (
          <>
            <div className="table-scroll dash-table-desktop">
              <table className="table table-polished">
                <thead>
                  <tr>
                    <th>Inquiry</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Created</th>
                    <th>Flags</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((i) => {
                    const display = getInquiryDisplayStatus(i);
                    return (
                      <tr key={i.id} className="table-row-interactive">
                        <td>
                          <Link className="table-link" to={`/inquiries/${encodeURIComponent(i.inquiry_id)}`}>
                            {i.inquiry_id}
                          </Link>
                        </td>
                        <td>
                          <span className="mono-cell">{i.customer_id}</span>
                        </td>
                        <td>
                          <StatusBadge tone={display.tone}>{display.label}</StatusBadge>
                        </td>
                        <td>
                          <WorkflowSteps inq={i} />
                        </td>
                        <td className="muted-cell">{formatTs(i.created_at) || "—"}</td>
                        <td>
                          <div className="flag-row">
                            <FlagPill on={!!i.accessible} label="access" />
                            <FlagPill on={!!i.issue_identified} label="id" />
                            <FlagPill on={!!i.issue_addressed} label="addr" />
                          </div>
                        </td>
                        <td>
                          <div className="row" style={{ gap: 10 }}>
                            {canCustomerApprove(i) && (
                              <button
                                type="button"
                                className="btn secondary btn-compact"
                                onClick={() => approve(i.inquiry_id)}
                                disabled={approvingId === i.inquiry_id}
                              >
                                {approvingId === i.inquiry_id ? "Approving..." : "Approve"}
                              </button>
                            )}
                            <Link
                              className="btn secondary btn-compact"
                              to={`/inquiries/${encodeURIComponent(i.inquiry_id)}`}
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="dash-card-list dash-table-mobile" aria-label="Inquiries list">
              {pageRows.map((i) => {
                const display = getInquiryDisplayStatus(i);
                return (
                  <li key={`m-${i.id}`} className="dash-inquiry-card">
                    <div className="dash-inquiry-card-top">
                      <Link className="table-link" to={`/inquiries/${encodeURIComponent(i.inquiry_id)}`}>
                        {i.inquiry_id}
                      </Link>
                      <StatusBadge tone={display.tone}>{display.label}</StatusBadge>
                    </div>
                    <p className="muted-line dash-inquiry-card-meta">
                      {i.customer_id}
                      {i.created_at ? ` · ${formatTs(i.created_at)}` : ""}
                    </p>
                    <WorkflowSteps inq={i} />
                    <div className="row dash-inquiry-card-actions">
                      {canCustomerApprove(i) && (
                        <button
                          type="button"
                          className="btn secondary btn-compact"
                          onClick={() => approve(i.inquiry_id)}
                          disabled={approvingId === i.inquiry_id}
                        >
                          {approvingId === i.inquiry_id ? "Approving..." : "Approve"}
                        </button>
                      )}
                      <Link className="btn secondary btn-compact" to={`/inquiries/${encodeURIComponent(i.inquiry_id)}`}>
                        View
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>

            <Pagination
              page={safePage}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </>
        )}
      </section>
    </div>
  );
}
