# SlotSure

SlotSure is a hospital clinic-booking MVP. Its defining guarantee is that PostgreSQL, not the UI, enforces that a slot can have no more than one active booking.

## Development setup

1. Copy `.env.example` to `.env` and use its development-only values.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. Install packages: `npm install` (this machine may require `npm install --workspaces=false` from each package until its npm workspace issue is resolved).
4. Apply migrations: `npm run db:migrate`.
5. Seed non-production data: `npm run db:seed`.
6. Run the web client: `npm run dev` (or `npm run dev:web`); run the API: `npm run dev:api`.

## Architecture

- `blacksmith_pro/`: Next.js App Router frontend with deterministic mock booking scenarios. The app currently provides the patient booking flow and a safe staff operations overview.
- `apps/api/`: Fastify API and edge validation.
- `packages/domain/`: product vocabulary and, next, state transitions and typed domain errors.
- `packages/database/`: Drizzle schema, PostgreSQL migrations, and development-only seed data.

The migration creates `one_active_booking_per_slot_idx`, a partial unique index covering `CONFIRMED` and `CANCEL_PENDING` bookings. The booking service will additionally use a transaction and controlled slot-state changes.

## Frontend

Run `npm run dev` for the frontend. In development, its scenario selector demonstrates a successful booking, competing request, expired hold, uncertain outcome resolution, and stale availability. It is not rendered in production builds. Run `npm run dev:api` separately for the API.

## Hospital decisions pending

Identity provider, final caregiver authorization, hold duration, cancellation/rescheduling policies, clinical eligibility/referral rules, notification channels, EHR integration, production infrastructure, and regulatory requirements remain **TBD — Hospital Decision Required**. Development seeds contain fictional identities only.
