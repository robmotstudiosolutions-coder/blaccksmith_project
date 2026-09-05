import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required to seed development data.');

const client = postgres(databaseUrl);
const ids = {
  hospital: '00000000-0000-4000-8000-000000000100',
  patientUser: '00000000-0000-4000-8000-000000000001', patient: '00000000-0000-4000-8000-000000000011',
  staffUser: '00000000-0000-4000-8000-000000000002', adminUser: '00000000-0000-4000-8000-000000000003',
  cardiology: '00000000-0000-4000-8000-000000000101', dermatology: '00000000-0000-4000-8000-000000000102', physiotherapy: '00000000-0000-4000-8000-000000000103',
  cardiologyType: '00000000-0000-4000-8000-000000000201', dermatologyType: '00000000-0000-4000-8000-000000000202', physioType: '00000000-0000-4000-8000-000000000203',
  cardiologist: '00000000-0000-4000-8000-000000000301', dermatologist: '00000000-0000-4000-8000-000000000302', physiotherapist: '00000000-0000-4000-8000-000000000303'
};

try {
  await client.begin(async (sql) => {
    await sql`INSERT INTO users (id, identity_reference, display_name, role) VALUES
      (${ids.patientUser}, 'DEV-PATIENT-001', 'Demo Patient', 'PATIENT'),
      (${ids.staffUser}, 'DEV-STAFF-001', 'Demo Booking Staff', 'BOOKING_STAFF'),
      (${ids.adminUser}, 'DEV-ADMIN-001', 'Demo Clinic Admin', 'CLINIC_ADMIN') ON CONFLICT (id) DO NOTHING`;
    await sql`INSERT INTO patients (id, user_id, identity_reference) VALUES (${ids.patient}, ${ids.patientUser}, 'DEV-PATIENT-001') ON CONFLICT (id) DO NOTHING`;
    await sql`INSERT INTO hospitals (id, name, configuration_reference) VALUES (${ids.hospital}, 'Development General Hospital', 'DEV-HOSPITAL') ON CONFLICT (id) DO NOTHING`;
    await sql`INSERT INTO clinics (id, hospital_id, name, configuration_reference) VALUES
      (${ids.cardiology}, ${ids.hospital}, 'Development Cardiology Clinic', 'DEV-CARDIOLOGY'),
      (${ids.dermatology}, ${ids.hospital}, 'Development Dermatology Clinic', 'DEV-DERMATOLOGY'),
      (${ids.physiotherapy}, ${ids.hospital}, 'Development Physiotherapy Clinic', 'DEV-PHYSIOTHERAPY') ON CONFLICT (id) DO NOTHING`;
    await sql`INSERT INTO appointment_types (id, clinic_id, name, duration_minutes, eligibility_rule_reference) VALUES
      (${ids.cardiologyType}, ${ids.cardiology}, 'Initial cardiology consultation', 30, 'TBD-HOSPITAL-RULE'),
      (${ids.dermatologyType}, ${ids.dermatology}, 'Dermatology review', 20, 'TBD-HOSPITAL-RULE'),
      (${ids.physioType}, ${ids.physiotherapy}, 'Physiotherapy assessment', 45, 'TBD-HOSPITAL-RULE') ON CONFLICT (id) DO NOTHING`;
    await sql`INSERT INTO clinicians (id, name, specialty) VALUES
      (${ids.cardiologist}, 'Development Clinician A', 'Cardiology'),
      (${ids.dermatologist}, 'Development Clinician B', 'Dermatology'),
      (${ids.physiotherapist}, 'Development Clinician C', 'Physiotherapy') ON CONFLICT (id) DO NOTHING`;
    const base = new Date(); base.setUTCDate(base.getUTCDate() + 7); base.setUTCHours(9, 0, 0, 0);
    const slotDefinitions = [
      [ids.cardiology, ids.cardiologyType, ids.cardiologist, 0], [ids.cardiology, ids.cardiologyType, ids.cardiologist, 1],
      [ids.dermatology, ids.dermatologyType, ids.dermatologist, 2], [ids.dermatology, ids.dermatologyType, ids.dermatologist, 3],
      [ids.physiotherapy, ids.physioType, ids.physiotherapist, 4], [ids.physiotherapy, ids.physioType, ids.physiotherapist, 5]
    ] as const;
    for (const [clinicId, typeId, clinicianId, offset] of slotDefinitions) {
      const start = new Date(base.getTime() + offset * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      await sql`INSERT INTO slots (clinic_id, appointment_type_id, clinician_id, start_time, end_time, state)
        SELECT ${clinicId}, ${typeId}, ${clinicianId}, ${start}, ${end}, 'PUBLISHED'
        WHERE NOT EXISTS (SELECT 1 FROM slots WHERE clinic_id = ${clinicId} AND start_time = ${start})`;
    }
  });
  console.log('Development-only SlotSure seed data created.');
} finally { await client.end(); }
