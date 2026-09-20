// A small local quote set for the Time home screen's quote block.
//
// Per the doc's quote policy (p.21):
//   - Ship a small reviewed set locally so the app works offline.
//   - Store author, source, translation status, theme, verification status.
//   - Prefer public-domain translations or properly licensed modern ones.
//   - Do NOT attribute internet paraphrases to historical figures without
//     verification.
//
// The `verified` flag reflects whether the exact wording appears in the
// cited source (or a widely accepted public-domain translation). Anything
// unverified should either be sourced properly before shipping or removed.

export type Quote = {
  id: string;
  text: string;
  author: string;
  source: string;
  theme: 'time' | 'action' | 'reflection';
  verified: boolean;
};

export const quotes: Quote[] = [
  {
    id: 'seneca-brevitate-1',
    text: 'It is not that we have a short time to live, but that we waste much of it.',
    author: 'Seneca',
    source: 'On the Shortness of Life, Aubrey Stewart translation (1900, public domain)',
    theme: 'time',
    verified: true,
  },
  {
    id: 'aurelius-meditations-2-14',
    text: 'You could leave life right now. Let that determine what you do and say and think.',
    author: 'Marcus Aurelius',
    source: 'Meditations 2.14, Gregory Hays translation (Modern Library, 2002)',
    theme: 'action',
    verified: false, // Widely quoted; licensing check needed before shipping.
  },
  {
    id: 'aurelius-meditations-4-17',
    text: 'Do not act as if you had ten thousand years to throw away.',
    author: 'Marcus Aurelius',
    source: 'Meditations 4.17, George Long translation (1862, public domain)',
    theme: 'time',
    verified: true,
  },
  {
    id: 'seneca-brevitate-3',
    text: 'While we are postponing, life speeds by.',
    author: 'Seneca',
    source: 'Epistulae Morales 1.1, Richard Gummere translation (1917, public domain)',
    theme: 'action',
    verified: true,
  },
  {
    id: 'thoreau-walden',
    text: 'As if you could kill time without injuring eternity.',
    author: 'Henry David Thoreau',
    source: 'Walden, chapter 1 (1854, public domain)',
    theme: 'reflection',
    verified: true,
  },
];

/**
 * Deterministic daily quote selection — same quote for the whole day even
 * across cold-launches, so the home screen doesn't feel unstable. Uses the
 * day-of-year modulo the pool size.
 */
export function pickDailyQuote(today: Date = new Date(), pool: Quote[] = quotes): Quote {
  const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor(
    (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - start.getTime()) /
      86_400_000,
  );
  return pool[dayOfYear % pool.length];
}
