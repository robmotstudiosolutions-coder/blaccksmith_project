'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, ShieldCheck, TriangleAlert, XCircle } from 'lucide-react';
import {
  cancelBooking,
  commitHold,
  createHold,
  defaultBookingContext,
  getAlternatives,
  getAppointmentTypes,
  getAvailability,
  getClinics
} from '@/lib/api/booking-client';
import type { ApiError, Booking, BookingAttemptState, Slot } from '@/types/booking';

const formatTime = (value: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const messageFor = (error: unknown) => (error as ApiError).message ?? 'We could not complete that request. Please try again.';

function SlotCard({ slot, onSelect, disabled }: { slot: Slot; onSelect: (slot: Slot) => void; disabled: boolean }) {
  return (
    <article className="slot-card">
      <div>
        <p className="eyebrow">{slot.clinicName}</p>
        <h3>{formatTime(slot.startsAt)}</h3>
        <p>{slot.clinicianName} · {slot.mode === 'IN_PERSON' ? 'In person' : 'Video visit'}</p>
      </div>
      <button className="button secondary" disabled={disabled} onClick={() => onSelect(slot)}>Choose this time</button>
    </article>
  );
}

export default function Home() {
  const [selectedClinicId, setSelectedClinicId] = useState<string>(defaultBookingContext.clinicId);
  const [selectedTypeId, setSelectedTypeId] = useState<string>(defaultBookingContext.appointmentTypeId);
  const [attempt, setAttempt] = useState<BookingAttemptState>('IDLE');
  const [selected, setSelected] = useState<Slot>();
  const [hold, setHold] = useState<{ id: string; expiresAt: string; commitKey: string }>();
  const [seconds, setSeconds] = useState(0);
  const [alternatives, setAlternatives] = useState<Slot[]>([]);
  const [booking, setBooking] = useState<Booking>();
  const [message, setMessage] = useState('');
  const [confirmCancelPrompt, setConfirmCancelPrompt] = useState(false);

  // Catalog Discovery queries
  const clinicsQuery = useQuery({ queryKey: ['clinics'], queryFn: getClinics });
  const typesQuery = useQuery({
    queryKey: ['appointmentTypes', selectedClinicId],
    queryFn: () => getAppointmentTypes(selectedClinicId)
  });

  // Availability query
  const availability = useQuery({
    queryKey: ['availability', selectedClinicId, selectedTypeId],
    queryFn: () => getAvailability(selectedClinicId, selectedTypeId)
  });

  // Update selected clinic/type when catalog loads
  useEffect(() => {
    if (clinicsQuery.data && clinicsQuery.data.length > 0 && !selectedClinicId) {
      setSelectedClinicId(clinicsQuery.data[0].id);
    }
  }, [clinicsQuery.data, selectedClinicId]);

  useEffect(() => {
    if (typesQuery.data && typesQuery.data.length > 0) {
      if (!typesQuery.data.some(t => t.id === selectedTypeId)) {
        setSelectedTypeId(typesQuery.data[0].id);
      }
    }
  }, [typesQuery.data, selectedTypeId]);

  // Hold countdown effect
  useEffect(() => {
    if (!hold || attempt !== 'HELD') return;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((new Date(hold.expiresAt).getTime() - Date.now()) / 1_000));
      setSeconds(remaining);
      if (remaining === 0) {
        setAttempt('EXPIRED');
        setMessage('Your temporary reservation expired. Check live availability and choose another time.');
      }
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1_000);
    return () => window.clearInterval(timer);
  }, [hold, attempt]);

  const search = async () => {
    setMessage('');
    setAttempt('IDLE');
    setSelected(undefined);
    setHold(undefined);
    setAlternatives([]);
    setConfirmCancelPrompt(false);
    await availability.refetch();
  };

  const choose = async (slot: Slot) => {
    setSelected(slot);
    setMessage('');
    setAttempt('HOLDING');
    try {
      const result = await createHold(slot.slotId, crypto.randomUUID());
      setHold({ id: result.holdId, expiresAt: result.expiresAt, commitKey: crypto.randomUUID() });
      setAttempt('HELD');
      await availability.refetch();
    } catch (error) {
      setMessage(messageFor(error));
      setAttempt('FAILED_TERMINAL');
      await availability.refetch();
    }
  };

  const confirm = async () => {
    if (!hold || !selected) return;
    setAttempt('COMMITTING');
    setMessage('');
    try {
      setBooking(await commitHold(hold.id, hold.commitKey, selected));
      setAttempt('CONFIRMED');
      await availability.refetch();
    } catch (error) {
      const apiError = error as ApiError;
      setMessage(messageFor(error));
      if (apiError.code === 'BOOKING_CONFLICT' || apiError.code === 'SLOT_NOT_AVAILABLE' || apiError.code === 'HOLD_EXPIRED') {
        setAlternatives(await getAlternatives(selectedClinicId, selectedTypeId).catch(() => []));
        setAttempt(apiError.code === 'HOLD_EXPIRED' ? 'EXPIRED' : 'RACE_LOST');
      } else {
        setAttempt(apiError.retryable ? 'FAILED_RETRYABLE' : 'FAILED_TERMINAL');
      }
    }
  };

  const cancel = async () => {
    if (!booking) return;
    setAttempt('CANCELLING');
    setMessage('');
    try {
      await cancelBooking(booking.bookingId, crypto.randomUUID());
      setAttempt('CANCELLED');
      setConfirmCancelPrompt(false);
      await availability.refetch();
    } catch (error) {
      setMessage(messageFor(error));
      setAttempt('CONFIRMED'); // revert to confirmed so patient can retry cancellation
    }
  };

  const busy = attempt === 'HOLDING' || attempt === 'COMMITTING' || attempt === 'CANCELLING';

  return (
    <main>
      <header className="header">
        <a className="brand" href="/"><ShieldCheck aria-hidden="true"/> SlotSure</a>
        <nav aria-label="Primary">
          <a href="#appointments">Book an appointment</a>
          <a href="/staff">Staff view</a>
          <a href="#support">Help</a>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Hospital clinic booking</p>
          <h1>Find care with confidence.</h1>
          <p className="lead">Appointment times are checked live. A time is confirmed only after the hospital securely completes your booking.</p>
        </div>
        <aside className="trust-card">
          <ShieldCheck/>
          <div>
            <strong>Fair, secure allocation</strong>
            <p>If a time becomes unavailable, we will explain clearly and show other options.</p>
          </div>
        </aside>
      </section>

      <section className="layout" id="appointments">
        <aside className="search-panel">
          <p className="eyebrow">Find an appointment</p>
          <h2>Search care options</h2>

          <label style={{ display: 'block', marginTop: '1rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-muted)' }}>Clinic specialty</span>
            <select
              style={{ width: '100%', padding: '0.625rem', marginTop: '0.25rem', borderRadius: '6px', border: '1px solid #ccc' }}
              value={selectedClinicId}
              disabled={busy}
              onChange={e => setSelectedClinicId(e.target.value)}
            >
              {clinicsQuery.data?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              )) ?? <option value={defaultBookingContext.clinicId}>Cardiology Clinic</option>}
            </select>
          </label>

          <label style={{ display: 'block', marginTop: '1rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-muted)' }}>Consultation type</span>
            <select
              style={{ width: '100%', padding: '0.625rem', marginTop: '0.25rem', borderRadius: '6px', border: '1px solid #ccc' }}
              value={selectedTypeId}
              disabled={busy}
              onChange={e => setSelectedTypeId(e.target.value)}
            >
              {typesQuery.data?.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.durationMinutes} min)</option>
              )) ?? <option value={defaultBookingContext.appointmentTypeId}>Initial consultation (30 min)</option>}
            </select>
          </label>

          <button className="button" disabled={busy || availability.isFetching} onClick={search}>
            {availability.isFetching ? 'Checking availability…' : 'Search availability'}
          </button>
        </aside>

        <section className="results" aria-live="polite">
          <div className="section-title">
            <div>
              <p className="eyebrow">Available appointments</p>
              <h2>Select a provisional time</h2>
            </div>
            <span className="badge">Live availability</span>
          </div>

          <p className="notice"><Clock3 aria-hidden="true"/> A displayed time can change before you complete your booking.</p>

          {availability.isLoading && <p>Checking availability…</p>}
          {availability.isError && (
            <section className="expired" role="alert">
              <TriangleAlert/>
              <div>
                <h2>Booking service unavailable</h2>
                <p>{messageFor(availability.error)}</p>
                <button className="button secondary" onClick={() => availability.refetch()}>Try again</button>
              </div>
            </section>
          )}

          {!availability.isLoading && !availability.isError && availability.data?.length === 0 && (
            <p>No appointments are currently available for this specialty. Try another clinic or check back later.</p>
          )}

          {availability.data?.map(slot => (
            <SlotCard key={slot.slotId} slot={slot} disabled={busy || attempt === 'HELD'} onSelect={choose}/>
          ))}

          {attempt === 'HOLDING' && <Status title="Reserving your selected time" text="We are checking the latest availability."/>}

          {attempt === 'HELD' && selected && (
            <section className="hold-card" aria-live="polite">
              <Clock3/>
              <div>
                <p className="eyebrow">Temporary reservation</p>
                <h2>This time is held for you</h2>
                <p>{formatTime(selected.startsAt)} with {selected.clinicianName}. Complete your booking before {formatTime(hold!.expiresAt)}.</p>
                <p className="countdown">About {seconds} seconds remaining</p>
              </div>
              <button className="button" disabled={seconds === 0} onClick={confirm}>Confirm appointment</button>
            </section>
          )}

          {attempt === 'COMMITTING' && <Status title="Confirming your appointment" text="Completing the booking securely. Please do not close this page."/>}

          {attempt === 'CONFIRMED' && booking && (
            <section className="confirmation" aria-live="polite">
              <CheckCircle2/>
              <div style={{ width: '100%' }}>
                <p className="eyebrow">Appointment confirmed</p>
                <h2>Your booking is complete</h2>
                <p>Reference: <strong>{booking.reference}</strong> · {formatTime(booking.slot.startsAt)} with {booking.slot.clinicianName} at {booking.slot.clinicName}.</p>

                {message && <p style={{ color: 'red', marginTop: '0.5rem' }}>{message}</p>}

                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e0e0e0', paddingTop: '1rem' }}>
                  {!confirmCancelPrompt ? (
                    <button
                      className="button secondary"
                      style={{ color: '#c00', borderColor: '#c00' }}
                      onClick={() => setConfirmCancelPrompt(true)}
                    >
                      Cancel this appointment
                    </button>
                  ) : (
                    <div style={{ background: '#fff5f5', padding: '1rem', borderRadius: '8px' }}>
                      <p style={{ margin: '0 0 0.75rem 0', fontWeight: 600 }}>Are you sure you want to cancel this booking?</p>
                      <button className="button" style={{ background: '#c00', color: '#fff', marginRight: '0.75rem' }} onClick={cancel}>
                        Yes, cancel appointment
                      </button>
                      <button className="button secondary" onClick={() => setConfirmCancelPrompt(false)}>
                        Keep appointment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {attempt === 'CANCELLING' && <Status title="Processing cancellation" text="Cancelling your appointment and updating hospital records. Please wait."/>}

          {attempt === 'CANCELLED' && (
            <section className="confirmation" aria-live="polite" style={{ borderColor: '#888' }}>
              <XCircle style={{ color: '#666' }}/>
              <div>
                <p className="eyebrow">Appointment cancelled</p>
                <h2>Your cancellation was processed</h2>
                <p>Your appointment has been safely cancelled. The reserved slot is scheduled for controlled release.</p>
                <button className="button secondary" style={{ marginTop: '1rem' }} onClick={search}>
                  Book another appointment
                </button>
              </div>
            </section>
          )}

          {attempt === 'RACE_LOST' && (
            <section className="conflict" role="alert">
              <TriangleAlert/>
              <div>
                <p className="eyebrow">Selected time unavailable</p>
                <h2>No appointment was created for you.</h2>
                <p>{message}</p>
              </div>
              <div className="alternatives">
                <h3>Other live times you can choose</h3>
                {alternatives.map(slot => (
                  <SlotCard key={slot.slotId} slot={slot} disabled={false} onSelect={choose}/>
                ))}
              </div>
            </section>
          )}

          {attempt === 'EXPIRED' && (
            <section className="expired" role="alert">
              <TriangleAlert/>
              <div>
                <h2>Reservation expired</h2>
                <p>{message}</p>
                <button className="button secondary" onClick={search}>Check availability again</button>
              </div>
            </section>
          )}

          {(attempt === 'FAILED_RETRYABLE' || attempt === 'FAILED_TERMINAL') && (
            <section className="expired" role="alert">
              <TriangleAlert/>
              <div>
                <h2>We could not complete that action</h2>
                <p>{message}</p>
                <button className="button secondary" onClick={attempt === 'FAILED_RETRYABLE' ? confirm : search}>
                  {attempt === 'FAILED_RETRYABLE' ? 'Retry confirmation' : 'Check availability again'}
                </button>
              </div>
            </section>
          )}
        </section>
      </section>

      <footer id="support" className="support">
        <strong>Need help?</strong> Contact your clinic directly for urgent care or clinical advice. Do not use online booking for emergencies.
      </footer>
    </main>
  );
}

function Status({ title, text }: { title: string; text: string }) {
  return (
    <section className="status" aria-live="polite">
      <Clock3/>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </section>
  );
}
