'use client';

import { LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { isStaffRole, useSession } from '@/lib/session';

export function AppHeader({ staff = false }: { staff?: boolean }) {
  const { user, ready, signOut } = useSession();
  return <header className="header"><a className="brand" href="/"><ShieldCheck aria-hidden="true"/> SlotSure</a><nav aria-label={staff ? 'Staff navigation' : 'Primary navigation'}><a href={staff ? '/staff' : '/#appointments'}>{staff ? 'Operations' : 'Book care'}</a>{user && !staff && <a href="/account">My appointments</a>}{user && isStaffRole(user.role) && !staff && <a href="/staff">Staff view</a>}{staff && <a href="#audit">Audit log</a>}<a href={staff ? '/' : '/#support'}>{staff ? 'Patient view' : 'Help'}</a>{ready && user ? <><a className="account-link" href="/account"><UserRound aria-hidden="true"/>{user.displayName}</a><button className="nav-button" onClick={signOut}><LogOut aria-hidden="true"/> Sign out</button></> : <a className="sign-in-link" href="/sign-in">Sign in</a>}</nav></header>;
}
