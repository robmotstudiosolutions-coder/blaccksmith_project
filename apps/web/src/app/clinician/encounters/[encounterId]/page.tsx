'use client';

import React from 'react';
import { Video, Building2, ShieldCheck } from 'lucide-react';
import { AppHeader } from '@/components/app-header';
import { AccessGate } from '@/components/access-gate';

interface EncounterPageProps {
  params: Promise<{ encounterId: string }>;
}

function EncounterContent({ params }: EncounterPageProps) {
  const [encounterId, setEncounterId] = React.useState<string>('');

  React.useEffect(() => {
    params.then(p => setEncounterId(p.encounterId));
  }, [params]);

  return (
    <main>
      <AppHeader />
      <section className="staff-page" style={{ maxWidth: 820 }}>
        <p className="eyebrow">Active encounter</p>
        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', margin: '4px 0 1.5rem' }}>
          Encounter {encounterId}
        </h1>

        {/* Minimum necessary data notice */}
        <aside className="auth-notice" style={{ marginBottom: '1.5rem' }}>
          <ShieldCheck aria-hidden="true" style={{ color: 'hsl(var(--trust))', flexShrink: 0 }} />
          <div>
            <h2 style={{ fontSize: '0.92rem', marginBottom: '4px' }}>Clinical documentation in EHR</h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'hsl(var(--muted))' }}>
              All clinical notes, diagnoses, and treatment records must be entered
              in the authorised EHR system. This screen provides encounter management only.
            </p>
          </div>
        </aside>

        {/* Encounter actions */}
        <div className="work-queue" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Encounter actions</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              className="button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={() => window.alert('Opening video room — telehealth service integration required in production.')}
            >
              <Video style={{ width: 16, height: 16 }} aria-hidden="true" />
              Open video room
            </button>
            <button
              className="button secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={() => window.alert('Launching EHR — EHR adapter integration required in production.')}
            >
              <Building2 style={{ width: 16, height: 16 }} aria-hidden="true" />
              Open in EHR
            </button>
          </div>

          <p style={{ marginTop: '1.5rem', color: 'hsl(var(--muted))', fontSize: '0.88rem' }}>
            Reference: <code style={{ fontFamily: 'monospace' }}>{encounterId}</code>
          </p>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <a href="/clinician" className="button secondary">
            ← Back to workspace
          </a>
        </div>
      </section>
    </main>
  );
}

export default function EncounterPage(props: EncounterPageProps) {
  return (
    <AccessGate allowedRoles={['CLINICIAN', 'CLINIC_ADMIN']}>
      <EncounterContent {...props} />
    </AccessGate>
  );
}
