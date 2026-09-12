'use client';

import { FormEvent, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { AppRole } from '@/types/booking';
import { useSession } from '@/lib/session';

/**
 * Sign-in page.
 *
 * PRODUCTION SECURITY REQUIREMENT:
 * - Role self-selection is completely disabled in production.
 * - Authentication claims must come from the server-side identity provider.
 * - The preview role switcher is only available in development/preview environments.
 */

// Role display names for preview mode only
const previewRoles: Array<{ value: AppRole; label: string }> = [
  { value: 'PATIENT',            label: 'Patient' },
  { value: 'CAREGIVER',          label: 'Authorized caregiver' },
  { value: 'BOOKING_STAFF',      label: 'Booking staff / Scheduler' },
  { value: 'CLINICIAN',          label: 'Clinician' },
  { value: 'CLINIC_ADMIN',       label: 'Clinic administrator' },
  { value: 'OPERATIONS_MANAGER', label: 'Operations manager' },
  { value: 'AUDITOR',            label: 'System / Security auditor' },
  { value: 'SYSTEM_ADMIN',       label: 'System administrator' },
];

const roleDestination = (role: AppRole): string => {
  switch (role) {
    case 'CLINICIAN':          return '/clinician';
    case 'BOOKING_STAFF':
    case 'CLINIC_ADMIN':
    case 'OPERATIONS_MANAGER':
    case 'SYSTEM_ADMIN':       return '/staff';
    case 'AUDITOR':            return '/staff#audit';
    default:                   return '/';
  }
};

export default function SignInPage() {
  const { signInPreview } = useSession();
  const [role, setRole] = useState<AppRole>('PATIENT');

  // Production: role self-selection is strictly impossible.
  // This flag controls the preview role switcher only.
  const previewEnabled = process.env.NODE_ENV !== 'production';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!previewEnabled) return;
    signInPreview(role);
    window.location.assign(roleDestination(role));
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="brand" href="/">
          <ShieldCheck aria-hidden="true" /> SlotSure
        </a>
        <p className="eyebrow">Secure access</p>
        <h1>Welcome back</h1>
        <p className="auth-intro">Sign in to book, review, or manage appointments.</p>

        {previewEnabled ? (
          <form onSubmit={submit}>
            <label>
              Preview account type
              <select
                value={role}
                onChange={e => setRole(e.target.value as AppRole)}
                aria-describedby="preview-warning"
              >
                {previewRoles.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
            <button className="button" type="submit">Continue as {previewRoles.find(r => r.value === role)?.label}</button>
            <p className="small" id="preview-warning">
              ⚠ Preview mode only — this does not verify identity.
              Role self-selection is disabled in production.
            </p>
          </form>
        ) : (
          <section className="auth-notice">
            <h2>Sign in with your hospital account</h2>
            <p>
              This system uses your hospital&apos;s secure identity provider.
              Role assignment is determined by your authenticated session claims.
            </p>
            <p style={{ fontSize: '0.88rem', color: 'hsl(var(--muted))' }}>
              Contact your hospital IT department if you cannot access your account.
            </p>
          </section>
        )}

        <p className="auth-switch">
          New to SlotSure? <a href="/sign-up">Create a patient account</a>
        </p>
        <p className="small">
          Do not use SlotSure for emergency care.
          Contact emergency services or your local hospital for urgent help.
        </p>
      </section>
    </main>
  );
}
