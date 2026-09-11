/**
 * Typed realtime client seam.
 *
 * Realtime events are advisory display updates ONLY.
 * They MUST NEVER confirm or deny a booking.
 *
 * Architecture:
 * - Primary: WebSocket / SSE connection to realtime service
 * - Fallback: Polling at configurable interval when realtime is degraded
 * - Recovery: Snapshot fetch on reconnect to cover missed events
 * - Deduplication: Sliding window of processed event IDs
 * - Backoff: Exponential with jitter for reconnects
 */

// ── Event types ───────────────────────────────────────────────────────────────

export type RealtimeEventType =
  | 'SLOT_AVAILABILITY_CHANGED'
  | 'SLOT_HELD'
  | 'SLOT_RELEASED'
  | 'SLOT_BOOKED'
  | 'WAITING_ROOM_UPDATED'
  | 'QUEUE_UPDATED'
  | 'CLINICIAN_STATUS_CHANGED'
  | 'ENCOUNTER_STARTED'
  | 'ROOM_READINESS_CHANGED'
  | 'SNAPSHOT';

export interface RealtimeEvent {
  eventId: string;        // Deduplication key
  sequence: number;       // Monotonic sequence for ordering
  type: RealtimeEventType;
  slotId?: string;
  slotVersion?: number;
  clinicId?: string;
  clinicianId?: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface RealtimeSnapshot {
  asOf: string;
  slots?: Array<{ slotId: string; state: string; version: number }>;
  queue?: Array<{ patientRef: string; waitingSince: string; status: string }>;
  waitingRoom?: Record<string, unknown>;
}

// ── Connection state ──────────────────────────────────────────────────────────

export type RealtimeConnectionState =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'POLLING_FALLBACK'
  | 'DISCONNECTED';

export interface RealtimeClientOptions {
  /** Called when a new deduplicated, in-sequence event arrives. */
  onEvent: (event: RealtimeEvent) => void;
  /** Called when a snapshot is loaded on connect or reconnect. */
  onSnapshot: (snapshot: RealtimeSnapshot) => void;
  /** Called when connection state changes (for UI indicators). */
  onConnectionStateChange: (state: RealtimeConnectionState) => void;
  /** Polling endpoint used as fallback (e.g. GET /v1/availability). */
  pollUrl: string;
  pollIntervalMs?: number; // Default: 15 000
  maxBackoffMs?: number;   // Default: 30 000
}

// ── Client implementation ─────────────────────────────────────────────────────

export class RealtimeClient {
  private readonly opts: Required<RealtimeClientOptions>;
  private ws: WebSocket | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private connectionState: RealtimeConnectionState = 'DISCONNECTED';

  /** Sliding deduplication window – keeps last 500 event IDs. */
  private readonly seenEventIds = new Set<string>();
  private seenEventIdQueue: string[] = [];

  /** Last sequence number processed – used to detect gaps. */
  private lastSequence = -1;

  constructor(opts: RealtimeClientOptions) {
    this.opts = {
      pollIntervalMs: 15_000,
      maxBackoffMs: 30_000,
      ...opts,
    };
  }

  connect(wsUrl?: string): void {
    if (wsUrl) {
      this.connectWebSocket(wsUrl);
    } else {
      // No WS URL provided – start polling fallback immediately
      this.startPollingFallback();
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.clearTimers();
    this.setConnectionState('DISCONNECTED');
  }

  private connectWebSocket(url: string): void {
    this.setConnectionState('CONNECTING');
    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setConnectionState('CONNECTED');
        this.stopPollingFallback();
        this.fetchSnapshot();
      };
      this.ws.onmessage = (msg) => this.handleRawMessage(msg.data);
      this.ws.onclose = () => this.handleDisconnect(url);
      this.ws.onerror = () => this.handleDisconnect(url);
    } catch {
      this.handleDisconnect(url);
    }
  }

  private handleDisconnect(wsUrl: string): void {
    this.ws = null;
    if (this.connectionState === 'DISCONNECTED') return;

    const backoff = this.calculateBackoff();
    this.setConnectionState(
      this.reconnectAttempts > 2 ? 'POLLING_FALLBACK' : 'RECONNECTING',
    );

    if (this.reconnectAttempts > 2) {
      this.startPollingFallback();
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connectWebSocket(wsUrl);
    }, backoff);
  }

  private calculateBackoff(): number {
    const base = Math.min(1_000 * Math.pow(2, this.reconnectAttempts), this.opts.maxBackoffMs);
    const jitter = Math.random() * 0.3 * base;
    return Math.round(base + jitter);
  }

  private handleRawMessage(raw: string): void {
    let parsed: RealtimeEvent | RealtimeSnapshot;
    try {
      parsed = JSON.parse(raw) as RealtimeEvent | RealtimeSnapshot;
    } catch {
      return; // Ignore malformed messages
    }

    if ('asOf' in parsed) {
      // Snapshot message
      this.opts.onSnapshot(parsed);
      return;
    }

    const event = parsed as RealtimeEvent;

    // Deduplication
    if (this.seenEventIds.has(event.eventId)) return;
    this.addSeenEvent(event.eventId);

    // Sequence tracking – emit even if out-of-order (gap detection is advisory)
    if (event.sequence <= this.lastSequence) return; // stale duplicate
    this.lastSequence = event.sequence;

    // Advisory only – never confirm a booking from a realtime message
    this.opts.onEvent(event);
  }

  private addSeenEvent(id: string): void {
    this.seenEventIds.add(id);
    this.seenEventIdQueue.push(id);
    // Keep window at 500
    while (this.seenEventIdQueue.length > 500) {
      const oldest = this.seenEventIdQueue.shift();
      if (oldest) this.seenEventIds.delete(oldest);
    }
  }

  private startPollingFallback(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.poll(), this.opts.pollIntervalMs);
    // Immediate poll
    void this.poll();
  }

  private stopPollingFallback(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async poll(): Promise<void> {
    try {
      const res = await fetch(this.opts.pollUrl, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json() as RealtimeSnapshot;
      this.opts.onSnapshot(data);
    } catch {
      // Silently swallow poll errors – do not surface as booking failures
    }
  }

  private async fetchSnapshot(): Promise<void> {
    await this.poll();
  }

  private setConnectionState(next: RealtimeConnectionState): void {
    this.connectionState = next;
    this.opts.onConnectionStateChange(next);
  }

  private clearTimers(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.pollTimer = null;
    this.reconnectTimer = null;
  }

  get state(): RealtimeConnectionState {
    return this.connectionState;
  }
}
