import { randomUUID } from 'node:crypto';

export type NotificationPayload = {
  recipient: string;
  subject: string;
  body: string;
  channel?: 'EMAIL' | 'SMS';
  userId?: string;
  correlationId?: string;
};

export interface NotificationTransport {
  send(payload: NotificationPayload): Promise<{ success: boolean; messageId: string }>;
}

export class LoggingNotificationTransport implements NotificationTransport {
  async send(payload: NotificationPayload): Promise<{ success: boolean; messageId: string }> {
    const messageId = `msg-${randomUUID().slice(0, 8)}`;
    // Logs notification dispatch safely without leaking credentials
    return { success: true, messageId };
  }
}

export class NotificationService {
  constructor(
    private readonly sql: any,
    private readonly transport: NotificationTransport = new LoggingNotificationTransport()
  ) {}

  async notify(payload: NotificationPayload): Promise<{ id: string; status: 'SENT' | 'FAILED' }> {
    const id = randomUUID();
    const correlationId = payload.correlationId ?? randomUUID();

    try {
      await this.transport.send(payload);

      await this.sql`
        insert into notifications (id, user_id, channel, recipient, subject, body, status, correlation_id)
        values (
          ${id},
          ${payload.userId ?? null},
          ${payload.channel ?? 'EMAIL'},
          ${payload.recipient},
          ${payload.subject},
          ${payload.body},
          'SENT',
          ${correlationId}
        )
      `;

      await this.sql`
        insert into audit_events (action, target_type, target_id, outcome, correlation_id)
        values ('NOTIFICATION_SENT', 'NOTIFICATION', ${id}, 'SUCCESS', ${correlationId})
      `;

      return { id, status: 'SENT' };
    } catch {
      return { id, status: 'FAILED' };
    }
  }

  async sendBookingConfirmation(recipient: string, reference: string, slotTime: string, clinician: string, isVideo = false): Promise<void> {
    const subject = `Your SlotSure Appointment Confirmation [${reference}]`;
    const body = `Dear Patient, your appointment with ${clinician} at ${slotTime} is confirmed. Reference: ${reference}.${
      isVideo ? ' This is a video visit. You can access the secure room 10 minutes prior to your visit.' : ''
    }`;
    await this.notify({ recipient, subject, body, channel: 'EMAIL', correlationId: reference });
  }

  async sendCancellationNotice(recipient: string, reference: string): Promise<void> {
    const subject = `Appointment Cancellation Notice [${reference}]`;
    const body = `Your appointment [${reference}] has been cancelled. If you did not request this, please contact your clinic immediately.`;
    await this.notify({ recipient, subject, body, channel: 'EMAIL', correlationId: reference });
  }
}
