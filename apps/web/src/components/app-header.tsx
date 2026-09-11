'use client';

import { LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { isStaffRole, useSession } from '@/lib/session';

export function AppHeader({ staff = false }: { staff?: boolean }) {
  const { user, ready, signOut } = useSession();
  const isClinician = user?.role === 'CLINICIAN';
  const isAuditor = user?.role === 'AUDITOR';

  return (
    <header className="header">
      <a className="brand" href="/">
        <ShieldCheck aria-hidden="true" /> SlotSure
      </a>

      <nav aria-label={staff ? 'Staff navigation' : 'Primary navigation'}>
        {/* Patient / public links */}
        {!staff && !isClinician && (
          <a href="/#appointments">Book care</a>
        )}

        {/* Clinician workspace link */}
        {isClinician && (
          <a href="/clinician">My workspace</a>
        )}

        {/* Staff / admin links */}
        {user && isStaffRole(user.role) && !isClinician && !staff && (
          <a href="/staff">Operations</a>
        )}
        {staff && (
          <>
            <a href="/staff">Operations</a>
            <a href="/staff/booking/patient">Assisted booking</a>
            <a href="/staff/reconciliation">Reconciliation</a>
          </>
        )}

        {/* Auditor governance */}
        {isAuditor && (
          <a href="/staff#audit">Governance</a>
        )}

        {/* My appointments (patients) */}
        {user && !isStaffRole(user.role) && (
          <a href="/account">My appointments</a>
        )}

        {/* Help — resolves to /help, not appointment search */}
        <a href="/help">Help</a>

        {/* Auth */}
        {ready && user
          ? <>
              <a className="account-link" href={isStaffRole(user.role) ? '/staff' : '/account'}>
                <UserRound aria-hidden="true" />{user.displayName}
              </a>
              <button className="nav-button" onClick={signOut}>
                <LogOut aria-hidden="true" /> Sign out
              </button>
            </>
          : <a className="sign-in-link" href="/sign-in">Sign in</a>}
      </nav>
    </header>
  );
}
