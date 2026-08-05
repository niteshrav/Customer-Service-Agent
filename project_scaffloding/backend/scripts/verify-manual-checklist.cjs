#!/usr/bin/env node
/**
 * Module: Manual API checklist runner
 *
 * Supertest-only smoke of auth, inquiries, chat, etc. Requires DATABASE_URL like npm test.
 */
const path = require("path");
require(path.join(__dirname, "..", "env.cjs")).loadBackendEnv();

const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../src/app.cjs");
const { createTestPool, truncateAll } = require("../tests/api/test-pool.cjs");
const { createChatService } = require("../src/chat/createChatService.cjs");
const { createChatTelemetry } = require("../src/chat/chatTelemetry.cjs");
const { createCustomerAndLogin, createAgentAndLogin } = require("../tests/auth/auth-helpers.cjs");

async function main() {
  const pool = createTestPool();
  const client = await pool.connect();
  try {
    await truncateAll(client);
  } finally {
    client.release();
  }

  const llmMock = {
    invoke: async () => ({
      content: "MANUAL_CHECK_OK",
      usage_metadata: { input_tokens: 2, output_tokens: 2, total_tokens: 4 },
    }),
  };
  const telemetry = createChatTelemetry();
  const chatService = createChatService({ llm: llmMock, telemetry, promptVersion: "manual-check" });
  const app = createApp(pool, { chatService });

  const prevMetricsToken = process.env.CHAT_METRICS_TOKEN;
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  async function run(id, fn) {
    try {
      await fn();
      console.log(`PASS  ${id}`);
      passed += 1;
    } catch (e) {
      console.log(`FAIL  ${id} — ${e.message}`);
      failed += 1;
    }
  }

  function skip(id, reason) {
    console.log(`SKIP  ${id} — ${reason}`);
    skipped += 1;
  }

  await run("H-1 Health", async () => {
    const res = await request(app).get("/api/health").expect(200);
    assert.equal(res.body.ok, true);
  });

  const regEmail = `manual_${Date.now()}@example.com`;
  await run("A-1 Register", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        full_name: "Manual Tester",
        email: regEmail,
        password: "Strong@123",
      })
      .expect(201);
  });

  await run("A-2 Register weak password", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        full_name: "X",
        email: "weak@example.com",
        password: "short",
      })
      .expect(400);
  });

  await run("A-3 Login", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: regEmail, password: "Strong@123" }).expect(200);
    assert.ok(res.body.token);
    assert.ok(res.body.user);
  });

  const login = await request(app).post("/api/auth/login").send({ email: regEmail, password: "Strong@123" }).expect(200);
  const token = login.body.token;

  await run("A-4 Me authorized", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`).expect(200);
    assert.ok(res.body.user);
  });

  await run("A-5 Me unauthorized", async () => {
    await request(app).get("/api/auth/me").expect(401);
  });

  await run("I-1 List inquiries (customer)", async () => {
    const res = await request(app).get("/api/inquiries").set("Authorization", `Bearer ${token}`).expect(200);
    assert.ok(Array.isArray(res.body.inquiries));
  });

  await run("M-1 GET /api/metrics/inquiries (customer scope)", async () => {
    const res = await request(app).get("/api/metrics/inquiries").set("Authorization", `Bearer ${token}`).expect(200);
    assert.equal(res.body.scope, "customer");
    assert.ok(res.body.inquiries);
    assert.equal(typeof res.body.inquiries.total, "number");
    assert.equal(typeof res.body.inquiries.awaiting_customer_approval, "number");
  });

  await run("I-5 Empty inquiry message", async () => {
    const suf = `e${Date.now()}`;
    const cust = await createCustomerAndLogin(app, pool, suf);
    const agent = await createAgentAndLogin(app, pool, suf);
    const { rows: cr } = await pool.query(`SELECT customer_id FROM users WHERE email = $1`, [cust.email]);
    const customerId = cr[0].customer_id;
    const ins = await pool.query(
      `INSERT INTO inquiries (inquiry_id, customer_id, received, accessible, issue_identified, issue_addressed, status, assigned_agent_id)
       VALUES ($1, $2, true, true, true, false, 'open', (SELECT id FROM users WHERE email = $3)) RETURNING inquiry_id`,
      [`INQ-M-${Date.now()}`, customerId, agent.email]
    );
    const inquiryId = ins.rows[0].inquiry_id;
    await request(app)
      .post(`/api/inquiries/${inquiryId}/messages`)
      .set("Authorization", `Bearer ${agent.token}`)
      .send({ body: "   " })
      .expect(400);
  });

  await run("CH-1 Empty chat question", async () => {
    const res = await request(app).post("/api/chat").send({ question: "", pathname: "/" }).expect(200);
    assert.ok(String(res.body.reply).toLowerCase().includes("enter") || res.body.reply.length > 0);
  });

  await run("CH-2 Guest show inquiries", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "Show my inquiries", pathname: "/dashboard" })
      .expect(200);
    assert.ok(res.body.reply.includes("Sign in"));
  });

  await run("CH-3 Off-domain", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "Who won the world cup?", pathname: "/" })
      .expect(200);
    assert.ok(res.body.reply.includes("outside what I cover") || res.body.reply.includes("inquiries"));
  });

  await run("CH-4 Login/API refusal", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "What is the Authorization header format?", pathname: "/login" })
      .expect(200);
    assert.ok(res.body.reply.includes("Sign in") || res.body.reply.includes("Register"));
  });

  await run("CH-5 In-domain LLM (mock)", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "What does issue_addressed mean on an inquiry?", pathname: "/", mode: "llm" })
      .expect(200);
    assert.equal(res.body.reply, "MANUAL_CHECK_OK");
    assert.ok(res.body.usage);
  });

  const ragRetriever = {
    embedQuery: async () => [1, 0, 0],
    search: async () => [],
  };
  const appRagEmpty = createApp(pool, {
    chatService: createChatService({ llm: llmMock, ragRetriever }),
  });
  await run("CH-6 RAG empty retrieval", async () => {
    const res = await request(appRagEmpty)
      .post("/api/chat")
      .send({ question: "What is customer approval?", pathname: "/", mode: "rag" })
      .expect(200);
    assert.ok(res.body.citations !== undefined);
    assert.equal(res.body.citations.length, 0);
  });

  const client2 = await pool.connect();
  try {
    await client2.query(
      `INSERT INTO rag_document_chunks
       (source_id, title, section_label, body, embedding, corpus_version, visible_roles)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      [
        "manual-guide-chunk",
        "Workflow",
        "Approval",
        "Closed requires customer_approved=true.",
        JSON.stringify([1, 0, 0]),
        "v1",
        ["guest", "customer", "agent", "lead", "admin"],
      ]
    );
  } finally {
    client2.release();
  }
  const { createPgRagRetriever } = require("../src/chat/pgRagRetriever.cjs");
  const ragRetrieverHit = createPgRagRetriever({
    pool,
    embedQuery: async () => [1, 0, 0],
  });
  const appRagHit = createApp(pool, {
    chatService: createChatService({ llm: llmMock, ragRetriever: ragRetrieverHit }),
  });
  await run("CH-7 RAG with corpus row", async () => {
    const res = await request(appRagHit)
      .post("/api/chat")
      .send({ question: "When is an inquiry closed?", pathname: "/", mode: "rag" })
      .expect(200);
    assert.ok(Array.isArray(res.body.citations));
    assert.ok(res.body.citations.length >= 1);
  });

  await run("CH-8 Conversation continuity", async () => {
    const r1 = await request(app)
      .post("/api/chat")
      .send({ question: "What does issue_addressed mean?", pathname: "/", mode: "llm" })
      .expect(200);
    const cid = r1.body.conversation_id;
    const r2 = await request(app)
      .post("/api/chat")
      .send({ question: "When is an inquiry resolved?", pathname: "/", mode: "llm", conversation_id: cid })
      .expect(200);
    assert.equal(r2.body.conversation_id, cid);
  });

  await run("CH-9 Mode switch same conversation_id", async () => {
    const r1 = await request(app)
      .post("/api/chat")
      .send({ question: "What does issue_addressed mean?", pathname: "/", mode: "llm" })
      .expect(200);
    const cid = r1.body.conversation_id;
    const r2 = await request(app)
      .post("/api/chat")
      .send({ question: "Explain inquiry timeline", pathname: "/", mode: "rag", conversation_id: cid })
      .expect(200);
    assert.equal(r2.body.conversation_id, cid);
  });

  delete process.env.CHAT_METRICS_TOKEN;
  await run("CH-10 Metrics disabled (503)", async () => {
    await request(app).get("/api/chat/metrics").expect(503);
  });

  process.env.CHAT_METRICS_TOKEN = "manual-checklist-secret";
  await run("CH-11 Metrics authorized", async () => {
    await request(app)
      .post("/api/chat")
      .send({ question: "Explain the timeline for an inquiry", pathname: "/" })
      .expect(200);
    const res = await request(app)
      .get("/api/chat/metrics")
      .set("X-Chat-Metrics-Token", "manual-checklist-secret")
      .expect(200);
    assert.ok(res.body.metrics);
    assert.ok(typeof res.body.metrics.requests_total === "number");
  });

  if (prevMetricsToken === undefined) {
    delete process.env.CHAT_METRICS_TOKEN;
  } else {
    process.env.CHAT_METRICS_TOKEN = prevMetricsToken;
  }

  skip("CH-12", "optional env CHAT_DAILY_TOKEN_BUDGET_PER_KEY (see api/chat.test.cjs)");
  skip("R-1", "optional REDIS_URL + running Redis");
  skip("RES-1", "provider outage / circuit breaker (manual or fault injection)");

  console.log("\n--- Summary ---");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped (documented): ${skipped}`);
  console.log("\nNot executed here (browser): UI-1 … UI-9 — covered by frontend Vitest when you run: cd frontend && npm test");

  await pool.end();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
