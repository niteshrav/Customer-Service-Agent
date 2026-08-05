/**
 * Module: In-memory chat conversation store
 *
 * Default store when no DB store is injected; async API matches createPgChatConversationStore for tests.
 * Messages: { role, content, meta? } with meta for usage, citations, flags.
 */
const crypto = require("crypto");

class ChatConversationStore {
  constructor() {
    /** @type {Map<string, { messages: Array<{ role: 'user'|'assistant', content: string, meta?: object }> }>} */
    this.store = new Map();
  }

  createConversation() {
    const id = crypto.randomUUID();
    this.store.set(id, { messages: [] });
    return id;
  }

  has(conversationId) {
    return this.store.has(conversationId);
  }

  async ensure(conversationId) {
    if (!conversationId || !this.has(conversationId)) {
      return this.createConversation();
    }
    return conversationId;
  }

  async listMessages(conversationId) {
    if (!this.has(conversationId)) return [];
    return this.store.get(conversationId).messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.meta && typeof m.meta === "object" ? { meta: { ...m.meta } } : {}),
    }));
  }

  async getHistory(conversationId, limit = 10) {
    const all = await this.listMessages(conversationId);
    return all.slice(Math.max(0, all.length - limit));
  }

  async appendUser(conversationId, content) {
    const id = await this.ensure(conversationId);
    this.store.get(id).messages.push({ role: "user", content: String(content), meta: {} });
    return id;
  }

  async appendAssistant(conversationId, content, meta = null) {
    const id = await this.ensure(conversationId);
    const row = { role: "assistant", content: String(content) };
    if (meta && typeof meta === "object") row.meta = { ...meta };
    this.store.get(id).messages.push(row);
    return id;
  }
}

module.exports = { ChatConversationStore };
