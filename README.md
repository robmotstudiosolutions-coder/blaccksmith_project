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

## Features & Portals

### 1. Clinician Workspace (`/clinician`)
- High-efficiency clinical command center designed for rapid workflow and HIPAA minimum-necessary display compliance (no full patient names or DOBs in tabular views).
- **Daily Schedule** (`/clinician/schedule`): Timeline and compact list views, status filtering, encounter quick-launch.
- **Realtime Patient Queue** (`/clinician/queue`): Live waiting room status, wait duration tracking, arrival indicators.
- **Encounter Room** (`/clinician/encounters/:id`): Telehealth readiness checklist (camera, microphone, network ping), secure token exchange, clinical action controls (start, complete, mark no-show).
- **Clinical Performance**: Running daily metrics (completed encounters, average wait time, on-time rate).

### 2. Shared Booking Architecture
- **Unified Engine**: Both patient self-service (`/booking`) and staff-assisted booking (`/staff/booking`) utilize the exact same state machine (`useSharedBooking`), UI primitives, and conflict-resolution rules.
- **Concurrency & Last-Slot Race Resolution**: Strict authoritative server-side commit guarantee. Browser availability is provisional; only the authoritative commit response can transition state to `CONFIRMED`.
- **Race Lost & Alternatives**: If two actors attempt to claim the same final slot simultaneously, the losing actor is immediately transitioned to `RACE_LOST`, receives empathetic, unambiguous messaging, and is presented with immediate alternative slots.
- **Network Ambiguity Resolution**: If a network timeout occurs during commit, the UI transitions to `PENDING_RESOLUTION` and polls `/appointments/attempts/:commitKey` using exponential backoff with jitter.

### 3. Role-Based Access Control (RBAC) & Safety Boundaries
SlotSure strictly enforces permissions across 7 discrete roles:
- `PATIENT` (Patient self-service)
- `CAREGIVER` (Proxy booking with valid proxy authorization)
- `STAFF` (Staff-assisted booking requiring verified patient identity reference)
- `CLINICIAN` (Clinical workspace, encounters, and attendance)
- `OPERATIONS_MANAGER` (Clinic schedules, slot releases, capacity management)
- `AUDITOR` (Compliance, immutable audit logs)
- `SYSTEM_ADMIN` (System configuration and user management)

### 4. Staff Reconciliation Workspace (`/staff/reconciliation`)
- Controlled slot release and capacity reconciliation.
- Full audit-trail logging with zero-PHI display tables.
- Realtime polling and stale hold recovery.

## Documentation

- [Role and Information Architecture Review](docs/role-and-ia-review.md): Detailed specifications for all 7 roles, authorization boundaries, and navigation hierarchy.
- [Booking State Machine Reference](docs/booking-state-machine.md): Formal state transition diagram, invariants, and race recovery algorithms.

## Atomic Booking Guarantee

The authoritative API exposes `/v1/availability`, `/v1/holds`, `/v1/holds/:holdId/commit`, `/v1/bookings/:bookingId/cancel`, and `/v1/alternatives`.
- Mutations enforce `Idempotency-Key` tracking and cryptographic hashing.
- Commit transactions lock hold and slot rows atomically.
- PostgreSQL's `one_active_booking_per_slot_idx` unique index serves as a final database-level guarantee against double booking.
- Cancellations enter `CANCEL_PENDING`, preventing immediate premature reissue without hospital audit verification.

