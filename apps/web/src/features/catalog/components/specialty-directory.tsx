'use client';

import React, { useState } from 'react';
import { specialties, type Specialty } from '@/lib/specialties';

interface SpecialtyDirectoryProps {
  onSelectSpecialty: (specialty: Specialty) => void;
  directoryMessage?: string;
}

export function SpecialtyDirectory({
  onSelectSpecialty,
  directoryMessage
}: SpecialtyDirectoryProps) {
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [specialtyCategory, setSpecialtyCategory] = useState('All care');

  const specialtyCategories = [
    'All care',
    ...Array.from(new Set(specialties.map(item => item.category)))
  ];

  const matchingSpecialties = specialties.filter(
    item =>
      `${item.name} ${item.description} ${item.category}`
        .toLowerCase()
        .includes(specialtySearch.toLowerCase()) &&
      (specialtyCategory === 'All care' || item.category === specialtyCategory)
  );

  return (
    <section className="specialty-directory" aria-labelledby="specialty-heading">
      <div className="directory-heading">
        <div>
          <p className="eyebrow">Find the right care</p>
          <h2 id="specialty-heading">Explore clinical specialties</h2>
          <p>
            Choose from primary, specialist and allied health services before selecting a
            convenient appointment time.
          </p>
        </div>
        <label className="specialty-search">
          <span className="sr-only">Search specialties</span>
          <input
            value={specialtySearch}
            onChange={event => setSpecialtySearch(event.target.value)}
            placeholder="Search a specialty"
          />
        </label>
      </div>

      {directoryMessage && (
        <p className="directory-message" role="status">
          {directoryMessage}
        </p>
      )}

      <div className="directory-controls">
        <div className="category-filter" aria-label="Filter specialties by care category">
          {specialtyCategories.map(category => (
            <button
              key={category}
              className={specialtyCategory === category ? 'filter-button active' : 'filter-button'}
              aria-pressed={specialtyCategory === category}
              onClick={() => setSpecialtyCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <p className="directory-count">{matchingSpecialties.length} specialties</p>
      </div>

      <div className="specialty-grid">
        {matchingSpecialties.map(specialty => (
          <article className="specialty-card" key={specialty.name}>
            <div>
              <p className="specialty-category">{specialty.category}</p>
              <h3>{specialty.name}</h3>
              <p>{specialty.description}</p>
            </div>
            <div className="specialty-footer">
              <span
                className={
                  specialty.clinicId ? 'availability-label live' : 'availability-label'
                }
              >
                {specialty.clinicId ? 'Appointments available' : 'Service coming soon'}
              </span>
              <button
                className="text-button"
                onClick={() => onSelectSpecialty(specialty)}
              >
                {specialty.clinicId ? 'View appointments' : 'View service'}
              </button>
            </div>
          </article>
        ))}
      </div>

      {matchingSpecialties.length === 0 && (
        <p className="empty-specialty">
          No specialty matches that search. Try a broader health need, such as “heart” or
          “children”.
        </p>
      )}
    </section>
  );
}
