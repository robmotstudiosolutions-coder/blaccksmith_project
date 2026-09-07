'use client';

import React from 'react';
import { specialties } from '@/lib/specialties';
import type { AppointmentType } from '@/lib/api/booking-client';

interface SearchPanelProps {
  selectedClinicId: string;
  selectedTypeId: string;
  isOnlineBookable: boolean;
  busy: boolean;
  isFetchingAvailability: boolean;
  appointmentTypes?: AppointmentType[];
  onSelectClinic: (clinicId: string) => void;
  onSelectType: (typeId: string) => void;
  onSearch: () => void;
}

export function SearchPanel({
  selectedClinicId,
  selectedTypeId,
  isOnlineBookable,
  busy,
  isFetchingAvailability,
  appointmentTypes,
  onSelectClinic,
  onSelectType,
  onSearch
}: SearchPanelProps) {
  return (
    <aside className="search-panel">
      <p className="eyebrow">Find an appointment</p>
      <h2>Search care options</h2>

      <label style={{ display: 'block', marginTop: '1rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-muted)' }}>
          Clinic specialty
        </span>
        <select
          style={{
            width: '100%',
            padding: '0.625rem',
            marginTop: '0.25rem',
            borderRadius: '6px',
            border: '1px solid #ccc'
          }}
          value={selectedClinicId}
          disabled={busy}
          onChange={e => onSelectClinic(e.target.value)}
        >
          {specialties.map(specialty => (
            <option
              key={specialty.name}
              value={specialty.clinicId ?? `directory:${specialty.name}`}
            >
              {specialty.name}
              {specialty.clinicId ? '' : ' — coming soon'}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'block', marginTop: '1rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-muted)' }}>
          Consultation type
        </span>
        <select
          style={{
            width: '100%',
            padding: '0.625rem',
            marginTop: '0.25rem',
            borderRadius: '6px',
            border: '1px solid #ccc'
          }}
          value={selectedTypeId}
          disabled={busy || !isOnlineBookable}
          onChange={e => onSelectType(e.target.value)}
        >
          {!isOnlineBookable && <option value="">Online appointments coming soon</option>}
          {isOnlineBookable &&
            (appointmentTypes?.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.durationMinutes} min)
              </option>
            )) ?? <option value={selectedTypeId}>Loading consultation types…</option>)}
        </select>
      </label>

      <button
        className="button"
        disabled={busy || isFetchingAvailability || !isOnlineBookable}
        onClick={onSearch}
      >
        {!isOnlineBookable
          ? 'Online booking coming soon'
          : isFetchingAvailability
            ? 'Checking availability…'
            : 'Search availability'}
      </button>
    </aside>
  );
}
