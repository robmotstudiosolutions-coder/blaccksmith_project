# SlotSure Production Operations & Security Runbook

This document details the operational architecture, security controls, deployment requirements, and incident procedures for the SlotSure hospital clinic-booking platform.

---

## 1. Allocation Guarantee & Database Architecture

SlotSure's defining guarantee is: **PostgreSQL is the single authority for slot availability, and at most one active booking may exist for a given slot.**

### 1.1 Database Engine & Indexing Requirements
- **Managed PostgreSQL**: Minimum version 16+, configured with Multi-AZ / High Availability replication.
- **Partial Unique Index**:
  ```sql
  CREATE UNIQUE INDEX one_active_booking_per_slot_idx 
  ON bookings (slot_id) 
  WHERE status IN ('CONFIRMED', 'CANCEL_PENDING');
  ```
  This index acts as the final hardware-level defense against race conditions, ensuring that even if concurrent transactions bypass application-level locks, duplicate bookings are rejected at commit time.
- **Connection Pooling**: Use transaction-mode pooling (such as PgBouncer or Supavisor) with maximum client connections tuned to hospital traffic bursts without exhausting database file descriptors.
- **Row Locking**: Mutations lock hold and slot rows (`FOR UPDATE`) in deterministic order (`holds` then `slots`) to prevent database deadlocks under contention.

---

## 2. Security & Zero-PHI Architecture

### 2.1 Least Privilege & Data Separation
1. **No PHI in URLs, Logs, or Client State**: URLs and API payloads use non-identifying UUIDs (`slotId`, `holdId`, `bookingId`, `correlationId`). Clinical diagnoses and medical records are strictly excluded from booking transactions.
2. **Audit Logging**: Every mutation emits an immutable record to `audit_events`:
   - Actions: `HOLD_CREATED`, `BOOKING_CREATED`, `BOOKING_CANCELLED`, `INVENTORY_RELEASED`.
   - Fields: `actor_id`, `action`, `target_type`, `target_id`, `outcome`, `correlation_id`, `occurred_at`.
3. **Staff View Privacy**: Staff dashboards display operational metadata (counts, safe reference IDs like `REC-10391`, latency, and system outcomes) without exposing patient identity.

### 2.2 Edge & Transport Security
- **TLS Termination**: All public traffic terminated via HTTPS/TLS 1.3 at the ingress load balancer.
- **Rate Limiting**:
  - Availability searches: 60 requests/minute per client IP.
  - Hold placements: 10 requests/minute per client.
  - Hold commits: 5 requests/minute per client.
- **Headers**:
  - `Idempotency-Key` (8-160 characters) mandatory for all mutations.
  - Security headers: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`.

---

## 3. Operations Runbooks

### Runbook 1: Reconciling Uncertain Booking Outcomes (`BOOKING_STATE_UNKNOWN`)
* **Scenario**: A patient clicked "Confirm appointment", the server executed the transaction, but the network dropped before the client received the HTTP 200 response.
* **Resolution**:
  1. Client sends a query to `GET /v1/booking-attempts/:idempotencyKey`.
  2. The service checks `idempotency_commands` for the stored request hash and completed response.
  3. If found, returns the original booking reference with `replayed: true`.
  4. If the record is still `IN_PROGRESS` or absent, the client prompts the patient to wait or check with support using their correlation ID.

### Runbook 2: Controlled Inventory Release
* **Scenario**: A patient cancels an appointment (`BOOKED` -> `CANCEL_PENDING`).
* **Procedure**:
  1. Cancellations do not instantly republish slots to avoid race conditions with clinical cancellation policies.
  2. A scheduled release worker or authorized staff member reviews the reconciliation queue (`/v1/staff/reconciliation`).
  3. Trigger `POST /v1/staff/slots/:slotId/release`.
  4. The slot safely transitions: `CANCEL_PENDING` -> `RELEASE_PENDING` -> `PUBLISHED`, and the audit event `INVENTORY_RELEASED` is logged.

### Runbook 3: Expired Hold Sweep
* **Scenario**: A hold was created but the patient closed the browser or abandoned the 5-minute countdown.
* **Procedure**:
  - PostgreSQL cron / worker executes:
    ```sql
    UPDATE slots SET state = 'PUBLISHED', version = version + 1, updated_at = NOW()
    WHERE id IN (
      SELECT slot_id FROM holds 
      WHERE status = 'ACTIVE' AND expires_at < NOW()
    ) AND state = 'HELD';

    UPDATE holds SET status = 'EXPIRED', updated_at = NOW()
    WHERE status = 'ACTIVE' AND expires_at < NOW();
    ```

---

## 4. Hospital Decisions Pending Checklist

Before moving to full production deployment, the following organizational integrations must be formally confirmed:

| Decision Item | Current Prototype State | Production Requirement |
|---|---|---|
| **Identity Provider** | Development headers (`X-Patient-Id`) | OIDC / SAML / NHS login enterprise integration |
| **Caregiver Authorization** | Single-user patient proxy | Legal proxy & guardian delegated consent rules |
| **Hold Duration** | 300 seconds (5 minutes) | Hospital clinical committee approval |
| **Cancellation Policy** | 24/7 self-service cancellation | Cut-off rules (e.g. minimum 24 hours prior to appointment) |
| **Notifications** | Suppressed / Logging only | SMS (NHS Notify / Twilio) / Email gateway |
| **EHR Synchronization** | Standalone Drizzle schema | HL7 FHIR bidirectional sync with Epic/Cerner |
