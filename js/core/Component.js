class Component {
    constructor(type, node1, node2, value) {
        this.type = type;      // Tipo del componente ('resistor', 'voltage_source', etc.)
        this.node1 = node1;    // Nodo de conexión 1
        this.node2 = node2;    // Nodo de conexión 2
        this.value = value;    // Valor numérico (Ohmios, Voltios, etc.)
    }
}
