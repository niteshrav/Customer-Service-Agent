/**
 * Module: CSA Assistant UI — demo-ready LLM / RAG chat
 *
 * Floating panel with mode pills, suggestion chips, usage/citations, expand for demos.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChatApi } from "../api/client";
import { getUser, isAuthed } from "../lib/auth";
import { formatChatError } from "../lib/chatErrorMessage";

const WELCOME =
  "Hi — I'm CSA Assistant. Try RAG for answers grounded in your docs (with Sources), or LLM for quick product help. Pick a suggestion below to start.";

function defaultModeForPath(pathname) {
  const env = String(import.meta.env.VITE_CHATBOT_DEFAULT_MODE ?? "").trim().toLowerCase();
  if (env === "rag" || env === "llm") return env;
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/inquiries")) return "rag";
  return "llm";
}

function isUnavailableReply(text) {
  return /temporarily unavailable|Could not reach the assistant/i.test(String(text || ""));
}

function suggestionsFor(pathname, mode, role) {
  if (mode === "rag") {
    if (role === "agent" || role === "lead" || role === "admin") {
      return [
        "What should an agent do first?",
        "When is an inquiry closed?",
        "How does customer approval work?",
      ];
    }
    return [
      "When is an inquiry closed?",
      "How does customer approval work?",
      "What does the dashboard show?",
    ];
  }
  if (pathname.startsWith("/login")) {
    return ["What is this app for?", "What can I do on this page?", "What is the password policy?"];
  }
  if (pathname.startsWith("/dashboard")) {
    return ["What does the dashboard show?", "What can I do on this page?", "How do I use this app?"];
  }
  if (pathname.startsWith("/inquiries")) {
    return ["How does customer approval work?", "What can I do on this page?", "When is an inquiry closed?"];
  }
  if (role === "customer") {
    return ["What is this app for?", "How does customer approval work?", "What can I do on this page?"];
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
  if (usage.evidence_fallback) parts.push("from docs");
  if (usage.estimated_cost_usd != null && Number(usage.estimated_cost_usd) > 0) {
    parts.push(`~$${Number(usage.estimated_cost_usd).toFixed(5)}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

function formatScore(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  return `${Math.round(score * 100)}% match`;
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(chatOpenByDefault);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content: WELCOME,
      citations: null,
      error: false,
      mode: null,
      usage: null,
      budgetBlocked: false,
      retryQuestion: null,
      at: new Date().toISOString(),
    },
  ]);
  const location = useLocation();
  const [mode, setMode] = useState(() => defaultModeForPath(location.pathname || "/"));
  const [conversationId, setConversationId] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendingPhase, setSendingPhase] = useState(null);
  const inputRef = useRef(null);
  const logEndRef = useRef(null);
  const abortRef = useRef(null);

  const user = getUser();
  const role = isAuthed() ? user?.role || "customer" : "guest";

  const chips = useMemo(
    () => suggestionsFor(location.pathname || "/", mode, role),
    [location.pathname, mode, role],
  );

  useEffect(() => {
    if (sending) return;
    setMode(defaultModeForPath(location.pathname || "/"));
  }, [location.pathname, sending]);

  useEffect(() => {
    if (!sending) {
      setSendingPhase(null);
      return undefined;
    }
    if (mode !== "rag") {
      setSendingPhase("generate");
      return undefined;
    }
    setSendingPhase("retrieve");
    const t = window.setTimeout(() => setSendingPhase("generate"), 1600);
    return () => window.clearTimeout(t);
  }, [sending, mode]);

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
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [messages, sending, open, expanded]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort?.();
    };
  }, []);

  async function sendQuestion(raw, { isRetry = false } = {}) {
    const q = String(raw ?? "").trim();
    if (!q || sending) return;

    setText("");
    setSending(true);
    if (!isRetry) {
      setMessages((m) => [
        ...m,
        {
          role: "user",
          content: q,
          citations: null,
          error: false,
          mode: null,
          usage: null,
          budgetBlocked: false,
          retryQuestion: null,
          at: new Date().toISOString(),
        },
      ]);
    }

    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await ChatApi.chat({
        question: q,
        pathname: location.pathname,
        mode,
        conversation_id: conversationId,
        signal: controller.signal,
      });
      const reply = data?.reply || data?.message || "Sorry, I couldn't generate a reply.";
      if (data?.conversation_id) setConversationId(data.conversation_id);
      const citations = Array.isArray(data?.citations) && data.citations.length ? data.citations : null;
      const budgetBlocked = Boolean(data?.budget_blocked);
      const evidenceFallback = Boolean(data?.usage?.evidence_fallback);
      const unavailable = !evidenceFallback && isUnavailableReply(reply) && !citations?.length;
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          content: budgetBlocked ? formatChatError(new Error(reply)) : reply,
          citations,
          error: budgetBlocked || unavailable,
          mode,
          usage: data?.usage || null,
          budgetBlocked,
          evidenceFallback,
          retryQuestion: unavailable ? q : null,
          emptyRag: mode === "rag" && !citations?.length && !evidenceFallback,
          at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      if (err?.name === "AbortError") {
        setMessages((m) => [
          ...m,
          {
            role: "bot",
            content: formatChatError(err),
            citations: null,
            error: true,
            mode,
            usage: null,
            budgetBlocked: false,
            retryQuestion: null,
            at: new Date().toISOString(),
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "bot",
            content: formatChatError(err),
            citations: null,
            error: true,
            mode,
            usage: null,
            budgetBlocked: false,
            retryQuestion: q,
            at: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  function send() {
    void sendQuestion(text);
  }

  function cancelSend() {
    abortRef.current?.abort?.();
  }

  function onComposerKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function resetChat() {
    abortRef.current?.abort?.();
    setConversationId(null);
    setMessages([
      {
        role: "bot",
        content: WELCOME,
        citations: null,
        error: false,
        mode: null,
        usage: null,
        budgetBlocked: false,
        retryQuestion: null,
        at: new Date().toISOString(),
      },
    ]);
  }

  function switchMode(next) {
    if (sending || next === mode) return;
    setMode(next);
  }

  const showChips = !sending;

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
                <div className="chatbot-header-title-row">
                  <div className="chatbot-header-title">CSA Assistant</div>
                  <span className="chatbot-status" aria-label="Assistant ready">
                    <span className="chatbot-status-dot" aria-hidden="true" />
                    Ready
                  </span>
                </div>
                <div className="chatbot-header-sub">
                  {mode === "rag" ? "RAG · grounded answers" : "LLM · product help"} ·{" "}
                  <code className="chatbot-path">{location.pathname || "/"}</code>
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
            <div className="chatbot-mode-pills">
              <button
                type="button"
                className={`chatbot-mode-pill${mode === "llm" ? " is-active" : ""}`}
                aria-pressed={mode === "llm"}
                aria-label="LLM"
                disabled={sending}
                onClick={() => switchMode("llm")}
              >
                <span className="chatbot-mode-pill-label">LLM</span>
                <span className="chatbot-mode-pill-desc">Quick help</span>
              </button>
              <button
                type="button"
                className={`chatbot-mode-pill${mode === "rag" ? " is-active" : ""}`}
                aria-pressed={mode === "rag"}
                aria-label="RAG"
                disabled={sending}
                onClick={() => switchMode("rag")}
              >
                <span className="chatbot-mode-pill-label">RAG</span>
                <span className="chatbot-mode-pill-desc">Docs + Sources</span>
              </button>
            </div>
            <p className="chatbot-mode-hint">
              {mode === "rag"
                ? "Retrieves knowledge-base passages, then answers with citations"
                : "Context-aware product guidance for this page"}
            </p>
          </div>

          <div className="chatbot-log" aria-live="polite" aria-relevant="additions">
            {messages.map((m, i) => (
              <div
                className={`chatbot-row ${m.role === "user" ? "is-user" : "is-bot"}${m.error ? " is-error" : ""}`}
                key={`${m.role}-${i}-${m.at || ""}`}
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
                  {m.at ? (
                    <time className="chatbot-time" dateTime={m.at}>
                      {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {m.role === "user" ? " · sent" : ""}
                    </time>
                  ) : null}
                  {m.role === "bot" && m.evidenceFallback ? (
                    <div className="chatbot-evidence-badge" role="status">
                      Answer synthesized from retrieved Sources
                    </div>
                  ) : null}
                  {m.role === "bot" && m.mode === "rag" && m.emptyRag ? (
                    <div className="chatbot-rag-empty" role="note">
                      No strong knowledge-base match — answered from product guidance. Try a workflow question or switch docs topic.
                    </div>
                  ) : null}
                  {m.role === "bot" && m.citations?.length ? (
                    <div className="chatbot-citations" role="note" aria-label="Sources">
                      <div className="chatbot-citations-title">Sources</div>
                      <ul className="chatbot-citations-list">
                        {m.citations.map((c, idx) => (
                          <li key={`${c.source_id}-${idx}`}>
                            <details className="chatbot-citation-details">
                              <summary>
                                {c.title}
                                {c.section ? ` — ${c.section}` : ""}
                                <span className="chatbot-citations-id"> ({c.source_id})</span>
                                {formatScore(c.score) ? (
                                  <span className="chatbot-citation-score"> · {formatScore(c.score)}</span>
                                ) : null}
                              </summary>
                              {c.snippet ? <p className="chatbot-citation-snippet">{c.snippet}</p> : (
                                <p className="chatbot-citation-snippet">Retrieved from the knowledge corpus.</p>
                              )}
                            </details>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {m.role === "bot" && m.retryQuestion ? (
                    <button
                      type="button"
                      className="btn secondary btn-compact chatbot-retry"
                      onClick={() => void sendQuestion(m.retryQuestion, { isRetry: true })}
                      disabled={sending}
                    >
                      Retry
                    </button>
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
                  <span className="chatbot-typing-label">
                    {mode === "rag" && sendingPhase === "retrieve"
                      ? "Searching knowledge base…"
                      : mode === "rag"
                        ? "Generating from docs…"
                        : "Thinking…"}
                  </span>
                </div>
              </div>
            )}
            <div ref={logEndRef} className="chatbot-log-anchor" />
          </div>

          {showChips && (
            <div className="chatbot-chips-wrap">
              <div className="chatbot-chips-label">Try asking</div>
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
                placeholder={
                  mode === "rag"
                    ? "Ask with RAG (docs + Sources)… Enter to send"
                    : "Ask the LLM… Enter to send"
                }
                disabled={sending}
                aria-label="Message to CSA Assistant"
              />
              <div className="chatbot-actions">
                <span className="chatbot-composer-mode" aria-hidden="true">
                  {mode.toUpperCase()}
                </span>
                {sending ? (
                  <button type="button" className="btn secondary chatbot-send-btn" onClick={cancelSend}>
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn chatbot-send-btn"
                    onClick={send}
                    disabled={!text.trim()}
                  >
                    Send
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <button type="button" className="chatbot-fab" aria-label="Open Chatbot" onClick={() => setOpen(true)}>
          <span className="chatbot-fab-icon" aria-hidden="true">✦</span>
          <span className="chatbot-fab-label">AI Chat</span>
        </button>
      )}
    </div>
  );
}
