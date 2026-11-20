# MarinaManagementOS

A marina management system for berth-based marinas: berths, customers and
vessels, agreements, bookings, billing, receivables and occupancy reporting.

- Module plan: [docs/PLAN.md](docs/PLAN.md)
- PacSoft data mapping for migration: [docs/pacsoft-mapping.md](docs/pacsoft-mapping.md)
- How PacSoft was studied: [docs/clean-room.md](docs/clean-room.md)

## Layout

| Path | What |
|------|------|
| `packages/domain` | Business rules (occupancy, ownership by month, double-booking, proration, GST, ageing, allocation) with unit tests |
| `apps/api` | Express + Prisma API on PostgreSQL, one router per module |
| `apps/web` | React + Vite + Tailwind front end |

## Run locally

```bash
cp .env.example apps/api/.env
npm install
npm run db:up                                   # PostgreSQL in Docker
npm run prisma:migrate --workspace apps/api     # create tables
npm run dev                                     # API :4000, web :5173
```

`npm test` runs the domain and API tests. `npm run typecheck` checks all packages.
