# Customer inquiry workflow

## Open vs resolved

An inquiry stays **open** while the team works on it. The field `issue_addressed` means progress was made toward a solution, but it does **not** mean the inquiry is closed.

An inquiry is **closed** only when its status becomes **resolved**. That happens after the customer approves the resolution.

## Customer approval

The inquiry can only move to **resolved** (closed) when the customer has **approved** the resolution. In the system this is represented by `customer_approved=true` together with `status='resolved'`.

If `issue_addressed` is still false, the customer cannot close the inquiry with approval yet — the team must address the issue first.

## How does customer approval work?

1. An agent (or lead) works the inquiry and marks progress (`issue_addressed`).
2. The customer reviews the response on the inquiry detail page.
3. The customer clicks **Approve** when the resolution is acceptable.
4. The inquiry status becomes **resolved** (closed).

## When is an inquiry closed?

An inquiry is closed when status is **resolved**. Closing requires customer approval after the issue has been addressed. `issue_addressed` alone never closes the ticket.

## What does the dashboard show?

The dashboard shows role-scoped metrics (total, open, resolved, awaiting customer approval) and a searchable list of inquiries in your scope. Customers can submit new queries; agents see their bucket; leads/admins see organization metrics including open unassigned when available.

## What can I do on this page?

On Home you can learn about the demo and open Sign in or Register. On Dashboard you can review metrics and inquiries. On Inquiry Detail you can read the thread, CRM context, reply (agents), or approve (customers when addressed).

## Timeline (management view)

For lead and admin users, the **timeline** is a chronological list of inquiry events and state changes, including when the issue was addressed and when the customer approved closure.
