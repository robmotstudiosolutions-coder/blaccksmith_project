'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AppRole } from '@/types/booking';

export type { AppRole };
export type SessionUser = { id: string; displayName: string; role: AppRole };
type SessionContextValue = {
  user?: SessionUser;
  ready: boolean;
  signInPreview: (role: AppRole, displayName?: string) => void;
  signOut: () => void;
};

const storageKey = 'slotsure-preview-session';
const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const previewDisplayName = (role: AppRole): string => {
  const names: Record<AppRole, string> = {
    PATIENT: 'Demo Patient',
    CAREGIVER: 'Demo Caregiver',
    BOOKING_STAFF: 'Demo Booking Staff',
    CLINICIAN: 'Dr. Demo Clinician',
    CLINIC_ADMIN: 'Demo Clinic Admin',
    OPERATIONS_MANAGER: 'Demo Ops Manager',
    AUDITOR: 'Demo Auditor',
    SYSTEM_ADMIN: 'Demo System Admin',
  };
  return names[role] ?? 'Demo User';
};

const previewUser = (role: AppRole, displayName?: string): SessionUser => ({
  id: `preview-${role.toLowerCase()}`,
  displayName: displayName?.trim() || previewDisplayName(role),
  role,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(storageKey);
      if (stored) setUser(JSON.parse(stored) as SessionUser);
    } finally {
      setReady(true);
    }
  }, []);

  const value = useMemo<SessionContextValue>(() => ({
    user,
    ready,
    signInPreview: (role, displayName) => {
      const next = previewUser(role, displayName);
      window.sessionStorage.setItem(storageKey, JSON.stringify(next));
      setUser(next);
    },
    signOut: () => {
      window.sessionStorage.removeItem(storageKey);
      setUser(undefined);
      // Redirect to signed-out confirmation page, not a protected gate
      window.location.assign('/signed-out');
    },
  }), [ready, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider.');
  return context;
}

export { isStaffRole } from '@/lib/permissions';
