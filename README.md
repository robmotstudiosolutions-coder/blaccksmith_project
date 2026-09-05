# SlotSure

SlotSure is a hospital clinic-booking MVP. Its defining guarantee is that PostgreSQL, not the UI, enforces that a slot can have no more than one active booking.

## Development setup

1. Copy `.env.example` to `.env` and use its development-only values.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. Install packages: `pnpm install`. The repository includes `pnpm-workspace.yaml`; use pnpm consistently rather than mixing npm and pnpm installs.
4. Apply migrations: `npm run db:migrate`.
5. Seed non-production data: `npm run db:seed`.
6. Run the web client: `pnpm dev` (or `pnpm dev:web`); run the API: `pnpm dev:api` on port `3001`.

## Architecture

- `blacksmith_pro/`: Next.js App Router frontend with deterministic mock booking scenarios. The app currently provides the patient booking flow and a safe staff operations overview.
- `apps/api/`: Fastify API and edge validation.
- `packages/domain/`: product vocabulary and, next, state transitions and typed domain errors.
- `packages/database/`: Drizzle schema, PostgreSQL migrations, and development-only seed data.

The migration creates `one_active_booking_per_slot_idx`, a partial unique index covering `CONFIRMED` and `CANCEL_PENDING` bookings. The booking service will additionally use a transaction and controlled slot-state changes.

## Frontend

Run `npm run dev` for the frontend. In development, its scenario selector demonstrates a successful booking, competing request, expired hold, uncertain outcome resolution, and stale availability. It is not rendered in production builds. Run `npm run dev:api` separately for the API.

## Atomic booking API

The authoritative API exposes `GET /healthz`, `GET /v1/availability`, `POST /v1/holds`, `POST /v1/holds/:holdId/commit`, `POST /v1/bookings/:bookingId/cancel`, `GET /v1/booking-attempts/:idempotencyKey`, and `GET /v1/alternatives`. Mutations require `Idempotency-Key` and the development-only `X-Patient-Id` header. The commit transaction locks hold then slot rows, commits booking/audit/idempotency outcome together, and relies on PostgreSQL's active-booking unique index as a final duplicate-allocation guard. Cancellation enters `CANCEL_PENDING`; a separate controlled-release worker/action must safely republish inventory.

## Hospital decisions pending

Identity provider, final caregiver authorization, hold duration, cancellation/rescheduling policies, clinical eligibility/referral rules, notification channels, EHR integration, production infrastructure, and regulatory requirements remain **TBD — Hospital Decision Required**. Development seeds contain fictional identities only.
