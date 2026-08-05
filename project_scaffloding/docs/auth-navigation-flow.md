# Auth + Navigation Flow — Customer Service Agent

**Source:** Product direction updates + existing BRD/stories/test-case docs  
**Scope:** Frontend navigation, auth behavior, access control boundaries, and chatbot placement  
**Stack context:** React (frontend) → Node.js APIs (backend) → PostgreSQL

---

## 1) Purpose

Define the formal user-access and page-navigation flow for the Customer Service Agent with:

- public Home, Login, Registration, and legal pages
- strict protected-route behavior for all other pages
- registration success redirect behavior
- post-login dashboard landing behavior
- password policy requirements
- chatbot availability rule (visible on all pages, context-aware answers)

---

## 2) Route access model

## Public routes (no login required)

- `/` — Home
- `/login` — Login page
- `/register` — Registration page
- `/terms` — Terms of Service
- `/privacy` — Privacy Policy
- `/cookies` — Cookie Policy

## Protected routes (login required)

- `/dashboard` — Customer Service Agent dashboard
- `/inquiries/:inquiryId` — Inquiry detail / handling
- Any other application workflow page beyond Home/Login/Register

### Access control rules

1. If a user is **not authenticated**, only public routes are accessible.
2. If a user tries to open a protected route while unauthenticated, redirect to `/login`.
3. If a user is authenticated and visits `/login` or `/register`, redirect to `/dashboard`.

---

## 3) Authentication flow

## 3.1 Registration flow

1. User opens `/register`.
2. User submits registration form.
3. Backend validates payload and password policy.
4. On success:
   - create account
   - redirect user to `/login`
   - display message: **"Registration successful"**
5. On failure:
   - stay on `/register`
   - display validation or business error message

## 3.2 Login flow

1. User opens `/login`.
2. User submits credentials.
3. Backend verifies credentials and creates authenticated session/token.
4. On success:
   - redirect to `/dashboard`
5. On failure:
   - stay on `/login`
   - show generic auth error

## 3.3 Session expiry / unauthorized flow

- If protected API call returns unauthorized, client clears local auth state and redirects to `/login`.
- Show optional informational notice such as: "Session expired. Please log in again."

## 3.4 Logout flow

1. User clicks logout from protected UI shell/header.
2. Backend invalidates auth session/token (or client clears token as per chosen auth mechanism).
3. User is redirected to `/login` (or `/` if product chooses Home after logout).

---

## 4) Password policy (registration and password reset/change)

Minimum required policy for this project:

- minimum length: **8 characters**
- strong-password requirement:
  - at least one uppercase letter
  - at least one lowercase letter
  - at least one number
  - at least one special character

### Validation behavior

- Frontend validates format before submission for immediate feedback.
- Backend applies the same validation as source of truth.
- Backend returns clear validation messages without exposing sensitive auth internals.

---

## 5) Page-level navigation flow

## 5.1 Home (`/`)

Purpose:
- entry point for unauthenticated users
- clear CTA links/buttons to Login and Registration
- global footer includes:
  - left: `© <year> your compay. All rights reserved.`
  - right: `Privacy Policy`, `Terms of Service`, `Cookie Policy`
  - chatbot floats above the footer (bottom-right)

Primary actions:
- "Login" → `/login`
- "Register" → `/register`

## 5.2 Login (`/login`)

Purpose:
- authenticate existing users

Primary outcomes:
- success → `/dashboard`
- failure → remain on `/login` with message

## 5.3 Registration (`/register`)

Purpose:
- onboard new users

Primary outcomes:
- success → `/login` with **"Registration successful"**
- failure → remain on `/register` with validation messages

## 5.4 Dashboard (`/dashboard`) — protected

Purpose:
- operational landing page after login
- access inquiry list and metrics
- role-based views:
  - `customer`: sees their open vs closed inquiries, approves addressed open inquiries (records `customer_approved`), and can submit new inquiries
  - `agent`: sees their opened inquiries (assigned) and closed inquiries (resolved by them)
  - `lead` / `admin` (management): sees all inquiries; operational timeline is visible via inquiry detail views

Primary action:
- select inquiry → `/inquiries/:inquiryId`

## 5.5 Inquiry Detail (`/inquiries/:inquiryId`) — protected

Purpose:
- handle inquiry, view CRM context, send response, progress resolution
- role-based actions:
  - `customer`: can approve only when `issue_addressed=true` (this records `customer_approved` and transitions `status` to `resolved`)
  - `agent` / `lead` / `admin`: can send messages and support resolution progress

---

## 6) Chatbot placement and behavior

## Rule

The chatbot is available on **all pages** (public and protected), but must answer according to the user question and current page context.

## Placement

- Global chatbot launcher in persistent UI shell (e.g., floating button in bottom-right).
- Expanded chatbot panel overlays current page.

## Context-aware behavior

- On public pages (`/`, `/login`, `/register`):
  - answer only customer-service inquiry, approval, and timeline questions (in plain language)
  - if asked about inquiry access while signed out, chatbot responds with: `Sign in first to access inquiry features.`
  - never provide login/auth/API/technical implementation details
- On protected pages:
  - answer only customer-service inquiry, approval, and timeline questions
  - never provide login/auth/API/technical implementation details

## Access and data boundaries

- chatbot responses must respect authentication state and route permissions
- no protected data returned to unauthenticated users
- if user asks for protected information while unauthenticated, chatbot should guide user to login

---

## 7) API and authorization alignment

Auth-related endpoints to support this flow:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me` (recommended for session bootstrap)

Protected business endpoints (already in backend scope):

- inquiries, CRM-context, and message endpoints require authenticated session/token
- customer-only resolution approval: `POST /api/inquiries/:inquiryId/approve`
- customer-only inquiry creation: `POST /api/inquiries`

Response expectations:

- `401` for unauthenticated access
- `403` for authenticated but unauthorized action (if role rules are introduced)

---

## 8) Acceptance criteria (flow-level)

1. Unauthenticated users can open only `/`, `/login`, `/register`, `/terms`, `/privacy`, and `/cookies`.
2. Successful registration redirects to `/login` and shows **"Registration successful"**.
3. Successful login redirects to `/dashboard`.
4. Protected routes redirect unauthenticated users to `/login`.
5. Password policy is enforced at frontend and backend (backend authoritative).
6. Chatbot is visible on all pages and answers contextually while respecting access boundaries.

---

## 9) Related documents

- `business-requirements.md`
- `user-stories.md`
- `test-cases.md`
- `../backend/README.md`

**Version:** 1.0  
**Status:** Draft for product/security review

