'use client';

import { LockKeyhole } from 'lucide-react';
import { AppRole, isStaffRole, useSession } from '@/lib/session';

export function AccessGate({ requireStaff = false, children }: { requireStaff?: boolean; children: React.ReactNode }) {
  const { ready, user } = useSession();
  if (!ready) return <main className="centered-page"><p>Checking your session…</p></main>;
  const permitted = user && (!requireStaff || isStaffRole(user.role));
  if (permitted) return <>{children}</>;
  const message = requireStaff ? 'This workspace is for authorised booking staff. Sign in with a staff account to continue.' : 'Sign in to view and manage your appointments.';
  return <main className="centered-page"><section className="access-card"><LockKeyhole aria-hidden="true"/><p className="eyebrow">Secure area</p><h1>{requireStaff ? 'Staff access required' : 'Sign in required'}</h1><p>{message}</p><a className="button" href="/sign-in">Go to sign in</a><p className="small">This is a UI access gate. Server-side authorization will be added with the hospital identity-provider integration.</p></section></main>;
}
