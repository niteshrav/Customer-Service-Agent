/**
 * Module: CSA Assistant UI — demo-ready LLM / RAG chat
 *
 * Floating panel with mode pills, suggestion chips, usage/citations, expand for demos.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChatApi } from "../api/client";
import { formatChatError } from "../lib/chatErrorMessage";

const WELCOME =
  "Hi — I'm CSA Assistant. Use LLM for product help, or RAG for answers grounded in docs (with Sources). Try a suggestion chip below.";

function suggestionsFor(pathname, mode) {
  if (mode === "rag") {
    return [
      "When is an inquiry closed?",
      "How does customer approval work?",
      "What should an agent do first?",
    ];
  }
  if (pathname.startsWith("/login")) {
    return ["What is this app for?", "What can I do on this page?", "What is the password policy?"];
  }
  if (pathname.startsWith("/dashboard")) {
    return ["What is this app for?", "What does the dashboard show?", "What can I do on this page?"];
  }
  if (pathname.startsWith("/inquiries")) {
    return ["How does customer approval work?", "What can I do on this page?", "When is an inquiry closed?"];
  }
  return ["What is this app for?", "What can I do on this page?", "How do I use this app?"];
}

function chatOpenByDefault() {
  return String(import.meta.env.VITE_CHATBOT_OPEN_DEFAULT ?? "") === "true";
}

function formatUsageLine(usage) {
  if (!usage || typeof usage !== "object") return null;
  const parts = [];
  if (usage.model) parts.push(usage.model);
  const prompt = Number(usage.prompt_tokens) || 0;
  const completion = Number(usage.completion_tokens) || 0;
  const total = Number(usage.total_tokens) || prompt + completion;
  if (total) parts.push(`${total} tokens`);
  if (usage.response_cache_hit) parts.push("cache hit");
  if (usage.estimated_cost_usd != null && Number(usage.estimated_cost_usd) > 0) {
    parts.push(`~$${Number(usage.estimated_cost_usd).toFixed(5)}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(chatOpenByDefault);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([
    { role: "bot", content: WELCOME, citations: null, error: false, mode: null, usage: null },
  ]);
  const location = useLocation();
  const [mode, setMode] = useState("llm");
  const [conversationId, setConversationId] = useState(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const logEndRef = useRef(null);

  const chips = useMemo(
    () => suggestionsFor(location.pathname || "/", mode),
    [location.pathname, mode],
  );

  function autosize() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    const sh = Math.max(el.scrollHeight || 0, 22);
    el.style.height = `${Math.min(sh, 140)}px`;
  }

  useEffect(() => {
    autosize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, open, expanded]);

  useEffect(() => {
    if (!open) return;
    const el = logEndRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, sending, open, expanded]);

  async function sendQuestion(raw) {
    const q = String(raw ?? "").trim();
    if (!q || sending) return;

    setText("");
    setSending(true);
    setMessages((m) => [
      ...m,
      { role: "user", content: q, citations: null, error: false, mode: null, usage: null },
    ]);

    try {
      const data = await ChatApi.chat({
        question: q,
        pathname: location.pathname,
        mode,
        conversation_id: conversationId,
      });
      const reply = data?.reply || data?.message || "Sorry, I couldn't generate a reply.";
      if (data?.conversation_id) setConversationId(data.conversation_id);
      const citations = Array.isArray(data?.citations) && data.citations.length ? data.citations : null;
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          content: reply,
          citations,
          error: false,
          mode,
          usage: data?.usage || null,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          content: formatChatError(err),
          citations: null,
          error: true,
          mode,
          usage: null,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function send() {
    void sendQuestion(text);
  }

  function onComposerKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function resetChat() {
    setConversationId(null);
    setMessages([
      { role: "bot", content: WELCOME, citations: null, error: false, mode: null, usage: null },
    ]);
  }

  const showChips = messages.length <= 1 && !sending;

  return (
    <div className={`chatbot-wrap${expanded ? " is-expanded" : ""}`}>
      {open && (
        <div className="chatbot-panel" role="dialog" aria-label="CSA Assistant chat">
          <header className="chatbot-header">
            <div className="chatbot-header-brand">
              <span className="chatbot-avatar bot" aria-hidden="true">
                CSA
              </span>
              <div>
                <div className="chatbot-header-title">CSA Assistant</div>
                <div className="chatbot-header-sub">
                  AI demo · <code className="chatbot-path">{location.pathname || "/"}</code>
                </div>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                type="button"
                className="chatbot-icon-btn"
                aria-label={expanded ? "Shrink chat" : "Expand chat"}
                title={expanded ? "Shrink" : "Expand"}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "↘" : "↖"}
              </button>
              <button
                type="button"
                className="chatbot-icon-btn"
                aria-label="New chat"
                title="New chat"
                onClick={resetChat}
              >
                ↺
              </button>
              <button
                type="button"
                className="chatbot-icon-btn"
                aria-label="Close chat"
                onClick={() => {
                  setOpen(false);
                  setExpanded(false);
                }}
              >
                ×
              </button>
            </div>
          </header>

          <div className="chatbot-mode-bar" role="group" aria-label="Chat mode selector">
            <button
              type="button"
              className={`chatbot-mode-pill${mode === "llm" ? " is-active" : ""}`}
              aria-pressed={mode === "llm"}
              disabled={sending}
              onClick={() => setMode("llm")}
            >
              LLM
            </button>
            <button
              type="button"
              className={`chatbot-mode-pill${mode === "rag" ? " is-active" : ""}`}
              aria-pressed={mode === "rag"}
              disabled={sending}
              onClick={() => setMode("rag")}
            >
              RAG
            </button>
            <p className="chatbot-mode-hint">
              {mode === "rag" ? "Docs + Sources" : "Product help"}
            </p>
          </div>

          <div className="chatbot-log" aria-live="polite" aria-relevant="additions">
            {messages.map((m, i) => (
              <div
                className={`chatbot-row ${m.role === "user" ? "is-user" : "is-bot"}${m.error ? " is-error" : ""}`}
                key={`${m.role}-${i}`}
              >
                {m.role === "bot" && (
                  <span className="chatbot-avatar bot" aria-hidden="true">
                    CSA
                  </span>
                )}
                <div className="chatbot-bubble">
                  {m.role === "bot" && m.mode ? (
                    <div className="chatbot-meta-row">
                      <span className={`chatbot-mode-tag is-${m.mode}`}>{m.mode.toUpperCase()}</span>
                      {formatUsageLine(m.usage) ? (
                        <span className="chatbot-usage">{formatUsageLine(m.usage)}</span>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="chatbot-bubble-text">{m.content}</p>
                  {m.role === "bot" && m.citations?.length ? (
                    <div className="chatbot-citations" role="note" aria-label="Sources">
                      <div className="chatbot-citations-title">Sources</div>
                      <ul className="chatbot-citations-list">
                        {m.citations.map((c, idx) => (
                          <li key={`${c.source_id}-${idx}`}>
                            {c.title}
                            {c.section ? ` — ${c.section}` : ""}
                            <span className="chatbot-citations-id"> ({c.source_id})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
                {m.role === "user" && (
                  <span className="chatbot-avatar user" aria-hidden="true">
                    You
                  </span>
                )}
              </div>
            ))}
            {sending && (
              <div className="chatbot-row is-bot chatbot-typing" aria-label="Assistant is typing">
                <span className="chatbot-avatar bot" aria-hidden="true">
                  CSA
                </span>
                <div className="chatbot-bubble">
                  <span className="chatbot-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            )}
            <div ref={logEndRef} className="chatbot-log-anchor" />
          </div>

          {showChips && (
            <div className="chatbot-chips" aria-label="Suggested questions">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="chatbot-chip"
                  disabled={sending}
                  onClick={() => void sendQuestion(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-composer">
            <div className="chatbot-input-stack">
              <textarea
                ref={inputRef}
                className="chatbot-textarea"
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onInput={autosize}
                onKeyDown={onComposerKeyDown}
                placeholder={mode === "rag" ? "Ask with RAG… Enter to send" : "Ask the LLM… Enter to send"}
                disabled={sending}
                aria-label="Message to CSA Assistant"
              />
              <div className="chatbot-actions">
                <span className="chatbot-composer-mode" aria-hidden="true">
                  {mode.toUpperCase()}
                </span>
                <button
                  type="button"
                  className="btn chatbot-send-btn"
                  onClick={send}
                  disabled={sending || !text.trim()}
                >
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <button type="button" className="chatbot-fab" aria-label="Open Chatbot" onClick={() => setOpen(true)}>
          <span className="chatbot-fab-label">AI Chat</span>
        </button>
      )}
    </div>
  );
}
