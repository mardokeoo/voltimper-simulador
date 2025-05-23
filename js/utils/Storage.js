class Storage {
    static save(key, data) {
        try {
            const jsonData = JSON.stringify(data);
            localStorage.setItem(key, jsonData);
        } catch (e) {
            console.error(`Error al guardar en localStorage con clave "${key}":`, e);
            alert("No se pudo guardar el circuito. Verifica el espacio disponible.");
        }
    }

    static load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`Error al cargar desde localStorage con clave "${key}":`, e);
            alert("Los datos almacenados están corruptos o mal formateados.");
            return null;
        }
    }

    static remove(key) {
        localStorage.removeItem(key);
    }

    static exists(key) {
        return localStorage.getItem(key) !== null;
    }

    static clearAll() {
        localStorage.clear();
    }
}
