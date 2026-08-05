# Customer inquiry workflow

## Open vs resolved

An inquiry stays **open** while the team works on it. The field `issue_addressed` means progress was made toward a solution, but it does **not** mean the inquiry is closed.

## Customer approval

The inquiry can only move to **resolved** (closed) when the customer has **approved** the resolution. In the system this is represented by `customer_approved=true` together with `status='resolved'`.

## Timeline (management view)

For lead and admin users, the **timeline** is a chronological list of inquiry events and state changes, including when the issue was addressed and when the customer approved closure.
