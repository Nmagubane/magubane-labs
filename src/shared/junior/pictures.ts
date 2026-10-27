/**
 * Picture codes: how a 6-year-old signs in. A child taps their name, then 3 pictures in order.
 * 12 pictures, 3 taps → 1 728 codes. That is weak on its own, so it only works on a device a parent or
 * teacher has set up (a device token), with lockout after repeated misses. See src/server/junior.ts.
 */
export const PICTURES = [
  { id: 'elephant', icon: '🐘', name: 'elephant' },
  { id: 'giraffe', icon: '🦒', name: 'giraffe' },
  { id: 'tortoise', icon: '🐢', name: 'tortoise' },
  { id: 'lion', icon: '🦁', name: 'lion' },
  { id: 'ball', icon: '⚽', name: 'ball' },
  { id: 'bicycle', icon: '🚲', name: 'bicycle' },
  { id: 'tree', icon: '🌳', name: 'tree' },
  { id: 'sun', icon: '☀️', name: 'sun' },
  { id: 'moon', icon: '🌙', name: 'moon' },
  { id: 'apple', icon: '🍎', name: 'apple' },
  { id: 'car', icon: '🚗', name: 'car' },
  { id: 'star', icon: '⭐', name: 'star' },
] as const;
export type PictureId = (typeof PICTURES)[number]['id'];
export const PICTURE_IDS = PICTURES.map((p) => p.id) as unknown as readonly [PictureId, ...PictureId[]];
export const CODE_LENGTH = 3;
export const pictureOf = (id: string) => PICTURES.find((p) => p.id === id);

/** A random code for a new child. The adult can change it. */
export function randomPictureCode(randomIndex: (n: number) => number): PictureId[] {
  const out: PictureId[] = [];
  while (out.length < CODE_LENGTH) {
    const p = PICTURES[randomIndex(PICTURES.length)]!.id;
    // No repeats: easier for a young child to remember three different pictures.
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

/** A few colours for name buttons so non-readers can find theirs (with their initial). */
export const CHILD_COLOURS = ['#2347d6', '#18804a', '#a86400', '#8a3fb3', '#c4302b', '#0f7c86', '#5b636b', '#b8406e'];
