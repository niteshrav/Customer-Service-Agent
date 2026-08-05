/**
 * Module: HTTP application (Express)
 *
 * Wires REST routes: auth, inquiries (CRUD-ish), CRM context, customer approval, dashboard inquiry metrics,
 * and chat. Resolves JWT to user, applies role checks, and lazily builds the chat bundle (LLM + RAG + stores).
 * Exports createApp(pool) for tests and production; closeDefaultChatBundle for graceful shutdown.
 */
const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const tokenToUser = new Map();

const { buildChatBundle } = require("./chat/buildChatBundle.cjs");
const { fetchInquiryDashboardMetrics } = require("./metrics/inquiryMetrics.cjs");

/** Lazy default chat stack (Redis optional, resilient LLM). Process-wide singleton (one server / test file). */
let defaultBundlePromise = null;

function validateStrongPassword(password) {
  if (typeof password !== "string") return false;
  if (password.length < 8) return false;
  return /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function escapeHtmlAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeHtmlText(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function extractBearerToken(req) {
  const auth = req.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token || !tokenToUser.has(token)) {
    res.status(401).json({ error: "unauthorized", message: "Authentication required" });
    return;
  }
  req.user = tokenToUser.get(token);
  req.token = token;
  next();
}

/**
 * Express app factory (TDD: inject Pool for tests).
 * @param {import("pg").Pool} pool
 */
/**
 * Close Redis (if any) for the lazily built default chat bundle and drop the singleton.
 * Safe to call if the bundle was never built.
 */
async function closeDefaultChatBundle() {
  if (!defaultBundlePromise) return;
  try {
    const bundle = await defaultBundlePromise;
    if (bundle && typeof bundle.close === "function") await bundle.close();
  } catch {
    /* build or close failed */
  } finally {
    defaultBundlePromise = null;
  }
}

function createApp(pool, { chatService, buildChatBundleOptions } = {}) {
  const app = express();
  app.use(express.json());

  async function resolveChatService() {
    if (chatService) return chatService;
    if (!defaultBundlePromise) {
      defaultBundlePromise = buildChatBundle(pool, buildChatBundleOptions || {});
    }
    const bundle = await defaultBundlePromise;
    return bundle.chatService;
  }

  app.get("/", (_req, res) => {
    const webApp =
      (process.env.PUBLIC_WEB_APP_URL && String(process.env.PUBLIC_WEB_APP_URL).trim()) || "http://localhost:5173";
    const href = escapeHtmlAttr(webApp);
    const label = escapeHtmlText(webApp);
    res.status(200).type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Customer Service Agent — API</title>
<style>
body{font-family:system-ui,sans-serif;max-width:38rem;margin:2rem auto;padding:0 1rem;line-height:1.55;color:#0f172a}
code{background:#f1f5f9;padding:0 .2rem;border-radius:4px}
</style>
</head>
<body>
  <h1>API server</h1>
  <p>You are on the <strong>backend</strong> port. It exposes JSON routes under <code>/api/…</code> only — there is no SPA at <code>/</code>.</p>
  <p><strong>Open the web app:</strong> <a href="${href}">${label}</a><br/>
  <small>Local dev: run <code>npm run dev</code> in <code>frontend/</code> (Vite default port 5173).</small></p>
  <p>Quick check: <a href="/api/health"><code>/api/health</code></a></p>
</body>
</html>`);
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/chat/metrics", async (req, res, next) => {
    try {
      const expected = process.env.CHAT_METRICS_TOKEN || "";
      if (!expected) {
        res.status(503).json({ error: "metrics_disabled", message: "Set CHAT_METRICS_TOKEN to enable" });
        return;
      }
      const hdr = req.get("X-Chat-Metrics-Token") || "";
      const q = typeof req.query?.token === "string" ? req.query.token : "";
      if (hdr !== expected && q !== expected) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      const svc = await resolveChatService();
      const metrics = typeof svc.getMetrics === "function" ? svc.getMetrics() : null;
      res.json({ metrics: metrics ?? {} });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/chat", async (req, res, next) => {
    try {
      const question = String(req.body?.question || "");
      const pathname = String(req.body?.pathname || "/");
      const mode = String(req.body?.mode || "auto");
      const conversation_id = req.body?.conversation_id;

      // Chat is visible on all pages, so it is not strictly auth-required.
      const token = extractBearerToken(req);
      const role = token && tokenToUser.has(token) ? tokenToUser.get(token).role : "guest";

      const svc = await resolveChatService();
      const budgetKey = token || null;
      const out = await svc.chat({ question, pathname, role, mode, conversation_id, budgetKey });
      const body = { reply: out.reply, conversation_id: out.conversation_id };
      if (out.citations !== undefined) body.citations = out.citations;
      if (out.usage !== undefined) body.usage = out.usage;
      if (out.budget_blocked) body.budget_blocked = true;
      res.json(body);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const fullName = (req.body?.full_name || "").trim();
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");

      if (!fullName || !email || !password) {
        res.status(400).json({ error: "validation_error", message: "full_name, email and password are required" });
        return;
      }
      if (!validateStrongPassword(password)) {
        res.status(400).json({ error: "validation_error", message: "Password must be at least 8 chars and include upper, lower, number, special" });
        return;
      }

      const hash = await bcrypt.hash(password, 10);

      // Customer registration also creates a CRM-like `customers` record.
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const customerId = `CUST-${crypto.randomBytes(6).toString("hex")}`;
        await client.query(
          `INSERT INTO customers (customer_id, name, email, account_status)
           VALUES ($1, $2, $3, 'active')`,
          [customerId, fullName, email]
        );
        await client.query(
          `INSERT INTO users (full_name, email, password_hash, role, is_active, customer_id)
           VALUES ($1, $2, $3, 'customer', true, $4)`,
          [fullName, email, hash, customerId]
        );

        await client.query("COMMIT");
        res.status(201).json({ message: "Registration successful" });
      } catch (e) {
        await client.query("ROLLBACK");
        if (e.code === "23505") {
          res.status(409).json({ error: "conflict", message: "Account already exists" });
          return;
        }
        next(e);
      } finally {
        client.release();
      }
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");
      const result = await pool.query(
        `SELECT id, full_name, email, password_hash, role, is_active, customer_id FROM users WHERE email = $1`,
        [email]
      );
      if (result.rows.length === 0) {
        res.status(401).json({ error: "invalid_credentials" });
        return;
      }
      const row = result.rows[0];
      if (!row.is_active) {
        res.status(403).json({ error: "forbidden", message: "Account inactive" });
        return;
      }
      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) {
        res.status(401).json({ error: "invalid_credentials" });
        return;
      }
      const token = crypto.randomBytes(24).toString("hex");
      tokenToUser.set(token, { id: row.id, full_name: row.full_name, email: row.email, role: row.role, customer_id: row.customer_id });
      res.json({
        token,
        user: {
          id: row.id,
          full_name: row.full_name,
          email: row.email,
          role: row.role,
          customer_id: row.customer_id,
        },
      });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  app.post("/api/auth/logout", requireAuth, (req, res) => {
    tokenToUser.delete(req.token);
    res.json({ ok: true });
  });

  app.get("/api/metrics/inquiries", requireAuth, async (req, res, next) => {
    try {
      const payload = await fetchInquiryDashboardMetrics(pool, req.user);
      res.json(payload);
    } catch (e) {
      if (e.statusCode === 403) {
        res.status(403).json({ error: "forbidden", message: "Role cannot access inquiry metrics" });
        return;
      }
      next(e);
    }
  });

  app.get("/api/inquiries", requireAuth, async (req, res, next) => {
    try {
      const role = req.user.role;
      const userId = req.user.id;
      const customerId = req.user.customer_id;

      let query = "";
      let params = [];

      if (role === "customer") {
        query = `SELECT id, inquiry_id, customer_id, received, accessible, issue_identified, issue_addressed, status, customer_approved, assigned_agent_id, resolved_by_agent_id, created_at
                 FROM inquiries
                 WHERE customer_id = $1
                 ORDER BY inquiry_id`;
        params = [customerId];
      } else if (role === "agent") {
        query = `SELECT id, inquiry_id, customer_id, received, accessible, issue_identified, issue_addressed, status, customer_approved, assigned_agent_id, resolved_by_agent_id, created_at
                 FROM inquiries
                 WHERE (assigned_agent_id = $1 AND status = 'open')
                    OR (resolved_by_agent_id = $1 AND status = 'resolved')
                 ORDER BY inquiry_id`;
        params = [userId];
      } else {
        // lead/admin: management can view all.
        query = `SELECT id, inquiry_id, customer_id, received, accessible, issue_identified, issue_addressed, status, customer_approved, assigned_agent_id, resolved_by_agent_id, created_at
                 FROM inquiries
                 ORDER BY inquiry_id`;
      }

      const { rows } = await pool.query(query, params);
      res.json({ inquiries: rows });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/inquiries/:inquiryId", requireAuth, async (req, res, next) => {
    try {
      const { inquiryId } = req.params;
      const inq = await pool.query(
        `SELECT id, inquiry_id, customer_id, received, accessible, issue_identified, issue_addressed, status, customer_approved, assigned_agent_id, resolved_by_agent_id, created_at
         FROM inquiries WHERE inquiry_id = $1`,
        [inquiryId]
      );
      if (inq.rows.length === 0) {
        res.status(404).json({ error: "not_found", message: "Inquiry not found" });
        return;
      }

      // Role-based authorization: keep access boundaries strict.
      const role = req.user.role;
      const userId = req.user.id;
      const customerId = req.user.customer_id;
      const row = inq.rows[0];
      const canAccess =
        role === "lead" ||
        role === "admin" ||
        (role === "customer" && row.customer_id === customerId) ||
        (role === "agent" && ((row.status === "open" && row.assigned_agent_id === userId) || (row.status === "resolved" && row.resolved_by_agent_id === userId)));

      if (!canAccess) {
        res.status(404).json({ error: "not_found", message: "Inquiry not found" });
        return;
      }

      const msgs = await pool.query(
        `SELECT id, body, sender_type, created_at
         FROM inquiry_messages
         WHERE inquiry_uuid = $1
         ORDER BY created_at ASC`,
        [row.id]
      );
      res.json({ inquiry: row, messages: msgs.rows });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/inquiries/:inquiryId/messages", requireAuth, async (req, res, next) => {
    try {
      const { inquiryId } = req.params;
      const bodyText = req.body && typeof req.body.body === "string" ? req.body.body : "";
      if (bodyText.trim() === "") {
        res.status(400).json({ error: "validation_error", message: "Message body must not be empty" });
        return;
      }
      const inq = await pool.query(
        `SELECT id, status, assigned_agent_id, resolved_by_agent_id, customer_id
         FROM inquiries WHERE inquiry_id = $1`,
        [inquiryId]
      );
      if (inq.rows.length === 0) {
        res.status(404).json({ error: "not_found", message: "Inquiry not found" });
        return;
      }

      const role = req.user.role;
      const userId = req.user.id;
      const customerId = req.user.customer_id;
      const row = inq.rows[0];

      if (role === "customer") {
        res.status(403).json({ error: "forbidden", message: "Customers cannot send internal messages" });
        return;
      }
      if (role === "agent") {
        const can =
          (row.status === "open" && row.assigned_agent_id === userId) ||
          (row.status === "resolved" && row.resolved_by_agent_id === userId);
        if (!can) {
          res.status(404).json({ error: "not_found", message: "Inquiry not found" });
          return;
        }
      }

      const senderType = req.body && typeof req.body.sender_type === "string" ? req.body.sender_type : "agent";
      const ins = await pool.query(
        `INSERT INTO inquiry_messages (inquiry_uuid, body, sender_type)
         VALUES ($1, $2, $3)
         RETURNING id, body, sender_type, created_at`,
        [row.id, bodyText, senderType]
      );
      res.status(201).json({ message: ins.rows[0] });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/inquiries/:inquiryId/crm", requireAuth, async (req, res, next) => {
    try {
      const { inquiryId } = req.params;
      const inq = await pool.query(
        `SELECT customer_id, status, assigned_agent_id, resolved_by_agent_id
         FROM inquiries WHERE inquiry_id = $1`,
        [inquiryId]
      );
      if (inq.rows.length === 0) {
        res.status(404).json({ error: "not_found", message: "Inquiry not found" });
        return;
      }

      const role = req.user.role;
      const userId = req.user.id;
      const customerId = req.user.customer_id;
      const row = inq.rows[0];

      const canAccess =
        role === "lead" ||
        role === "admin" ||
        (role === "customer" && row.customer_id === customerId) ||
        (role === "agent" && ((row.status === "open" && row.assigned_agent_id === userId) || (row.status === "resolved" && row.resolved_by_agent_id === userId)));

      if (!canAccess) {
        res.status(404).json({ error: "not_found", message: "Inquiry not found" });
        return;
      }

      const cust = await pool.query(
        `SELECT customer_id, name, email, account_status FROM customers WHERE customer_id = $1`,
        [row.customer_id]
      );
      res.json({ customer: cust.rows[0] ?? null });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/inquiries", requireAuth, async (req, res, next) => {
    try {
      if (req.user.role !== "customer") {
        res.status(403).json({ error: "forbidden", message: "Only customers can open new inquiries" });
        return;
      }

      const bodyText = req.body && typeof req.body.body === "string" ? req.body.body : "";
      const queryText = bodyText.trim();
      if (!queryText) {
        res.status(400).json({ error: "validation_error", message: "Inquiry text must not be empty" });
        return;
      }

      const customerId = req.user.customer_id;
      if (!customerId) {
        res.status(400).json({ error: "validation_error", message: "Customer mapping is missing" });
        return;
      }

      // Demo-friendly: auto-assign to the earliest active agent.
      const agent = await pool.query(`SELECT id FROM users WHERE role = 'agent' AND is_active = true ORDER BY created_at ASC LIMIT 1`);
      const assignedAgentId = agent.rows[0]?.id ?? null;

      const inquiryId = `INQ-${crypto.randomBytes(6).toString("hex")}`;
      const ins = await pool.query(
        `INSERT INTO inquiries (
            inquiry_id, customer_id, received, accessible,
            issue_identified, issue_addressed, status,
            assigned_agent_id, customer_approved
          ) VALUES ($1, $2, true, true, false, false, 'open', $3, false)
          RETURNING id, inquiry_id`,
        [inquiryId, customerId, assignedAgentId]
      );

      await pool.query(
        `INSERT INTO inquiry_messages (inquiry_uuid, body, sender_type)
         VALUES ($1, $2, 'customer')`,
        [ins.rows[0].id, queryText]
      );

      res.status(201).json({ message: "Inquiry created", inquiry: { inquiry_id: ins.rows[0].inquiry_id } });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/inquiries/:inquiryId/approve", requireAuth, async (req, res, next) => {
    try {
      if (req.user.role !== "customer") {
        res.status(403).json({ error: "forbidden", message: "Only customers can approve resolution" });
        return;
      }

      const { inquiryId } = req.params;
      const customerId = req.user.customer_id;
      const inq = await pool.query(
        `SELECT id, inquiry_id, customer_id, issue_addressed, status, assigned_agent_id
         FROM inquiries WHERE inquiry_id = $1`,
        [inquiryId]
      );
      if (inq.rows.length === 0) {
        res.status(404).json({ error: "not_found", message: "Inquiry not found" });
        return;
      }

      const row = inq.rows[0];
      if (row.customer_id !== customerId) {
        res.status(404).json({ error: "not_found", message: "Inquiry not found" });
        return;
      }
      if (row.issue_addressed !== true) {
        res.status(400).json({ error: "not_ready", message: "Inquiry is not ready for customer approval" });
        return;
      }
      if (row.status !== "open") {
        // Idempotency: if already resolved, keep it resolved.
        if (row.status === "resolved") {
          res.json({ message: "Already approved" });
          return;
        }
      }

      await pool.query(
        `UPDATE inquiries
         SET status = 'resolved',
             customer_approved = true,
             resolved_by_agent_id = $1
         WHERE id = $2`,
        [row.assigned_agent_id, row.id]
      );

      const approvalMessage = "Customer approved the resolution. Inquiry is now resolved.";
      await pool.query(
        `INSERT INTO inquiry_messages (inquiry_uuid, body, sender_type)
         VALUES ($1, $2, 'customer')`,
        [row.id, approvalMessage]
      );

      res.json({ message: "Inquiry approved" });
    } catch (e) {
      next(e);
    }
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}

module.exports = { createApp, closeDefaultChatBundle };
