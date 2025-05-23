class Simulator {
    constructor(components = [], connections = []) {
        this.components = components;     // Lista de componentes en el circuito
        this.connections = connections;   // Lista de conexiones entre componentes
    }

    runSimulationStep() {
        console.log(`Sim step iniciado`);

        // 1. Resetear estados
        this.connections.forEach(conn => conn.active = false);
        this.components.forEach(comp => {
            if (comp.type === 'led') comp.properties.state = 'off';
        });

        // 2. Buscar batería y tierra para intentar activar LED si hay camino cerrado
        const batteries = this.components.filter(c => c.type === 'battery');
        const grounds = this.components.filter(c => c.type === 'ground');

        if (batteries.length > 0 && grounds.length > 0) {
            const battery = batteries[0];
            const ground = grounds[0];

            const visitedComponents = new Set();
            const visitedConnections = new Set();

            const pathFound = this.findPath(battery.id, ground.id, visitedComponents, visitedConnections);

            if (pathFound) {
                visitedConnections.forEach(connId => {
                    const conn = this.connections.find(c => c.id === connId);
                    if (conn) conn.active = true;
                });
                visitedComponents.forEach(compId => {
                    const comp = this.components.find(c => c.id === compId);
                    if (comp && comp.type === 'led') {
                        comp.properties.state = 'on';
                    }
                });
            }
        }
    }

    findPath(startCompId, endCompId, visitedComponents, visitedConnections) {
        const queue = [{ compId: startCompId, pathComps: [startCompId], pathConns: [] }];
        visitedComponents.add(startCompId);

        while (queue.length > 0) {
            const { compId, pathComps, pathConns } = queue.shift();

            if (compId === endCompId) {
                pathComps.forEach(id => visitedComponents.add(id));
                pathConns.forEach(id => visitedConnections.add(id));
                return true;
            }

            const neighbors = this.getConnectedElements(compId);

            for (const { nextCompId, connectionId, component } of neighbors) {
                let canPass = true;
                if (component && component.type === 'switch' && component.properties.state !== 'closed') {
                    canPass = false;
                }

                if (canPass && !visitedComponents.has(nextCompId)) {
                    visitedComponents.add(nextCompId);
                    queue.push({
                        compId: nextCompId,
                        pathComps: [...pathComps, nextCompId],
                        pathConns: [...pathConns, connectionId]
                    });
                }
            }
        }

        return false;
    }

    getConnectedElements(compId) {
        const elements = [];
        this.connections.forEach(conn => {
            let neighborCompId = null;
            let sourceComp = null;

            if (conn.startCompId === compId) {
                neighborCompId = conn.endCompId;
                sourceComp = this.components.find(c => c.id === conn.startCompId);
            } else if (conn.endCompId === compId) {
                neighborCompId = conn.startCompId;
                sourceComp = this.components.find(c => c.id === conn.endCompId);
            }

            if (neighborCompId) {
                elements.push({ nextCompId: neighborCompId, connectionId: conn.id, component: sourceComp });
            }
        });

        return elements;
    }
}
