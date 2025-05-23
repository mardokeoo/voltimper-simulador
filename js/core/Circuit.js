class Circuit {
    constructor() {
        this.nodes = new Set();
        this.components = [];
    }

    addComponent(type, node1, node2, value) {
        this.components.push(new Component(type, node1, node2, value));
        this.nodes.add(node1);
        this.nodes.add(node2);
    }

    runSimulationStep() {
        console.log(`Sim step started`);

        const nodeList = Array.from(this.nodes).filter(n => n !== 0);  // Nodo 0 = tierra
        const n = nodeList.length;

        const G = Array.from({ length: n }, () => Array(n).fill(0));
        const I = Array(n).fill(0);

        for (const comp of this.components) {
            const i = nodeList.indexOf(comp.node1);
            const j = nodeList.indexOf(comp.node2);

            if (comp.type === 'resistor') {
                const conductance = 1 / comp.value;
                if (i >= 0) G[i][i] += conductance;
                if (j >= 0) G[j][j] += conductance;
                if (i >= 0 && j >= 0) {
                    G[i][j] -= conductance;
                    G[j][i] -= conductance;
                }
            } else if (comp.type === 'voltage_source') {
                const voltage = comp.value;
                if (i >= 0) I[i] -= voltage / 1e-3;  // Corriente equivalente
                if (j >= 0) I[j] += voltage / 1e-3;
            }
        }

        const V = this.solveLinearSystem(G, I);

        nodeList.forEach((node, idx) => {
            console.log(`Voltaje en nodo ${node}: ${V[idx].toFixed(2)} V`);
        });
    }

    solveLinearSystem(A, b) {
        const n = A.length;
        const M = A.map((row, i) => [...row, b[i]]);

        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
            }
            [M[i], M[maxRow]] = [M[maxRow], M[i]];

            for (let k = i + 1; k < n; k++) {
                const factor = M[k][i] / M[i][i];
                for (let j = i; j <= n; j++) {
                    M[k][j] -= factor * M[i][j];
                }
            }
        }

        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = M[i][n] / M[i][i];
            for (let k = i - 1; k >= 0; k--) {
                M[k][n] -= M[k][i] * x[i];
            }
        }

        return x;
    }
}
