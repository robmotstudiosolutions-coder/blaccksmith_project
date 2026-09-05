import { NextRequest } from 'next/server';

const apiOrigin = process.env.SLOTSURE_API_URL ?? 'http://127.0.0.1:3001';
const demoPatientId = process.env.SLOTSURE_DEMO_PATIENT_ID ?? '00000000-0000-4000-8000-000000000011';

const mockClinics = [
  { id: '00000000-0000-4000-8000-000000000101', name: 'Cardiology Clinic', hospitalName: 'Main Hospital', locationReference: 'CARDIOLOGY-A' },
  { id: '00000000-0000-4000-8000-000000000102', name: 'Dermatology Clinic', hospitalName: 'Main Hospital', locationReference: 'DERMATOLOGY-B' },
  { id: '00000000-0000-4000-8000-000000000103', name: 'Physiotherapy Clinic', hospitalName: 'Main Hospital', locationReference: 'PHYSIO-C' }
];

const mockAppointmentTypes = [
  { id: '00000000-0000-4000-8000-000000000201', clinicId: '00000000-0000-4000-8000-000000000101', name: 'Initial cardiology consultation', durationMinutes: 30 },
  { id: '00000000-0000-4000-8000-000000000202', clinicId: '00000000-0000-4000-8000-000000000102', name: 'Dermatology review', durationMinutes: 20 },
  { id: '00000000-0000-4000-8000-000000000203', clinicId: '00000000-0000-4000-8000-000000000103', name: 'Physiotherapy assessment', durationMinutes: 45 }
];

function getMockSlots(clinicId?: string, appointmentTypeId?: string) {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + 1);
  base.setUTCHours(9, 0, 0, 0);

  const matchedClinic = mockClinics.find(c => c.id === clinicId) ?? mockClinics[0];
  const matchedType = mockAppointmentTypes.find(t => t.id === appointmentTypeId) ?? mockAppointmentTypes[0];

  return [
    {
      slotId: '00000000-0000-4000-8000-000000000401',
      clinicId: matchedClinic.id,
      clinicName: matchedClinic.name,
      appointmentTypeId: matchedType.id,
      appointmentType: matchedType.name,
      clinicianId: '00000000-0000-4000-8000-000000000301',
      clinicianName: 'Dr. Sarah Adebayo',
      startsAt: new Date(base.getTime()).toISOString(),
      endsAt: new Date(base.getTime() + matchedType.durationMinutes * 60 * 1000).toISOString(),
      version: 1,
      state: 'PUBLISHED'
    },
    {
      slotId: '00000000-0000-4000-8000-000000000402',
      clinicId: matchedClinic.id,
      clinicName: matchedClinic.name,
      appointmentTypeId: matchedType.id,
      appointmentType: matchedType.name,
      clinicianId: '00000000-0000-4000-8000-000000000301',
      clinicianName: 'Dr. Sarah Adebayo',
      startsAt: new Date(base.getTime() + 60 * 60 * 1000).toISOString(),
      endsAt: new Date(base.getTime() + (60 + matchedType.durationMinutes) * 60 * 1000).toISOString(),
      version: 1,
      state: 'PUBLISHED'
    },
    {
      slotId: '00000000-0000-4000-8000-000000000403',
      clinicId: matchedClinic.id,
      clinicName: matchedClinic.name,
      appointmentTypeId: matchedType.id,
      appointmentType: matchedType.name,
      clinicianId: '00000000-0000-4000-8000-000000000302',
      clinicianName: 'Dr. Marcus Chen',
      startsAt: new Date(base.getTime() + 120 * 60 * 1000).toISOString(),
      endsAt: new Date(base.getTime() + (120 + matchedType.durationMinutes) * 60 * 1000).toISOString(),
      version: 1,
      state: 'PUBLISHED'
    }
  ];
}

