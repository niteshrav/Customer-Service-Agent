/**
 * Module: Chat orchestration service
 *
 * Single entry chat({ question, pathname, role, mode, ... }): policy + domain gate, optional RAG retrieve,
 * prompt build, response cache, daily budget, then llm.invoke. Persists turns and returns reply, usage, citations.
 * Factory: createChatService({ llm, ragRetriever, conversationStore, ... }).
 */
const { performance } = require("node:perf_hooks");
const { policyShortCircuit } = require("./chatPolicy.cjs");
const { buildPrompt } = require("./promptBuilder.cjs");
const { domainGate } = require("./chatDomainGate.cjs");
const { SystemMessage, HumanMessage, AIMessage } = require("@langchain/core/messages");
const { ChatConversationStore } = require("./chatConversationStore.cjs");
const { extractUsageFromAiMessage, estimateCostUsd } = require("./chatUsage.cjs");
const { buildResponseCacheKey } = require("./chatCacheKeys.cjs");
const { compressHistoryRows } = require("./chatHistoryCompress.cjs");
const { buildRagEvidenceReply, isLlmDegradedResponse, isFallbackReply } = require("./ragEvidenceReply.cjs");
const { resolvePersonaQuickReply } = require("./chatPersonaQuickReply.cjs");

/** Legacy copy; domain-approved RAG requests now always continue to the LLM with no-evidence rules. */
const RAG_EMPTY_MSG = "I couldn't find relevant documentation for that in the knowledge base.";
const BUDGET_MSG = "Daily assistant token limit reached. Try again tomorrow.";

/**
 * @param {object} opts
 * @param {object} opts.llm
 * @param {object} [opts.conversationStore] async { ensure, listMessages, appendUser, appendAssistant }
 * @param {{ embedQuery: (q: string) => Promise<number[]>, search: (args: object) => Promise<object[]> }} [opts.ragRetriever]
 * @param {{ get: (k: string) => unknown, set: (k: string, v: unknown) => void }} [opts.responseCache]
 * @param {object} [opts.telemetry]
 * @param {object} [opts.dailyBudget]
 * @param {number} [opts.maxHistoryMessages]
 * @param {number} [opts.historyPriorSummaryMaxChars]
 * @param {string} [opts.llmModelName]
 * @param {string} [opts.promptVersion] — recorded in system prompt for rollout tracking
 */
