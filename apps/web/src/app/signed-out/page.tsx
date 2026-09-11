'use client';

import { useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * /signed-out — Clean session end page.
 *
 * Fixes: Sign-out was previously landing on a protected staff gate (/staff).
 * This page confirms the session has ended and offers clear navigation options.
 */
export default function SignedOutPage() {
  useEffect(() => {
    // Ensure session storage is fully cleared
    try {
      sessionStorage.removeItem('slotsure-preview-session');
    } catch {
      // Ignore if sessionStorage is not available
    }
  }, []);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="brand" href="/">
          <ShieldCheck aria-hidden="true" /> SlotSure
        </a>
        <p className="eyebrow">Session ended</p>
        <h1>You have been signed out</h1>
        <p className="auth-intro">
          Your session has ended securely. Thank you for using SlotSure.
        </p>
        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1.5rem' }}>
          <a className="button" href="/">
            Return to home
          </a>
          <a className="button secondary" href="/sign-in">
            Sign in again
          </a>
        </div>
        <p className="small" style={{ marginTop: '1.5rem' }}>
          For your security, close this browser tab if you are using a shared device.
          Do not use SlotSure for emergency care.
        </p>
      </section>
    </main>
  );
}
