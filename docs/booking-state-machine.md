# SlotSure – Booking State Machine Reference

## Authoritative Invariant

> **The browser must never decide who wins.**
> 
> Availability shown in the browser is **provisional** and advisory only.
> Only an authoritative commit response from the server can set state to `CONFIRMED`.
> Realtime events are display-layer updates only and must never set `CONFIRMED`.

---

## States

| State | Terminal? | Description |
|-------|-----------|-------------|
| `IDLE` | No | No active booking attempt |
| `HOLDING` | No | Hold request in flight |
| `HELD` | No | Provisional time reserved (countdown active) |
| `COMMITTING` | No | Commit request in flight |
| `CONFIRMED` | Yes* | Booking durably created by server |
| `PENDING_RESOLUTION` | No | Outcome unknown (network failure during commit) |
| `RACE_LOST` | Yes* | Slot taken by another patient. No booking created. |
| `EXPIRED` | Yes* | Hold countdown reached zero |
| `FAILED_RETRYABLE` | No | Transient error; retry allowed |
| `FAILED_TERMINAL` | Yes* | Unrecoverable error |
| `CANCELLING` | No | Cancellation request in flight |
| `CANCELLED` | Yes* | Booking successfully cancelled |

*Terminal states can be reset with the `RESET` event.

---

## Transition Table

```
IDLE ──HOLD_REQUESTED──────────────────────> HOLDING
HOLDING ──HOLD_SUCCEEDED──────────────────> HELD
HOLDING ──SLOT_UNAVAILABLE────────────────> RACE_LOST
HOLDING ──RETRYABLE_ERROR─────────────────> FAILED_RETRYABLE
HOLDING ──TERMINAL_ERROR──────────────────> FAILED_TERMINAL
HELD ──COMMIT_REQUESTED───────────────────> COMMITTING
HELD ──HOLD_EXPIRED───────────────────────> EXPIRED
HELD ──TERMINAL_ERROR─────────────────────> FAILED_TERMINAL
COMMITTING ──COMMIT_SUCCEEDED─────────────> CONFIRMED  ← authoritative
COMMITTING ──SLOT_UNAVAILABLE─────────────> RACE_LOST
COMMITTING ──NETWORK_TIMEOUT──────────────> PENDING_RESOLUTION
COMMITTING ──TERMINAL_ERROR───────────────> FAILED_TERMINAL
PENDING_RESOLUTION ──ATTEMPT_CONFIRMED────> CONFIRMED  ← authoritative (via polling)
PENDING_RESOLUTION ──ATTEMPT_RACE_LOST────> RACE_LOST
PENDING_RESOLUTION ──STILL_PENDING────────> PENDING_RESOLUTION
PENDING_RESOLUTION ──TERMINAL_ERROR───────> FAILED_TERMINAL
CONFIRMED ──CANCEL_REQUESTED──────────────> CANCELLING
CANCELLING ──CANCEL_SUCCEEDED─────────────> CANCELLED
CANCELLING ──CANCEL_FAILED────────────────> CONFIRMED  (revert)
CANCELLING ──TERMINAL_ERROR───────────────> FAILED_TERMINAL
FAILED_RETRYABLE ──HOLD_REQUESTED─────────> HOLDING
FAILED_RETRYABLE ──RESET──────────────────> IDLE
RACE_LOST ──RESET─────────────────────────> IDLE
EXPIRED ──RESET───────────────────────────> IDLE
FAILED_TERMINAL ──RESET───────────────────> IDLE
CANCELLED ──RESET─────────────────────────> IDLE
```

---

## Events

