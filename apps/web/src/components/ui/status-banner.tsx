'use client';

import React from 'react';
import { Clock3 } from 'lucide-react';

interface StatusBannerProps {
  title: string;
  text: string;
}

export function StatusBanner({ title, text }: StatusBannerProps) {
  return (
    <section className="status" aria-live="polite">
      <Clock3 />
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </section>
  );
}
