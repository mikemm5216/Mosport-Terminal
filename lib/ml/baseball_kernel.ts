import { Matrix } from "ml-matrix";

export class BaseballModel {
    private weights: Matrix;

    constructor(inputDim: number, outputDim: number = 3) {
        this.weights = Matrix.zeros(inputDim, outputDim);
    }

    public train(X: Matrix, y: Matrix, lr: number = 0.01, epochs: number = 1000) {
        const N = X.rows;
        const K = this.weights.columns;

        for (let epoch = 0; epoch < epochs; epoch++) {
            const logits = X.mmul(this.weights);
            const probs = this.softmax(logits);

            const grad = X.transpose().mmul(probs.sub(y)).div(N);
            this.weights = this.weights.sub(grad.mul(lr));
        }
    }

    public predict(X: Matrix): Matrix {
        return this.softmax(X.mmul(this.weights));
    }

    private softmax(m: Matrix): Matrix {
        const res = Matrix.zeros(m.rows, m.columns);
        for (let i = 0; i < m.rows; i++) {
            let sum = 0;
            const row = m.getRow(i);
            const max = Math.max(...row);
            for (let j = 0; j < m.columns; j++) {
                const val = Math.exp(row[j] - max);
                res.set(i, j, val);
                sum += val;
            }
            for (let j = 0; j < m.columns; j++) {
                res.set(i, j, res.get(i, j) / sum);
            }
        }
        return res;
    }

    public save(): number[][] {
        return this.weights.to2DArray();
    }
}
