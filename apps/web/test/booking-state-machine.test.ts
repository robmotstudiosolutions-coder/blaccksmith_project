import { describe, it, expect } from 'vitest';
import {
  transition,
  assertTransition,
  isTerminalState,
  isBusyState,
  isResolvingState,
  assertNotProvisionalConfirmation,
} from '../src/features/booking/state-machine';



describe('BookingStateMachine – Authoritative Transition Table', () => {

  // ── Happy path ──────────────────────────────────────────────────────────

  it('IDLE → HOLDING on HOLD_REQUESTED', () => {
    expect(transition('IDLE', { type: 'HOLD_REQUESTED' })).toBe('HOLDING');
  });

  it('HOLDING → HELD on HOLD_SUCCEEDED', () => {
    expect(transition('HOLDING', { type: 'HOLD_SUCCEEDED' })).toBe('HELD');
  });

  it('HELD → COMMITTING on COMMIT_REQUESTED', () => {
    expect(transition('HELD', { type: 'COMMIT_REQUESTED' })).toBe('COMMITTING');
  });

  it('COMMITTING → CONFIRMED on COMMIT_SUCCEEDED', () => {
    expect(transition('COMMITTING', { type: 'COMMIT_SUCCEEDED' })).toBe('CONFIRMED');
  });

  // ── Race-loss recovery ──────────────────────────────────────────────────

  it('HOLDING → RACE_LOST when slot is taken during hold', () => {
    expect(transition('HOLDING', { type: 'SLOT_UNAVAILABLE' })).toBe('RACE_LOST');
  });

  it('COMMITTING → RACE_LOST when slot is taken during commit', () => {
    expect(transition('COMMITTING', { type: 'SLOT_UNAVAILABLE' })).toBe('RACE_LOST');
  });

  it('RACE_LOST → IDLE on RESET (allows new attempt with new idempotency key)', () => {
    expect(transition('RACE_LOST', { type: 'RESET' })).toBe('IDLE');
  });

  // ── Outcome unknown resolution ──────────────────────────────────────────

  it('COMMITTING → PENDING_RESOLUTION on network timeout', () => {
    expect(transition('COMMITTING', { type: 'NETWORK_TIMEOUT' })).toBe('PENDING_RESOLUTION');
  });

  it('PENDING_RESOLUTION → CONFIRMED when server confirms attempt', () => {
    expect(transition('PENDING_RESOLUTION', { type: 'ATTEMPT_CONFIRMED' })).toBe('CONFIRMED');
  });

  it('PENDING_RESOLUTION → RACE_LOST when server denies attempt', () => {
    expect(transition('PENDING_RESOLUTION', { type: 'ATTEMPT_RACE_LOST' })).toBe('RACE_LOST');
  });

  it('PENDING_RESOLUTION → PENDING_RESOLUTION while still pending', () => {
    expect(transition('PENDING_RESOLUTION', { type: 'STILL_PENDING' })).toBe('PENDING_RESOLUTION');
  });

  // ── Expiry ──────────────────────────────────────────────────────────────

  it('HELD → EXPIRED when hold timer expires', () => {
    expect(transition('HELD', { type: 'HOLD_EXPIRED' })).toBe('EXPIRED');
  });

  it('EXPIRED → IDLE on RESET (allows fresh search)', () => {
    expect(transition('EXPIRED', { type: 'RESET' })).toBe('IDLE');
  });

  // ── Error states ────────────────────────────────────────────────────────

  it('HOLDING → FAILED_RETRYABLE on retryable error', () => {
    expect(transition('HOLDING', { type: 'RETRYABLE_ERROR' })).toBe('FAILED_RETRYABLE');
  });

  it('active states → FAILED_TERMINAL on terminal validation error', () => {
    // IDLE has no active operation, so TERMINAL_ERROR is not defined there.
    // Only states with an in-flight operation can receive a terminal error.
    const states: Parameters<typeof transition>[0][] = ['HOLDING', 'HELD', 'COMMITTING', 'PENDING_RESOLUTION'];
    for (const s of states) {
      expect(transition(s, { type: 'TERMINAL_ERROR' })).toBe('FAILED_TERMINAL');
    }
  });

  // ── Cancellation ────────────────────────────────────────────────────────

  it('CONFIRMED → CANCELLING → CANCELLED', () => {
    expect(transition('CONFIRMED', { type: 'CANCEL_REQUESTED' })).toBe('CANCELLING');
    expect(transition('CANCELLING', { type: 'CANCEL_SUCCEEDED' })).toBe('CANCELLED');
  });

  it('CANCELLING → CONFIRMED on CANCEL_FAILED (revert for retry)', () => {
    expect(transition('CANCELLING', { type: 'CANCEL_FAILED' })).toBe('CONFIRMED');
  });

  // ── CRITICAL INVARIANT: PROVISIONAL → CONFIRMED must be impossible ──────

  it('CRITICAL: PROVISIONAL → CONFIRMED transition does not exist', () => {
    // There is no state called PROVISIONAL in BookingAttemptState.
    // Provisional is a SlotAvailabilityState, not an attempt state.
    // This test verifies that IDLE (the only state where provisional slots are shown)
    // cannot transition directly to CONFIRMED.
    expect(transition('IDLE', { type: 'COMMIT_SUCCEEDED' })).toBeNull();
    expect(transition('IDLE', { type: 'ATTEMPT_CONFIRMED' })).toBeNull();
  });

  it('CRITICAL: assertNotProvisionalConfirmation throws when slot was provisional', () => {
    expect(() => assertNotProvisionalConfirmation(true, 'CONFIRMED')).toThrow();
    expect(() => assertNotProvisionalConfirmation(false, 'CONFIRMED')).not.toThrow();
    expect(() => assertNotProvisionalConfirmation(true, 'HOLDING')).not.toThrow();
  });

  // ── Invalid transitions return null ─────────────────────────────────────

  it('invalid transitions return null', () => {
    expect(transition('CONFIRMED', { type: 'HOLD_REQUESTED' })).toBeNull();
    expect(transition('CANCELLED', { type: 'COMMIT_REQUESTED' })).toBeNull();
    expect(transition('FAILED_TERMINAL', { type: 'COMMIT_SUCCEEDED' })).toBeNull();
  });

  // ── State predicates ─────────────────────────────────────────────────────

  it('correctly identifies terminal states', () => {
    expect(isTerminalState('CONFIRMED')).toBe(true);
    expect(isTerminalState('RACE_LOST')).toBe(true);
    expect(isTerminalState('EXPIRED')).toBe(true);
    expect(isTerminalState('FAILED_TERMINAL')).toBe(true);
    expect(isTerminalState('CANCELLED')).toBe(true);
    expect(isTerminalState('IDLE')).toBe(false);
    expect(isTerminalState('HOLDING')).toBe(false);
    expect(isTerminalState('PENDING_RESOLUTION')).toBe(false);
  });

  it('correctly identifies busy states', () => {
    expect(isBusyState('HOLDING')).toBe(true);
    expect(isBusyState('COMMITTING')).toBe(true);
    expect(isBusyState('CANCELLING')).toBe(true);
    expect(isBusyState('IDLE')).toBe(false);
    expect(isBusyState('CONFIRMED')).toBe(false);
  });

  // ── Two concurrent booking attempts: only one winner ────────────────────

  it('simulates two concurrent attempts: exactly one durable winner', () => {
    // Both patients reach COMMITTING simultaneously
    let attemptA: Parameters<typeof transition>[0] = 'COMMITTING';
    let attemptB: Parameters<typeof transition>[0] = 'COMMITTING';

    // Server commits one; the other gets SLOT_UNAVAILABLE (race loss)
    attemptA = assertTransition(attemptA, { type: 'COMMIT_SUCCEEDED' }); // Winner
    attemptB = assertTransition(attemptB, { type: 'SLOT_UNAVAILABLE' }); // Loser

    expect(attemptA).toBe('CONFIRMED');
    expect(attemptB).toBe('RACE_LOST');

    // Only one is CONFIRMED – the other is RACE_LOST (no booking created)
    expect(attemptA === 'CONFIRMED' && attemptB === 'CONFIRMED').toBe(false);
    expect(
      (attemptA === 'CONFIRMED' && attemptB === 'RACE_LOST') ||
      (attemptA === 'RACE_LOST' && attemptB === 'CONFIRMED')
    ).toBe(true);
  });
});
