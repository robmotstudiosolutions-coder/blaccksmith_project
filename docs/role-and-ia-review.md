# SlotSure – Role and Information Architecture Review

## Purpose

This document formally documents the seven user roles, their permission boundaries, the corrected information architecture, and HIPAA data minimization compliance for the SlotSure hospital clinic-booking platform.

---

## 1. Role Definitions and Permission Boundaries

| Role | Owns | Permitted Actions | Explicitly Prohibited |
|------|------|-------------------|----------------------|
| **Patient** | Own care-seeking and appointments | Search, hold, commit, cancel, reschedule, view own appointments, join telehealth | View another patient; inspect audit events; publish capacity; change permissions |
| **Authorized Caregiver** | Booking for an authorized patient | All patient actions after delegation verification | Act for unauthorized patient; access unrelated records; audit access |
| **Booking Staff / Scheduler** | Assisted booking and daily operations | Book for verified patient; resolve uncertain outcomes; reconcile EHR mismatches; view metrics; release slots | Manage users; change global policy; silently override allocation; mutate audit |
| **Clinician** | Care delivery and schedule ownership | View own schedule; patient queue; room readiness; start encounters; mark attendance | Manage permissions; publish unrestricted capacity; edit booking outcomes without authorization; audit search |
| **Clinic Administrator** | Local configuration and governance | Manage clinic settings; appointment types; clinician availability rules; staff membership; controlled overrides; local audit access | Bypass tenant boundaries; alter immutable audit records; global user management |
| **Operations Manager** | Network-level operations | Monitor clinics; capacity; incidents; integrations; reports; audit search | Access unnecessary patient detail; clinical notes; book appointments |
| **System / Security Auditor** | Independent oversight | Search immutable audit events; inspect access; export approved evidence | Book appointments; edit or delete any evidence; bypass audit immutability |

---

## 2. Authorization Basis Types

| Actor Role | Authorization Basis | Verification Requirement |
|-----------|---------------------|--------------------------|
| Patient | `SELF` | Authenticated session matches subject patient |
| Caregiver | `CAREGIVER_DELEGATION` | Delegation token from patient + staff verification |
| Booking Staff | `STAFF_ASSISTANCE` | Mandatory identity verification before booking |

---

## 3. Information Architecture

### 3.1 Public Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Patient home: specialty directory, availability search, booking flow |
| `/sign-in` | Public | Authentication page; role self-selection disabled in production |
| `/sign-up` | Public | Patient account creation |
| `/help` | Public | Comprehensive help centre (FIXED: was linking to appointment search) |
| `/signed-out` | Public | Clean session end page (FIXED: was landing on protected staff gate) |

### 3.2 Patient Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/account` | Patient, Caregiver | My appointments: view, cancel, reschedule, join telehealth |
| `/appointments/[id]` | Patient, Caregiver | Individual appointment detail |

### 3.3 Clinician Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/clinician` | Clinician, Clinic Admin | P0 workspace: schedule, queue, waiting rooms, help, settings |
| `/clinician/schedule` | Clinician, Clinic Admin | Full schedule view with date controls |
| `/clinician/queue` | Clinician, Clinic Admin | Real-time patient queue (15s polling) |
| `/clinician/encounters/[encounterId]` | Clinician, Clinic Admin | Active encounter management + EHR launch |

### 3.4 Staff Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/staff` | Booking Staff, Clinic Admin, Ops Manager, Auditor | Operations dashboard: metrics, reconciliation, audit |
| `/staff/booking/patient` | Booking Staff, Clinic Admin | Step 1: Patient selection & identity verification |
| `/staff/booking/search` | Booking Staff, Clinic Admin | Step 2: Appointment search (requires verified patient) |
| `/staff/reconciliation` | Booking Staff, Clinic Admin | EHR reconciliation and controlled slot release |

### 3.5 Route Corrections Applied

| Issue | Fix |
|-------|-----|
| Help linked to `/#appointments` (appointment search) | Fixed to `/help` (real help centre) |
| Sign-out landed on `/staff` (protected gate) | Fixed to `/signed-out` (session confirmation page) |
| Staff booking had no patient verification step | Added `/staff/booking/patient` (mandatory first step) |
| Broad audit search unscoped | Scoped to `AUDITOR`, `CLINIC_ADMIN`, `OPERATIONS_MANAGER` roles only |
| Production sign-in allowed role self-selection | Role switcher disabled when `NODE_ENV === 'production'` |

