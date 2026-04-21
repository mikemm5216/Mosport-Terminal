/**
 * Computes time score based on difference between two dates.
 * 1.0 = exact match
 * 0.0 = >= windowMs difference
 * Linear decay between 0 and windowMs.
 */
export function computeTimeScore(a: Date, b: Date, windowMs: number = 2 * 60 * 60 * 1000): number {
    const diffMs = Math.abs(a.getTime() - b.getTime());

    if (diffMs === 0) return 1.0;
    if (diffMs >= windowMs) return 0.0;

    // Linear decay: 1.0 at 0 diff, 0.0 at windowMs diff
    return 1.0 - (diffMs / windowMs);
}
