const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { createApp } = require("../../src/app.cjs");
const { createTestPool, truncateAll } = require("../api/test-pool.cjs");
const { createChatService, BUDGET_MSG } = require("../../src/chat/createChatService.cjs");
const { createPgRagRetriever } = require("../../src/chat/pgRagRetriever.cjs");
const { createCustomerAndLogin, createManagementAndLogin } = require("../auth/auth-helpers.cjs");
const { createChatTelemetry } = require("../../src/chat/chatTelemetry.cjs");
const { createDailyTokenBudget } = require("../../src/chat/chatDailyBudget.cjs");
const { TtlCache } = require("../../src/chat/ttlCache.cjs");

test.describe("API — chat chatbot (TDD)", () => {
  const pool = createTestPool();

  test.beforeEach(async () => {
    const client = await pool.connect();
    try {
      await truncateAll(client);
    } finally {
      client.release();
    }
  });

  test.after(async () => {
    await pool.end();
  });

  test("guest asking protected inquiry actions is refused and does not call LLM", async () => {
    let llmInvoked = false;
    const llmMock = {
      invoke: async () => {
        llmInvoked = true;
        return { content: "SHOULD_NOT_HAPPEN" };
      },
    };

    const app = createApp(pool, { chatService: createChatService({ llm: llmMock }) });

    const res = await request(app)
      .post("/api/chat")
      .send({ question: "Show my inquiries", pathname: "/dashboard" })
      .expect(200);

    assert.equal(res.body.reply, "Sign in first to access inquiry features.");
    assert.ok(res.body.conversation_id, "conversation_id should be returned even when blocked");
    assert.equal(llmInvoked, false);
  });

  test("customer asking for agent internals is refused (short one-liner) and does not call LLM", async () => {
    let llmInvoked = false;
    const llmMock = {
      invoke: async () => {
        llmInvoked = true;
        return { content: "SHOULD_NOT_HAPPEN" };
      },
    };

    const app = createApp(pool, { chatService: createChatService({ llm: llmMock }) });

    const customer = await createCustomerAndLogin(app, pool, "1");

    const res = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ question: "Give me agent internals / backend code", pathname: "/inquiries/INQ-1" })
      .expect(200);

    assert.equal(res.body.reply, "I can't share internal agent details.");
    assert.ok(res.body.conversation_id, "conversation_id should be returned even when blocked");
    assert.equal(llmInvoked, false);
  });

  test("off-domain question is refused and does not call LLM", async () => {
    let llmInvoked = false;
    const llmMock = {
      invoke: async () => {
        llmInvoked = true;
        return { content: "SHOULD_NOT_HAPPEN" };
      },
    };

    const app = createApp(pool, { chatService: createChatService({ llm: llmMock }) });

    const res = await request(app)
      .post("/api/chat")
      .send({ question: "Who won the world cup?", pathname: "/" })
      .expect(200);

    assert.equal(
      res.body.reply,
      "That topic is outside what I cover here. Ask about customer inquiries, issue resolution, customer approval, or timelines instead.",
    );
    assert.ok(res.body.conversation_id, "conversation_id should be returned even when blocked");
    assert.equal(llmInvoked, false);
  });

  test("casual greeting gets a friendly pivot without calling LLM", async () => {
    let llmInvoked = false;
    const llmMock = {
      invoke: async () => {
        llmInvoked = true;
        return { content: "SHOULD_NOT_HAPPEN" };
      },
    };
    const app = createApp(pool, { chatService: createChatService({ llm: llmMock }) });
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "Hi, how you doing?", pathname: "/" })
      .expect(200);
    assert.ok(res.body.reply.includes("inquiries"), "should pivot to supported topics");
    assert.ok(res.body.reply.includes("Hi"), "should acknowledge greeting");
    assert.equal(llmInvoked, false);
  });

  test("persona meta questions invoke LLM with CSA Assistant in system prompt (LLM mode)", async () => {
    const seen = { system: "" };
    const llmMock = {
      invoke: async (messages) => {
        seen.system = messages[0]?.content || "";
        return { content: "I am CSA Assistant." };
      },
    };
    const app = createApp(pool, { chatService: createChatService({ llm: llmMock }) });
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "What is your name?", pathname: "/" })
      .expect(200);
    assert.equal(res.body.reply, "I am CSA Assistant.");
    assert.ok(seen.system.includes("CSA Assistant"));
  });

  test("onboarding questions invoke LLM instead of auth guardrail (LLM mode)", async () => {
    let calls = 0;
    const llmMock = {
      invoke: async (messages) => {
        calls += 1;
        assert.ok(String(messages[0]?.content || "").includes("CSA Assistant"));
        return { content: "Use Sign in or Register in the header." };
      },
    };
    const app = createApp(pool, { chatService: createChatService({ llm: llmMock }) });
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "How to register for the app", pathname: "/" })
      .expect(200);
    assert.equal(res.body.reply, "Use Sign in or Register in the header.");
    assert.equal(calls, 1);
  });

  test("general product questions use instant persona reply when matched (demo chips)", async () => {
    let calls = 0;
    const llmMock = {
      invoke: async () => {
        calls += 1;
        return { content: "SHOULD_NOT_HAPPEN" };
      },
    };
    const app = createApp(pool, { chatService: createChatService({ llm: llmMock }) });
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "What is this app for?", pathname: "/" })
      .expect(200);
    assert.match(res.body.reply, /Customer Service Agent/i);
    assert.equal(calls, 0);
  });

  test("non-chip persona questions still invoke LLM (LLM mode)", async () => {
    let calls = 0;
    const llmMock = {
      invoke: async (messages) => {
        calls += 1;
        const sys = String(messages[0]?.content || "");
        assert.ok(sys.includes("CSA Assistant"));
        assert.ok(sys.includes("application") || sys.includes("high level") || sys.includes("inquiries"));
        return { content: "GENERAL_APP_GUIDE_OK" };
      },
    };
    const app = createApp(pool, { chatService: createChatService({ llm: llmMock }) });
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "Who can use this application?", pathname: "/" })
      .expect(200);
    assert.equal(res.body.reply, "GENERAL_APP_GUIDE_OK");
    assert.equal(calls, 1);
  });

  test("RAG empty retrieval invokes LLM for general product questions", async () => {
    let llmInvoked = false;
    const llmMock = {
      invoke: async (messages) => {
        llmInvoked = true;
        assert.ok(String(messages[0]?.content || "").includes("CSA Assistant"));
        return { content: "RAG_GENERAL_OK" };
      },
    };
    const ragRetriever = {
      embedQuery: async () => [1, 0, 0],
      search: async () => [],
    };
    const app = createApp(pool, { chatService: createChatService({ llm: llmMock, ragRetriever }) });
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "What can I do here?", pathname: "/", mode: "rag" })
      .expect(200);
    assert.equal(res.body.reply, "RAG_GENERAL_OK");
    assert.equal(llmInvoked, true);
    assert.deepEqual(res.body.citations, []);
  });

  test("RAG empty retrieval still invokes LLM for persona questions", async () => {
    let llmInvoked = false;
    const llmMock = {
      invoke: async (messages) => {
        llmInvoked = true;
        const sys = String(messages[0]?.content || "");
        assert.ok(sys.includes("CSA Assistant"));
        assert.ok(sys.toLowerCase().includes("mode: rag"));
        return { content: "PERSONA_RAG_OK" };
      },
    };
    const ragRetriever = {
      embedQuery: async () => [1, 0, 0],
      search: async () => [],
    };
    const app = createApp(pool, { chatService: createChatService({ llm: llmMock, ragRetriever }) });
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "What should I do to enter the app", pathname: "/", mode: "rag" })
      .expect(200);
    assert.equal(res.body.reply, "PERSONA_RAG_OK");
    assert.equal(llmInvoked, true);
    assert.deepEqual(res.body.citations, []);
  });

  test("login/API detail questions are refused and do not call LLM", async () => {
    let llmInvoked = false;
    const llmMock = {
      invoke: async () => {
        llmInvoked = true;
        return { content: "SHOULD_NOT_HAPPEN" };
      },
    };

    const app = createApp(pool, { chatService: createChatService({ llm: llmMock }) });

    const res = await request(app)
      .post("/api/chat")
      .send({ question: "What is the Authorization header format?", pathname: "/login" })
      .expect(200);

    assert.equal(
      res.body.reply,
      "I can't help with login steps, passwords, or technical implementation details in chat. Use the Sign in or Register pages for account access.",
    );
    assert.ok(res.body.conversation_id, "conversation_id should be returned even when blocked");
    assert.equal(llmInvoked, false);
  });

  test("management can ask timeline concept; LLM is called with a prompt containing timeline guidance", async () => {
    const seen = { messages: null };
    const llmMock = {
      invoke: async (messages) => {
        seen.messages = messages;
        return { content: "TIMELINE_REPLY_FROM_LLM" };
      },
    };

    const app = createApp(pool, { chatService: createChatService({ llm: llmMock }) });
    const management = await createManagementAndLogin(app, pool, "1");

    const res = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${management.token}`)
      .send({ question: "Explain the timeline concept for inquiry resolution", pathname: "/dashboard" })
      .expect(200);

    assert.equal(res.body.reply, "TIMELINE_REPLY_FROM_LLM");
    assert.ok(res.body.conversation_id, "conversation_id should be returned");
    assert.ok(seen.messages, "expected llm.invoke to be called");

    const systemText = seen.messages[0]?.content || "";
    assert.ok(systemText.toLowerCase().includes("timeline"), "system prompt should mention timeline");
    assert.ok(systemText.toLowerCase().includes("customer_approved=true"), "system prompt should contain approval workflow facts");
  });

  test("switching mode keeps the same conversation_id and includes prior turns in history", async () => {
    let callCount = 0;
    const seenSecondCall = { messages: null };

    const llmMock = {
      invoke: async (messages) => {
        callCount += 1;
        if (callCount === 2) {
          seenSecondCall.messages = messages;
        }
        return { content: callCount === 1 ? "FIRST_ASSISTANT_REPLY" : "SECOND_ASSISTANT_REPLY" };
      },
    };

    const ragRetriever = {
      embedQuery: async () => [1, 0, 0],
      search: async () => [],
    };

    const app = createApp(pool, {
      chatService: createChatService({ llm: llmMock, ragRetriever }),
    });
    const management = await createManagementAndLogin(app, pool, "1");

    const r1 = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${management.token}`)
      .send({ question: "What does issue_addressed mean?", pathname: "/dashboard", mode: "llm" })
      .expect(200);

    const convId = r1.body.conversation_id;
    assert.ok(convId, "conversation_id should be created on first call");

    const r2 = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${management.token}`)
      .send({
        question: "Summarize the inquiry resolution workflow for management on this dashboard",
        pathname: "/dashboard",
        mode: "rag",
        conversation_id: convId,
      })
      .expect(200);

    assert.equal(r2.body.conversation_id, convId, "conversation_id must remain the same across mode switch");
    assert.ok(seenSecondCall.messages, "expected llm.invoke on second call");

    const systemText = seenSecondCall.messages[0]?.content || "";
    assert.ok(systemText.toLowerCase().includes("mode: rag"), "RAG mode should be reflected in system prompt");

    const allContents = seenSecondCall.messages.map((m) => m.content).join("\n");
    assert.ok(allContents.includes("What does issue_addressed mean?"), "history should include first user question");
    assert.ok(allContents.includes("FIRST_ASSISTANT_REPLY"), "history should include first assistant reply");
  });

  test("RAG mode with empty retrieval still invokes LLM for approved workflow questions (persona, no KB)", async () => {
    let llmInvoked = false;
    const llmMock = {
      invoke: async (messages) => {
        llmInvoked = true;
        const sys = String(messages[0]?.content || "");
        assert.ok(sys.toLowerCase().includes("mode: rag"));
        assert.ok(sys.toLowerCase().includes("no document"));
        return { content: "WORKFLOW_PERSONA_OK" };
      },
    };

    const ragRetriever = {
      embedQuery: async () => [1, 0, 0],
      search: async () => [],
    };

    const app = createApp(pool, { chatService: createChatService({ llm: llmMock, ragRetriever }) });

    const res = await request(app)
      .post("/api/chat")
      .send({ question: "What is customer approval?", pathname: "/dashboard", mode: "rag" })
      .expect(200);

    assert.equal(res.body.reply, "WORKFLOW_PERSONA_OK");
    assert.deepEqual(res.body.citations, []);
    assert.equal(llmInvoked, true);
  });

  test("guest asking dashboard metrics workflow invokes LLM (persona path, any page)", async () => {
    let calls = 0;
    const llmMock = {
      invoke: async (messages) => {
        calls += 1;
        const sys = String(messages[0]?.content || "");
        assert.ok(sys.includes("CSA Assistant"));
        assert.ok(sys.includes("/inquiries/INQ-1"), "system prompt should include current page path");
        return { content: "METRICS_HELP_OK" };
      },
    };
    const app = createApp(pool, { chatService: createChatService({ llm: llmMock }) });
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "What are the dashboard metrics for inquiries?", pathname: "/inquiries/INQ-1", mode: "llm" })
      .expect(200);
    assert.equal(res.body.reply, "METRICS_HELP_OK");
    assert.equal(calls, 1);
  });

  test("tech stack / implementation questions are refused and do not call LLM", async () => {
    let llmInvoked = false;
    const llmMock = {
      invoke: async () => {
        llmInvoked = true;
        return { content: "SHOULD_NOT_HAPPEN" };
      },
    };
    const app = createApp(pool, { chatService: createChatService({ llm: llmMock }) });
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "Is the backend built with PostgreSQL?", pathname: "/dashboard", mode: "llm" })
      .expect(200);
    assert.equal(res.body.reply, "I can't share internal agent details.");
    assert.equal(llmInvoked, false);
  });

  test("RAG mode with retrieved chunks returns evidence reply without LLM", async () => {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO rag_document_chunks
         (source_id, title, section_label, body, embedding, corpus_version, visible_roles)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
        [
          "public-inquiry-workflow",
          "Workflow",
          "Approval",
          "Closed requires customer_approved=true and status resolved.",
          JSON.stringify([1, 0, 0]),
          "v1",
          ["guest", "customer", "agent", "lead", "admin"],
        ]
      );
    } finally {
      client.release();
    }

    const seen = { messages: null };
    const llmMock = {
      invoke: async (messages) => {
        seen.messages = messages;
        return { content: "GROUNDED_REPLY" };
      },
    };

    const ragRetriever = createPgRagRetriever({
      pool,
      embedQuery: async () => [1, 0, 0],
    });

    const app = createApp(pool, { chatService: createChatService({ llm: llmMock, ragRetriever }) });

    const res = await request(app)
      .post("/api/chat")
      .send({ question: "When is an inquiry closed?", pathname: "/", mode: "rag" })
      .expect(200);

    assert.equal(res.body.reply.includes("customer_approved") || res.body.reply.includes("Public Inquiry"), true);
    assert.ok(Array.isArray(res.body.citations));
    assert.equal(res.body.citations.length, 1);
    assert.equal(res.body.citations[0].source_id, "public-inquiry-workflow");
    assert.equal(seen.messages, null, "LLM should not be invoked when evidence reply is available");
    assert.equal(res.body.usage?.evidence_fallback, true);
  });

  test("LLM response includes usage when model returns usage_metadata", async () => {
    const llmMock = {
      invoke: async () => ({
        content: "WITH_USAGE",
        usage_metadata: { input_tokens: 4, output_tokens: 2, total_tokens: 6 },
      }),
    };
    const app = createApp(pool, { chatService: createChatService({ llm: llmMock }) });
    const res = await request(app)
      .post("/api/chat")
      .send({ question: "What does issue_addressed mean on an inquiry?", pathname: "/dashboard" })
      .expect(200);
    assert.ok(res.body.usage);
    assert.equal(res.body.usage.total_tokens, 6);
    assert.equal(res.body.usage.response_cache_hit, false);
  });

  test("response cache: identical request invokes LLM only once", async () => {
    const rc = new TtlCache({ defaultTtlMs: 60_000, maxEntries: 20 });
    const responseCache = { get: (k) => rc.get(k), set: (k, v) => rc.set(k, v) };
    let invocations = 0;
    const llmMock = {
      invoke: async () => {
        invocations += 1;
        return {
          content: "CACHED_REPLY",
          usage_metadata: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
        };
      },
    };
    const app = createApp(pool, { chatService: createChatService({ llm: llmMock, responseCache }) });
    const q = "What is customer approval on an inquiry?";
    const r1 = await request(app).post("/api/chat").send({ question: q, pathname: "/p", mode: "llm" }).expect(200);
    const r2 = await request(app).post("/api/chat").send({ question: q, pathname: "/p", mode: "llm" }).expect(200);
    assert.equal(r1.body.reply, "CACHED_REPLY");
    assert.equal(r2.body.reply, "CACHED_REPLY");
    assert.equal(invocations, 1);
    assert.equal(r2.body.usage.response_cache_hit, true);
  });

  test("daily token budget blocks further LLM calls for the same budget key", async () => {
    const dailyBudget = createDailyTokenBudget({ maxTokensPerDay: 40 });
    let invocations = 0;
    const llmMock = {
      invoke: async () => {
        invocations += 1;
        return {
          content: `R${invocations}`,
          usage_metadata: { input_tokens: 25, output_tokens: 25, total_tokens: 50 },
        };
      },
    };
    const app = createApp(pool, { chatService: createChatService({ llm: llmMock, dailyBudget }) });
    const r1 = await request(app)
      .post("/api/chat")
      .send({ question: "When is an inquiry resolved?", pathname: "/", mode: "llm" })
      .expect(200);
    assert.match(r1.body.reply, /^R1$/);
    const r2 = await request(app)
      .post("/api/chat")
      .send({ question: "What does customer_approved mean?", pathname: "/", mode: "llm" })
      .expect(200);
    assert.equal(r2.body.reply, BUDGET_MSG);
    assert.equal(r2.body.budget_blocked, true);
    assert.equal(invocations, 1);
  });

  test("GET /api/chat/metrics returns snapshot when CHAT_METRICS_TOKEN matches", async () => {
    const prev = process.env.CHAT_METRICS_TOKEN;
    process.env.CHAT_METRICS_TOKEN = "metrics-test-secret";
    try {
      const telemetry = createChatTelemetry();
      const llmMock = {
        invoke: async () => ({
          content: "m",
          usage_metadata: { input_tokens: 1, output_tokens: 0, total_tokens: 1 },
        }),
      };
      const svc = createChatService({ llm: llmMock, telemetry });
      const app = createApp(pool, { chatService: svc });
      await request(app)
        .post("/api/chat")
        .send({ question: "Explain the timeline for an inquiry", pathname: "/" })
        .expect(200);
      await request(app).get("/api/chat/metrics").expect(401);
      const res = await request(app)
        .get("/api/chat/metrics")
        .set("X-Chat-Metrics-Token", "metrics-test-secret")
        .expect(200);
      assert.equal(res.body.metrics.requests_total, 1);
      assert.equal(res.body.metrics.llm_invocations, 1);
      assert.equal(res.body.metrics.mode_llm_total, 1);
      assert.ok(res.body.metrics.request_latency_ms_count >= 1);
      assert.ok(res.body.metrics.request_latency_ms_max >= 0);
    } finally {
      if (prev === undefined) delete process.env.CHAT_METRICS_TOKEN;
      else process.env.CHAT_METRICS_TOKEN = prev;
    }
  });

  test("RAG mode uses evidence fallback when LLM is degraded but chunks were retrieved", async () => {
    const fallback = "The assistant is temporarily unavailable. Please try again in a moment.";
    const llmMock = {
      invoke: async () => ({
        content: fallback,
        response_metadata: { llm_degraded: true },
      }),
    };
    const ragRetriever = {
      embedQuery: async () => [1, 0],
      search: async () => [
        {
          sourceId: "public-inquiry-workflow",
          title: "Workflow",
          sectionLabel: "Closing",
          body: "An inquiry is resolved only after customer approval.",
          score: 0.81,
        },
      ],
    };

    const svc = createChatService({
      llm: llmMock,
      ragRetriever,
      llmFallbackMessage: fallback,
    });

    const out = await svc.chat({
      question: "When is an inquiry closed?",
      pathname: "/dashboard",
      role: "agent",
      mode: "rag",
    });

    assert.match(out.reply, /Workflow/);
    assert.match(out.reply, /customer approval/i);
    assert.ok(Array.isArray(out.citations) && out.citations.length === 1);
    assert.equal(out.usage.evidence_fallback, true);
  });

  test("GET /api/chat/metrics returns 503 when token is not configured", async () => {
    const prev = process.env.CHAT_METRICS_TOKEN;
    delete process.env.CHAT_METRICS_TOKEN;
    try {
      const app = createApp(pool, {
        chatService: createChatService({ llm: { invoke: async () => ({ content: "x" }) } }),
      });
      await request(app).get("/api/chat/metrics").expect(503);
    } finally {
      if (prev !== undefined) process.env.CHAT_METRICS_TOKEN = prev;
    }
  });
});

