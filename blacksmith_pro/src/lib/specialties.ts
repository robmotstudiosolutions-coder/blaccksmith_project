export type Specialty = {
  name: string;
  description: string;
  category: 'Primary care' | 'Specialist care' | 'Women & children' | 'Allied health';
  clinicId?: string;
  appointmentTypeId?: string;
};

export const specialties: Specialty[] = [
  { name: 'General practice', description: 'Everyday care, referrals and ongoing health support.', category: 'Primary care', clinicId: '00000000-0000-4000-8000-000000000104', appointmentTypeId: '00000000-0000-4000-8000-000000000204' },
  { name: 'Cardiology', description: 'Heart health, investigations and specialist consultations.', category: 'Specialist care', clinicId: '00000000-0000-4000-8000-000000000101', appointmentTypeId: '00000000-0000-4000-8000-000000000201' },
  { name: 'Dermatology', description: 'Skin, hair and nail concerns with specialist assessment.', category: 'Specialist care', clinicId: '00000000-0000-4000-8000-000000000102', appointmentTypeId: '00000000-0000-4000-8000-000000000202' },
  { name: 'Paediatrics', description: 'Dedicated care for infants, children and adolescents.', category: 'Women & children', clinicId: '00000000-0000-4000-8000-000000000105', appointmentTypeId: '00000000-0000-4000-8000-000000000205' },
  { name: 'Women’s health', description: 'Obstetrics, gynaecology and reproductive health care.', category: 'Women & children', clinicId: '00000000-0000-4000-8000-000000000106', appointmentTypeId: '00000000-0000-4000-8000-000000000206' },
  { name: 'Mental health', description: 'Psychological support and mental health consultations.', category: 'Specialist care', clinicId: '00000000-0000-4000-8000-000000000107', appointmentTypeId: '00000000-0000-4000-8000-000000000207' },
  { name: 'Orthopaedics', description: 'Bones, joints, mobility and musculoskeletal injuries.', category: 'Specialist care', clinicId: '00000000-0000-4000-8000-000000000108', appointmentTypeId: '00000000-0000-4000-8000-000000000208' },
  { name: 'Eye care', description: 'Vision checks and ophthalmology consultations.', category: 'Specialist care', clinicId: '00000000-0000-4000-8000-000000000109', appointmentTypeId: '00000000-0000-4000-8000-000000000209' },
  { name: 'Ear, nose & throat', description: 'ENT consultations for hearing, sinus and throat concerns.', category: 'Specialist care', clinicId: '00000000-0000-4000-8000-000000000110', appointmentTypeId: '00000000-0000-4000-8000-000000000210' },
  { name: 'Neurology', description: 'Specialist support for brain, nerve and headache conditions.', category: 'Specialist care', clinicId: '00000000-0000-4000-8000-000000000111', appointmentTypeId: '00000000-0000-4000-8000-000000000211' },
  { name: 'Diabetes & endocrinology', description: 'Hormone, metabolism and diabetes management.', category: 'Specialist care', clinicId: '00000000-0000-4000-8000-000000000112', appointmentTypeId: '00000000-0000-4000-8000-000000000212' },
  { name: 'Gastroenterology', description: 'Digestive health and specialist stomach-care consultations.', category: 'Specialist care', clinicId: '00000000-0000-4000-8000-000000000113', appointmentTypeId: '00000000-0000-4000-8000-000000000213' },
  { name: 'Physiotherapy', description: 'Movement, recovery and rehabilitation support.', category: 'Allied health', clinicId: '00000000-0000-4000-8000-000000000103', appointmentTypeId: '00000000-0000-4000-8000-000000000203' },
  { name: 'Nutrition & dietetics', description: 'Practical nutrition guidance for your health goals.', category: 'Allied health', clinicId: '00000000-0000-4000-8000-000000000114', appointmentTypeId: '00000000-0000-4000-8000-000000000214' },
  { name: 'Dental care', description: 'Routine dental care and oral-health consultations.', category: 'Specialist care', clinicId: '00000000-0000-4000-8000-000000000115', appointmentTypeId: '00000000-0000-4000-8000-000000000215' }
];
