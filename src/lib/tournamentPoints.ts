export const POINTS_BY_POSITION: Record<1 | 2 | 3, number> = { 1: 10, 2: 5, 3: 3 };

export function pointsFor(position: number): number {
  return POINTS_BY_POSITION[position as 1 | 2 | 3] ?? 0;
}
