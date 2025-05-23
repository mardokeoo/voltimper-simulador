class PropertiesPanel {
    constructor(titleEl, contentEl, deleteBtnEl) {
        this.titleEl = titleEl;             // Elemento donde aparece el título del panel
        this.contentEl = contentEl;         // Contenedor de los inputs de propiedades
        this.deleteBtnEl = deleteBtnEl;     // Botón de eliminar componente
        this.currentComponent = null;       // Componente actualmente mostrado
        this.onPropertyChange = null;       // Función callback para manejar cambios
    }

    render(component) {
        this.currentComponent = component;

        if (!component) {
            this.titleEl.querySelector('span').textContent = 'Propiedades';
            this.contentEl.innerHTML = `<div class="no-component-selected">Selecciona un componente para ver/editar sus propiedades</div>`;
            this.deleteBtnEl.style.display = 'none';
            return;
        }

        this.titleEl.querySelector('span').textContent = `Propiedades (${component.type} - ${component.id.slice(0, 8)})`;
        this.deleteBtnEl.style.display = 'inline-block';

        let html = '<div class="property-group">';

        if (component.properties.value !== undefined) {
            html += `
                <div class="property-item">
                    <label class="property-label">Valor:</label>
                    <input class="property-input" type="number" step="any" data-property="value" value="${component.properties.value}">
                    ${component.properties.unit ? `<span class="property-unit">${component.properties.unit}</span>` : ''}
                </div>`;
        }

        if (component.type === 'led' && component.properties.forwardVoltage !== undefined) {
            html += `
                <div class="property-item">
                    <label class="property-label">Voltaje (Fwd):</label>
                    <input class="property-input" type="number" step="0.1" data-property="forwardVoltage" value="${component.properties.forwardVoltage}">
                    <span class="property-unit">V</span>
                </div>`;
        }

        if (component.properties.state !== undefined) {
            html += `
                <div class="property-item">
                    <label class="property-label">Estado:</label>
                    <span style="font-weight:500;">${component.properties.state}</span>
                    ${component.type === 'switch' ? '<span style="font-size:0.8em; color:#888;"> (Clic para cambiar)</span>' : ''}
                </div>`;
        }

        html += '</div>';
        this.contentEl.innerHTML = html;

        this.contentEl.querySelectorAll('.property-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const prop = e.target.dataset.property;
                let newValue = e.target.value;
                if (!isNaN(parseFloat(newValue))) {
                    newValue = parseFloat(newValue);
                    if (isNaN(newValue)) {
                        alert("Valor inválido");
                        e.target.value = component.properties[prop];
                        return;
                    }
                }
                if (this.onPropertyChange) {
                    this.onPropertyChange(component.id, prop, newValue);
                }
            });
        });
    }

    setPropertyChangeCallback(callback) {
        this.onPropertyChange = callback;
    }

    hide() {
        this.render(null);
    }
}
