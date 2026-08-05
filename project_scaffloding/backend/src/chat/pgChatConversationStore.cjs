/**
 * Module: Postgres chat conversation store
 *
 * Persists chat_conversations and chat_messages; ensure/listMessages/appendUser/appendAssistant with UUID ids and meta_json for usage/citations.
 */
const { isUuid } = require("./chatUuid.cjs");

function createPgChatConversationStore({ pool } = {}) {
  if (!pool) throw new Error("pool is required");

  async function ensure(conversationId) {
    if (!conversationId || !isUuid(String(conversationId))) {
      const r = await pool.query(`INSERT INTO chat_conversations DEFAULT VALUES RETURNING id`);
      return r.rows[0].id;
    }
    const idStr = String(conversationId);
    const found = await pool.query(`SELECT id FROM chat_conversations WHERE id = $1::uuid`, [idStr]);
    if (found.rows.length) return idStr;
    const r = await pool.query(`INSERT INTO chat_conversations DEFAULT VALUES RETURNING id`);
    return r.rows[0].id;
  }

  async function listMessages(conversationId) {
    const { rows } = await pool.query(
      `SELECT role, content, meta_json
       FROM chat_messages
       WHERE conversation_id = $1::uuid
       ORDER BY created_at ASC`,
      [conversationId]
    );
    return rows.map((r) => {
      const meta = r.meta_json && typeof r.meta_json === "object" ? { ...r.meta_json } : {};
      const out = { role: r.role, content: r.content };
      if (Object.keys(meta).length) out.meta = meta;
      return out;
    });
  }

  async function appendUser(conversationId, content) {
    const id = await ensure(conversationId);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO chat_messages (conversation_id, role, content, meta_json)
         VALUES ($1::uuid, 'user', $2, '{}'::jsonb)`,
        [id, String(content)]
      );
      await client.query(`UPDATE chat_conversations SET updated_at = now() WHERE id = $1::uuid`, [id]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    return id;
  }

  async function appendAssistant(conversationId, content, meta = null) {
    const id = await ensure(conversationId);
    const payload = meta && typeof meta === "object" ? JSON.stringify(meta) : "{}";
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO chat_messages (conversation_id, role, content, meta_json)
         VALUES ($1::uuid, 'assistant', $2, $3::jsonb)`,
        [id, String(content), payload]
      );
      await client.query(`UPDATE chat_conversations SET updated_at = now() WHERE id = $1::uuid`, [id]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    return id;
  }

  return { ensure, listMessages, appendUser, appendAssistant };
}

module.exports = { createPgChatConversationStore };
