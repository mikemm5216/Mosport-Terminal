export class IsotonicCalibrator {
    private bins: { x: number; y: number }[] = [];

    public fit(probs: number[], labels: number[]) {
        // 1. Pair and sort by prob
        let data = probs.map((p, i) => ({ p, y: labels[i] }))
            .sort((a, b) => a.p - b.p);

        // 2. Initial buckets
        let buckets = data.map(d => ({
            meanX: d.p,
            meanY: d.y,
            count: 1,
            sumY: d.y
        }));

        // 3. PAVA merge
        let pool = true;
        while (pool) {
            pool = false;
            for (let i = 0; i < buckets.length - 1; i++) {
                if (buckets[i].meanY > buckets[i + 1].meanY) {
                    // Merge
                    const newCount = buckets[i].count + buckets[i + 1].count;
                    const newSumY = buckets[i].sumY + buckets[i + 1].sumY;
                    const newMeanX = (buckets[i].meanX * buckets[i].count + buckets[i + 1].meanX * buckets[i + 1].count) / newCount;

                    buckets.splice(i, 2, {
                        meanX: newMeanX,
                        meanY: newSumY / newCount,
                        count: newCount,
                        sumY: newSumY
                    });
                    pool = true;
                    break;
                }
            }
        }
        this.bins = buckets.map(b => ({ x: b.meanX, y: b.meanY }));
    }

    public transform(p: number): number {
        if (this.bins.length === 0) return p;
        if (p <= this.bins[0].x) return this.bins[0].y;
        if (p >= this.bins[this.bins.length - 1].x) return this.bins[this.bins.length - 1].y;

        // Linear interpolation
        for (let i = 0; i < this.bins.length - 1; i++) {
            if (p >= this.bins[i].x && p <= this.bins[i + 1].x) {
                const t = (p - this.bins[i].x) / (this.bins[i + 1].x - this.bins[i].x);
                return this.bins[i].y + t * (this.bins[i + 1].y - this.bins[i].y);
            }
        }
        return p;
    }
}
