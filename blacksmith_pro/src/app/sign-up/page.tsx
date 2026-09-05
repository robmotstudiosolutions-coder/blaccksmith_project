'use client';

import { FormEvent, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useSession } from '@/lib/session';

export default function SignUpPage() {
  const { signInPreview } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const previewEnabled = process.env.NODE_ENV !== 'production';
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!previewEnabled || !name.trim() || !email.trim()) return;
    signInPreview('PATIENT', name);
    window.location.assign('/');
  };

  return <main className="auth-page"><section className="auth-card"><a className="brand" href="/"><ShieldCheck aria-hidden="true"/> SlotSure</a><p className="eyebrow">Patient access</p><h1>Create your account</h1><p className="auth-intro">Set up a secure profile to book and manage appointments.</p>{previewEnabled ? <form onSubmit={submit}><label>Full name<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" placeholder="Your full name" required/></label><label>Email address<input value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" type="email" placeholder="you@example.com" required/></label><button className="button" type="submit">Create preview account</button><p className="small">Preview mode only. Your details stay in this browser session and are not sent to a hospital system.</p></form> : <section className="auth-notice"><h2>Account registration is being connected</h2><p>Registration will be available after the hospital identity-provider and consent workflows are approved.</p></section>}<p className="auth-switch">Already have an account? <a href="/sign-in">Sign in</a></p></section></main>;
}
