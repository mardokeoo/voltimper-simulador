class Notifications {
    constructor(containerEl, titleEl, messageEl) {
        this.containerEl = containerEl;  // Elemento contenedor de la notificación
        this.titleEl = titleEl;          // Elemento donde se escribe el título
        this.messageEl = messageEl;      // Elemento donde se escribe el mensaje
        this._timeoutId = null;          // ID del timeout para ocultar
    }

    show(title, message, type = 'info', duration = 3000) {
        // Limpiar timeout anterior si existe
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
        }

        this.titleEl.textContent = title;
        this.messageEl.textContent = message;

        // Resetear y aplicar clase según el tipo (info, success, warning, error)
        this.containerEl.className = 'notification';
        this.containerEl.classList.add(type);
        this.containerEl.classList.add('show');

        // Ocultar automáticamente después del tiempo indicado
        this._timeoutId = setTimeout(() => {
            this.containerEl.classList.remove('show');
            this._timeoutId = null;
        }, duration);
    }

    hide() {
        this.containerEl.classList.remove('show');
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
    }
}
