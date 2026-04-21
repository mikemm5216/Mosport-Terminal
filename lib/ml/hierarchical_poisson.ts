import { Matrix } from "ml-matrix";

/**
 * NEURAL GOAL ENGINE (V6.2)
 * 1-Hidden-Layer MLP for GoalDiff & DrawGate
 */

export class NeuralGoalModel {
    private W1: Matrix;
    private b1: Matrix;
    private W2_diff: Matrix;
    private b2_diff: number = 0;
    private W2_draw: Matrix;
    private b2_draw: number = 0;

    private sigma: number = 1.35;
    private inputDim: number;
    private hiddenDim: number = 32;

    constructor(inputDim: number) {
        this.inputDim = inputDim;
        // He Initialization
        this.W1 = Matrix.rand(this.hiddenDim, inputDim).sub(0.5).mul(Math.sqrt(2 / inputDim));
        this.b1 = new Matrix(this.hiddenDim, 1).fill(0);
        this.W2_diff = Matrix.rand(1, this.hiddenDim).sub(0.5).mul(Math.sqrt(2 / this.hiddenDim));
        this.W2_draw = Matrix.rand(1, this.hiddenDim).sub(0.5).mul(Math.sqrt(2 / this.hiddenDim));
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

    private sigmoid(z: number): number {
        return 1 / (1 + Math.exp(-z));
    }

    public forward(X: Matrix) {
        // X is (N x inputDim)
        const h_lin = X.mmul(this.W1.transpose()); // (N x hidden)
        for (let i = 0; i < h_lin.rows; i++) {
            for (let j = 0; j < this.hiddenDim; j++) h_lin.set(i, j, h_lin.get(i, j) + this.b1.get(j, 0));
        }
        const h = this.relu(h_lin);

        const diff = h.mmul(this.W2_diff.transpose()).add(this.b2_diff);
        const draw_lin = h.mmul(this.W2_draw.transpose()).add(this.b2_draw);

        const draw_prob = draw_lin.clone();
        for (let i = 0; i < draw_prob.rows; i++) draw_prob.set(i, 0, this.sigmoid(draw_lin.get(i, 0)));

        return { h, diff, draw_prob };
    }

    public train(X: Matrix, yDiff: Matrix, yDraw: Matrix, lr: number = 0.01, epochs: number = 500) {
        const m = X.rows;

        for (let e = 0; e < epochs; e++) {
            // Forward
            const { h, diff, draw_prob } = this.forward(X);

            // Backprop - Diff
            const dDiff = diff.clone().sub(yDiff); // (N x 1)
            const dW2_diff = dDiff.transpose().mmul(h).mul(1 / m);
            const db2_diff = dDiff.mean();

            // Backprop - Draw
            const dDraw = draw_prob.clone().sub(yDraw); // (N x 1)
            const dW2_draw = dDraw.transpose().mmul(h).mul(1 / m);
            const db2_draw = dDraw.mean();

            // Backprop - Hidden
            const dh = dDiff.mmul(this.W2_diff).add(dDraw.mmul(this.W2_draw)); // (N x hidden)
            const dW1 = new Matrix(this.hiddenDim, this.inputDim).fill(0);
            const db1 = new Matrix(this.hiddenDim, 1).fill(0);

            // Simple ReLU gradient
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < this.hiddenDim; j++) {
                    if (h.get(i, j) > 0) {
                        const grad = dh.get(i, j);
                        db1.set(j, 0, db1.get(j, 0) + grad / m);
                        for (let k = 0; k < this.inputDim; k++) {
                            dW1.set(j, k, dW1.get(j, k) + (grad * X.get(i, k)) / m);
                        }
                    }
                }
            }

            // Updates
            this.W1.sub(dW1.mul(lr));
            this.b1.sub(db1.mul(lr));
            this.W2_diff.sub(dW2_diff.mul(lr));
            this.b2_diff -= db2_diff * lr;
            this.W2_draw.sub(dW2_draw.mul(lr));
            this.b2_draw -= db2_draw * lr;
        }

        // Sigma
        const { diff } = this.forward(X);
        const res = diff.clone().sub(yDiff);
        let ss = 0;
        for (let i = 0; i < m; i++) ss += Math.pow(res.get(i, 0), 2);
        this.sigma = Math.sqrt(ss / m) || 1.35;
    }

    private nCdf(x: number, mean: number, sigma: number): number {
        const z = (x - mean) / (sigma * Math.sqrt(2));
        const t = 1 / (1 + 0.3275911 * Math.abs(z));
        const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
        const erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
        const res = 0.5 * (1 + (z >= 0 ? erf : -erf));
        return res;
    }

    public predictProbs(X: Matrix): Matrix {
        const { diff, draw_prob } = this.forward(X);
        const probs = new Matrix(X.rows, 3);

        for (let i = 0; i < X.rows; i++) {
            const mu = diff.get(i, 0);
            const pD = draw_prob.get(i, 0);
            const s = this.sigma;

            const pH_raw = 1 - this.nCdf(0.5, mu, s);
            const pA_raw = this.nCdf(-0.5, mu, s);
            const sumNonDraw = pH_raw + pA_raw;

            probs.set(i, 0, (1 - pD) * (pH_raw / (sumNonDraw || 1)));
            probs.set(i, 1, pD);
            probs.set(i, 2, (1 - pD) * (pA_raw / (sumNonDraw || 1)));
        }
        return probs;
    }
}
