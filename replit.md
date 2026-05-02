# GEOboost Workspace

## Overview

pnpm workspace monorepo using TypeScript. GEOboost helps small businesses optimize their content to be cited more often by AI assistants like ChatGPT, Claude, and Perplexity (Generative Engine Optimization).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (not currently used — stateless MVP)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Anthropic Claude (via Replit AI Integrations — no API key needed)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui

## Architecture

### Frontend (`artifacts/geoboost/`)
- React + Vite, deployed at `/`
- Pages: `/` (audit form), `/results` (audit dashboard), `/optimizer` (content optimizer)
- Uses generated hooks from `@workspace/api-client-react`

### Backend (`artifacts/api-server/`)
- Express 5, deployed at `/api`
- Routes: `POST /api/geoboost/audit`, `POST /api/geoboost/optimize`
- Uses Anthropic Claude `claude-sonnet-4-6` via `@workspace/integrations-anthropic-ai`
- Stateless — no database writes

### AI Integration (`lib/integrations-anthropic-ai/`)
- Replit AI Integrations for Anthropic — uses `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` and `AI_INTEGRATIONS_ANTHROPIC_API_KEY` (auto-provisioned)

## Key Features

1. **Free Audit** — Scrapes submitted URL, sends content + queries to Claude, returns AI Visibility Score (0-100), Semantic Density Score, Structural Formatting Score, 3 specific weaknesses, 3 competitor patterns
2. **Email Capture** — Name + email captured before showing audit results
3. **Content Optimizer** — Rewrites page content with GEO optimizations (definition-first answers, specificity, FAQ sections), side-by-side diff with change explanations
4. **Payment CTA** — "Optimize My Content — $149/month" button ready for Stripe integration

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## API Endpoints

- `POST /api/geoboost/audit` — Audit a business website for AI visibility
- `POST /api/geoboost/optimize` — Optimize content for AI visibility

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
