# MarinaManagementOS

A marina management system for berth-based marinas: berths, customers and
vessels, agreements, bookings, billing, receivables and occupancy reporting.

- Module plan: [docs/PLAN.md](docs/PLAN.md)
- What PacSoft MMS NG contains, and what we keep: [docs/pacsoft-study.md](docs/pacsoft-study.md)
- PacSoft data mapping for migration: [docs/pacsoft-mapping.md](docs/pacsoft-mapping.md)
- How PacSoft was studied: [docs/clean-room.md](docs/clean-room.md)

## Layout

| Path | What |
|------|------|
| `packages/domain` | Business rules (occupancy, ownership by month, double-booking, proration, GST, ageing, allocation, meter usage) with unit tests |
| `apps/api` | Express + Prisma API on PostgreSQL, one router per module |
| `apps/web` | React + Vite + Tailwind front end |

## Run locally

```bash
cp .env.example apps/api/.env
npm install
npm run db:up                                   # PostgreSQL in Docker
npm run db:setup --workspace apps/api           # create tables and sample data + first admin (from .env)
npm run dev                                     # API :4000, web :5173
```

Sign in with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD from `apps/api/.env`, then add
staff under the users API. Roles: Admin (everything), Berth Office (berths,
customers, vessels, agreements), Finance (customers, billing, receivables),
Read-only. The API listens on 127.0.0.1 by default (API_HOST to change).

`npm test` runs the domain and API tests. `npm run typecheck` checks all packages.