| Event | Trigger |
|-------|---------|
| `HOLD_REQUESTED` | Patient clicks a slot to reserve |
| `HOLD_SUCCEEDED` | Server acknowledges the hold |
| `SLOT_UNAVAILABLE` | Server reports slot already taken |
| `RETRYABLE_ERROR` | Server signals transient failure |
| `HOLD_EXPIRED` | Countdown reaches 0 |
| `COMMIT_REQUESTED` | Patient confirms appointment during hold |
| `COMMIT_SUCCEEDED` | Server returns durable booking confirmation |
| `NETWORK_TIMEOUT` | Commit request timed out before server response |
| `ATTEMPT_CONFIRMED` | Polling reveals server confirmed the attempt |
| `ATTEMPT_RACE_LOST` | Polling reveals server did not create a booking |
| `STILL_PENDING` | Polling returns no outcome yet |
| `TERMINAL_ERROR` | Unrecoverable validation or server error |
| `CANCEL_REQUESTED` | Patient requests cancellation |
| `CANCEL_SUCCEEDED` | Server confirms cancellation |
| `CANCEL_FAILED` | Cancellation failed (reverts to CONFIRMED) |
| `RESET` | Patient chooses a new slot after terminal state |

---

## PENDING_RESOLUTION Outcome Resolution

When `COMMITTING → NETWORK_TIMEOUT → PENDING_RESOLUTION`:

1. Poll `GET /v1/booking-attempts/{idempotencyKey}` using bounded exponential backoff.
2. Poll intervals: 1s, 2s, 4s, 8s, 10s (max), then 10s continuously.
3. On `status=CONFIRMED`: emit `ATTEMPT_CONFIRMED` → `CONFIRMED`.
4. On `outcome=RACE_LOST`: emit `ATTEMPT_RACE_LOST` → `RACE_LOST`.
5. On HTTP 5xx or timeout: continue polling.

### CRITICAL: Do not re-submit

The UI must display the `PendingOutcomePanel` warning while in `PENDING_RESOLUTION`:

> "We're checking whether the appointment was confirmed. **Please do not submit this booking again.**"

---

## RACE_LOST: Required User Messaging

Per product specification, the user message on race loss must be:

> "That appointment was booked by another patient just before your request was completed. **No appointment was created for you.**"

The message must:
1. Use plain language (no technical codes exposed to patient).
2. Explicitly state no booking was created.
3. Offer alternative times immediately.
4. Be delivered via an assertive `aria-live` region for screen reader announcement.

---

## Idempotency Key Management

| Operation | Key Generation | Purpose |
|-----------|---------------|---------|
| Hold request | `crypto.randomUUID()` at click time | Prevents duplicate holds |
| Commit request | Separate `crypto.randomUUID()` | Prevents duplicate commits even on retry |
| Cancel request | `crypto.randomUUID()` per attempt | Safe cancellation retry |

Keys are **never reused** across separate attempts. Each RESET generates fresh keys.

---

## Realtime Event Handling

Realtime events (WebSocket / SSE) update `SlotAvailabilityState` in the availability grid only.

**Events must NEVER:**
- Set `BookingAttemptState` to `CONFIRMED`
- Remove a `RACE_LOST` state
- Override `PENDING_RESOLUTION` without server confirmation
- Be treated as authoritative for any booking lifecycle state change

**Events may:**
- Update provisional slot availability indicators in the grid
- Trigger a snapshot refresh from the availability API
- Update waiting room and queue displays in the clinician workspace

---

## State Machine Implementation

**File:** [`state-machine.ts`](file:///c:/dev/blaccksmith_project/apps/web/src/features/booking/state-machine.ts)

- `transition(current, event)` — returns next state or `null` (invalid)
- `assertTransition(current, event)` — throws on invalid (programmer error)
- `assertNotProvisionalConfirmation(wasProvisional, newState)` — invariant guard
- `isTerminalState(s)` — true for CONFIRMED, RACE_LOST, EXPIRED, FAILED_TERMINAL, CANCELLED
- `isBusyState(s)` — true for HOLDING, COMMITTING, CANCELLING
- `isResolvingState(s)` — true for PENDING_RESOLUTION

**Hook:** [`use-shared-booking.ts`](file:///c:/dev/blaccksmith_project/apps/web/src/features/booking/hooks/use-shared-booking.ts)
