/**
 * Typed Booking Attempt State Machine
 *
 * Pure domain logic – no React, no side effects.
 * Enforces the authoritative transition table from the product spec.
 *
 * CRITICAL INVARIANT:
 * The state machine NEVER allows a transition from provisional availability
 * to CONFIRMED. CONFIRMED is only reachable via COMMITTING (commit succeeded)
 * or PENDING_RESOLUTION (polled and confirmed by server).
 */

import type { BookingAttemptState } from '@/types/booking';

// ── Events ────────────────────────────────────────────────────────────────────

export type BookingEvent =
  | { type: 'HOLD_REQUESTED' }
  | { type: 'HOLD_SUCCEEDED' }
  | { type: 'SLOT_UNAVAILABLE' }
  | { type: 'RETRYABLE_ERROR' }
  | { type: 'HOLD_EXPIRED' }
  | { type: 'COMMIT_REQUESTED' }
  | { type: 'COMMIT_SUCCEEDED' }
  | { type: 'NETWORK_TIMEOUT' }
  | { type: 'ATTEMPT_CONFIRMED' }
  | { type: 'ATTEMPT_RACE_LOST' }
  | { type: 'STILL_PENDING' }
  | { type: 'TERMINAL_ERROR' }
  | { type: 'CANCEL_REQUESTED' }
  | { type: 'CANCEL_SUCCEEDED' }
  | { type: 'CANCEL_FAILED' }
  | { type: 'RESET' };

// ── Transition table ──────────────────────────────────────────────────────────

type TransitionMap = Partial<Record<BookingAttemptState, Partial<Record<BookingEvent['type'], BookingAttemptState>>>>;

const transitions: TransitionMap = {
  IDLE: {
    HOLD_REQUESTED: 'HOLDING',
  },
  HOLDING: {
    HOLD_SUCCEEDED: 'HELD',
    SLOT_UNAVAILABLE: 'RACE_LOST',
    RETRYABLE_ERROR: 'FAILED_RETRYABLE',
    TERMINAL_ERROR: 'FAILED_TERMINAL',
  },
  HELD: {
    HOLD_EXPIRED: 'EXPIRED',
    COMMIT_REQUESTED: 'COMMITTING',
    TERMINAL_ERROR: 'FAILED_TERMINAL',
  },
  COMMITTING: {
    COMMIT_SUCCEEDED: 'CONFIRMED',
    SLOT_UNAVAILABLE: 'RACE_LOST',
    NETWORK_TIMEOUT: 'PENDING_RESOLUTION',
    TERMINAL_ERROR: 'FAILED_TERMINAL',
  },
  PENDING_RESOLUTION: {
    ATTEMPT_CONFIRMED: 'CONFIRMED',
    ATTEMPT_RACE_LOST: 'RACE_LOST',
    STILL_PENDING: 'PENDING_RESOLUTION',
    TERMINAL_ERROR: 'FAILED_TERMINAL',
  },
  CONFIRMED: {
    CANCEL_REQUESTED: 'CANCELLING',
  },
  CANCELLING: {
    CANCEL_SUCCEEDED: 'CANCELLED',
    CANCEL_FAILED: 'CONFIRMED', // Revert so patient can retry
    TERMINAL_ERROR: 'FAILED_TERMINAL',
  },
  FAILED_RETRYABLE: {
    HOLD_REQUESTED: 'HOLDING',
    RESET: 'IDLE',
    TERMINAL_ERROR: 'FAILED_TERMINAL',
  },
  // Terminal states – only RESET can escape
  RACE_LOST: { RESET: 'IDLE' },
  EXPIRED: { RESET: 'IDLE' },
  FAILED_TERMINAL: { RESET: 'IDLE' },
  CANCELLED: { RESET: 'IDLE' },
};

// ── Transition function ───────────────────────────────────────────────────────

/**
 * Returns the next state given a current state and event.
 * Returns null when the transition is not defined (invalid in current state).
 */
export function transition(
  current: BookingAttemptState,
  event: BookingEvent,
): BookingAttemptState | null {
  const map = transitions[current];
  if (!map) return null;
  return map[event.type] ?? null;
}

/**
 * Asserts a transition is valid and returns the new state.
 * Throws if the transition is invalid (indicates a programming error).
 */
export function assertTransition(
  current: BookingAttemptState,
  event: BookingEvent,
): BookingAttemptState {
  const next = transition(current, event);
  if (next === null) {
    throw new Error(
      `[BookingStateMachine] Invalid transition: ${current} + ${event.type}`,
    );
  }
  return next;
}

// ── State predicates ─────────────────────────────────────────────────────────

export const isTerminalState = (s: BookingAttemptState): boolean =>
  s === 'CONFIRMED' ||
  s === 'RACE_LOST' ||
  s === 'EXPIRED' ||
  s === 'FAILED_TERMINAL' ||
  s === 'CANCELLED';

export const isBusyState = (s: BookingAttemptState): boolean =>
  s === 'HOLDING' || s === 'COMMITTING' || s === 'CANCELLING';

export const isResolvingState = (s: BookingAttemptState): boolean =>
  s === 'PENDING_RESOLUTION';

export const isRecoverableState = (s: BookingAttemptState): boolean =>
  s === 'RACE_LOST' ||
  s === 'EXPIRED' ||
  s === 'FAILED_RETRYABLE' ||
  s === 'FAILED_TERMINAL' ||
  s === 'CANCELLED';

/** Validates the critical invariant: provisional availability can NEVER confirm a booking. */
export function assertNotProvisionalConfirmation(
  wasProvisional: boolean,
  newState: BookingAttemptState,
): void {
  if (wasProvisional && newState === 'CONFIRMED') {
    throw new Error(
      '[BookingStateMachine] INVARIANT VIOLATED: Cannot confirm from provisional availability. ' +
      'CONFIRMED state must only be reached via an authoritative commit response.',
    );
  }
}
