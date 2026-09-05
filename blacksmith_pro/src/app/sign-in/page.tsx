'use client';

import { FormEvent, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { AppRole, useSession } from '@/lib/session';

export default function SignInPage() {
  const { signInPreview } = useSession();
  const [role, setRole] = useState<AppRole>('PATIENT');
  const previewEnabled = process.env.NODE_ENV !== 'production';
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!previewEnabled) return;
    signInPreview(role);
    window.location.assign(role === 'PATIENT' ? '/' : '/staff');
  };

  return <main className="auth-page"><section className="auth-card"><a className="brand" href="/"><ShieldCheck aria-hidden="true"/> SlotSure</a><p className="eyebrow">Secure access</p><h1>Sign in to SlotSure</h1><p>Use your hospital-approved account to manage appointments and, where permitted, booking operations.</p>{previewEnabled ? <form onSubmit={submit}><label>Preview account type<select value={role} onChange={event => setRole(event.target.value as AppRole)}><option value="PATIENT">Patient</option><option value="BOOKING_STAFF">Booking staff</option><option value="CLINIC_ADMIN">Clinic administrator</option></select></label><button className="button" type="submit">Continue in development preview</button><p className="small">Development preview only. This does not verify identity and is never a substitute for hospital authentication.</p></form> : <section className="auth-notice"><h2>Sign-in service is being connected</h2><p>Hospital identity-provider access is required before this environment can accept patient or staff sign-ins.</p></section>}<p className="small">Do not use SlotSure for emergency care. Contact emergency services or your local hospital for urgent help.</p></section></main>;
}
