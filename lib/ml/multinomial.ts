import { Matrix } from "ml-matrix";

/**
 * MULTINOMIAL LOGISTIC REGRESSION (SOFTMAX)
 * Optimized for Sports (3 classes: Home, Draw, Away)
 */

export class MultinomialModel {
    private W: Matrix; // Weights (K x D)
    private b: Matrix; // Bias (K x 1)
    private classes: number;

    constructor(features: number, classes: number = 3) {
        this.classes = classes;
        this.W = Matrix.rand(classes, features).sub(0.5).mul(0.1);
        this.b = Matrix.zeros(classes, 1);
    }

    private softmax(Z: Matrix): Matrix {
        // Z is (K x N)
        const expZ = Z.clone();
        for (let j = 0; j < Z.columns; j++) {
            const col = Z.getColumn(j);
            const max = Math.max(...col);
            let sum = 0;
            for (let i = 0; i < Z.rows; i++) {
                const val = Math.exp(col[i] - max);
                expZ.set(i, j, val);
                sum += val;
            }
            for (let i = 0; i < Z.rows; i++) {
                expZ.set(i, j, expZ.get(i, j) / sum);
            }
        }
        return expZ;
    }

    public predict(X: Matrix): Matrix {
        // X is (N x D) -> XT is (D x N)
        const Z = this.W.mmul(X.transpose()); // (K x N)
        // Manual broadcasting for b (K x 1) -> (K x N)
        for (let j = 0; j < Z.columns; j++) {
            for (let i = 0; i < Z.rows; i++) {
                Z.set(i, j, Z.get(i, j) + this.b.get(i, 0));
            }
        }
        return this.softmax(Z).transpose(); // (N x K)
    }

    public setBiasFromPriors(priors: number[]) {
        const sum = priors.reduce((a, b) => a + b, 0);
        for (let i = 0; i < this.classes; i++) {
            const p = Math.max(priors[i] / sum, 1e-15);
            this.b.set(i, 0, Math.log(p));
        }
    }

    public train(X: Matrix, y: Matrix, lr: number = 0.1, epochs: number = 100, batchSize: number = 64, classWeights?: number[]) {
        const N = X.rows;
        const D = X.columns;
        const K = this.classes;

        for (let e = 0; e < epochs; e++) {
            for (let i = 0; i < N; i += batchSize) {
                const end = Math.min(i + batchSize, N);
                const Xi = X.subMatrix(i, end - 1, 0, D - 1);
                const yi = y.subMatrix(i, end - 1, 0, K - 1); // One-hot
                const m = Xi.rows;

                const probs = this.predict(Xi); // (m x K)
                const error = probs.clone().sub(yi); // (m x K)

                // Apply Class Weights to Gradient
                if (classWeights) {
                    for (let r = 0; r < m; r++) {
                        // Find active class from one-hot
                        const row = yi.getRow(r);
                        const labelIdx = row.indexOf(1);
                        const w = classWeights[labelIdx] || 1.0;
                        for (let c = 0; c < K; c++) {
                            error.set(r, c, error.get(r, c) * w);
                        }
                    }
                }

                const dW = error.transpose().mmul(Xi).mul(1 / m); // (K x D)
                const db = Matrix.from1DArray(K, 1, error.sum("column").map(v => v / m));

                this.W.sub(dW.mul(lr));
                this.b.sub(db.mul(lr));
            }
        }
    }

    public getParams() {
        return { W: this.W.to2DArray(), b: this.b.to2DArray() };
    }
}

export function toOneHot(labels: number[], classes: number = 3): Matrix {
    const m = new Matrix(labels.length, classes);
    labels.forEach((l, i) => m.set(i, l, 1));
    return m;
}
