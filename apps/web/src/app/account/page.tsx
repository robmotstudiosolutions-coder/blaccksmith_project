'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/navigation';
import {
  CalendarDays,
  ShieldCheck,
  Video,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  XCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { AccessGate } from '@/components/access-gate';
import { AppHeader } from '@/components/app-header';
import { useSession } from '@/lib/session';
import {
  getPatientAppointments,
  cancelBooking,
  rescheduleBooking,
  getAvailability,
  PatientAppointment,
  defaultBookingContext
} from '@/lib/api/booking-client';
import type { Slot } from '@/types/booking';

function AccountContent() {
  const { user } = useSession();
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Reschedule state
  const [reschedulingBookingId, setReschedulingBookingId] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedNewSlotId, setSelectedNewSlotId] = useState<string | null>(null);
  const [reschedulingLoading, setReschedulingLoading] = useState<boolean>(false);
  const [rescheduleMessage, setRescheduleMessage] = useState<string | null>(null);

  // Cancellation state
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPatientAppointments();
      setAppointments(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load appointment history at this time.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleStartReschedule = async (booking: PatientAppointment) => {
    setReschedulingBookingId(booking.bookingId);
    setSelectedNewSlotId(null);
    setRescheduleMessage(null);
    try {
      // Fetch available slots for this appointment
      const slots = await getAvailability(defaultBookingContext.clinicId, defaultBookingContext.appointmentTypeId);
      setAvailableSlots(slots.filter(s => s.slotId !== booking.slotId));
    } catch {
      setAvailableSlots([]);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulingBookingId || !selectedNewSlotId) return;
    try {
      setReschedulingLoading(true);
      const idempotencyKey = `resched-${crypto.randomUUID()}`;
      await rescheduleBooking(reschedulingBookingId, selectedNewSlotId, idempotencyKey);
      setRescheduleMessage('Appointment successfully rescheduled!');
      setTimeout(() => {
        setReschedulingBookingId(null);
        fetchAppointments();
      }, 1200);
    } catch (err: any) {
      setRescheduleMessage(err?.message || 'Could not complete rescheduling. Slot may no longer be available.');
    } finally {
      setReschedulingLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment? This action is subject to clinic release policies.')) {
      return;
    }
    try {
      setCancellingBookingId(bookingId);
      const idempotencyKey = `cancel-${crypto.randomUUID()}`;
      await cancelBooking(bookingId, idempotencyKey);
      await fetchAppointments();
    } catch (err: any) {
      alert(err?.message || 'Cancellation could not be completed.');
    } finally {
      setCancellingBookingId(null);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: 'hsl(var(--canvas))' }}>
      <AppHeader />

      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 7vw 80px' }}>
        <p className="eyebrow">Patient Portal</p>
        <h1 style={{ fontSize: '2.4rem', margin: '4px 0 12px' }}>Welcome back, {user?.displayName}</h1>
        <p className="lead" style={{ maxWidth: '640px', marginBottom: '32px' }}>
          Manage your verified clinic appointments, initiate secure video consultations, or reschedule visits in accordance with hospital policy.
        </p>

        {/* Enterprise Sync Disclaimer */}
        <div
          style={{
            background: '#e0f2fe',
            border: '1px solid #bae6fd',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            marginBottom: '32px'
          }}
        >
          <Info size={22} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: '#0369a1', fontSize: '0.92rem' }}>
              TBD — Hospital Decision Required: Electronic Health Record (EHR) Synchronization
            </strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#0c4a6e' }}>
              SlotSure provides atomic, transactional slot reservations. Full external EHR synchronization (HL7 FHIR / Epic / Cerner) will be connected during the hospital integration phase.
            </p>
          </div>
        </div>

        {/* Appointment History List */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Upcoming & Recent Appointments</h2>
            <button
              onClick={fetchAppointments}
              style={{
                background: 'none',
                border: 'none',
                color: 'hsl(var(--trust))',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.88rem'
              }}
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--muted))' }}>
              Loading appointments...
            </div>
          ) : error ? (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '20px',
                borderRadius: '8px',
                color: '#b91c1c'
              }}
            >
              <AlertCircle size={20} style={{ display: 'inline', marginRight: '8px' }} />
              {error}
            </div>
          ) : appointments.length === 0 ? (
            <section
              style={{
                background: 'white',
                border: '1px solid hsl(var(--line))',
                borderRadius: 'var(--radius)',
                padding: '36px',
                textAlign: 'center'
              }}
            >
              <CalendarDays size={48} color="hsl(var(--muted))" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px' }}>No appointments booked yet</h3>
              <p style={{ color: 'hsl(var(--muted))', fontSize: '0.92rem', marginBottom: '20px' }}>
                Discover open clinics and reserve a slot directly.
              </p>
              <a href="/#appointments" className="button">
                Browse Clinic Availability
              </a>
            </section>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {appointments.map(appt => {
                const isVideo = appt.mode === 'VIDEO';
                const isConfirmed = appt.status === 'CONFIRMED';
                const isCancelled = appt.status === 'CANCEL_PENDING' || appt.status === 'CANCELLED';
                const isRescheduled = appt.status === 'RESCHEDULED';

                return (
                  <article
                    key={appt.bookingId}
                    style={{
                      background: 'white',
                      border: '1px solid hsl(var(--line))',
                      borderRadius: 'var(--radius)',
                      padding: '24px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '12px',
                        marginBottom: '16px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              background: isVideo ? '#e0f2fe' : '#f0fdf4',
                              color: isVideo ? '#0369a1' : '#15803d',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {isVideo ? <Video size={13} /> : <MapPin size={13} />}
                            {isVideo ? 'Telehealth Video Consultation' : 'In-Person Hospital Visit'}
                          </span>

                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              background: isConfirmed ? '#dcfce7' : isCancelled ? '#fee2e2' : '#f1f5f9',
                              color: isConfirmed ? '#166534' : isCancelled ? '#991b1b' : '#475569'
                            }}
                          >
                            {appt.status}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.25rem', margin: '4px 0 2px' }}>
                          {appt.appointmentType}
                        </h3>
                        <p style={{ margin: 0, color: 'hsl(var(--muted))', fontSize: '0.88rem' }}>
                          {appt.clinicName} • Attending: <strong>{appt.clinicianName}</strong> • Ref: <code>{appt.reference}</code>
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {isVideo && isConfirmed && (
                          <a
                            href={`/appointments/${appt.bookingId}/telehealth`}
                            className="button"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              textDecoration: 'none',
                              padding: '10px 18px',
                              fontSize: '0.9rem',
                              background: appt.canJoinVideo ? 'hsl(var(--trust))' : '#475569'
                            }}
                          >
                            <Video size={16} />
                            {appt.canJoinVideo ? 'Enter Consultation Room' : 'Join Room (Opens 10m Prior)'}
                          </a>
                        )}

                        {isConfirmed && (
                          <>
                            <button
                              onClick={() => handleStartReschedule(appt)}
                              className="button secondary"
                              style={{ padding: '9px 15px', fontSize: '0.88rem' }}
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => handleCancelBooking(appt.bookingId)}
                              disabled={cancellingBookingId === appt.bookingId}
                              style={{
                                background: 'transparent',
                                border: '1px solid #f87171',
                                color: '#dc2626',
                                borderRadius: '8px',
                                padding: '9px 14px',
                                fontSize: '0.88rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {cancellingBookingId === appt.bookingId ? 'Cancelling...' : 'Cancel'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        paddingTop: '14px',
                        borderTop: '1px solid hsl(var(--line))',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        color: '#475569',
                        fontSize: '0.88rem'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={16} color="hsl(var(--trust))" />
                        {new Date(appt.startsAt).toLocaleString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })} - {new Date(appt.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Inline Reschedule Selector */}
                    {reschedulingBookingId === appt.bookingId && (
                      <div
                        style={{
                          marginTop: '20px',
                          padding: '20px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px'
                        }}
                      >
                        <h4 style={{ margin: '0 0 10px', fontSize: '1rem', color: '#1e293b' }}>
                          Select a new appointment slot
                        </h4>
                        <p style={{ margin: '0 0 14px', fontSize: '0.84rem', color: '#64748b' }}>
                          Rescheduling is atomic: your existing booking is held until the new appointment is confirmed by PostgreSQL.
                        </p>

                        {availableSlots.length === 0 ? (
                          <p style={{ color: 'hsl(var(--muted))', fontSize: '0.88rem' }}>
                            No alternative slots available right now. Please check back later.
                          </p>
                        ) : (
                          <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                            {availableSlots.map(slot => (
                              <label
                                key={slot.slotId}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '10px 14px',
                                  background: selectedNewSlotId === slot.slotId ? '#e0f2fe' : 'white',
                                  border: `1px solid ${selectedNewSlotId === slot.slotId ? '#0284c7' : '#e2e8f0'}`,
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              >
                                <input
                                  type="radio"
                                  name="rescheduleSlot"
                                  value={slot.slotId}
                                  checked={selectedNewSlotId === slot.slotId}
                                  onChange={() => setSelectedNewSlotId(slot.slotId)}
                                />
                                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                  {new Date(slot.startsAt).toLocaleString([], {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  ({slot.clinicianName})
                                </span>
                              </label>
                            ))}
                          </div>
                        )}

                        {rescheduleMessage && (
                          <p style={{ margin: '0 0 12px', fontSize: '0.88rem', fontWeight: 600, color: rescheduleMessage.includes('successfully') ? '#15803d' : '#dc2626' }}>
                            {rescheduleMessage}
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            className="button"
                            disabled={!selectedNewSlotId || reschedulingLoading}
                            onClick={handleConfirmReschedule}
                            style={{ fontSize: '0.88rem', padding: '9px 18px' }}
                          >
                            {reschedulingLoading ? 'Confirming...' : 'Confirm Reschedule'}
                          </button>
                          <button
                            className="button secondary"
                            onClick={() => setReschedulingBookingId(null)}
                            style={{ fontSize: '0.88rem', padding: '9px 14px' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Safety & Compliance Card */}
        <section
          style={{
            background: 'white',
            border: '1px solid hsl(var(--line))',
            borderRadius: 'var(--radius)',
            padding: '24px',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start'
          }}
        >
          <ShieldCheck size={28} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem' }}>Patient Privacy & Verification Guarantee</h3>
            <p style={{ margin: 0, color: 'hsl(var(--muted))', fontSize: '0.88rem' }}>
              Your consultation credentials and medical notes are protected in compliance with healthcare data protection standards. Video consultations are peer-to-peer encrypted and are not recorded without explicit clinical authorisation.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

export default function AccountPage() {
  return (
    <AccessGate>
      <AccountContent />
    </AccessGate>
  );
}
