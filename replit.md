# GEOboost Workspace

## Overview

pnpm workspace monorepo using TypeScript. GEOboost helps small businesses optimize their content to be cited more often by AI assistants like ChatGPT, Claude, and Perplexity (Generative Engine Optimization).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (`@workspace/db`)
- **Auth**: Clerk (via Replit Clerk provisioning — `@clerk/react`, `@clerk/express`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Anthropic Claude (via Replit AI Integrations — no API key needed)
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui
- **Payments**: Stripe (test key in `STRIPE_SECRET_KEY`)

## Architecture

### Frontend (`artifacts/geoboost/`)
- React + Vite, deployed at `/`
- Wrapped in `ClerkProvider` with branded navy/green appearance
- Pages: `/` (audit form), `/results` (results dashboard), `/optimizer` (content optimizer), `/dashboard` (audit history — auth required), `/pricing` (4-tier pricing), `/monitor-setup` (Monitor plan setup — auth required), `/sign-in`, `/sign-up`, `/success`, `/cancel`
- In dev, uses `VITE_CLERK_PUBLISHABLE_KEY` directly (not `publishableKeyFromHost`) to avoid custom-domain issues
- Tailwind v4: `@layer theme, base, clerk, components, utilities` in `index.css`, `optimize: false` in vite.config

### Backend (`artifacts/api-server/`)
- Express 5, deployed at `/api`
- Clerk middleware wired: `clerkProxyMiddleware` (production only) + `clerkMiddleware` before body parsers
- Routes: `POST /api/geoboost/audit`, `POST /api/geoboost/optimize`, `POST /api/geoboost/detect-category`, `GET /api/audits` (protected), `POST /api/create-checkout-session`
- Uses Anthropic Claude `claude-sonnet-4-6` via `@workspace/integrations-anthropic-ai`
- Audit route auto-saves to DB when user is authenticated (via `getAuth(req)`)

### Auth (`@clerk/react` + `@clerk/express`)
- Server: `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts` (proxy: production only), `clerkMiddleware` on all routes
- Client: `ClerkProvider` in `App.tsx`, `Show` component for conditional auth UI, custom `UserMenu` dropdown (no `<UserButton />`)
- `DashboardGuard` component: shows Dashboard if signed in, redirects to `/sign-in` if not
- `ClerkQueryClientCacheInvalidator`: clears React Query cache on auth state changes
- Clerk secrets: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` (auto-provisioned by Replit)

### Database (`lib/db/`)
- `@workspace/db` exports `db` (Drizzle instance), `pool`, and all schema types
- `auditsTable`: stores per-user audit history keyed by `clerk_user_id`
- Schema at `lib/db/src/schema/audits.ts`
- Table created via raw SQL (no drizzle-kit migration needed for this project)

### AI Integration (`lib/integrations-anthropic-ai/`)
- Replit AI Integrations for Anthropic — uses `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` and `AI_INTEGRATIONS_ANTHROPIC_API_KEY` (auto-provisioned)

## Key Features

1. **Free Audit** — Scrapes URL, sends to Claude, returns AI Visibility Score (0-100), Semantic Density, Structural Formatting, 3 weaknesses, 3 competitor patterns
2. **Email Capture** — Name + email captured before showing audit results
3. **Content Optimizer** — Rewrites page content with GEO optimizations, side-by-side diff
4. **Pricing Tiers** — Free ($0), Fix Package ($49 one-time), Monitor ($29/mo), Grow ($99/mo)
5. **Stripe Payments** — Monitor + Grow Stripe checkout sessions via `/api/stripe/checkout`
6. **Monitor Plan** — Weekly automated re-audits of 5 tracked AI queries; Claude checks each query; results stored in `query_tracking` table; Monday morning email report via Resend. Setup via `/monitor-setup`.
7. **GrowUpsellPanel** — Blurred competitor AI visibility comparison on dashboard (locked behind Grow plan)
8. **User Accounts** — Clerk auth with sign-in/sign-up pages, branded with GEOboost logo
9. **Audit History** — Signed-in users get audits auto-saved to PostgreSQL; Dashboard shows all past audits with score bars, "View Results" restores to sessionStorage

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec

## API Endpoints

- `POST /api/geoboost/audit` — Audit a business website (saves to DB if authenticated)
- `POST /api/geoboost/optimize` — Optimize content for AI visibility
- `POST /api/geoboost/detect-category` — Auto-detect business category from URL metadata
- `GET /api/audits` — Fetch authenticated user's audit history (401 if not signed in)
- `POST /api/stripe/checkout` — Create Stripe checkout session (Monitor or Grow plan)
- `GET /api/monitor/setup` — Get user's tracked query config
- `POST /api/monitor/setup` — Save tracked queries + email for Monitor plan
- `GET /api/monitor/query-results` — Get recent query tracking results
- `POST /api/monitor/send-test-report` — Trigger a test weekly email report

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
