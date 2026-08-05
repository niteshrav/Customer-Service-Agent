/**
 * TDD: these tests define the PostgreSQL schema contract for the Customer Service Agent.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { Client } = require("pg");
const { getConnectionString, applyMigrations, truncateAll } = require("./test-helpers.cjs");

test.describe("PostgreSQL schema (TDD)", () => {
  let client;

  test.before(async () => {
    client = new Client({ connectionString: getConnectionString() });
    await client.connect();
    await applyMigrations(client);
  });

  test.after(async () => {
    if (client) await client.end();
  });

  test.beforeEach(async () => {
    await truncateAll(client);
  });

  test("required tables exist", async () => {
    const { rows } = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN (
           'chat_conversations', 'chat_messages',
           'customers', 'inquiries', 'inquiry_messages', 'rag_document_chunks', 'users'
         )
       ORDER BY table_name`
    );
    const names = rows.map((r) => r.table_name);
    assert.deepEqual(names, [
      "chat_conversations",
      "chat_messages",
      "customers",
      "inquiries",
      "inquiry_messages",
      "rag_document_chunks",
      "users",
    ]);
  });

  test("rag_document_chunks has expected columns", async () => {
    const { rows } = await client.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'rag_document_chunks'
       ORDER BY ordinal_position`
    );
    const cols = Object.fromEntries(rows.map((r) => [r.column_name, r.data_type]));
    assert.ok(cols.id === "uuid");
    assert.equal(cols.source_id, "text");
    assert.equal(cols.body, "text");
    assert.equal(cols.embedding, "jsonb");
    assert.equal(cols.corpus_version, "text");
    assert.ok(Object.prototype.hasOwnProperty.call(cols, "visible_roles"));
  });

  test("customers has expected columns", async () => {
    const { rows } = await client.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'customers'
       ORDER BY ordinal_position`
    );
    const cols = Object.fromEntries(rows.map((r) => [r.column_name, r.data_type]));
    assert.equal(cols.customer_id, "text");
    assert.equal(cols.name, "text");
    assert.equal(cols.email, "text");
    assert.ok(cols.id === "uuid");
  });

  test("users has auth fields", async () => {
    const { rows } = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'`
    );
    const cols = new Set(rows.map((r) => r.column_name));
    assert.ok(cols.has("email"));
    assert.ok(cols.has("password_hash"));
    assert.ok(cols.has("role"));
    assert.ok(cols.has("customer_id"));
  });

  test("inquiries has assignment + approval fields", async () => {
    const { rows } = await client.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'inquiries'
       ORDER BY ordinal_position`
    );
    const cols = Object.fromEntries(rows.map((r) => [r.column_name, r.data_type]));

    assert.equal(cols.customer_approved, "boolean");
    assert.ok(cols.assigned_agent_id === "uuid" || cols.assigned_agent_id === "USER-DEFINED");
    assert.ok(cols.resolved_by_agent_id === "uuid" || cols.resolved_by_agent_id === "USER-DEFINED");
  });

  test("status=resolved requires customer_approved=true", async () => {
    await client.query(
      `INSERT INTO customers (customer_id, name, email, account_status)
       VALUES ($1, $2, $3, $4)`,
      ["CUST-RES-1", "Res Customer", "res@example.com", "active"]
    );
    await assert.rejects(
      async () => {
        await client.query(
          `INSERT INTO inquiries (inquiry_id, customer_id, received, accessible, issue_identified, issue_addressed, status, customer_approved)
           VALUES ($1, $2, true, true, false, false, 'resolved', false)`,
          ["INQ-RES-1", "CUST-RES-1"]
        );
      },
      (err) => err.code === "23514"
    );
  });

  test("can insert customer, inquiry, and message (happy path)", async () => {
    await client.query(
      `INSERT INTO customers (customer_id, name, email, account_status)
       VALUES ($1, $2, $3, $4)`,
      ["CUST-1001", "Ava Patel", "ava@example.com", "active"]
    );
    const ins = await client.query(
      `INSERT INTO inquiries (
         inquiry_id, customer_id, received, accessible, issue_identified, issue_addressed, status
       ) VALUES ($1, $2, true, true, true, false, 'open')
       RETURNING id`,
      ["INQ-2001", "CUST-1001"]
    );
    const inquiryUuid = ins.rows[0].id;
    await client.query(
      `INSERT INTO inquiry_messages (inquiry_uuid, body, sender_type)
       VALUES ($1, $2, 'agent')`,
      [inquiryUuid, "Hello, I can help with that."]
    );
    const msgs = await client.query(`SELECT body FROM inquiry_messages WHERE inquiry_uuid = $1`, [inquiryUuid]);
    assert.equal(msgs.rows.length, 1);
  });

  test("inquiries.customer_id must reference existing customer (FK)", async () => {
    await assert.rejects(
      async () => {
        await client.query(`INSERT INTO inquiries (inquiry_id, customer_id) VALUES ($1, $2)`, ["INQ-9999", "CUST-MISSING"]);
      },
      (err) => err.code === "23503"
    );
  });

  test("chat_messages stores meta_json and links to conversation", async () => {
    const conv = await client.query(`INSERT INTO chat_conversations DEFAULT VALUES RETURNING id`);
    const convId = conv.rows[0].id;
    await client.query(
      `INSERT INTO chat_messages (conversation_id, role, content, meta_json)
       VALUES ($1, 'user', $2, '{}'::jsonb)`,
      [convId, "What is an inquiry?"]
    );
    await client.query(
      `INSERT INTO chat_messages (conversation_id, role, content, meta_json)
       VALUES ($1, 'assistant', $2, $3::jsonb)`,
      [convId, "An inquiry is a customer case.", JSON.stringify({ usage: { total_tokens: 10 } })]
    );
    const { rows } = await client.query(
      `SELECT role, meta_json FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at`,
      [convId]
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[1].meta_json.usage.total_tokens, 10);
  });

  test("inquiry_messages.body cannot be empty (CHECK)", async () => {
    await client.query(`INSERT INTO customers (customer_id, name, email) VALUES ($1, $2, $3)`, ["CUST-1002", "Noah Kim", "noah@example.com"]);
    const ins = await client.query(`INSERT INTO inquiries (inquiry_id, customer_id) VALUES ($1, $2) RETURNING id`, ["INQ-2002", "CUST-1002"]);
    await assert.rejects(
      async () => {
        await client.query(`INSERT INTO inquiry_messages (inquiry_uuid, body) VALUES ($1, $2)`, [ins.rows[0].id, "   "]);
      },
      (err) => err.code === "23514"
    );
  });
});
