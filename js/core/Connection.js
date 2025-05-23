class Connection {
    constructor(id, startCompId, startTermId, endCompId, endTermId) {
        this.id = id;                     // ID único de la conexión
        this.startCompId = startCompId;   // ID del componente de inicio
        this.startTermId = startTermId;   // ID del terminal de inicio
        this.endCompId = endCompId;       // ID del componente final
        this.endTermId = endTermId;       // ID del terminal final
        this.active = false;              // Estado visual durante la simulación
    }
}
