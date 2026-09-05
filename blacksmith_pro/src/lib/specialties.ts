export type Specialty = {
  name: string;
  description: string;
  category: 'Primary care' | 'Specialist care' | 'Women & children' | 'Allied health';
  clinicId?: string;
  appointmentTypeId?: string;
};

export const specialties: Specialty[] = [
  { name: 'General practice', description: 'Everyday care, referrals and ongoing health support.', category: 'Primary care' },
  { name: 'Cardiology', description: 'Heart health, investigations and specialist consultations.', category: 'Specialist care', clinicId: '00000000-0000-4000-8000-000000000101', appointmentTypeId: '00000000-0000-4000-8000-000000000201' },
  { name: 'Dermatology', description: 'Skin, hair and nail concerns with specialist assessment.', category: 'Specialist care', clinicId: '00000000-0000-4000-8000-000000000102', appointmentTypeId: '00000000-0000-4000-8000-000000000202' },
  { name: 'Paediatrics', description: 'Dedicated care for infants, children and adolescents.', category: 'Women & children' },
  { name: 'Women’s health', description: 'Obstetrics, gynaecology and reproductive health care.', category: 'Women & children' },
  { name: 'Mental health', description: 'Psychological support and mental health consultations.', category: 'Specialist care' },
  { name: 'Orthopaedics', description: 'Bones, joints, mobility and musculoskeletal injuries.', category: 'Specialist care' },
  { name: 'Eye care', description: 'Vision checks and ophthalmology consultations.', category: 'Specialist care' },
  { name: 'Ear, nose & throat', description: 'ENT consultations for hearing, sinus and throat concerns.', category: 'Specialist care' },
  { name: 'Neurology', description: 'Specialist support for brain, nerve and headache conditions.', category: 'Specialist care' },
  { name: 'Diabetes & endocrinology', description: 'Hormone, metabolism and diabetes management.', category: 'Specialist care' },
  { name: 'Gastroenterology', description: 'Digestive health and specialist stomach-care consultations.', category: 'Specialist care' },
  { name: 'Physiotherapy', description: 'Movement, recovery and rehabilitation support.', category: 'Allied health', clinicId: '00000000-0000-4000-8000-000000000103', appointmentTypeId: '00000000-0000-4000-8000-000000000203' },
  { name: 'Nutrition & dietetics', description: 'Practical nutrition guidance for your health goals.', category: 'Allied health' },
  { name: 'Dental care', description: 'Routine dental care and oral-health consultations.', category: 'Specialist care' }
];
