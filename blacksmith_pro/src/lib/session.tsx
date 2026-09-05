'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppRole = 'PATIENT' | 'BOOKING_STAFF' | 'CLINIC_ADMIN' | 'CLINICIAN' | 'AUDITOR';
export type SessionUser = { id: string; displayName: string; role: AppRole };
type SessionContextValue = { user?: SessionUser; ready: boolean; signInPreview: (role: AppRole, displayName?: string) => void; signOut: () => void };

const storageKey = 'slotsure-preview-session';
const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const previewUser = (role: AppRole, displayName?: string): SessionUser => ({
  id: `preview-${role.toLowerCase()}`,
  displayName: displayName?.trim() || (role === 'PATIENT' ? 'Demo Patient' : 'Demo Booking Staff'),
  role
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
    }
  }), [ready, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider.');
  return context;
}

export const isStaffRole = (role?: AppRole): boolean => role === 'BOOKING_STAFF' || role === 'CLINIC_ADMIN' || role === 'CLINICIAN' || role === 'AUDITOR';
