'use client';

import { ShieldCheck, Phone, Video, Clock, AlertTriangle, HelpCircle } from 'lucide-react';
import { AppHeader } from '@/components/app-header';

/**
 * /help — Comprehensive help centre.
 *
 * Fixes: Help previously linked to appointment search (/#appointments).
 * This is now a dedicated, real help page.
 */
export default function HelpPage() {
  return (
    <main>
      <AppHeader />
      <section style={{ maxWidth: 820, margin: '0 auto', padding: '52px 7vw 80px' }}>
        <p className="eyebrow">SlotSure help centre</p>
        <h1>How can we help?</h1>

        {/* Emergency warning */}
        <div
          role="alert"
          style={{
            background: '#fff3e0', border: '2px solid #e67e00', borderRadius: 12,
            padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start',
            marginBottom: '2.5rem',
          }}
        >
          <AlertTriangle style={{ color: '#e67e00', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div>
            <strong style={{ display: 'block', marginBottom: 4 }}>
              Do not use SlotSure for emergencies
            </strong>
            <p style={{ margin: 0, fontSize: '0.92rem' }}>
              For urgent or life-threatening situations, call <strong>999</strong> or
              go to your nearest Emergency Department immediately.
              SlotSure is for routine appointment booking only.
            </p>
          </div>
        </div>

        {/* Help topics */}
        <div style={{ display: 'grid', gap: '2rem' }}>

          <section className="work-queue" style={{ padding: '24px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem' }}>
              <Clock aria-hidden="true" style={{ color: 'hsl(var(--trust))' }} />
              Booking appointments
            </h2>
            <ul style={{ color: 'hsl(var(--muted))', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
              <li>Browse specialty clinics and select the type of appointment you need.</li>
              <li>Choose a displayed time — this is a <em>provisional</em> availability indication.</li>
              <li>Complete the reservation within the countdown window to confirm your booking.</li>
              <li>If another patient books the last slot first, we will show you alternative times.</li>
              <li>Only a confirmation reference confirms your booking is secure.</li>
            </ul>
          </section>

          <section className="work-queue" style={{ padding: '24px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem' }}>
              <Video aria-hidden="true" style={{ color: 'hsl(var(--trust))' }} />
              Video appointments
            </h2>
            <ul style={{ color: 'hsl(var(--muted))', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
              <li>Ensure you have a device with a working camera and microphone.</li>
              <li>Use a supported browser (Chrome, Edge, Firefox, or Safari).</li>
              <li>Find a quiet, well-lit, private location before joining.</li>
              <li>The video room link becomes available 10 minutes before your appointment.</li>
              <li>If you have technical difficulties, contact the clinic by telephone.</li>
            </ul>
          </section>

          <section className="work-queue" style={{ padding: '24px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem' }}>
              <HelpCircle aria-hidden="true" style={{ color: 'hsl(var(--trust))' }} />
              Managing and cancelling
            </h2>
            <ul style={{ color: 'hsl(var(--muted))', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
              <li>View all your appointments in <a href="/account">My appointments</a>.</li>
              <li>Cancellations can be made from your account page.</li>
              <li>Cancellation policies vary by clinic — check your appointment confirmation for details.</li>
              <li>If you need to reschedule, cancel your current booking and make a new one.</li>
            </ul>
          </section>

          <section className="work-queue" style={{ padding: '24px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem' }}>
              <Phone aria-hidden="true" style={{ color: 'hsl(var(--trust))' }} />
              Contact your clinic
            </h2>
            <p style={{ color: 'hsl(var(--muted))', marginBottom: '1rem' }}>
              For questions about your care, clinical advice, or appointment-specific queries,
              contact the clinic directly.
            </p>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.9rem' }}>
              Clinic telephone numbers and contact details are included in your appointment confirmation.
              You can also find contact information on your hospital&apos;s website.
            </p>
          </section>

          <section className="work-queue" style={{ padding: '24px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem' }}>
              <ShieldCheck aria-hidden="true" style={{ color: 'hsl(var(--trust))' }} />
              Staff and booking assistance
            </h2>
            <p style={{ color: 'hsl(var(--muted))' }}>
              If you are unable to book online or need assistance, hospital booking staff can
              help you by telephone. They follow the same fair appointment allocation process
              as the self-service system.
            </p>
            <p style={{ color: 'hsl(var(--muted))', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              <strong>Staff</strong>: Access the assisted booking workspace via{' '}
              <a href="/staff/booking/patient">Staff booking</a>.
            </p>
          </section>

        </div>
      </section>
    </main>
  );
}
