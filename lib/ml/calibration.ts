/**
 * Spartan Calibration & Metrics Utility V1.1
 * Platt Scaling (Logit-based), Brier Score, Log Loss, and Bucket Analysis.
 */

export function sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-z));
}

/**
 * Apply Platt Scaling: 
 * calibrated_prob = 1 / (1 + exp(-(A * logit + B)))
 */
export function plattScale(logit: number, A: number, B: number): number {
    return sigmoid(A * logit + B);
}

/**
 * Train Platt Scaling parameters A and B using Gradient Descent.
 * logits: array of raw model outputs (before sigmoid)
 * labels: array of binary outcomes (0 or 1)
 */
export function trainPlatt(logits: number[], labels: number[]) {
    let A = 1.0; // Initial guess for logit scaling
    let B = 0.0;
    const lr = 0.5;
    const epochs = 2000;

    for (let i = 0; i < epochs; i++) {
        let dA = 0;
        let dB = 0;

        for (let j = 0; j < logits.length; j++) {
            const logit = logits[j];
            const label = labels[j];
            const pred = plattScale(logit, A, B);
            const error = pred - label;

            dA += error * logit;
            dB += error;
        }

        A -= (lr * dA) / logits.length;
        B -= (lr * dB) / logits.length;
    }

    return { A, B };
}

export function brierScore(probs: number[], labels: number[]): number {
    if (probs.length === 0) return 0;
    const sumSqError = probs.reduce((sum, p, i) => sum + Math.pow(p - labels[i], 2), 0);
    return sumSqError / probs.length;
}

export function logLoss(probs: number[], labels: number[]): number {
    if (probs.length === 0) return 0;
    const sumLogLoss = probs.reduce((sum, p, i) => {
        const eps = 1e-15;
        const pred = Math.max(eps, Math.min(1 - eps, p));
        return sum - (labels[i] * Math.log(pred) + (1 - labels[i]) * Math.log(1 - pred));
    }, 0);
    return sumLogLoss / probs.length;
}

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
