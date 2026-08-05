/**
 * Module: In-app CSA Assistant UI
 *
 * Floating panel: message log, LLM/RAG mode, sends ChatApi.chat with current route pathname and conversation_id for threaded backend chat.
 */
/**
 * Module: CSA Assistant UI
 *
 * Collapsible chat panel: posts to ChatApi.chat with pathname, mode (llm|rag), and conversation_id; shows citations when returned.
 */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChatApi } from "../api/client";

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content:
        "Hi — I'm CSA Assistant. Ask about this app, your current page, or inquiry workflows. I won't cover technical implementation details.",
      citations: null,
    },
  ]);
  const location = useLocation();
  const [mode, setMode] = useState("llm");
  const [conversationId, setConversationId] = useState(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  function autosize() {
    const el = inputRef.current;
    if (!el) return;
    // Reset then grow to content height.
    el.style.height = "0px";
    const sh = Math.max(el.scrollHeight || 0, 22); // JSDOM can report 0; keep at least one line.
    el.style.height = `${Math.min(sh, 180)}px`;
  }

  useEffect(() => {
    autosize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, open]);

  async function send() {
    const q = String(text ?? "").trim();
    if (!q) return;

    setText("");
    setSending(true);
    setMessages((m) => [...m, { role: "user", content: q }]);

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
      setMessages((m) => [...m, { role: "bot", content: reply, citations }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", content: err.message || "Chat failed.", citations: null }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chatbot-wrap">
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-log">
            {messages.map((m, i) => (
              <div className={`chatbot-msg ${m.role === "user" ? "user" : ""}`} key={`${m.role}-${i}`}>
                <strong>{m.role === "user" ? "You" : "Bot"}: </strong>
                {m.content}
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
            ))}
          </div>
          <div className="row">
            <div className="chatbot-input-stack">
              <textarea
                ref={inputRef}
                className="chatbot-textarea"
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onInput={autosize}
                placeholder="Ask a question..."
              />
              <div className="chatbot-actions">
                <select
                  aria-label="Chat mode selector"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="chatbot-mode-select"
                >
                  <option value="llm">LLM</option>
                  <option value="rag">RAG</option>
                </select>
                <button className="btn" onClick={send} disabled={sending}>
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <button className="chatbot-btn" onClick={() => setOpen((v) => !v)}>{open ? "Close Chat" : "Open Chatbot"}</button>
    </div>
  );
}
