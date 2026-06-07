# Free Fire Tournament Website

## Overview

pnpm workspace monorepo with a Free Fire tournament website. Players can register, login, join tournaments (Solo/Duo/Squad), and pay entry fees via UPI. Admin can create/manage matches and confirm payments.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Auth**: JWT (bcryptjs + jsonwebtoken) stored in localStorage
- **Routing**: wouter

## Features

- Player registration + login with JWT auth
- Solo (Rs 10), Duo (Rs 20), Squad (Rs 40) tournament categories
- Max 18 players per match
- Live player count per match
- Admin panel: create/edit/delete matches, confirm payments
- UPI payment: 7762067909@ibl
- WhatsApp support: 7762067909 (floating button)
- Dark esports theme with orange/amber fire colors

## Admin Access

- Email: admin@ff.com
- Password: admin123

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

- `artifacts/freefire-tournament/` — React frontend
- `artifacts/api-server/` — Express backend
- `lib/db/` — Drizzle schema (players, matches, registrations)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-client-react/` — Generated React hooks
- `lib/api-zod/` — Generated Zod validators
