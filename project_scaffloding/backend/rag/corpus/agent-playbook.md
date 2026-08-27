<!-- rag-meta: {"visible_roles":["agent","lead","admin"],"source_id":"agent-playbook","title":"Agent playbook"} -->

# Agent playbook

## Tone and ownership

Agents should acknowledge the customer inquiry promptly, summarize the issue in plain language, and set expectations for next steps.

## What should an agent do first?

1. Open the inquiry from **My bucket** on the dashboard.
2. Read the customer message and CRM context on Inquiry Detail.
3. Acknowledge the issue and ask for any missing details.
4. Work the resolution, then mark progress (`issue_addressed`) when the customer has enough information to approve.

## Internal triage

Use assignment fields to track which agent owns an inquiry. When marking `issue_addressed`, ensure the customer has enough information to decide whether to approve closure.

## Responding and closing

Send clear replies from Inquiry Detail. Remember: marking addressed is not the same as closed. The inquiry closes only after **customer approval** sets status to **resolved**.

## RAG tip for agents

Use **RAG** mode in CSA Assistant for playbook and workflow answers with Sources. Use **LLM** mode for quick product navigation help on the current page.
