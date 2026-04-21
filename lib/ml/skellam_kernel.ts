import { Matrix } from "ml-matrix";

/**
 * SKELLAM GENERATIVE ENGINE (V7.1)
 * Optimized for Poisson NLL and Skellam Projection
 */

export class SkellamGoalModel {
    private W1: Matrix;
    private b1: Matrix;
    private W2_home: Matrix;
    private b2_home: number = 0;
    private W2_away: Matrix;
    private b2_away: number = 0;

    constructor(inputDim: number, hiddenDim: number = 32) {
        this.W1 = Matrix.rand(hiddenDim, inputDim).sub(0.5).mul(Math.sqrt(2 / inputDim));
        this.b1 = new Matrix(hiddenDim, 1).fill(0.1);
        this.W2_home = Matrix.rand(1, hiddenDim).sub(0.5).mul(0.1);
        this.W2_away = Matrix.rand(1, hiddenDim).sub(0.5).mul(0.1);
    }

    private relu(m: Matrix): Matrix {
        const res = m.clone();
        for (let i = 0; i < res.rows; i++) {
            for (let j = 0; j < res.columns; j++) {
                if (res.get(i, j) < 0) res.set(i, j, 0);
            }
        }
        return res;
    }

    // EXP for positivity
    private expAct(z: number): number {
        return Math.exp(Math.min(z, 5)); // Cap at e^5 (~148) for stability
    }

    public forward(X: Matrix) {
        const h_lin = X.mmul(this.W1.transpose());
        for (let i = 0; i < h_lin.rows; i++) {
            for (let j = 0; j < this.b1.rows; j++) h_lin.set(i, j, h_lin.get(i, j) + this.b1.get(j, 0));
        }
        const h = this.relu(h_lin);

        const zH = h.mmul(this.W2_home.transpose()).add(this.b2_home);
        const zA = h.mmul(this.W2_away.transpose()).add(this.b2_away);

        const lambdaH = zH.clone();
        const lambdaA = zA.clone();
        for (let i = 0; i < X.rows; i++) {
            lambdaH.set(i, 0, this.expAct(zH.get(i, 0)));
            lambdaA.set(i, 0, this.expAct(zA.get(i, 0)));
        }

        return { h, lambdaH, lambdaA };
    }

    public train(X: Matrix, yHome: Matrix, yAway: Matrix, lr: number = 0.005, epochs: number = 1000) {
        const m = X.rows;
        for (let e = 0; e < epochs; e++) {
            const { h, lambdaH, lambdaA } = this.forward(X);

            // Poisson Loss Gradient: (lambda - y)
            const dH = lambdaH.clone().sub(yHome);
            const dA = lambdaA.clone().sub(yAway);

            const dW2H = dH.transpose().mmul(h).mul(1 / m);
            const db2H = dH.mean();
            const dW2A = dA.transpose().mmul(h).mul(1 / m);
            const db2A = dA.mean();

            // Gradient Flow to Hidden
            const dh = dH.mmul(this.W2_home).add(dA.mmul(this.W2_away));
            const dW1 = new Matrix(this.W1.rows, this.W1.columns).fill(0);
            const db1 = new Matrix(this.b1.rows, 1).fill(0);

            for (let i = 0; i < m; i++) {
                for (let j = 0; j < this.b1.rows; j++) {
                    if (h.get(i, j) > 0) {
                        const g = dh.get(i, j);
                        db1.set(j, 0, db1.get(j, 0) + g / m);
                        for (let k = 0; k < X.columns; k++) {
                            dW1.set(j, k, dW1.get(j, k) + (g * X.get(i, k)) / m);
                        }
                    }
                }
            }

            this.W1.sub(dW1.mul(lr));
            this.b1.sub(db1.mul(lr));
            this.W2_home.sub(dW2H.mul(lr));
            this.b2_home -= db2H * lr;
            this.W2_away.sub(dW2A.mul(lr));
            this.b2_away -= db2A * lr;
        }
    }

    // Direct Poisson Summation for Skellam-like outcomes
    private poissonPmf(k: number, lambda: number): number {
        if (k < 0) return 0;
        let p = Math.exp(-lambda);
        for (let i = 1; i <= k; i++) p *= (lambda / i);
        return p;
    }

    public predictProbs(X: Matrix): Matrix {
        const { lambdaH, lambdaA } = this.forward(X);
        const probs = new Matrix(X.rows, 3);
        const LIMIT = 12;

        for (let i = 0; i < X.rows; i++) {
            const lh = lambdaH.get(i, 0);
            const la = lambdaA.get(i, 0);

            let pH = 0, pD = 0, pA = 0;

            // Pre-calculate PMFs for batch efficiency
            const pmfH = Array.from({ length: LIMIT + 1 }, (_, k) => this.poissonPmf(k, lh));
            const pmfA = Array.from({ length: LIMIT + 1 }, (_, k) => this.poissonPmf(k, la));

            for (let h = 0; h <= LIMIT; h++) {
                for (let a = 0; a <= LIMIT; a++) {
                    const mass = pmfH[h] * pmfA[a];
                    if (h > a) pH += mass;
                    else if (h < a) pA += mass;
                    else pD += mass;
                }
            }

            // Norm to 1.0
            const sum = pH + pD + pA;
            probs.set(i, 0, pH / sum);
            probs.set(i, 1, pD / sum);
            probs.set(i, 2, pA / sum);
        }
        return probs;
    }
}
