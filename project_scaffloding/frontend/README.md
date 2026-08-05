# Frontend — React UI

Implements the flow from `docs/auth-navigation-flow.md`:

- Public: `/`, `/login`, `/register`, `/terms`, `/privacy`, `/cookies`
- Protected: `/dashboard`, `/inquiries/:inquiryId`
- Login success redirects to dashboard
- Register success redirects to login with `?registered=1`
- Global chatbot widget shown on all pages

## Run

```bash
cd project_scaffloding/frontend
npm install
npm run dev
```

The **demo role credentials** section is shown by default in dev. To override credentials, set:
- `VITE_DEMO_LOGIN_EMAIL` / `VITE_DEMO_LOGIN_PASSWORD` (Agent)
- `VITE_DEMO_CUSTOMER_LOGIN_EMAIL` / `VITE_DEMO_CUSTOMER_LOGIN_PASSWORD` (Customer)
- `VITE_DEMO_MANAGEMENT_LOGIN_EMAIL` / `VITE_DEMO_MANAGEMENT_LOGIN_PASSWORD` (Management)
- (optionally) `VITE_SHOW_DEMO_LOGIN=false` to hide it
in `frontend/.env.local` (copy from `frontend/.env.local.example`).

Backend should be running on `http://127.0.0.1:3101` (Vite’s default proxy forwards `/api` there). Override with `VITE_API_PROXY_TARGET` if needed.

## Build

```bash
npm run build
```

## Tests (TDD)

Specifications live next to the code (`*.test.js` / `*.test.jsx`). Run:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

New behavior should follow red → green → refactor: add or extend a failing test first, then implement the smallest change that passes.
