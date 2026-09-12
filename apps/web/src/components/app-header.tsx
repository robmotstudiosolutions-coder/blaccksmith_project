'use client';

import { LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { isStaffRole, useSession } from '@/lib/session';
import { can } from '@/lib/permissions';

export function AppHeader({ staff = false }: { staff?: boolean }) {
  const { user, ready, signOut } = useSession();
  const isClinician = user?.role === 'CLINICIAN';
  const isAuditor = user?.role === 'AUDITOR';
  const canAssistedBook = can(user?.role, 'booking:staff_assist');
  const canReconcile = can(user?.role, 'staff:reconcile');
  const canViewClinical = can(user?.role, 'clinician:view_schedule');

  const profileHref =
    user?.role === 'CLINICIAN'
      ? '/clinician'
      : isStaffRole(user?.role)
      ? '/staff'
      : '/account';

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

        {/* Clinical oversight for admin/ops when not in clinician portal */}
        {!isClinician && canViewClinical && !staff && (
          <a href="/clinician">Clinician oversight</a>
        )}

        {/* Staff / admin links */}
        {user && isStaffRole(user.role) && !isClinician && !staff && (
          <a href="/staff">Operations</a>
        )}
        {staff && (
          <>
            <a href="/staff">Operations</a>
            {canAssistedBook && (
              <a href="/staff/booking/patient">Assisted booking</a>
            )}
            {canReconcile && (
              <a href="/staff/reconciliation">Reconciliation</a>
            )}
          </>
        )}

        {/* Auditor governance */}
        {isAuditor && (
          <a href="/staff#audit">Governance</a>
        )}

        {/* My appointments (patients / caregivers) */}
        {user && !isStaffRole(user.role) && (
          <a href="/account">My appointments</a>
        )}

        {/* Help — resolves to /help, not appointment search */}
        <a href="/help">Help</a>

        {/* Auth */}
        {ready && user
          ? <>
              <a className="account-link" href={profileHref}>
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
