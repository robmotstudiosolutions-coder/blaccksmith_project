# SlotSure

SlotSure is a hospital clinic-booking MVP. Its defining guarantee is that PostgreSQL, not the UI, enforces that a slot can have no more than one active booking.

## Development setup

1. Copy `.env.example` to `.env` and use its development-only values.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. Install packages: `npm install`. This workspace now uses the npm lockfiles generated for the Next.js application; avoid mixing package managers in the same checkout.
4. Apply migrations: `npm run db:migrate`.
5. Seed non-production data: `npm run db:seed`.
6. Run the API in one terminal: `npm run dev:api`. Run the web client in another: `npm run dev` (or `npm run dev:web`). The web app runs on port `3000` and proxies booking requests to the API on port `3001`.

## Architecture

- `blacksmith_pro/`: Next.js App Router frontend with a same-origin server-side proxy to the Fastify booking API. It provides live development booking and a safe staff operations overview.
- `apps/api/`: Fastify API and edge validation.
- `packages/domain/`: product vocabulary and, next, state transitions and typed domain errors.
- `packages/database/`: Drizzle schema, PostgreSQL migrations, and development-only seed data.

The migration creates `one_active_booking_per_slot_idx`, a partial unique index covering `CONFIRMED` and `CANCEL_PENDING` bookings. The booking service will additionally use a transaction and controlled slot-state changes.

## Frontend

Run `npm run dev` for the frontend and `npm run dev:api` separately for the API. The patient screen now uses live API availability, holds, idempotent commits, and typed error states. Its development identity is held server-side by the Next proxy and must be replaced with an approved identity-provider integration before production.

## Atomic booking API

The authoritative API exposes `GET /healthz`, `GET /v1/availability`, `POST /v1/holds`, `POST /v1/holds/:holdId/commit`, `POST /v1/bookings/:bookingId/cancel`, `GET /v1/booking-attempts/:idempotencyKey`, and `GET /v1/alternatives`. Mutations require `Idempotency-Key` and the development-only `X-Patient-Id` header. The commit transaction locks hold then slot rows, commits booking/audit/idempotency outcome together, and relies on PostgreSQL's active-booking unique index as a final duplicate-allocation guard. Cancellation enters `CANCEL_PENDING`; a separate controlled-release worker/action must safely republish inventory.

## Hospital decisions pending

Identity provider, final caregiver authorization, hold duration, cancellation/rescheduling policies, clinical eligibility/referral rules, notification channels, EHR integration, production infrastructure, and regulatory requirements remain **TBD — Hospital Decision Required**. Development seeds contain fictional identities only.