function handleMockFallback(request: NextRequest, path: string[]): Response | null {
  const endpoint = path[0];

  if (endpoint === 'clinics' && request.method === 'GET') {
    return Response.json({ clinics: mockClinics });
  }

  if (endpoint === 'appointment-types' && request.method === 'GET') {
    const clinicId = request.nextUrl.searchParams.get('clinicId');
    const filtered = clinicId ? mockAppointmentTypes.filter(t => t.clinicId === clinicId) : mockAppointmentTypes;
    return Response.json({ appointmentTypes: filtered });
  }

  if (endpoint === 'availability' && request.method === 'GET') {
    const clinicId = request.nextUrl.searchParams.get('clinicId') ?? undefined;
    const typeId = request.nextUrl.searchParams.get('appointmentTypeId') ?? undefined;
    return Response.json({ slots: getMockSlots(clinicId, typeId), authoritative: false });
  }

  if (endpoint === 'holds' && request.method === 'POST') {
    if (path.length >= 3 && path[2] === 'commit') {
      const bookingId = crypto.randomUUID();
      const correlationId = `SS-${Math.floor(10000 + Math.random() * 90000)}`;
      return Response.json({ bookingId, status: 'CONFIRMED', correlationId });
    }
    const holdId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 300 * 1000).toISOString();
    return Response.json({ holdId, expiresAt, state: 'HELD' });
  }

  if (endpoint === 'bookings' && request.method === 'POST' && path.length >= 3 && path[2] === 'cancel') {
    const bookingId = path[1];
    const correlationId = `SS-CANCEL-${Math.floor(10000 + Math.random() * 90000)}`;
    return Response.json({ bookingId, status: 'CANCEL_PENDING', correlationId });
  }

  if (endpoint === 'alternatives' && request.method === 'GET') {
    const clinicId = request.nextUrl.searchParams.get('clinicId') ?? undefined;
    const typeId = request.nextUrl.searchParams.get('appointmentTypeId') ?? undefined;
    return Response.json({ slots: getMockSlots(clinicId, typeId).slice(1) });
  }

  if (endpoint === 'booking-attempts' && request.method === 'GET') {
    return Response.json({
      bookingId: crypto.randomUUID(),
      status: 'CONFIRMED',
      slotId: '00000000-0000-4000-8000-000000000401',
      correlationId: `SS-${Math.floor(10000 + Math.random() * 90000)}`
    });
  }

  if (endpoint === 'staff') {
    const sub = path[1];
    if (sub === 'metrics' && request.method === 'GET') {
      return Response.json({
        metrics: [
          { label: 'Today’s confirmed bookings', value: '42', note: 'Across three clinics' },
          { label: 'Unresolved outcomes', value: '2', note: 'Awaiting controlled release' },
          { label: 'Hold expiries', value: '7', note: 'Today' },
          { label: 'Availability conflicts', value: '3.1%', note: 'Last 24 hours' }
        ]
      });
    }
    if (sub === 'reconciliation' && request.method === 'GET') {
      return Response.json({
        items: [
          { id: 'rec-001', slotId: '00000000-0000-4000-8000-000000000401', safeReference: 'REC-10391', category: 'Pending inventory release', ageMinutes: 8, nextSafeAction: 'Release slot back to public pool' },
          { id: 'rec-002', slotId: '00000000-0000-4000-8000-000000000402', safeReference: 'REC-10392', category: 'External update delayed', ageMinutes: 23, nextSafeAction: 'Check integration response' }
        ]
      });
    }
    if (sub === 'audit' && request.method === 'GET') {
      return Response.json({
        events: [
          { id: 'aud-001', action: 'BOOKING_CREATED', targetType: 'BOOKING', targetId: '00000000-0000-4000-8000-000000000601', outcome: 'SUCCESS', correlationId: 'SS-20481', occurredAt: new Date(Date.now() - 5 * 60000).toISOString() },
          { id: 'aud-002', action: 'HOLD_CREATED', targetType: 'HOLD', targetId: '00000000-0000-4000-8000-000000000501', outcome: 'SUCCESS', correlationId: 'SS-HOLD-10492', occurredAt: new Date(Date.now() - 10 * 60000).toISOString() },
          { id: 'aud-003', action: 'INVENTORY_RELEASED', targetType: 'SLOT', targetId: '00000000-0000-4000-8000-000000000401', outcome: 'SUCCESS', correlationId: 'SS-REL-88392', occurredAt: new Date(Date.now() - 25 * 60000).toISOString() },
          { id: 'aud-004', action: 'BOOKING_CANCELLED', targetType: 'BOOKING', targetId: '00000000-0000-4000-8000-000000000600', outcome: 'PENDING_RELEASE', correlationId: 'SS-CAN-99182', occurredAt: new Date(Date.now() - 40 * 60000).toISOString() }
        ]
      });
    }
    if (sub === 'slots' && path[3] === 'release' && request.method === 'POST') {
      return Response.json({ success: true, slotId: path[2], state: 'PUBLISHED' });
    }
  }

  return null;
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  let path: string[] = [];
  try {
    const resolved = await context.params;
    path = resolved.path ?? [];
  } catch {
    path = [];
  }

  const url = new URL(`/v1/${path.join('/')}`, apiOrigin);
  url.search = request.nextUrl.search;
  const headers = new Headers();
  headers.set('accept', 'application/json');
  headers.set('x-patient-id', demoPatientId);
  const key = request.headers.get('idempotency-key');
  if (key) headers.set('idempotency-key', key);
  if (request.headers.get('content-type')) headers.set('content-type', request.headers.get('content-type')!);

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.method === 'GET' ? undefined : await request.text(),
      cache: 'no-store',
      signal: AbortSignal.timeout(2000)
    });

    if (response.ok) {
      return new Response(response.body, {
        status: response.status,
        headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' }
      });
    }

    if (response.status >= 500 && process.env.NODE_ENV !== 'production') {
      const mock = handleMockFallback(request, path);
      if (mock) return mock;
    }

    return new Response(response.body, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' }
    });
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      const mock = handleMockFallback(request, path);
      if (mock) return mock;
    }
    return Response.json(
      { code: 'SERVICE_UNAVAILABLE', message: 'The booking service is unavailable. Start the SlotSure API and try again.', retryable: true },
      { status: 503 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