function createChatService({
  llm,
  conversationStore,
  ragRetriever,
  responseCache = null,
  telemetry = null,
  dailyBudget = null,
  maxHistoryMessages = 16,
  historyPriorSummaryMaxChars = 1500,
  llmModelName = "gpt-4o-mini",
  promptVersion = "v1",
  llmFallbackMessage = "The assistant is temporarily unavailable. Please try again in a moment.",
} = {}) {
  if (!llm) throw new Error("llm is required");
  const store = conversationStore || new ChatConversationStore();

  function budgetKeyFor({ budgetKey, role }) {
    if (budgetKey != null && String(budgetKey).trim() !== "") return String(budgetKey).trim();
    return `guest:${role}`;
  }

  async function chat({ question, pathname, role, mode = "auto", conversation_id, budgetKey }) {
    const t0 = performance.now();
    try {
      const convoId = await store.ensure(conversation_id);
      const bKey = budgetKeyFor({ budgetKey, role });

      if (telemetry) telemetry.recordRequest();

      if (!question || !String(question).trim()) {
        return { reply: "Please enter a question.", conversation_id: convoId };
      }

      const policy = policyShortCircuit({ question, role });
      if (policy.shortCircuit) {
        if (telemetry) telemetry.recordGuardrailBlock();
        return { reply: policy.reply, conversation_id: convoId };
      }

      const domain = domainGate({ question, role });
      if (domain.shortCircuit) {
        if (telemetry) telemetry.recordGuardrailBlock();
        return { reply: domain.reply, conversation_id: convoId };
      }

      const normalizedMode = mode === "rag" ? "rag" : "llm";
      if (telemetry) telemetry.recordModeUsage(normalizedMode);

      const quickReply =
        normalizedMode === "llm" ? resolvePersonaQuickReply({ question, pathname, role }) : null;
      if (quickReply) {
        if (telemetry) telemetry.recordGuardrailBlock();
        await store.appendUser(convoId, question);
        await store.appendAssistant(convoId, quickReply, { persona_quick_reply: true });
        return { reply: quickReply, conversation_id: convoId };
      }

      let evidenceChunks = [];
      let citations = [];

      if (normalizedMode === "rag" && ragRetriever) {
        const qv = await ragRetriever.embedQuery(question);
        const retrieved = await ragRetriever.search({ queryVector: qv, role, limit: 5 });
        if (retrieved.length) {
          evidenceChunks = retrieved;
          citations = retrieved.map((c) => {
            const snippet = String(c.body || "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 160);
            return {
              source_id: c.sourceId,
              title: c.title,
              section: c.sectionLabel,
              ...(typeof c.score === "number" ? { score: Number(c.score.toFixed(4)) } : {}),
              ...(snippet ? { snippet } : {}),
            };
          });
        }
      }

      const priorMessages = await store.listMessages(convoId);

      if (normalizedMode === "rag" && evidenceChunks.length > 0) {
        const evidenceReply = buildRagEvidenceReply(evidenceChunks);
        if (evidenceReply) {
          const cacheKey =
            responseCache &&
            buildResponseCacheKey({
              mode: normalizedMode,
              role,
              pathname,
              question,
              historyMessages: priorMessages,
            });

          if (responseCache && cacheKey) {
            const hit = await Promise.resolve(responseCache.get(cacheKey));
            if (
              hit &&
              typeof hit === "object" &&
              hit.reply != null &&
              !isFallbackReply(String(hit.reply), llmFallbackMessage)
            ) {
              if (telemetry) telemetry.recordResponseCacheHit();
              await store.appendUser(convoId, question);
              const usageOut = {
                ...(hit.usage && typeof hit.usage === "object" ? hit.usage : {}),
                response_cache_hit: true,
                model: llmModelName,
              };
              const hitCitations = Array.isArray(hit.citations) ? hit.citations : citations;
              await store.appendAssistant(convoId, String(hit.reply), {
                usage: usageOut,
                citations: hitCitations,
                response_cache_hit: true,
              });
              return {
                reply: String(hit.reply),
                conversation_id: convoId,
                usage: usageOut,
                citations: hitCitations,
              };
            }
            if (telemetry) telemetry.recordResponseCacheMiss();
          }

          const usageForClient = {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            estimated_cost_usd: 0,
            response_cache_hit: false,
            model: llmModelName,
            evidence_fallback: true,
          };
          await store.appendUser(convoId, question);
          await store.appendAssistant(convoId, evidenceReply, {
            usage: usageForClient,
            citations,
          });
          if (responseCache && cacheKey) {
            await Promise.resolve(
              responseCache.set(cacheKey, {
                reply: evidenceReply,
                citations,
                usage: usageForClient,
              })
            );
          }
          return {
            reply: evidenceReply,
            conversation_id: convoId,
            usage: usageForClient,
            citations,
          };
        }
      }

      if (normalizedMode === "rag" && evidenceChunks.length === 0) {
        const ragQuick = resolvePersonaQuickReply({ question, pathname, role });
        if (ragQuick) {
          await store.appendUser(convoId, question);
          await store.appendAssistant(convoId, ragQuick, { persona_quick_reply: true });
          return { reply: ragQuick, conversation_id: convoId };
        }
      }

      const historyRows = compressHistoryRows(priorMessages, {
        maxMessages: maxHistoryMessages,
        maxPriorSummaryChars: historyPriorSummaryMaxChars,
      });
      const historyForPrompt = historyRows.map((h) => {
        if (h.role === "user") return new HumanMessage(h.content);
        return new AIMessage(h.content);
      });

      const { system, human } = buildPrompt({
        question,
        pathname,
        role,
        mode: normalizedMode,
        evidenceChunks,
        promptVersion,
      });

      const messages = [new SystemMessage(system), ...historyForPrompt, new HumanMessage(human)];

      const cacheKey =
        responseCache &&
        buildResponseCacheKey({
          mode: normalizedMode,
          role,
          pathname,
          question,
          historyMessages: priorMessages,
        });

      if (responseCache && cacheKey) {
        const hit = await Promise.resolve(responseCache.get(cacheKey));
        if (hit && typeof hit === "object" && hit.reply != null) {
          if (isFallbackReply(String(hit.reply), llmFallbackMessage)) {
            if (telemetry) telemetry.recordResponseCacheMiss();
          } else {
            if (telemetry) telemetry.recordResponseCacheHit();
            await store.appendUser(convoId, question);
            const usageOut = {
              ...(hit.usage && typeof hit.usage === "object" ? hit.usage : {}),
              response_cache_hit: true,
              model: llmModelName,
            };
            const hitCitations = Array.isArray(hit.citations) ? hit.citations : citations;
            await store.appendAssistant(convoId, String(hit.reply), {
              usage: usageOut,
              ...(normalizedMode === "rag" && ragRetriever ? { citations: hitCitations } : {}),
              response_cache_hit: true,
            });
            const out = {
              reply: String(hit.reply),
              conversation_id: convoId,
              usage: usageOut,
            };
            if (normalizedMode === "rag" && ragRetriever) {
              out.citations = hitCitations;
            }
            return out;
          }
        } else if (telemetry) {
          telemetry.recordResponseCacheMiss();
        }
      }

      if (dailyBudget && dailyBudget.isEnabled() && !dailyBudget.canProceed(bKey)) {
        if (telemetry) telemetry.recordBudgetBlock();
        await store.appendUser(convoId, question);
        await store.appendAssistant(convoId, BUDGET_MSG, { budget_blocked: true });
        return {
          reply: BUDGET_MSG,
          conversation_id: convoId,
          budget_blocked: true,
          ...(normalizedMode === "rag" && ragRetriever ? { citations } : {}),
        };
      }

      const aiMsg = await llm.invoke(messages);
      let content = aiMsg?.content ?? "";
      let evidenceFallback = false;
      if (
        normalizedMode === "rag" &&
        evidenceChunks.length &&
        isLlmDegradedResponse(aiMsg, llmFallbackMessage)
      ) {
        const evidenceReply = buildRagEvidenceReply(evidenceChunks);
        if (evidenceReply) {
          content = evidenceReply;
          evidenceFallback = true;
        }
      } else if (
        normalizedMode === "llm" &&
        isLlmDegradedResponse(aiMsg, llmFallbackMessage)
      ) {
        const personaFallback = resolvePersonaQuickReply({ question, pathname, role });
        if (personaFallback) {
          content = personaFallback;
          evidenceFallback = false;
        }
      }
      const replyText = content || "Sorry, I couldn't generate a reply.";

      const usage = extractUsageFromAiMessage(aiMsg);
      const totalTok = usage?.total_tokens ?? (usage ? usage.prompt_tokens + usage.completion_tokens : 0);
      const costUsd = usage ? estimateCostUsd(llmModelName, usage.prompt_tokens, usage.completion_tokens) : 0;

      if (dailyBudget && dailyBudget.isEnabled() && usage) {
        dailyBudget.consume(bKey, totalTok);
      }
      if (telemetry) telemetry.recordLlmInvocation(usage, costUsd);

      const usageForClient = {
        prompt_tokens: usage?.prompt_tokens ?? 0,
        completion_tokens: usage?.completion_tokens ?? 0,
        total_tokens: totalTok,
        estimated_cost_usd: costUsd,
        response_cache_hit: false,
        model: llmModelName,
        ...(evidenceFallback ? { evidence_fallback: true } : {}),
      };

      await store.appendUser(convoId, question);
      await store.appendAssistant(convoId, replyText, {
        usage: usageForClient,
        ...(normalizedMode === "rag" && ragRetriever ? { citations } : {}),
      });

      if (responseCache && cacheKey && !isFallbackReply(replyText, llmFallbackMessage)) {
        await Promise.resolve(
          responseCache.set(cacheKey, {
            reply: replyText,
            citations: normalizedMode === "rag" && ragRetriever ? citations : undefined,
            usage: usageForClient,
          })
        );
      }

      const out = {
        reply: replyText,
        conversation_id: convoId,
        usage: usageForClient,
      };
      if (normalizedMode === "rag" && ragRetriever) {
        out.citations = citations;
      }
      return out;
    } finally {
      if (telemetry) telemetry.recordRequestLatencyMs(performance.now() - t0);
    }
  }

  function getMetrics() {
    return telemetry ? telemetry.snapshot() : null;
  }

  return { chat, getMetrics };
}

module.exports = { createChatService, RAG_EMPTY_MSG, BUDGET_MSG };
