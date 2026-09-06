import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required to seed development data.');

const client = postgres(databaseUrl);
const ids = {
  hospital: '00000000-0000-4000-8000-000000000100',
  patientUser: '00000000-0000-4000-8000-000000000001', patient: '00000000-0000-4000-8000-000000000011',
  staffUser: '00000000-0000-4000-8000-000000000002', adminUser: '00000000-0000-4000-8000-000000000003'
};

const catalog = [
  ['Cardiology', 'Initial cardiology consultation', 30, 'IN_PERSON', 'Development Clinician A'],
  ['Dermatology', 'Dermatology review', 20, 'IN_PERSON', 'Development Clinician B'],
  ['Physiotherapy', 'Physiotherapy assessment', 45, 'IN_PERSON', 'Development Clinician C'],
  ['General practice', 'General practice consultation', 20, 'IN_PERSON', 'Development Clinician D'],
  ['Paediatrics', 'Paediatric consultation', 30, 'IN_PERSON', 'Development Clinician E'],
  ['Women’s health', 'Women’s health consultation', 30, 'IN_PERSON', 'Development Clinician F'],
  ['Mental health', 'Mental health consultation', 45, 'VIDEO', 'Development Clinician G'],
  ['Orthopaedics', 'Orthopaedic consultation', 30, 'IN_PERSON', 'Development Clinician H'],
  ['Eye care', 'Eye care consultation', 30, 'IN_PERSON', 'Development Clinician I'],
  ['Ear, nose & throat', 'ENT consultation', 30, 'IN_PERSON', 'Development Clinician J'],
  ['Neurology', 'Neurology consultation', 40, 'IN_PERSON', 'Development Clinician K'],
  ['Diabetes & endocrinology', 'Diabetes and endocrinology consultation', 30, 'VIDEO', 'Development Clinician L'],
  ['Gastroenterology', 'Gastroenterology consultation', 30, 'IN_PERSON', 'Development Clinician M'],
  ['Nutrition & dietetics', 'Nutrition consultation', 30, 'VIDEO', 'Development Clinician N'],
  ['Dental care', 'Dental consultation', 30, 'IN_PERSON', 'Development Clinician O']
] as const;

const identifier = (prefix: '1' | '2' | '3', position: number) => `00000000-0000-4000-8000-000000000${prefix}${String(position + 1).padStart(2, '0')}`;

try {
  await client.begin(async (sql) => {
    await sql`INSERT INTO users (id, identity_reference, display_name, role) VALUES
      (${ids.patientUser}, 'DEV-PATIENT-001', 'Demo Patient', 'PATIENT'),
      (${ids.staffUser}, 'DEV-STAFF-001', 'Demo Booking Staff', 'BOOKING_STAFF'),
      (${ids.adminUser}, 'DEV-ADMIN-001', 'Demo Clinic Admin', 'CLINIC_ADMIN') ON CONFLICT (id) DO NOTHING`;
    await sql`INSERT INTO patients (id, user_id, identity_reference) VALUES (${ids.patient}, ${ids.patientUser}, 'DEV-PATIENT-001') ON CONFLICT (id) DO NOTHING`;
    await sql`INSERT INTO hospitals (id, name, configuration_reference) VALUES (${ids.hospital}, 'Development General Hospital', 'DEV-HOSPITAL') ON CONFLICT (id) DO NOTHING`;

    const base = new Date();
    base.setUTCDate(base.getUTCDate() + 7);
    base.setUTCHours(9, 0, 0, 0);

    for (const [index, entry] of catalog.entries()) {
      const [specialty, appointmentType, durationMinutes, mode, clinicianName] = entry;
      const clinicId = identifier('1', index);
      const typeId = identifier('2', index);
      const clinicianId = identifier('3', index);

      await sql`INSERT INTO clinics (id, hospital_id, name, configuration_reference) VALUES (${clinicId}, ${ids.hospital}, ${`${specialty} Clinic`}, ${`DEV-${specialty.toUpperCase().replace(/[^A-Z]/g, '-')}`}) ON CONFLICT (id) DO UPDATE SET name = excluded.name, configuration_reference = excluded.configuration_reference`;
      await sql`INSERT INTO appointment_types (id, clinic_id, name, duration_minutes, mode, eligibility_rule_reference) VALUES (${typeId}, ${clinicId}, ${appointmentType}, ${durationMinutes}, ${mode}, 'TBD-HOSPITAL-RULE') ON CONFLICT (id) DO UPDATE SET name = excluded.name, duration_minutes = excluded.duration_minutes, mode = excluded.mode`;
      await sql`INSERT INTO clinicians (id, name, specialty) VALUES (${clinicianId}, ${clinicianName}, ${specialty}) ON CONFLICT (id) DO UPDATE SET name = excluded.name, specialty = excluded.specialty`;

      for (const slotOffset of [0, 1, 2]) {
        const start = new Date(base.getTime() + (index * 3 + slotOffset) * 60 * 60 * 1000);
        const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
        await sql`INSERT INTO slots (clinic_id, appointment_type_id, clinician_id, start_time, end_time, state)
          SELECT ${clinicId}, ${typeId}, ${clinicianId}, ${start}, ${end}, 'PUBLISHED'
          WHERE NOT EXISTS (SELECT 1 FROM slots WHERE clinic_id = ${clinicId} AND start_time = ${start})`;
      }
    }
  });
  console.log(`Development-only SlotSure seed data created for ${catalog.length} clinical specialties.`);
} finally {
  await client.end();
}
