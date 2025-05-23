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
    loadSampleCircuits();
    updateCircuitsList();

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

        // Circuitos - Mejorado el diseño de las pestañas
        newCircuitBtn.addEventListener('click', () => {
            showModal('newCircuitModal');
            // Mejora visual para el modal
            const modalContent = newCircuitModal.querySelector('.modal-content');
            modalContent.style.borderRadius = '10px';
            modalContent.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
            modalContent.style.overflow = 'hidden';
            
            // Mejor diseño para el formulario
            newCircuitForm.style.padding = '20px';
            newCircuitForm.style.backgroundColor = '#f9f9f9';
            
            // Mejor diseño para los inputs
            circuitNameInput.style.padding = '10px';
            circuitNameInput.style.borderRadius = '5px';
            circuitNameInput.style.border = '1px solid #ddd';
            circuitNameInput.style.width = '100%';
            circuitNameInput.style.marginBottom = '15px';
            
            // Mejor diseño para los botones
            const formButtons = newCircuitForm.querySelectorAll('button');
            formButtons.forEach(btn => {
                btn.style.padding = '10px 15px';
                btn.style.borderRadius = '5px';
                btn.style.border = 'none';
                btn.style.cursor = 'pointer';
                btn.style.marginRight = '10px';
                btn.style.transition = 'all 0.3s';
                
                if (btn.type === 'submit') {
                    btn.style.backgroundColor = '#4CAF50';
                    btn.style.color = 'white';
                } else {
                    btn.style.backgroundColor = '#f44336';
                    btn.style.color = 'white';
                }
                
                btn.addEventListener('mouseover', () => {
                    btn.style.opacity = '0.8';
                    btn.style.transform = 'translateY(-2px)';
                });
                
                btn.addEventListener('mouseout', () => {
                    btn.style.opacity = '1';
                    btn.style.transform = 'translateY(0)';
                });
            });
        });
        
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
                        <div class="property-item">
                            <label class="property-label">Color:</label>
                            <select class="property-input" data-property="color">
                                <option value="red" ${properties.color === 'red' ? 'selected' : ''}>Rojo</option>
                                <option value="green" ${properties.color === 'green' ? 'selected' : ''}>Verde</option>
                                <option value="blue" ${properties.color === 'blue' ? 'selected' : ''}>Azul</option>
                                <option value="yellow" ${properties.color === 'yellow' ? 'selected' : ''}>Amarillo</option>
                            </select>
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
                            <input type="number" class="property-input" data-property="voltage" value="${properties.voltage}" min="1" max="10" step="1">
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
        document.querySelectorAll('.property-input').forEach(input => {
            input.addEventListener('change', function() {
                updateComponentProperties(selectedComponent, this);
            });
        });
    }

    function updateComponentProperties(component, input) {
        const propertyName = input.dataset.property;
        let propertyValue = input.value;

        if (!component || !propertyName) return;

        switch(component.type) {
            case 'resistor': 
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
                } else if (propertyName === 'color') {
                    component.properties.color = propertyValue;
                    const ledVisual = component.element.querySelector('.led-visual');
                    if (ledVisual) {
                        ledVisual.style.backgroundColor = propertyValue;
                    }
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
        const componentData = components.find(c => c.id === componentEl.id);
        
        selectedTerminal = {
            componentId: componentData.id,
            terminalElement: terminal,
            terminalPosition: terminal.dataset.position,
            terminalType: terminal.dataset.type,
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
        const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
        wire.setAttribute('d', d);
        
        connectionsSvg.appendChild(wire);
        
        // Agregar a la lista de conexiones
        connections.push({
            id,
            fromComponent: from.componentId,
            fromTerminal: from.terminalPosition,
            toComponent: to.componentId,
            toTerminal: to.terminalPosition,
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
                    ledVisual.style.opacity = 0.3;
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
        
        // Simulación mejorada para LED
        components.filter(c => c.type === 'led').forEach(ledComponent => {
            const ledVisual = ledComponent.element.querySelector('.led-visual');
            if (ledVisual) {
                // Obtener información de los terminales del LED
                const anodeTerminalInfo = ledComponent.terminals.find(t => t.type === 'anode');
                const cathodeTerminalInfo = ledComponent.terminals.find(t => t.type === 'cathode');

                if (!anodeTerminalInfo || !cathodeTerminalInfo) {
                    ledVisual.classList.remove('on');
                    ledVisual.style.opacity = 0.3;
                    return;
                }

                // Verificar si ambos terminales están conectados
                const isAnodeConnected = connections.some(conn =>
                    (conn.fromComponent === ledComponent.id && conn.fromTerminal === anodeTerminalInfo.position) ||
                    (conn.toComponent === ledComponent.id && conn.toTerminal === anodeTerminalInfo.position)
                );
                
                const isCathodeConnected = connections.some(conn =>
                    (conn.fromComponent === ledComponent.id && conn.fromTerminal === cathodeTerminalInfo.position) ||
                    (conn.toComponent === ledComponent.id && conn.toTerminal === cathodeTerminalInfo.position)
                );

                // Verificar si hay una batería conectada y el estado del switch
                let hasPower = false;
                let switchClosed = false;
                
                if (isAnodeConnected && isCathodeConnected) {
                    // Buscar si hay una batería conectada correctamente
                    const battery = components.find(c => c.type === 'battery');
                    if (battery) {
                        const batteryPositiveTerminal = battery.terminals.find(t => t.type === 'positive');
                        const batteryNegativeTerminal = battery.terminals.find(t => t.type === 'negative');
                        
                        // Verificar conexión correcta de la batería al LED
                        const batteryConnectedCorrectly = connections.some(conn => {
                            // Batería positiva conectada al ánodo del LED
                            const positiveToAnode = 
                                (conn.fromComponent === battery.id && conn.fromTerminal === batteryPositiveTerminal.position &&
                                 conn.toComponent === ledComponent.id && conn.toTerminal === anodeTerminalInfo.position) ||
                                (conn.toComponent === battery.id && conn.toTerminal === batteryPositiveTerminal.position &&
                                 conn.fromComponent === ledComponent.id && conn.fromTerminal === anodeTerminalInfo.position);
                            
                            // Batería negativa conectada al cátodo del LED
                            const negativeToCathode = 
                                (conn.fromComponent === battery.id && conn.fromTerminal === batteryNegativeTerminal.position &&
                                 conn.toComponent === ledComponent.id && conn.toTerminal === cathodeTerminalInfo.position) ||
                                (conn.toComponent === battery.id && conn.toTerminal === batteryNegativeTerminal.position &&
                                 conn.fromComponent === ledComponent.id && conn.fromTerminal === cathodeTerminalInfo.position);
                            
                            return positiveToAnode && negativeToCathode;
                        });
                        
                        // Verificar estado de los switches en el circuito
                        const switches = components.filter(c => c.type === 'switch');
                        if (switches.length > 0) {
                            // Asumimos que el LED solo se enciende si TODOS los switches están abiertos
                            switchClosed = switches.some(sw => sw.properties.isClosed);
                        }
                        
                        hasPower = batteryConnectedCorrectly && !switchClosed;
                    }
                }

                // Actualizar estado visual del LED
                if (hasPower) {
                    ledVisual.classList.add('on');
                    const randomBrightness = 0.7 + Math.random() * 0.3;
                    ledVisual.style.opacity = randomBrightness;
                    ledVisual.style.backgroundColor = ledComponent.properties.color || 'red';
                } else {
                    ledVisual.classList.remove('on');
                    ledVisual.style.opacity = 0.3;
                }
            }
        });
        
        // Simular switches
        components.filter(c => c.type === 'switch').forEach(switchComponent => {
            const switchVisual = switchComponent.element.querySelector('.switch-visual');
            if (switchVisual) {
                if (switchComponent.properties.isClosed) {
                    switchVisual.classList.add('on');
                } else {
                    switchVisual.classList.remove('on');
                }
            }
        });
        
        // Simular conexiones activas
        connections.forEach(conn => {
            if (isSimulating) {
                conn.element.classList.toggle('active', Math.floor(time * 2) % 2 === 0);
            } else {
                conn.element.classList.remove('active');
            }
        });
    }

    // Funciones de circuitos
    function loadSampleCircuits() {
        circuits = [
            {
                id: 'circuit-1',
                name: 'Circuito LED Básico',
                description: 'Circuito simple con batería, switch y LED',
                components: [],
                connections: []
            },
            {
                id: 'circuit-2',
                name: 'Circuito RC Básico',
                description: 'Circuito de carga/descarga de capacitor',
                components: [],
                connections: []
            }
        ];
    }
    
    function updateCircuitsList() {
        circuitsList.innerHTML = '';
        if (circuits.length === 0) {
            circuitsList.innerHTML = '<li class="no-circuits">No hay circuitos guardados.</li>';
            return;
        }
        
        // Mejor diseño para la lista de circuitos
        circuitsList.style.listStyle = 'none';
        circuitsList.style.padding = '0';
        circuitsList.style.margin = '0';
        
        circuits.forEach(circuit => {
            const listItem = document.createElement('li');
            listItem.textContent = circuit.name;
            listItem.dataset.circuitId = circuit.id;
            
            // Estilos para los items de la lista
            listItem.style.padding = '10px 15px';
            listItem.style.marginBottom = '5px';
            listItem.style.backgroundColor = '#f5f5f5';
            listItem.style.borderRadius = '5px';
            listItem.style.cursor = 'pointer';
            listItem.style.transition = 'all 0.2s';
            
            // Efecto hover
            listItem.addEventListener('mouseover', () => {
                listItem.style.backgroundColor = '#e0e0e0';
                listItem.style.transform = 'translateX(5px)';
            });
            
            listItem.addEventListener('mouseout', () => {
                listItem.style.backgroundColor = '#f5f5f5';
                listItem.style.transform = 'translateX(0)';
            });
            
            listItem.addEventListener('click', () => {
                // Resaltar el circuito seleccionado
                document.querySelectorAll('#circuitsList li').forEach(item => {
                    item.style.backgroundColor = '#f5f5f5';
                    item.style.fontWeight = 'normal';
                });
                listItem.style.backgroundColor = '#e0e0e0';
                listItem.style.fontWeight = 'bold';
                
                loadCircuit(circuit.id);
            });
            
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
        
        const newCircuitId = `circuit-${Date.now()}`;
        currentCircuit = {
            id: newCircuitId,
            name: circuitName,
            description: '',
            components: [],
            connections: []
        };
        circuits.push(currentCircuit);
        
        clearCanvas();
        updateCircuitsList();
        hideModal('newCircuitModal');
        newCircuitForm.reset();
        showNotification('Éxito', `Nuevo circuito "${circuitName}" creado.`, 'success');
    }

    function loadCircuit(circuitId) {
        const circuitToLoad = circuits.find(c => c.id === circuitId);
        if (!circuitToLoad) {
            showNotification('Error', 'No se pudo cargar el circuito.', 'error');
            return;
        }
        clearCanvas();
        currentCircuit = circuitToLoad;
        nextComponentId = 1;
        nextConnectionId = 1;

        // Cargar componentes
        circuitToLoad.components.forEach(compData => {
            const addedComp = addComponent(compData.type, compData.x, compData.y);
            if (compData.properties) {
                Object.assign(addedComp.properties, compData.properties);
                updateComponentVisualValue(addedComp);
            }
        });

        // Cargar conexiones
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
                const ledVisual = component.element.querySelector('.led-visual');
                if (ledVisual) {
                    ledVisual.style.backgroundColor = component.properties.color || 'red';
                }
                break;
            case 'battery':
                valueEl.textContent = `${component.properties.voltage}V`;
                break;
            case 'ac_source':
                valueEl.textContent = `${component.properties.amplitude}V~`;
                break;
            case 'switch':
                valueEl.textContent = component.properties.isClosed ? 'ON' : 'OFF';
                const switchVisual = component.element.querySelector('.switch-visual');
                if (switchVisual) {
                    if (component.properties.isClosed) {
                        switchVisual.classList.add('on');
                    } else {
                        switchVisual.classList.remove('on');
                    }
                }
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
        resetSimulation();
    }

    // Funciones auxiliares
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'flex';
    }

    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }

    function showNotification(title, message, type = 'info') {
        notification.innerHTML = `<strong>${title}:</strong> ${message}`;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
    
    function startDrag(e) {
        if (!selectedComponent || !e.target.closest('.component') || e.target.classList.contains('component-terminal')) return;
        
        const targetComponentElement = e.target.closest('.component');
        if (selectedComponent.element !== targetComponentElement) {
            const componentData = components.find(c => c.element === targetComponentElement);
            if (componentData) {
                selectComponent(targetComponentElement, componentData.type, componentData.properties);
            } else {
                return;
            }
        }

        isDragging = true;
        selectedComponent.element.classList.add('dragging');
        dragStartX = e.clientX - selectedComponent.element.offsetLeft;
        dragStartY = e.clientY - selectedComponent.element.offsetTop;
        circuitStage.style.cursor = 'grabbing';
    }

    function handleDrag(e) {
        if (!isDragging || !selectedComponent) return;
        e.preventDefault();

        const rect = circuitCanvas.getBoundingClientRect();
        let newX = e.clientX - dragStartX - rect.left;
        let newY = e.clientY - dragStartY - rect.top;

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
        circuitStage.style.cursor = '';
    }

    function updateConnectionsForComponent(componentId) {
        connections.forEach(conn => {
            let needsUpdate = false;
            let newX1, newY1, newX2, newY2;

            const fromComp = components.find(c => c.id === conn.fromComponent);
            const toComp = components.find(c => c.id === conn.toComponent);

            if (!fromComp || !toComp) return;

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
    updateCircuitsList();
});