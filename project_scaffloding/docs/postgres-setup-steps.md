# Four setup steps (backend + PostgreSQL)

These match the steps to go from **no config** → **migrations applied**.

## Option A — Local Postgres without Docker (recommended)

Uses Homebrew’s `initdb` / `pg_ctl` with data in **`backend/pgdata`**, port **5434** (does not use your system Postgres on **5432**).

1. Install server tools: `brew install postgresql@16` (if needed).
2. From `project_scaffloding/backend/`:

   ```bash
   npm install
   npm run db:up
   ```

   (`db:up` = start cluster + `npm run db:migrate`)

3. Stop later: `npm run db:stop-local` — start again: `npm run db:start-local`

Credentials (dev only): user `csa`, password `csa_local_dev`, DB `customer_service_agent` (see `backend/.env`).

---

## Option B — Your own PostgreSQL (manual)

## Step 1 — Copy env template

From `project_scaffloding/backend`:

```bash
cp .env.example .env
```

## Step 2 — Set `DATABASE_URL`

Edit **`backend/.env`** and replace `USER`, `PASSWORD`, host, and DB name with your Postgres credentials.

Example:

```env
DATABASE_URL=postgresql://niteshrav:YOUR_PASSWORD@127.0.0.1:5432/customer_service_agent
```

**Note:** Your machine must be able to connect with this URL (same user/password you use in `psql`).

## Step 3 — Create the database (if it does not exist)

**Option A — `psql` (recommended)**

Connect to the maintenance database `postgres`, then run:

```bash
psql -h 127.0.0.1 -U YOUR_USER -d postgres -f sql/create_database.sql
```

**Option B — `createdb`**

```bash
createdb -h 127.0.0.1 -U YOUR_USER customer_service_agent
```

If the database already exists, you can skip this step.

## Step 4 — Run migrations

```bash
cd project_scaffloding/backend
npm install   # if not already done
npm run db:migrate
```

You should see: `Applied: 001_initial.sql`

## One-liner alternative (no `.env` file)

```bash
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/customer_service_agent" npm run db:migrate
```

---

### Why automation may stop at Step 2–3

If PostgreSQL uses **password authentication**, the assistant cannot guess your password or complete interactive `psql` prompts. Complete Steps 2–4 on your machine after setting `DATABASE_URL` (or `PGPASSWORD` for CLI tools).
