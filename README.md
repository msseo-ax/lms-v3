# HOMES LMS v3

Modern LMS built with Next.js 14 (App Router), Prisma, Supabase Auth, AWS S3, and optional OpenAI/Slack integrations.

## 1) Quick Start (Mock Mode)

Mock mode works without external services.

```bash
cp .env.example .env.local
# keep USE_MOCK_DB="true"

npm install
npm run dev
```

Open `http://localhost:3000`.

## 2) Real Integration Mode (`USE_MOCK_DB=false`)

### Required environment values

Set these in `.env.local`:

- `USE_MOCK_DB="false"`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `DATABASE_URL`
- `DIRECT_URL`
- `ADMIN_EMAILS`
- `GOOGLE_ALLOWED_DOMAIN`
- `NEXT_PUBLIC_SITE_URL`

Optional integrations:

- S3 upload: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_BASE_URL`
- AI summary: `OPENAI_API_KEY`
- Slack reminders: `SLACK_WEBHOOK_URL`

### Database migration and seed

```bash
npx prisma migrate deploy
npx prisma db seed
```

Team concept removal data migration:

```bash
# preview affected rows
npm run migrate:remove-team:dry-run

# apply conversion (team target -> division target, user.team_id null, teams delete)
npm run migrate:remove-team:apply

# apply conversion but keep teams table rows
npm run migrate:remove-team:apply:keep-teams
```

For local development where migration history is still evolving:

```bash
npx prisma migrate dev
npx prisma db seed
```

### Run and verify

```bash
npm run dev
```

Recommended smoke checks:

- Login with a `@homes.global` Google account
- Open `/`, `/contents/:id`, `/mypage`
- Open `/admin/contents`, `/admin/dashboard`, `/admin/categories`
- Verify `POST /api/ai/summary` with `{"text":"..."}` payload

## 3) Build

```bash
npm run build
```

## 4) Notes

- `/api/contents/[id]` supports `GET`, `PATCH`, `DELETE`.
- `/api/categories/[id]` supports `PATCH`, `DELETE`.
- Category admin UI is API-driven and persists in both mock and real mode.
- In real mode, app/admin pages fetch Prisma-backed data; mock-only hardcoded pages were removed.
