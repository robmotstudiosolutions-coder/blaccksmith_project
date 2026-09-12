'use client';

import { LockKeyhole } from 'lucide-react';
import { useSession } from '@/lib/session';
import type { AppRole } from '@/types/booking';
import { can, isStaffRole, type PermissionAction, type PermissionResource, type PermissionContext } from '@/lib/permissions';

export interface AccessGateProps {
  requireStaff?: boolean;
  permission?: PermissionAction;
  resource?: PermissionResource;
  context?: PermissionContext;
  allowedRoles?: AppRole[];
  title?: string;
  description?: string;
  fallbackHref?: string;
  fallbackLabel?: string;
  children: React.ReactNode;
}

export function AccessGate({
  requireStaff = false,
  permission,
  resource,
  context,
  allowedRoles,
  title,
  description,
  fallbackHref = '/sign-in',
  fallbackLabel = 'Go to sign in',
  children,
}: AccessGateProps) {
  const { ready, user } = useSession();

  if (!ready) {
    return (
      <main className="centered-page" aria-busy="true">
        <p>Checking your session…</p>
      </main>
    );
  }

  // Determine permission based on provided criteria
  let permitted = Boolean(user);

  if (permitted && requireStaff) {
    permitted = isStaffRole(user?.role);
  }

  if (permitted && allowedRoles && allowedRoles.length > 0) {
    permitted = Boolean(user && allowedRoles.includes(user.role));
  }

  if (permitted && permission) {
    permitted = can(user?.role, permission, resource, context);
  }

  if (permitted) return <>{children}</>;

  const resolvedTitle =
    title ??
    (permission?.startsWith('clinician:')
      ? 'Clinician access required'
      : requireStaff
      ? 'Staff access required'
      : 'Sign in required');

  const resolvedDescription =
    description ??
    (permission?.startsWith('clinician:')
      ? 'This workspace is for authorised clinicians and administrators. Sign in with an authorised account to continue.'
      : requireStaff
      ? 'This workspace is for authorised booking staff. Sign in with a staff account to continue.'
      : 'Sign in to view and manage your appointments.');

  return (
    <main className="centered-page">
      <section className="access-card">
        <LockKeyhole aria-hidden="true" />
        <p className="eyebrow">Secure area</p>
        <h1>{resolvedTitle}</h1>
        <p>{resolvedDescription}</p>
        <a className="button" href={fallbackHref}>
          {fallbackLabel}
        </a>
        <p className="small">
          Server-side session validation is enforced at the API layer. This UI gate is an additional display-layer safeguard.
        </p>
      </section>
    </main>
  );
}