---

## 4. Navigation by Role

### Patient
- Book care (specialty directory + booking flow)
- My appointments (account page)
- Help (`/help`)
- Sign in / Sign out → `/signed-out`

### Clinician
- My workspace (`/clinician`)
- Help (`/help`)
- Sign out → `/signed-out`

### Booking Staff
- Operations (`/staff`)
- Assisted booking (`/staff/booking/patient`)
- Reconciliation (`/staff/reconciliation`)
- Help (`/help`)

### Clinic Administrator
- Operations (`/staff`)
- Assisted booking
- Reconciliation
- Clinician workspace (oversight view)

### Operations Manager
- Operations dashboard
- Audit log
- Clinician schedule (read-only overview)

### Auditor
- Governance / Audit log (`/staff#audit`)
- Export functions

---

## 5. HIPAA Minimum-Necessary Data Compliance

### 5.1 Patient Identity in List Views

All list views (clinician schedule, patient queue, staff reconciliation, audit log) are subject to this rule:

> Patient identity is restricted to **safe server-generated references** (e.g. `SS-PT-4821`) and **initials** (e.g. `J.D.`). Full names, dates of birth, diagnoses, medications, and clinical notes are never displayed in this workspace.

| View | Patient Data Shown | Patient Data Excluded |
|------|-------------------|----------------------|
| Clinician schedule | Safe reference, initials | Full name, DOB, diagnosis, notes |
| Patient queue | Safe reference, initials, waiting time | Full name, reason for visit, clinical history |
| Staff reconciliation | Safe reference | Any patient identity |
| Audit log | No patient data | N/A |
| Staff metrics | Aggregate counts only | Any individual patient data |

### 5.2 EHR Boundary

This application:
- Does **not** store clinical notes, diagnoses, or medications.
- Does **not** display clinical history in any view.
- Provides an EHR launch button in the encounter view to redirect clinicians to the authorised EHR system.
- Displays a minimum-necessary data notice in all clinical-adjacent views.

### 5.3 PHI in URLs

- Patient identifiers are **never** placed in URLs.
- Encounter IDs are server-generated opaque UUIDs with no patient information.
- Safe references (`SS-PT-XXXX`) are used in display contexts only.

### 5.4 Browser Storage

- Access tokens are **not** stored in `localStorage`.
- Preview session tokens use `sessionStorage` (cleared on tab close).
- Production must use secure, HttpOnly cookies via the hospital identity provider.

### 5.5 Analytics and Logging

- PHI is **never** included in analytics events or browser console logs.
- All audit events are server-side, immutable, and include correlation IDs.

---

## 6. Shared Booking Architecture

Both patient self-service and staff-assisted booking share:
- `useSharedBooking` hook (state machine, idempotency, polling, race-loss)
- `BookingResults` component (slot display, hold countdown, conflict, alternatives)
- `ConflictAlert`, `AlternativeSlotList`, `PendingOutcomePanel` components
- Booking state machine (`state-machine.ts`)
- API client functions

Role-specific separation:
- Patient flow: `BookingContext.authorizationBasis = 'SELF'`
- Staff flow: `BookingContext.authorizationBasis = 'STAFF_ASSISTANCE'` with mandatory `verificationReference`
- Staff flow begins at `/staff/booking/patient` (identity verification) before searching

---

## 7. Permission Helper

Central permission check: `can(role, action, resource?, context?)`

- Returns `true` only when action is explicitly allowed AND not prohibited.
- Cross-tenant context (`tenantId ≠ actorTenantId`) always returns `false`.
- Caregiver delegation requires `verificationReference` and `subjectPatientId`.
- Staff assistance requires `verificationReference` and `subjectPatientId`.
- Production: Role self-selection in UI is impossible (`NODE_ENV === 'production'`).

> **Note:** Frontend permission checks are display-layer guards only. The server enforces the same policy independently and authoritatively.
