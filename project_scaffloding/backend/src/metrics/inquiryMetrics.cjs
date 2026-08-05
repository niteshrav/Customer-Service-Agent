/**
 * Module: Dashboard inquiry metrics (US-5)
 *
 * Computes role-scoped SQL aggregates: totals, open, resolved, awaiting customer approval, open unassigned (org roles).
 * Used by GET /api/metrics/inquiries; throws 403-shaped errors for unsupported roles.
 *
 * @param {import("pg").Pool} pool
 * @param {{ role: string, id: string, customer_id?: string | null }} user — req.user from JWT/session
 */
async function fetchInquiryDashboardMetrics(pool, user) {
  const { role, id: userId, customer_id: customerId } = user;
  const orgScope = role === "lead" || role === "admin";
  const agentScope = role === "agent";
  const customerScope = role === "customer";

  let whereSql;
  const params = [];
  if (orgScope) {
    whereSql = "TRUE";
  } else if (agentScope) {
    params.push(userId);
    whereSql = `(assigned_agent_id = $1 AND status = 'open') OR (resolved_by_agent_id = $1 AND status = 'resolved')`;
  } else if (customerScope) {
    params.push(customerId);
    whereSql = "customer_id = $1";
  } else {
    const err = new Error("forbidden");
    err.statusCode = 403;
    throw err;
  }

  const openUnassignedExpr = orgScope
    ? "COUNT(*) FILTER (WHERE status = 'open' AND assigned_agent_id IS NULL)::int"
    : "0::int";

  const sql = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'open')::int AS open,
      COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
      ${openUnassignedExpr} AS open_unassigned,
      COUNT(*) FILTER (WHERE status = 'open' AND issue_addressed = true AND customer_approved = false)::int AS awaiting_customer_approval
    FROM inquiries
    WHERE ${whereSql}
  `;

  const { rows } = await pool.query(sql, params);
  const row = rows[0];
  const scope = orgScope ? "organization" : agentScope ? "agent_bucket" : "customer";

  return {
    scope,
    inquiries: {
      total: row.total,
      open: row.open,
      resolved: row.resolved,
      open_unassigned: row.open_unassigned,
      awaiting_customer_approval: row.awaiting_customer_approval,
    },
  };
}

module.exports = { fetchInquiryDashboardMetrics };
