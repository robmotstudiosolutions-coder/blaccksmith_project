'use client';

/**
 * /staff/booking/patient — Staff-assisted booking Step 1: Patient selection & verification.
 *
 * SECURITY: Staff must verify patient identity before proceeding to booking search.
 * Without a verification reference, the booking context cannot be constructed.
 * The verification check is the server's responsibility; this form collects
 * the necessary identifiers and verification acknowledgement.
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, UserRound } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { AccessGate } from '@/components/access-gate';
import { can } from '@/lib/permissions';
import { useSession } from '@/lib/session';

// ── Validation schema ─────────────────────────────────────────────────────────

const patientSearchSchema = z.object({
  safeIdentifier: z.string()
    .min(3, 'Safe identifier is required')
    .regex(/^[A-Za-z0-9\-]+$/, 'Enter the patient safe reference (e.g. SS-PT-4821)'),
  verificationAcknowledged: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm patient identity has been verified before proceeding.' }),
  }),
});

type PatientSearchForm = z.infer<typeof patientSearchSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

function PatientSelectionWorkspace() {
  const { user } = useSession();
  const [verifiedRef, setVerifiedRef] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PatientSearchForm>({
    resolver: zodResolver(patientSearchSchema),
    defaultValues: { verificationAcknowledged: undefined },
  });

  // Permission check: staff must be able to verify patient
  if (!can(user?.role, 'staff:verify_patient', 'staff_workspace')) {
    return (
      <main>
        <AppHeader staff />
        <section className="centered-page">
          <div className="access-card">
            <p className="eyebrow">Insufficient permissions</p>
            <h1>Verification not permitted</h1>
            <p>Your role does not permit patient verification for assisted booking.</p>
            <a className="button" href="/staff">Back to operations</a>
          </div>
        </section>
      </main>
    );
  }

  const onSubmit = (data: PatientSearchForm) => {
    // Store verified reference and redirect to search
    const params = new URLSearchParams({
      subject: data.safeIdentifier,
      verification: `STAFF-VERIFIED-${Date.now()}`,
    });
    window.location.assign(`/staff/booking/search?${params}`);
  };

  return (
    <main>
      <AppHeader staff />
      <section style={{ maxWidth: 600, margin: '0 auto', padding: '52px 7vw 80px' }}>
        <p className="eyebrow">Staff-assisted booking · Step 1 of 2</p>
        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', margin: '6px 0 1rem' }}>
          Patient selection and verification
        </h1>
        <p style={{ color: 'hsl(var(--muted))', marginBottom: '2rem' }}>
          Confirm the patient&apos;s identity using your approved verification process
          before searching for available appointments on their behalf.
        </p>

        {/* Data minimization notice */}
        <aside className="auth-notice" style={{ marginBottom: '2rem' }}>
          <ShieldCheck aria-hidden="true" style={{ color: 'hsl(var(--trust))', flexShrink: 0 }} />
          <div>
            <h2 style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Minimum-necessary access</h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'hsl(var(--muted))' }}>
              Use the patient&apos;s safe reference or booking reference only.
              Do not record or transmit unnecessary patient details.
              This action is audited.
            </p>
          </div>
        </aside>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: '0.9rem' }}>
              Patient safe reference
              <input
                {...register('safeIdentifier')}
                type="text"
                placeholder="SS-PT-XXXX or booking reference"
                style={{
                  border: `1px solid ${errors.safeIdentifier ? 'hsl(var(--conflict))' : 'hsl(var(--line))'}`,
                  borderRadius: 8, padding: '10px 12px', width: '100%',
                  background: 'white', color: 'hsl(var(--ink))', font: 'inherit',
                }}
                aria-describedby={errors.safeIdentifier ? 'id-error' : undefined}
              />
            </label>
            {errors.safeIdentifier && (
              <p id="id-error" role="alert" style={{ color: 'hsl(var(--conflict))', fontSize: '0.82rem', marginTop: 4 }}>
                {errors.safeIdentifier.message}
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
              <input
                {...register('verificationAcknowledged')}
                type="checkbox"
                style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
                aria-describedby={errors.verificationAcknowledged ? 'verify-error' : undefined}
              />
              I confirm that I have verified this patient&apos;s identity using the approved
              verification process and I am authorised to book on their behalf.
            </label>
            {errors.verificationAcknowledged && (
              <p id="verify-error" role="alert" style={{ color: 'hsl(var(--conflict))', fontSize: '0.82rem', marginTop: 4 }}>
                {errors.verificationAcknowledged.message}
              </p>
            )}
          </div>

          <button
            className="button"
            type="submit"
            disabled={isSubmitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            <UserRound style={{ width: 16, height: 16 }} aria-hidden="true" />
            {isSubmitting ? 'Verifying…' : 'Proceed to appointment search'}
          </button>

          <a href="/staff" className="button secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
            Cancel
          </a>
        </form>

        <p className="small" style={{ marginTop: '1.5rem', color: 'hsl(var(--muted))' }}>
          This action is logged in the audit trail with your staff ID and timestamp.
        </p>
      </section>
    </main>
  );
}

export default function StaffBookingPatientPage() {
  return (
    <AccessGate requireStaff>
      <PatientSelectionWorkspace />
    </AccessGate>
  );
}
