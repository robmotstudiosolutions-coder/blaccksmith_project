import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { trust: 'hsl(var(--trust))', available: 'hsl(var(--available))', provisional: 'hsl(var(--provisional))', held: 'hsl(var(--held))', confirmed: 'hsl(var(--confirmed))', conflict: 'hsl(var(--conflict))', degraded: 'hsl(var(--degraded))' } } },
  plugins: []
} satisfies Config;
