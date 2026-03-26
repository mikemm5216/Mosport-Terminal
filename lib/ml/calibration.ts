/**
 * Spartan Calibration & Metrics Utility
 * Platt Scaling (A/B optimization), Brier Score, Log Loss, and Bucket Analysis.
 */

export function sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-z));
}

/**
 * Apply Platt Scaling: 
 * calibrated_prob = 1 / (1 + exp(-(A * raw_prob + B)))
 */
export function plattScale(rawProb: number, A: number, B: number): number {
    return sigmoid(A * rawProb + B);
}

/**
 * Train Platt Scaling parameters A and B using Gradient Descent.
 * rawProbs: array of uncalibrated probabilities (0-1)
 * labels: array of binary outcomes (0 or 1)
 */
export function trainPlatt(rawProbs: number[], labels: number[]) {
    let A = -1.0; // Initial guess: negative slope to compress overconfidence
    let B = 0.0;
    const lr = 0.1;
    const epochs = 1000;

    for (let i = 0; i < epochs; i++) {
        let dA = 0;
        let dB = 0;

        for (let j = 0; j < rawProbs.length; j++) {
            const prob = rawProbs[j];
            const label = labels[j];
            const pred = plattScale(prob, A, B);
            const error = pred - label;

            dA += error * prob;
            dB += error;
        }

        A -= (lr * dA) / rawProbs.length;
        B -= (lr * dB) / rawProbs.length;
    }

    return { A, B };
}

/**
 * Brier Score: Mean Squared Error of predictions.
 * Lower is better. 0.0 is perfect, 0.25 is random/worst for binary.
 */
export function brierScore(probs: number[], labels: number[]): number {
    if (probs.length === 0) return 0;
    const sumSqError = probs.reduce((sum, p, i) => sum + Math.pow(p - labels[i], 2), 0);
    return sumSqError / probs.length;
}

/**
 * Log Loss (Cross-Entropy).
 * Lower is better.
 */
export function logLoss(probs: number[], labels: number[]): number {
    if (probs.length === 0) return 0;
    const sumLogLoss = probs.reduce((sum, p, i) => {
        const eps = 1e-15;
        const pred = Math.max(eps, Math.min(1 - eps, p));
        return sum - (labels[i] * Math.log(pred) + (1 - labels[i]) * Math.log(1 - pred));
    }, 0);
    return sumLogLoss / probs.length;
}

/**
 * Bucket Analysis: Group predictions into buckets to find calibration gaps.
 */
export function bucketAnalysis(probs: number[], labels: number[]) {
    const buckets: { predicted: number[]; actual: number[] }[] = Array.from({ length: 10 }, () => ({
        predicted: [],
        actual: []
    }));

    for (let i = 0; i < probs.length; i++) {
        const p = probs[i];
        const bucketIndex = Math.min(Math.floor(p * 10), 9);
        buckets[bucketIndex].predicted.push(p);
        buckets[bucketIndex].actual.push(labels[i]);
    }

    return buckets.map((b, i) => {
        const count = b.predicted.length;
        const avgPred = count > 0 ? b.predicted.reduce((s, x) => s + x, 0) / count : 0;
        const winRate = count > 0 ? b.actual.reduce((s, x) => s + x, 0) / count : 0;
        return {
            bucket: `${(i * 10).toString().padStart(2, "0")}-${((i + 1) * 10).toString().padStart(2, "0")}%`,
            count,
            avgPred: avgPred.toFixed(4),
            winRate: winRate.toFixed(4),
            gap: (avgPred - winRate).toFixed(4)
        };
    });
}
