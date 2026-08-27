import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSession, setSession } from "../lib/auth";
import ChatbotWidget from "./ChatbotWidget";

const chatMock = vi.fn();

vi.mock("../api/client", () => ({
  ChatApi: {
    chat: (...args) => chatMock(...args),
  },
}));

describe("ChatbotWidget", () => {
  afterEach(() => {
    clearSession();
    chatMock.mockReset();
  });

  async function openChat(user) {
    const openBtn = screen.queryByRole("button", { name: /Open Chatbot/i });
    if (openBtn) await user.click(openBtn);
  }

  async function openAndAsk(question) {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ChatbotWidget />
      </MemoryRouter>,
    );
    await openChat(user);
    await user.type(screen.getByLabelText(/Message to CSA Assistant/i), question);
    await user.click(screen.getByRole("button", { name: /^Send$/i }));
  }

  it("opens with CSA Assistant persona scope (any page)", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <ChatbotWidget />
      </MemoryRouter>,
    );
    await openChat(user);
    expect(screen.getByRole("dialog", { name: /CSA Assistant chat/i })).toBeInTheDocument();
    expect(screen.getByText(/Try RAG for answers/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Chat mode selector/i })).toBeInTheDocument();
  });

  it("shows mode-specific suggestion chips for demo", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ChatbotWidget />
      </MemoryRouter>,
    );
    await openChat(user);
    expect(screen.getByRole("button", { name: /What is this app for\?/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^RAG$/i }));
    expect(screen.getByRole("button", { name: /When is an inquiry closed\?/i })).toBeInTheDocument();
  });

  it("shows usage metadata on replies when API returns usage", async () => {
    chatMock.mockResolvedValueOnce({
      reply: "Demo reply",
      conversation_id: "conv-usage",
      usage: { model: "gpt-4o-mini", total_tokens: 42, prompt_tokens: 30, completion_tokens: 12 },
    });
    await openAndAsk("Hello");
    expect(await screen.findByText(/Demo reply/i)).toBeInTheDocument();
    expect(screen.getByText(/gpt-4o-mini/i)).toBeInTheDocument();
    expect(screen.getByText(/42 tokens/i)).toBeInTheDocument();
  });

  it("replies with password policy when asked", async () => {
    chatMock.mockResolvedValueOnce({
      reply: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      conversation_id: "conv-test",
    });
    await openAndAsk("What is a strong password?");
    expect(
      await screen.findByText(/Password must be at least 8 characters/i),
    ).toBeInTheDocument();
  });

  it("uses auth context: blocked inquiry help when logged out", async () => {
    chatMock.mockResolvedValueOnce({
      reply: "Please login first to access inquiry, CRM, and dashboard features.",
      conversation_id: "conv-test",
    });
    await openAndAsk("Show my inquiries");
    expect(await screen.findByText(/Please login first/i)).toBeInTheDocument();
  });

  it("allows richer help when authenticated", async () => {
    setSession("t", { email: "a@b.com" });
    chatMock.mockResolvedValueOnce({
      reply: "You can open an inquiry from Dashboard, view CRM context, and send a response from Inquiry Detail.",
      conversation_id: "conv-test",
    });
    await openAndAsk("What can I do?");
    expect(await screen.findByText(/Inquiry Detail/i)).toBeInTheDocument();
  });

  it("sends current route pathname on each chat request (any page)", async () => {
    chatMock.mockResolvedValueOnce({
      reply: "ok",
      conversation_id: "conv-path",
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ChatbotWidget />
      </MemoryRouter>,
    );

    await openChat(user);
    await user.type(screen.getByLabelText(/Message to CSA Assistant/i), "What metrics can I see?");
    await user.click(screen.getByRole("button", { name: /^Send$/i }));

    expect(chatMock).toHaveBeenCalledTimes(1);
    expect(chatMock.mock.calls[0][0].pathname).toBe("/dashboard");
  });

  it("switching LLM/RAG keeps the same conversation_id", async () => {
    chatMock
      .mockResolvedValueOnce({
        reply: "LLM reply",
        conversation_id: "conv-1",
      })
      .mockResolvedValueOnce({
        reply: "RAG reply",
        conversation_id: "conv-1",
      });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ChatbotWidget />
      </MemoryRouter>,
    );

    await openChat(user);

    await user.click(screen.getByRole("button", { name: /^RAG$/i }));
    await user.type(screen.getByLabelText(/Message to CSA Assistant/i), "First question in RAG");
    await user.click(screen.getByRole("button", { name: /^Send$/i }));

    await user.click(screen.getByRole("button", { name: /^LLM$/i }));
    await user.type(screen.getByLabelText(/Message to CSA Assistant/i), "Second question in LLM");
    await user.click(screen.getByRole("button", { name: /^Send$/i }));

    expect(chatMock).toHaveBeenCalledTimes(2);

    const firstCallPayload = chatMock.mock.calls[0][0];
    const secondCallPayload = chatMock.mock.calls[1][0];

    expect(firstCallPayload.conversation_id).toBeNull();
    expect(firstCallPayload.mode).toBe("rag");
    expect(firstCallPayload.question).toBe("First question in RAG");
    expect(secondCallPayload.conversation_id).toBe("conv-1");
    expect(secondCallPayload.mode).toBe("llm");
    expect(secondCallPayload.question).toBe("Second question in LLM");
  });

  it("shows RAG sources when API returns citations", async () => {
    chatMock.mockResolvedValueOnce({
      reply: "Answer from knowledge base.",
      conversation_id: "conv-rag",
      citations: [{ source_id: "workflow", title: "Workflow", section: "Approval" }],
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ChatbotWidget />
      </MemoryRouter>,
    );

    await openChat(user);
    await user.click(screen.getByRole("button", { name: /^RAG$/i }));
    await user.type(screen.getByLabelText(/Message to CSA Assistant/i), "When is an inquiry closed?");
    await user.click(screen.getByRole("button", { name: /^Send$/i }));

    const sourcesNote = await screen.findByRole("note", { name: /Sources/i });
    expect(sourcesNote).toHaveTextContent("Workflow");
    expect(sourcesNote).toHaveTextContent("Approval");
    expect(sourcesNote.textContent).toMatch(/\(workflow\)/i);
  });

  it("textarea starts one-line and grows as text grows", async () => {
    chatMock.mockResolvedValueOnce({
      reply: "ok",
      conversation_id: "conv-test",
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ChatbotWidget />
      </MemoryRouter>,
    );

    await openChat(user);

    const input = screen.getByLabelText(/Message to CSA Assistant/i);
    expect(input.getAttribute("rows")).toBe("1");
    Object.defineProperty(input, "scrollHeight", {
      configurable: true,
      get() {
        const lines = String(input.value || "").split("\n").length;
        return Math.max(lines * 22, 22);
      },
    });

    // After typing a single line, it should still be constrained (not huge).
    await user.type(input, "Hello");
    const h1 = Number.parseInt(input.style.height || "0", 10);
    expect(h1).toBeGreaterThan(0);
    expect(h1).toBeLessThan(120);

    // Multi-line should grow.
    await user.clear(input);
    await user.type(input, "Line 1{Shift>}{Enter}{/Shift}Line 2{Shift>}{Enter}{/Shift}Line 3");
    const h2 = Number.parseInt(input.style.height || "0", 10);
    expect(h2).toBeGreaterThan(h1);
  });
});
