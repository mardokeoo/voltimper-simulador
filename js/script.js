document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    const circuitCanvas = document.getElementById('circuitCanvas');
    const circuitStage = document.getElementById('circuitStage');
    const connectionsSvg = document.getElementById('connections-svg');
    const componentsToolbar = document.getElementById('componentsToolbar');
    const componentPropertiesContent = document.getElementById('componentPropertiesContent');
    const simulateBtn = document.getElementById('simulateBtn');
    const resetSimulationBtn = document.getElementById('resetSimulationBtn');
    const simulationTime = document.getElementById('simulationTime');
    const simulationStatus = document.getElementById('simulationStatus');
    const newCircuitBtn = document.getElementById('newCircuitBtn');
    const newCircuitModal = document.getElementById('newCircuitModal');
    const newCircuitForm = document.getElementById('newCircuitForm');
    const circuitNameInput = document.getElementById('circuitNameInput');
    const circuitsList = document.getElementById('circuitsList');
    const deleteComponentBtn = document.getElementById('deleteComponentBtn');
    const notification = document.getElementById('notification');
    
    let currentCircuit = null;
    let components = [];
    let connections = [];
    let selectedComponent = null;
    let selectedTerminal = null;
    let tempWire = null;
    let isSimulating = false;
    let simulationStartTime = 0;
    let simulationInterval = null;
    let selectedTool = null;
    let circuits = [];
    let nextComponentId = 1;
    let nextConnectionId = 1;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    // Inicialización
    initEventListeners();
    loadSampleCircuits(); // Carga circuitos de ejemplo si es necesario
    // updateCircuitsList(); // Actualiza la lista de circuitos si tienes una

    // Funciones principales
    function initEventListeners() {
        // Barra de herramientas de componentes
        componentsToolbar.addEventListener('click', function(e) {
            if (e.target.closest('.component-btn')) {
                const btn = e.target.closest('.component-btn');
                selectedTool = btn.getAttribute('data-component');
                document.querySelectorAll('.component-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                showNotification('Herramienta seleccionada', `Componente: ${btn.querySelector('.component-label').textContent}`);
            }
        });

        // Lienzo del circuito
        circuitCanvas.addEventListener('click', function(e) {
            if (!selectedTool || e.target.closest('.component') || e.target.classList.contains('component-terminal')) return;
            
            const rect = circuitCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            addComponent(selectedTool, x, y);
            selectedTool = null;
            document.querySelectorAll('.component-btn').forEach(b => b.classList.remove('active'));
        });

        // Panel de propiedades
        deleteComponentBtn.addEventListener('click', deleteSelectedComponent);

        // Botones de simulación
        simulateBtn.addEventListener('click', startSimulation);
        resetSimulationBtn.addEventListener('click', resetSimulation);

        // Circuitos
        newCircuitBtn.addEventListener('click', () => showModal('newCircuitModal'));
        newCircuitForm.addEventListener('submit', createNewCircuit);

        // Modales
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', function() {
                hideModal(btn.getAttribute('data-close-modal'));
            });
        });

        // Eventos para arrastrar componentes
        circuitStage.addEventListener('mousedown', function(e) {
            if (e.target.closest('.component')) {
                startDrag(e);
            }
        });
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', endDrag);
    }

    // Funciones de componentes
    function addComponent(type, x, y) {
        const id = `comp-${nextComponentId++}`;
        const component = document.createElement('div');
        component.className = 'component';
        component.id = id;
        component.style.left = `${x}px`;
        component.style.top = `${y}px`;
        
        let properties = {};
        let visualContent = '';
        let terminals = [];

        switch(type) {
            case 'resistor':
                properties = { resistance: 100 }; // Valor por defecto
                visualContent = `
                    <div class="component-header">
                        <span class="component-name">Resistor</span>
                        <span class="component-value">${properties.resistance}Ω</span>
                    </div>
                    <div class="component-visual">
                        <svg viewBox="0 0 24 24">
                            <path d="M4 12 H 6 L 7 9 L 9 15 L 11 9 L 13 15 L 15 9 L 17 15 L 18 12 H 20"/>
                        </svg>
                    </div>
                `;
                terminals = [
                    { position: 'left', type: 'terminal' },
                    { position: 'right', type: 'terminal' }
                ];
                break;
            
            case 'capacitor':
                properties = { capacitance: 0.001 }; // 1mF
                visualContent = `
                    <div class="component-header">
                        <span class="component-name">Capacitor</span>
                        <span class="component-value">1mF</span>
                    </div>
                    <div class="component-visual">
                        <svg viewBox="0 0 24 24">
                            <path d="M4 12 H 10 M 14 12 H 20 M 10 6 V 18 M 14 6 V 18"/>
                        </svg>
                    </div>
                `;
                terminals = [
                    { position: 'left', type: 'terminal' },
                    { position: 'right', type: 'terminal' }
                ];
                break;
            
            case 'inductor':
                properties = { inductance: 0.1, resistance: 0, initialCurrent: 0 }; // 100mH
                visualContent = `
                    <div class="component-header">
                        <span class="component-name">Inductor</span>
                        <span class="component-value">100mH</span>
                    </div>
                    <div class="component-visual">
                        <svg viewBox="0 0 24 24">
                            <path d="M4 12 H 7 C 7 9 9 9 9 12 C 9 15 11 15 11 12 C 11 9 13 9 13 12 C 13 15 15 15 15 12 H 20"/>
                        </svg>
                    </div>
                `;
                terminals = [
                    { position: 'left', type: 'terminal' },
                    { position: 'right', type: 'terminal' }
                ];
                break;
            
            case 'led':
                properties = { forwardVoltage: 2, maxCurrent: 0.02, color: 'red' }; // 2V, 20mA
                visualContent = `
                    <div class="component-header">
                        <span class="component-name">LED</span>
                        <span class="component-value">2V</span>
                    </div>
                    <div class="component-visual">
                        <svg viewBox="0 0 24 24">
                            <path d="M4 12 H 8 L 12 7 L 16 12 H 20 M 12 7 V 17 M 9 17 H 15"/>
                            <line x1="17" y1="6" x2="19" y2="4" stroke-width="1.5"/>
                            <line x1="18" y1="8" x2="20" y2="6" stroke-width="1.5"/>
                        </svg>
                        <div class="led-visual"></div>
                    </div>
                `;
                terminals = [
                    { position: 'left', type: 'anode' },    // Terminal izquierdo como ánodo
                    { position: 'right', type: 'cathode' } // Terminal derecho como cátodo
                ];
                break;
            
            case 'switch':
                properties = { isClosed: false };
                visualContent = `
                    <div class="component-header">
                        <span class="component-name">Switch</span>
                        <span class="component-value">OFF</span>
                    </div>
                    <div class="component-visual">
                        <svg viewBox="0 0 24 24">
                            <path d="M4 12 H 8 M 16 12 H 20 M 8 12 L 16 8"/>
                            <circle cx="8" cy="12" r="2.5" fill="white"/>
                            <circle cx="16" cy="12" r="2.5" fill="white"/>
                        </svg>
                        <div class="switch-visual"></div>
                    </div>
                `;
                terminals = [
                    { position: 'left', type: 'terminal' },
                    { position: 'right', type: 'terminal' }
                ];
                break;
            
            case 'battery':
                properties = { voltage: 9 }; // 9V
                visualContent = `
                    <div class="component-header">
                        <span class="component-name">Batería</span>
                        <span class="component-value">9V</span>
                    </div>
                    <div class="component-visual">
                        <svg viewBox="0 0 24 24">
                            <path d="M4 12 H 8 M 16 12 H 20 M 8 8 V 16 M 12 10 V 14 M 16 8 V 16"/>
                            <text x="17" y="9" font-size="5" fill="currentColor">+</text>
                            <text x="17" y="17" font-size="5" fill="currentColor">-</text>
                        </svg>
                    </div>
                `;
                terminals = [
                    { position: 'left', type: 'negative' }, // Negativo a la izquierda
                    { position: 'right', type: 'positive' } // Positivo a la derecha
                ];
                break;
            
            case 'ac_source':
                properties = { 
                    amplitude: 5, 
                    frequency: 60, 
                    phase: 0, 
                    offset: 0, 
                    waveform: 'sine' 
                };
                visualContent = `
                    <div class="component-header">
                        <span class="component-name">Fuente AC</span>
                        <span class="component-value">5V~</span>
                    </div>
                    <div class="component-visual">
                        <svg viewBox="0 0 24 24">
                            <path d="M4 12 H 8 M 16 12 H 20 M 8 8 V 16 M 12 6 V 18 M 16 8 V 16"/>
                            <path d="M 8 12 C 10 8 14 16 16 12" stroke-width="1.5" fill="none"/>
                            <text x="17" y="9" font-size="5" fill="currentColor">~</text>
                            <text x="17" y="17" font-size="5" fill="currentColor">~</text>
                        </svg>
                        <div class="ac-source-waveform">
                            <div class="ac-source-waveform-preview"></div>
                        </div>
                    </div>
                `;
                terminals = [
                    { position: 'left', type: 'neutral' },
                    { position: 'right', type: 'hot' }
                ];
                break;
            
            case 'ground':
                properties = {};
                visualContent = `
                    <div class="component-header">
                        <span class="component-name">Tierra</span>
                    </div>
                    <div class="component-visual">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 4 V 12 M 8 12 H 16 M 9 15 H 15 M 10.5 18 H 13.5"/>
                        </svg>
                    </div>
                `;
                terminals = [
                    { position: 'top', type: 'terminal' }
                ];
                break;
        }

        component.innerHTML = visualContent;
        
        // Agregar terminales
        terminals.forEach(terminal => {
            const terminalEl = document.createElement('div');
            terminalEl.className = `component-terminal terminal-${terminal.position}`;
            terminalEl.dataset.position = terminal.position;
            terminalEl.dataset.type = terminal.type; // Asegúrate de que 'type' se almacena aquí
            component.appendChild(terminalEl);
            
            // Eventos para terminales
            terminalEl.addEventListener('mousedown', startConnection);
        });

        // Eventos para componentes
        component.addEventListener('click', function(e) {
            if (e.target.classList.contains('component-terminal')) return;
            selectComponent(component, type, properties);
            e.stopPropagation();
        });

        circuitStage.appendChild(component);
        
        const componentObj = {
            id,
            type,
            element: component,
            properties,
            terminals, // Guarda la info de los terminales incluyendo su tipo (anode/cathode)
            x,
            y
        };
        
        components.push(componentObj);
        selectComponent(component, type, properties);
        
        return componentObj;
    }

    function selectComponent(component, type, properties) {
        // Deseleccionar componente anterior
        if (selectedComponent) {
            selectedComponent.element.classList.remove('selected');
        }
        
        // Seleccionar nuevo componente
        component.classList.add('selected');
        selectedComponent = components.find(c => c.id === component.id);
        
        // Mostrar propiedades
        showComponentProperties(type, properties);
        deleteComponentBtn.style.display = 'block';
    }

    function showComponentProperties(type, properties) {
        let propertiesHTML = '';
        
        switch(type) {
            case 'resistor':
                // MODIFICACIÓN: Mostrar como texto, no como input
                propertiesHTML = `
                    <div class="property-group">
                        <div class="property-item">
                            <label class="property-label">Resistencia:</label>
                            <span class="property-value-display" style="padding: 5px; border: 1px solid #ccc; background-color: #f9f9f9; display: inline-block; min-width: 50px; text-align: right;">${properties.resistance}</span>
                            <span class="property-unit">Ω</span>
                        </div>
                    </div>
                `;
                break;
            
            case 'capacitor':
                propertiesHTML = `
                    <div class="property-group">
                        <div class="property-item">
                            <label class="property-label">Capacitancia:</label>
                            <input type="number" class="property-input" data-property="capacitance" value="${properties.capacitance}" min="0.000000001" step="0.000000001">
                            <span class="property-unit">F</span>
                        </div>
                    </div>
                `;
                break;
            
            case 'inductor':
                propertiesHTML = `
                    <div class="property-group">
                        <div class="property-item">
                            <label class="property-label">Inductancia:</label>
                            <input type="number" class="property-input" data-property="inductance" value="${properties.inductance}" min="0.000001" step="0.000001">
                            <span class="property-unit">H</span>
                        </div>
                    </div>
                `;
                break;
            
            case 'led':
                propertiesHTML = `
                    <div class="property-group">
                        <div class="property-item">
                            <label class="property-label">Voltaje directo:</label>
                            <input type="number" class="property-input" data-property="forwardVoltage" value="${properties.forwardVoltage}" min="1" max="5" step="0.1">
                            <span class="property-unit">V</span>
                        </div>
                    </div>
                `;
                break;
            
            case 'switch':
                propertiesHTML = `
                    <div class="property-group">
                        <div class="property-item">
                            <label class="property-label">Estado:</label>
                            <select class="property-input" data-property="isClosed">
                                <option value="false" ${!properties.isClosed ? 'selected' : ''}>Abierto</option>
                                <option value="true" ${properties.isClosed ? 'selected' : ''}>Cerrado</option>
                            </select>
                        </div>
                    </div>
                `;
                break;
            
             case 'battery':
                propertiesHTML = `
                    <div class="property-group">
                        <div class="property-item">
                            <label class="property-label">Voltaje:</label>
                            // MODIFICACIÓN: min="0" y max="10"
                            <input type="number" class="property-input" data-property="voltage" value="${properties.voltage}" min="0" max="10" step="0.1">
                            <span class="property-unit">V</span>
                        </div>
                    </div>
                `;
                break;
            
            case 'ac_source':
                propertiesHTML = `
                    <div class="property-group">
                        <div class="property-item">
                            <label class="property-label">Amplitud:</label>
                            <input type="number" class="property-input" data-property="amplitude" value="${properties.amplitude}" min="0.1" step="0.1">
                            <span class="property-unit">V</span>
                        </div>
                        <div class="property-item">
                            <label class="property-label">Frecuencia:</label>
                            <input type="number" class="property-input" data-property="frequency" value="${properties.frequency}" min="0.1" step="0.1">
                            <span class="property-unit">Hz</span>
                        </div>
                    </div>
                `;
                break;
            default:
                propertiesHTML = '<div class="no-properties">No hay propiedades para este componente.</div>';
                break;
        }
        
        componentPropertiesContent.innerHTML = propertiesHTML;
        
        // Actualizar propiedades cuando cambian los inputs
        // Se asegura de que solo los elementos .property-input tengan este listener
        document.querySelectorAll('.property-input').forEach(input => {
            input.addEventListener('change', function() {
                updateComponentProperties(selectedComponent, this);
            });
        });
    }

    function updateComponentProperties(component, input) {
        // const propertyName = input.previousElementSibling.textContent.replace(':', '').trim().toLowerCase(); // Esto podría ser frágil
        const propertyName = input.dataset.property; // Usar data-property es más robusto
        let propertyValue = input.value;

        if (!component || !propertyName) return; // Salir si no hay componente o nombre de propiedad

        switch(component.type) {
            // El caso 'resistor' ya no necesita estar aquí si su valor es fijo desde el panel.
            // Si el valor de resistencia se pudiera cambiar programáticamente de otra forma,
            // aún se necesitaría la lógica para actualizar .component-value
            case 'resistor': 
                // Como el input fue removido, esta parte no se llamará desde un 'change' event del panel.
                // Si necesitas actualizar el valor visual por otros medios:
                // component.element.querySelector('.component-value').textContent = `${component.properties.resistance}Ω`;
                break;
            
            case 'capacitor':
                if (propertyName === 'capacitance') {
                    component.properties.capacitance = parseFloat(propertyValue);
                    const value = propertyValue >= 0.001 ? `${parseFloat(propertyValue) * 1000}mF` : `${parseFloat(propertyValue) * 1000000}µF`;
                    component.element.querySelector('.component-value').textContent = value;
                }
                break;
            
            case 'inductor':
                if (propertyName === 'inductance') {
                    component.properties.inductance = parseFloat(propertyValue);
                    const value = propertyValue >= 1 ? `${propertyValue}H` : `${parseFloat(propertyValue) * 1000}mH`;
                    component.element.querySelector('.component-value').textContent = value;
                }
                break;
            
            case 'led':
                if (propertyName === 'forwardVoltage') {
                    component.properties.forwardVoltage = parseFloat(propertyValue);
                    component.element.querySelector('.component-value').textContent = `${propertyValue}V`;
                }
                break;
            
            case 'switch':
                if (propertyName === 'isClosed') {
                    component.properties.isClosed = propertyValue === 'true';
                    component.element.querySelector('.component-value').textContent = component.properties.isClosed ? 'ON' : 'OFF';
                    const switchVisual = component.element.querySelector('.switch-visual');
                    if (component.properties.isClosed) {
                        switchVisual.classList.add('on');
                    } else {
                        switchVisual.classList.remove('on');
                    }
                }
                break;
            
            case 'battery':
                if (propertyName === 'voltage') {
                    component.properties.voltage = parseFloat(propertyValue);
                    component.element.querySelector('.component-value').textContent = `${propertyValue}V`;
                }
                break;
            
            case 'ac_source':
                if (propertyName === 'amplitude') {
                    component.properties.amplitude = parseFloat(propertyValue);
                    component.element.querySelector('.component-value').textContent = `${propertyValue}V~`;
                } else if (propertyName === 'frequency') {
                    component.properties.frequency = parseFloat(propertyValue);
                }
                break;
        }
    }

    function deleteSelectedComponent() {
        if (!selectedComponent) return;
        
        // Eliminar conexiones asociadas
        connections = connections.filter(conn => {
            if (conn.fromComponent === selectedComponent.id || conn.toComponent === selectedComponent.id) {
                const wire = document.getElementById(conn.id);
                if (wire) wire.remove();
                return false;
            }
            return true;
        });
        
        // Eliminar componente
        const index = components.findIndex(c => c.id === selectedComponent.id);
        if (index !== -1) {
            components[index].element.remove();
            components.splice(index, 1);
        }
        
        // Limpiar selección
        selectedComponent = null;
        componentPropertiesContent.innerHTML = '<div class="no-component-selected">Selecciona un componente para ver/editar sus propiedades</div>';
        deleteComponentBtn.style.display = 'none';
    }

    // Funciones de conexiones
    function startConnection(e) {
        e.stopPropagation();
        
        const terminal = e.target;
        const componentEl = terminal.closest('.component');
        const componentData = components.find(c => c.id === componentEl.id); // Cambié nombre a componentData para evitar conflicto
        
        selectedTerminal = {
            componentId: componentData.id, // Guardamos ID del componente
            terminalElement: terminal,     // Guardamos el elemento del terminal
            terminalPosition: terminal.dataset.position, // Guardamos la posición (left, right, etc.)
            terminalType: terminal.dataset.type,         // Guardamos el tipo (anode, cathode, terminal)
            x: terminal.offsetLeft + terminal.offsetWidth / 2 + componentEl.offsetLeft,
            y: terminal.offsetTop + terminal.offsetHeight / 2 + componentEl.offsetTop
        };
        
        // Crear línea temporal
        tempWire = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tempWire.classList.add('temp-wire');
        tempWire.setAttribute('x1', selectedTerminal.x);
        tempWire.setAttribute('y1', selectedTerminal.y);
        tempWire.setAttribute('x2', selectedTerminal.x);
        tempWire.setAttribute('y2', selectedTerminal.y);
        connectionsSvg.appendChild(tempWire);
        
        // Cambiar cursor
        document.body.style.cursor = 'crosshair';
        circuitStage.style.cursor = 'crosshair';
        
        // Escuchar movimiento del ratón
        document.addEventListener('mousemove', drawTempWire);
        document.addEventListener('mouseup', finishConnection);
    }

    function drawTempWire(e) {
        if (!tempWire || !selectedTerminal) return;
        
        const rect = circuitCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        tempWire.setAttribute('x2', x);
        tempWire.setAttribute('y2', y);
    }

    function finishConnection(e) {
        if (!tempWire || !selectedTerminal) return;
        
        // Eliminar eventos temporales
        document.removeEventListener('mousemove', drawTempWire);
        document.removeEventListener('mouseup', finishConnection);
        
        // Restaurar cursor
        document.body.style.cursor = '';
        circuitStage.style.cursor = '';
        
        // Verificar si se soltó sobre otro terminal
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && target.classList.contains('component-terminal')) {
            const toTerminalElement = target;
            const toComponentEl = toTerminalElement.closest('.component');
            const toComponentData = components.find(c => c.id === toComponentEl.id);
            
            // No permitir conexión consigo mismo (mismo componente, diferente terminal está bien si se implementara)
            // Aquí la validación es simple: no conectar un componente a sí mismo.
            if (toComponentData.id !== selectedTerminal.componentId) {
                createConnection(selectedTerminal, { 
                    componentId: toComponentData.id, 
                    terminalElement: toTerminalElement,
                    terminalPosition: toTerminalElement.dataset.position,
                    terminalType: toTerminalElement.dataset.type,
                    x: toTerminalElement.offsetLeft + toTerminalElement.offsetWidth / 2 + toComponentEl.offsetLeft,
                    y: toTerminalElement.offsetTop + toTerminalElement.offsetHeight / 2 + toComponentEl.offsetTop
                });
            }
        }
        
        // Eliminar línea temporal
        if (tempWire) {
            tempWire.remove();
            tempWire = null;
        }
        
        selectedTerminal = null;
    }

    function createConnection(from, to) {
        const id = `conn-${nextConnectionId++}`;
        
        // Crear línea SVG
        const wire = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        wire.id = id;
        wire.classList.add('connection-wire');
        
        // Calcular puntos de control para una curva suave
        const midX = (from.x + to.x) / 2;
        // const midY = (from.y + to.y) / 2; // No usado en la d actual
        
        // Crear una curva Bézier
        const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
        wire.setAttribute('d', d);
        
        connectionsSvg.appendChild(wire);
        
        // Agregar a la lista de conexiones
        connections.push({
            id,
            fromComponent: from.componentId,
            fromTerminal: from.terminalPosition, // Usar la posición del terminal
            toComponent: to.componentId,
            toTerminal: to.terminalPosition,   // Usar la posición del terminal
            element: wire
        });
        
        // Marcar terminales como conectados
        from.terminalElement.classList.add('connected');
        to.terminalElement.classList.add('connected');
    }

    // Funciones de simulación
    function startSimulation() {
        if (isSimulating) return;
        
        isSimulating = true;
        simulationStartTime = Date.now();
        simulationStatus.textContent = 'Estado: Simulando';
        simulateBtn.disabled = true;
        resetSimulationBtn.disabled = false;
        
        // Marcar componentes como en simulación
        components.forEach(comp => {
            comp.element.classList.add('simulating');
        });
        
        // Actualizar tiempo de simulación
        simulationInterval = setInterval(updateSimulationTime, 100);
        
        // Mostrar notificación
        showNotification('Simulación iniciada', 'El circuito está siendo simulado', 'success');
    }

    function resetSimulation() {
        if (!isSimulating) return;
        
        isSimulating = false;
        clearInterval(simulationInterval);
        simulationStatus.textContent = 'Estado: Detenido';
        simulateBtn.disabled = false;
        resetSimulationBtn.disabled = true;
        simulationTime.textContent = '0.00s';
        
        // Quitar marcas de simulación
        components.forEach(comp => {
            comp.element.classList.remove('simulating');
            // Resetear estado visual de LEDs
            if (comp.type === 'led') {
                const ledVisual = comp.element.querySelector('.led-visual');
                if (ledVisual) {
                    ledVisual.classList.remove('on');
                    ledVisual.style.opacity = 1; // O el valor por defecto
                }
            }
        });
        
        // Quitar marcas de conexiones activas
        document.querySelectorAll('.connection-wire').forEach(wire => {
            wire.classList.remove('active');
        });
        
        // Mostrar notificación
        showNotification('Simulación detenida', 'La simulación ha sido reiniciada', 'error');
    }

    function updateSimulationTime() {
        const elapsed = (Date.now() - simulationStartTime) / 1000;
        simulationTime.textContent = elapsed.toFixed(2) + 's';
        
        // Simular comportamiento de componentes
        simulateComponents(elapsed);
    }

    function simulateComponents(time) {
        // Simular fuente AC
        components.filter(c => c.type === 'ac_source').forEach(source => {
            const omega = 2 * Math.PI * source.properties.frequency;
            const angle = omega * time + (source.properties.phase * Math.PI / 180);
            let voltage = source.properties.amplitude * Math.sin(angle);
            voltage += source.properties.offset;
            
            // Actualizar visualización de la forma de onda
            const waveformPreview = source.element.querySelector('.ac-source-waveform-preview');
            if (waveformPreview) {
                const yPos = 10 - (voltage / source.properties.amplitude) * 8;
                waveformPreview.style.background = `
                    radial-gradient(circle at ${(time * 20) % 100}% ${yPos}px, 
                    var(--ac-source-color) 2px, transparent 3px)
                `;
            }
        });
        
        // MODIFICACIÓN: Simular LEDs solo si están conectados
        components.filter(c => c.type === 'led').forEach(ledComponent => {
            const ledVisual = ledComponent.element.querySelector('.led-visual');
            if (ledVisual) {
                // Necesitamos saber las posiciones de los terminales del LED (e.g., 'left' para ánodo, 'right' para cátodo)
                // Esta información debe estar en ledComponent.terminals
                const anodeTerminalInfo = ledComponent.terminals.find(t => t.type === 'anode');
                const cathodeTerminalInfo = ledComponent.terminals.find(t => t.type === 'cathode');

                if (!anodeTerminalInfo || !cathodeTerminalInfo) {
                    // Si no se definieron correctamente los terminales del LED
                    ledVisual.classList.remove('on');
                    ledVisual.style.opacity = 1; // Apagado
                    return; 
                }

                const isAnodeConnected = connections.some(conn =>
                    (conn.fromComponent === ledComponent.id && conn.fromTerminal === anodeTerminalInfo.position) ||
                    (conn.toComponent === ledComponent.id && conn.toTerminal === anodeTerminalInfo.position)
                );
                const isCathodeConnected = connections.some(conn =>
                    (conn.fromComponent === ledComponent.id && conn.fromTerminal === cathodeTerminalInfo.position) ||
                    (conn.toComponent === ledComponent.id && conn.toTerminal === cathodeTerminalInfo.position)
                );

                if (isAnodeConnected && isCathodeConnected) { 
                    // Lógica de encendido (aún simplificada, sin cálculo de corriente/voltaje real)
                    ledVisual.classList.add('on');
                    const randomBrightness = 0.3 + Math.random() * 0.7; 
                    ledVisual.style.opacity = randomBrightness;
                } else {
                    ledVisual.classList.remove('on');
                    ledVisual.style.opacity = 1; // O un valor por defecto para apagado
                }
            }
        });
        
        // Simular conexiones activas (esto es solo visual, no afecta la lógica del circuito)
        connections.forEach(conn => {
            // Ejemplo de animación simple para el cable
            if (isSimulating) { // Solo animar si la simulación está activa
                 // Esta animación de parpadeo puede ser muy básica o mejorada
                conn.element.classList.toggle('active', Math.floor(time * 2) % 2 === 0);
            } else {
                conn.element.classList.remove('active');
            }
        });
    }

    // Funciones de circuitos (Ejemplo, puedes expandir esto)
    function loadSampleCircuits() {
        circuits = [
            {
                id: 'circuit-1',
                name: 'Circuito RC Básico (Ejemplo)',
                description: 'Circuito de carga/descarga de capacitor',
                components: [ /* ... datos de componentes ... */ ],
                connections: [ /* ... datos de conexiones ... */ ]
            }
            // Puedes añadir más circuitos de ejemplo aquí
        ];
        // Por ahora, no carga automáticamente ningún circuito en el canvas
        // updateCircuitsList(); // Si tienes una lista visible para el usuario
    }
    
    function updateCircuitsList() {
        circuitsList.innerHTML = ''; // Limpiar lista actual
        if (circuits.length === 0) {
            circuitsList.innerHTML = '<li>No hay circuitos guardados.</li>';
            return;
        }
        circuits.forEach(circuit => {
            const listItem = document.createElement('li');
            listItem.textContent = circuit.name;
            listItem.dataset.circuitId = circuit.id;
            listItem.addEventListener('click', () => loadCircuit(circuit.id));
            circuitsList.appendChild(listItem);
        });
    }

    function createNewCircuit(event) {
        event.preventDefault();
        const circuitName = circuitNameInput.value.trim();
        if (!circuitName) {
            showNotification('Error', 'El nombre del circuito no puede estar vacío.', 'error');
            return;
        }
        
        const newCircuitId = `circuit-${Date.now()}`; // ID simple
        currentCircuit = {
            id: newCircuitId,
            name: circuitName,
            description: '', // Podrías añadir un campo para esto
            components: [],
            connections: []
        };
        circuits.push(currentCircuit);
        
        clearCanvas(); // Limpiar el canvas para el nuevo circuito
        updateCircuitsList();
        hideModal('newCircuitModal');
        newCircuitForm.reset();
        showNotification('Éxito', `Nuevo circuito "${circuitName}" creado.`, 'success');
        // Aquí podrías seleccionar este nuevo circuito como el activo en la UI
    }

    function loadCircuit(circuitId) {
        const circuitToLoad = circuits.find(c => c.id === circuitId);
        if (!circuitToLoad) {
            showNotification('Error', 'No se pudo cargar el circuito.', 'error');
            return;
        }
        clearCanvas();
        currentCircuit = circuitToLoad;
        nextComponentId = 1; // Resetear IDs para componentes del circuito cargado
        nextConnectionId = 1;

        // Cargar componentes
        circuitToLoad.components.forEach(compData => {
            const addedComp = addComponent(compData.type, compData.x, compData.y);
            // Sobrescribir propiedades si vienen del circuito guardado
            if (compData.properties) {
                Object.assign(addedComp.properties, compData.properties);
                // Actualizar el valor visual del componente si es necesario
                updateComponentVisualValue(addedComp);
            }
        });

        // Cargar conexiones (esto es más complejo si los IDs de componentes no coinciden)
        // Para este ejemplo, asumimos que los IDs se regenerarán secuencialmente
        // y que las conexiones en `circuitToLoad.connections` se refieren a los índices o IDs temporales.
        // Una forma más robusta sería guardar IDs únicos y persistentes.
        
        // Simplificación: reconstruir conexiones basadas en los componentes recién añadidos
        // Esto requiere que `circuitToLoad.connections` use referencias que puedan mapearse
        // a los nuevos `comp-X` IDs. Por ejemplo, si guardas el índice del array de componentes.
        // Ejemplo: { fromComponentIndex: 0, fromTerminal: 'right', toComponentIndex: 1, toTerminal: 'left' }

        // O si los IDs `comp-X` son consistentes (requiere manejar `nextComponentId` cuidadosamente al guardar/cargar)
        circuitToLoad.connections.forEach(connData => {
            const fromComp = components.find(c => c.id === connData.fromComponent);
            const toComp = components.find(c => c.id === connData.toComponent);

            if (fromComp && toComp) {
                const fromTerminalEl = fromComp.element.querySelector(`.component-terminal[data-position="${connData.fromTerminal}"]`);
                const toTerminalEl = toComp.element.querySelector(`.component-terminal[data-position="${connData.toTerminal}"]`);

                if (fromTerminalEl && toTerminalEl) {
                     const fromTerminalData = {
                        componentId: fromComp.id,
                        terminalElement: fromTerminalEl,
                        terminalPosition: connData.fromTerminal,
                        terminalType: fromTerminalEl.dataset.type,
                        x: fromTerminalEl.offsetLeft + fromTerminalEl.offsetWidth / 2 + fromComp.element.offsetLeft,
                        y: fromTerminalEl.offsetTop + fromTerminalEl.offsetHeight / 2 + fromComp.element.offsetTop
                    };
                    const toTerminalData = {
                        componentId: toComp.id,
                        terminalElement: toTerminalEl,
                        terminalPosition: connData.toTerminal,
                        terminalType: toTerminalEl.dataset.type,
                        x: toTerminalEl.offsetLeft + toTerminalEl.offsetWidth / 2 + toComp.element.offsetLeft,
                        y: toTerminalEl.offsetTop + toTerminalEl.offsetHeight / 2 + toComp.element.offsetTop
                    };
                    createConnection(fromTerminalData, toTerminalData);
                }
            }
        });


        showNotification('Información', `Circuito "${circuitToLoad.name}" cargado.`, 'info');
        // Actualizar la UI si es necesario (nombre del circuito, etc.)
    }
    
    function updateComponentVisualValue(component) {
        const valueEl = component.element.querySelector('.component-value');
        if (!valueEl) return;

        switch(component.type) {
            case 'resistor':
                valueEl.textContent = `${component.properties.resistance}Ω`;
                break;
            case 'capacitor':
                const capValue = component.properties.capacitance;
                valueEl.textContent = capValue >= 0.001 ? `${parseFloat(capValue) * 1000}mF` : `${parseFloat(capValue) * 1000000}µF`;
                break;
            case 'inductor':
                const indValue = component.properties.inductance;
                valueEl.textContent = indValue >= 1 ? `${indValue}H` : `${parseFloat(indValue) * 1000}mH`;
                break;
            case 'led':
                valueEl.textContent = `${component.properties.forwardVoltage}V`;
                break;
            case 'battery':
                valueEl.textContent = `${component.properties.voltage}V`;
                break;
            case 'ac_source':
                valueEl.textContent = `${component.properties.amplitude}V~`;
                break;
            case 'switch':
                valueEl.textContent = component.properties.isClosed ? 'ON' : 'OFF';
                break;
        }
    }


    function clearCanvas() {
        components.forEach(comp => comp.element.remove());
        connections.forEach(conn => conn.element.remove());
        components = [];
        connections = [];
        selectedComponent = null;
        nextComponentId = 1;
        nextConnectionId = 1;
        componentPropertiesContent.innerHTML = '<div class="no-component-selected">Selecciona un componente para ver/editar sus propiedades</div>';
        deleteComponentBtn.style.display = 'none';
        resetSimulation(); // También resetea el estado de simulación
    }


    // Funciones auxiliares (Modales, Notificaciones, Dragging)
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'flex';
    }

    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }

    function showNotification(title, message, type = 'info') { // type: info, success, error
        notification.innerHTML = `<strong>${title}:</strong> ${message}`;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
    
    function startDrag(e) {
        if (!selectedComponent || !e.target.closest('.component') || e.target.classList.contains('component-terminal')) return;
        
        // Asegurarse de que el componente clickeado es el seleccionado para arrastrar
        const targetComponentElement = e.target.closest('.component');
        if (selectedComponent.element !== targetComponentElement) {
             // Si se hace clic en un componente diferente al seleccionado, selecciónalo primero
            const componentData = components.find(c => c.element === targetComponentElement);
            if (componentData) {
                selectComponent(targetComponentElement, componentData.type, componentData.properties);
            } else {
                return; // No se encontró el componente, no arrastrar
            }
        }

        isDragging = true;
        selectedComponent.element.classList.add('dragging');
        // Coordenadas relativas al componente, no al canvas, para evitar saltos
        dragStartX = e.clientX - selectedComponent.element.offsetLeft;
        dragStartY = e.clientY - selectedComponent.element.offsetTop;
        circuitStage.style.cursor = 'grabbing';
    }

    function handleDrag(e) {
        if (!isDragging || !selectedComponent) return;
        e.preventDefault(); // Prevenir selección de texto u otros comportamientos por defecto

        const rect = circuitCanvas.getBoundingClientRect(); // Obtener límites del canvas para calcular pos. relativa
        
        // Nueva posición X, Y calculada restando el offset inicial del drag y la posición del canvas
        let newX = e.clientX - dragStartX - rect.left;
        let newY = e.clientY - dragStartY - rect.top;

        // Asegurarse de que el componente no se salga del circuitStage (o canvas)
        // Las dimensiones del componente también deben ser consideradas para los límites derecho e inferior
        const compWidth = selectedComponent.element.offsetWidth;
        const compHeight = selectedComponent.element.offsetHeight;

        newX = Math.max(0, Math.min(newX, circuitStage.offsetWidth - compWidth));
        newY = Math.max(0, Math.min(newY, circuitStage.offsetHeight - compHeight));

        selectedComponent.element.style.left = `${newX}px`;
        selectedComponent.element.style.top = `${newY}px`;
        selectedComponent.x = newX;
        selectedComponent.y = newY;
        updateConnectionsForComponent(selectedComponent.id);
    }

    function endDrag(e) {
        if (!isDragging || !selectedComponent) return;
        isDragging = false;
        selectedComponent.element.classList.remove('dragging');
        circuitStage.style.cursor = ''; // Restaurar cursor
        // selectedComponent = null; // No deseleccionar al terminar de arrastrar
    }

    function updateConnectionsForComponent(componentId) {
        connections.forEach(conn => {
            let needsUpdate = false;
            let newX1, newY1, newX2, newY2;

            const fromComp = components.find(c => c.id === conn.fromComponent);
            const toComp = components.find(c => c.id === conn.toComponent);

            if (!fromComp || !toComp) return; // Si algún componente de la conexión no existe

            const fromTerminalEl = fromComp.element.querySelector(`.component-terminal[data-position="${conn.fromTerminal}"]`);
            const toTerminalEl = toComp.element.querySelector(`.component-terminal[data-position="${conn.toTerminal}"]`);

            if (!fromTerminalEl || !toTerminalEl) return;

            newX1 = fromTerminalEl.offsetLeft + fromTerminalEl.offsetWidth / 2 + fromComp.element.offsetLeft;
            newY1 = fromTerminalEl.offsetTop + fromTerminalEl.offsetHeight / 2 + fromComp.element.offsetTop;
            newX2 = toTerminalEl.offsetLeft + toTerminalEl.offsetWidth / 2 + toComp.element.offsetLeft;
            newY2 = toTerminalEl.offsetTop + toTerminalEl.offsetHeight / 2 + toComp.element.offsetTop;
            
            if (conn.fromComponent === componentId || conn.toComponent === componentId) {
                needsUpdate = true;
            }

            if (needsUpdate) {
                const midX = (newX1 + newX2) / 2;
                const d = `M ${newX1} ${newY1} C ${midX} ${newY1}, ${midX} ${newY2}, ${newX2} ${newY2}`;
                conn.element.setAttribute('d', d);
            }
        });
    }

    // Carga inicial
    // Puedes llamar a updateCircuitsList aquí si quieres que se muestre la lista al cargar la página
    updateCircuitsList(); 
    if (circuits.length > 0 && !currentCircuit) {
        // Opcionalmente, cargar el primer circuito de la lista por defecto
        // loadCircuit(circuits[0].id); 
    } else if (!currentCircuit) {
        // Si no hay circuitos, quizá crear uno vacío por defecto
        // createNewCircuit({ preventDefault: () => {} }); // Simula un evento
        // circuitNameInput.value = "Circuito por Defecto";
        // document.querySelector('#newCircuitForm button[type="submit"]').click();
        // O simplemente dejar el canvas vacío.
    }


});