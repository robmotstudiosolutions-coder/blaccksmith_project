# SlotSure

SlotSure is a modern hospital clinic-booking platform designed for scale and clinical reliability. Its defining guarantee is that PostgreSQL and domain state machines enforce that an appointment slot can have no more than one active booking.

The development seed now creates 15 clinics, appointment types, clinicians, and three future slots per specialty. Re-run `npm run db:seed` after this update. Mock responses are disabled by default; set `SLOTSURE_USE_MOCKS=true` only for UI demonstrations that do not create real bookings.

## Architecture

The project is structured as a scalable, clean TypeScript monorepo with decoupled domain layers:

```text
├── apps/
│   ├── web/               # Next.js 16 (Turbopack) frontend with patient & staff portals (@slotsure/web)
│   └── api/               # Fastify REST API with modular plugins, RBAC, and error handlers (@slotsure/api)
├── packages/
│   ├── domain/            # Core business models, slot state machine, and typed errors (@slotsure/domain)
│   └── database/          # Drizzle schema, cross-platform migrations, and test seeds (@slotsure/database)
└── tsconfig.base.json     # Standardized modern TypeScript configuration
```

## Development Setup

1. **Environment**: Copy `.env.example` to `.env` and use development values.
2. **Start Database**: `docker compose up -d postgres`.
3. **Install Dependencies**: `npm install`.
4. **Apply Migrations**: `npm run db:migrate`.
5. **Seed Non-Production Data**: `npm run db:seed`.
6. **Start Dev Servers**:
   - Web Client (`http://localhost:3000`): `npm run dev` (or `npm run dev:web`)
   - Booking API (`http://localhost:3001`): `npm run dev:api`

## Monorepo Scripts

| Command | Action |
| --- | --- |
| `npm run dev` | Runs the Next.js web application (`apps/web`) |
| `npm run dev:api` | Builds dependencies and starts Fastify API with hot reload (`apps/api`) |
| `npm run build` | Compiles domain, database, API, and web packages |
| `npm run test` | Executes unit and integration test suites across all workspaces |
| `npm run typecheck` | Validates TypeScript types across all workspaces with zero emit |
| `npm run db:migrate` | Runs Drizzle migrations against PostgreSQL |
| `npm run db:seed` | Seeds test hospital, clinic, and patient data |

## Atomic Booking Guarantee

The authoritative API exposes `/v1/availability`, `/v1/holds`, `/v1/holds/:holdId/commit`, `/v1/bookings/:bookingId/cancel`, and `/v1/alternatives`.
- Mutations enforce `Idempotency-Key` tracking and cryptographic hashing.
- Commit transactions lock hold and slot rows atomically.
- PostgreSQL's `one_active_booking_per_slot_idx` unique index serves as a final database-level guarantee against double booking.
- Cancellations enter `CANCEL_PENDING`, preventing immediate premature reissue without hospital audit verification.
