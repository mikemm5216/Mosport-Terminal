/**
 * Computes string similarity between two team names.
 * Uses normalized comparison and Levenshtein distance.
 */
export function computeTeamSimilarity(a: string, b: string): number {
    const normalize = (s: string) => (s || "").toLowerCase().trim().replace(/\s+/g, ' ');
    const nA = normalize(a);
    const nB = normalize(b);

    if (nA === nB) return 1.0;
    if (nA.length === 0 || nB.length === 0) return 0.0;

    // High score for partial inclusions
    if (nA.includes(nB) || nB.includes(nA)) {
        const ratio = Math.min(nA.length, nB.length) / Math.max(nA.length, nB.length);
        return 0.7 + (ratio * 0.2); // Range 0.7 - 0.9
    }

    const distance = levenshteinDistance(nA, nB);
    const maxLength = Math.max(nA.length, nB.length);
    return 1.0 - distance / maxLength;
}

function levenshteinDistance(a: string, b: string): number {
    const tmp = [];
    for (let i = 0; i <= a.length; i++) tmp[i] = [i];
    for (let j = 1; j <= b.length; j++) tmp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            tmp[i][j] = Math.min(
                tmp[i - 1][j] + 1,
                tmp[i][j - 1] + 1,
                tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }
    return tmp[a.length][b.length];
}
