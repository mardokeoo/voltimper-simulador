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
                properties = { resistance: 100 };
                visualContent = `
                    <div class="component-header">
                        <span class="component-name">Resistor</span>
                        <span class="component-value">100Ω</span>
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
                    { position: 'left', type: 'anode' },
                    { position: 'right', type: 'cathode' }
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
                    { position: 'left', type: 'negative' },
                    { position: 'right', type: 'positive' }
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
            terminalEl.dataset.type = terminal.type;
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
            terminals,
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
                            <input type="number" class="property-input" value="${properties.resistance}" min="0.001" step="0.001">
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
                            <input type="number" class="property-input" value="${properties.capacitance}" min="0.000000001" step="0.000000001">
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
                            <input type="number" class="property-input" value="${properties.inductance}" min="0.000001" step="0.000001">
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
                            <input type="number" class="property-input" value="${properties.forwardVoltage}" min="1" max="5" step="0.1">
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
                            <select class="property-input">
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
                            <input type="number" class="property-input" value="${properties.voltage}" min="1" max="24" step="0.1">
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
                            <input type="number" class="property-input" value="${properties.amplitude}" min="0.1" step="0.1">
                            <span class="property-unit">V</span>
                        </div>
                        <div class="property-item">
                            <label class="property-label">Frecuencia:</label>
                            <input type="number" class="property-input" value="${properties.frequency}" min="0.1" step="0.1">
                            <span class="property-unit">Hz</span>
                        </div>
                    </div>
                `;
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
        const propertyName = input.previousElementSibling.textContent.replace(':', '').trim().toLowerCase();
        const propertyValue = input.value;
        
        switch(component.type) {
            case 'resistor':
                if (propertyName === 'resistencia') {
                    component.properties.resistance = parseFloat(propertyValue);
                    component.element.querySelector('.component-value').textContent = `${propertyValue}Ω`;
                }
                break;
                
            case 'capacitor':
                if (propertyName === 'capacitancia') {
                    component.properties.capacitance = parseFloat(propertyValue);
                    const value = propertyValue >= 0.001 ? `${propertyValue * 1000}mF` : `${propertyValue * 1000000}µF`;
                    component.element.querySelector('.component-value').textContent = value;
                }
                break;
                
            case 'inductor':
                if (propertyName === 'inductancia') {
                    component.properties.inductance = parseFloat(propertyValue);
                    const value = propertyValue >= 1 ? `${propertyValue}H` : `${propertyValue * 1000}mH`;
                    component.element.querySelector('.component-value').textContent = value;
                }
                break;
                
            case 'led':
                if (propertyName === 'voltaje directo') {
                    component.properties.forwardVoltage = parseFloat(propertyValue);
                    component.element.querySelector('.component-value').textContent = `${propertyValue}V`;
                }
                break;
                
            case 'switch':
                if (propertyName === 'estado') {
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
                if (propertyName === 'voltaje') {
                    component.properties.voltage = parseFloat(propertyValue);
                    component.element.querySelector('.component-value').textContent = `${propertyValue}V`;
                }
                break;
                
            case 'ac_source':
                if (propertyName === 'amplitud') {
                    component.properties.amplitude = parseFloat(propertyValue);
                    component.element.querySelector('.component-value').textContent = `${propertyValue}V~`;
                } else if (propertyName === 'frecuencia') {
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
        const component = components.find(c => c.id === componentEl.id);
        
        selectedTerminal = {
            component: component.id,
            terminal: terminal,
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
            const terminal = target;
            const componentEl = terminal.closest('.component');
            const component = components.find(c => c.id === componentEl.id);
            
            // No permitir conexión consigo mismo
            if (component.id !== selectedTerminal.component) {
                createConnection(selectedTerminal, { 
                    component: component.id, 
                    terminal: terminal,
                    x: terminal.offsetLeft + terminal.offsetWidth / 2 + componentEl.offsetLeft,
                    y: terminal.offsetTop + terminal.offsetHeight / 2 + componentEl.offsetTop
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
        const midY = (from.y + to.y) / 2;
        
        // Crear una curva Bézier
        const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
        wire.setAttribute('d', d);
        
        connectionsSvg.appendChild(wire);
        
        // Agregar a la lista de conexiones
        connections.push({
            id,
            fromComponent: from.component,
            fromTerminal: from.terminal.dataset.position,
            toComponent: to.component,
            toTerminal: to.terminal.dataset.position,
            element: wire
        });
        
        // Marcar terminales como conectados
        from.terminal.classList.add('connected');
        to.terminal.classList.add('connected');
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
        
        // Simular LEDs
        components.filter(c => c.type === 'led').forEach(led => {
            const ledVisual = led.element.querySelector('.led-visual');
            if (ledVisual) {
                ledVisual.classList.add('on');
                const randomBrightness = 0.3 + Math.random() * 0.7;
                ledVisual.style.opacity = randomBrightness;
            }
        });
        
        // Simular conexiones activas
        connections.forEach(conn => {
            if (Math.floor(time * 2) % 2 === 0) {
                conn.element.classList.add('active');
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
                name: 'Circuito RC Básico',
                description: 'Circuito de carga/descarga de capacitor',
                components: [
                    { type: 'battery', x: 100, y: 150, properties: { voltage: 9 } },
                    { type: 'resistor', x: 250, y: 150, properties: { resistance: 1000 } },
                    { type: 'capacitor', x: 400, y: 150, properties: { capacitance: 0.0001 } },
                    { type: 'ground', x: 400, y: 250 }
                ],
                connections: [
                    { fromComponent: 'comp-1', fromTerminal: 'right', toComponent: 'comp-2', toTerminal: 'left' },
                    { fromComponent: 'comp-2', fromTerminal: 'right', toComponent: 'comp-3', toTerminal: 'left' },
                    { fromComponent: 'comp-3', fromTerminal: 'right', toComponent: 'comp-4', toTerminal: 'top' }
                ],
                createdAt: '2023-01-01T00:00:00Z'
            },
            {
                id: 'circuit-2',
                name: 'Divisor de Voltaje',
                description: 'Circuito divisor de voltaje con resistencias',
                components: [
                    { type: 'battery', x: 100, y: 150, properties: { voltage: 12 } },
                    { type: 'resistor', x: 250, y: 100, properties: { resistance: 1000 } },
                    { type: 'resistor', x: 250, y: 200, properties: { resistance: 2000 } },
                    { type: 'ground', x: 400, y: 200 }
                ],
                connections: [
                    { fromComponent: 'comp-1', fromTerminal: 'right', toComponent: 'comp-2', toTerminal: 'left' },
                    { fromComponent: 'comp-2', fromTerminal: 'right', toComponent: 'comp-3', toTerminal: 'left' },
                    { fromComponent: 'comp-3', fromTerminal: 'right', toComponent: 'comp-4', toTerminal: 'top' }
                ],
                createdAt: '2023-01-02T00:00:00Z'
            },
            {
                id: 'circuit-3',
                name: 'LED con Resistencia',
                description: 'Circuito básico para encender un LED',
                components: [
                    { type: 'battery', x: 100, y: 150, properties: { voltage: 5 } },
                    { type: 'resistor', x: 250, y: 150, properties: { resistance: 220 } },
                    { type: 'led', x: 400, y: 150, properties: { forwardVoltage: 2, maxCurrent: 0.02, color: 'red' } },
                    { type: 'ground', x: 400, y: 250 }
                ],
                connections: [
                    { fromComponent: 'comp-1', fromTerminal: 'right', toComponent: 'comp-2', toTerminal: 'left' },
                    { fromComponent: 'comp-2', fromTerminal: 'right', toComponent: 'comp-3', toTerminal: 'left' },
                    { fromComponent: 'comp-3', fromTerminal: 'right', toComponent: 'comp-4', toTerminal: 'top' }
                ],
                createdAt: '2023-01-03T00:00:00Z'
            }
        ];
    }

    function createNewCircuit(e) {
        e.preventDefault();
        
        const name = circuitNameInput.value.trim();
        if (!name) return;
        
        const description = document.getElementById('circuitDescriptionInput').value.trim();
        const id = `circuit-${Date.now()}`;
        
        const circuit = {
            id,
            name,
            description,
            components: [],
            connections: [],
            createdAt: new Date().toISOString()
        };
        
        circuits.push(circuit);
        currentCircuit = circuit;
        
        // Limpiar y preparar nuevo circuito
        resetSimulation();
        clearCircuit();
        
        // Actualizar lista y cerrar modal
        updateCircuitsList();
        hideModal('newCircuitModal');
        newCircuitForm.reset();
        
        showNotification('Circuito creado', `"${name}" ha sido creado correctamente`, 'success');
    }

    function updateCircuitsList() {
        circuitsList.innerHTML = '';
        
        circuits.forEach(circuit => {
            const item = document.createElement('div');
            item.className = `circuit-item ${currentCircuit?.id === circuit.id ? 'active' : ''}`;
            item.dataset.circuitId = circuit.id;
            
            item.innerHTML = `
                <div class="circuit-item-name">${circuit.name}</div>
                <div class="circuit-item-info">${circuit.description || 'Sin descripción'}</div>
                <button class="btn btn-danger" data-action="delete">Eliminar</button>
                <button class="btn btn-primary" data-action="load">Cargar</button>
            `;
            
            item.querySelector('[data-action="delete"]').addEventListener('click', function(e) {
                e.stopPropagation();
                deleteCircuit(circuit.id);
            });
            
            item.querySelector('[data-action="load"]').addEventListener('click', function(e) {
                e.stopPropagation();
                loadCircuit(circuit.id);
            });
            
            item.addEventListener('click', function() {
                loadCircuit(circuit.id);
            });
            
            circuitsList.appendChild(item);
        });
    }

    function loadCircuit(circuitId) {
        const circuit = circuits.find(c => c.id === circuitId);
        if (!circuit) return;
        
        currentCircuit = circuit;
        resetSimulation();
        clearCircuit();
        
        // Reiniciar contadores de IDs
        nextComponentId = 1;
        nextConnectionId = 1;
        
        // Cargar componentes
        circuit.components.forEach(compData => {
            const component = addComponent(compData.type, compData.x, compData.y);
            
            // Actualizar propiedades
            Object.keys(compData.properties).forEach(prop => {
                component.properties[prop] = compData.properties[prop];
            });
            
            // Actualizar visualización de propiedades
            if (component.element.querySelector('.component-value')) {
                let valueText = '';
                switch(compData.type) {
                    case 'resistor':
                        valueText = `${compData.properties.resistance}Ω`;
                        break;
                    case 'capacitor':
                        valueText = compData.properties.capacitance >= 0.001 ? 
                            `${compData.properties.capacitance * 1000}mF` : 
                            `${compData.properties.capacitance * 1000000}µF`;
                        break;
                    case 'inductor':
                        valueText = compData.properties.inductance >= 1 ? 
                            `${compData.properties.inductance}H` : 
                            `${compData.properties.inductance * 1000}mH`;
                        break;
                    case 'led':
                        valueText = `${compData.properties.forwardVoltage}V`;
                        break;
                    case 'battery':
                        valueText = `${compData.properties.voltage}V`;
                        break;
                    case 'ac_source':
                        valueText = `${compData.properties.amplitude}V~`;
                        break;
                }
                component.element.querySelector('.component-value').textContent = valueText;
            }
        });
        
        // Cargar conexiones (necesitamos esperar un momento para que los componentes se rendericen)
        setTimeout(() => {
            circuit.connections.forEach(connData => {
                const fromComponent = components.find(c => c.id === `comp-${connData.fromComponent.split('-')[1]}`);
                const toComponent = components.find(c => c.id === `comp-${connData.toComponent.split('-')[1]}`);
                
                if (fromComponent && toComponent) {
                    const fromTerminal = fromComponent.element.querySelector(`.terminal-${connData.fromTerminal}`);
                    const toTerminal = toComponent.element.querySelector(`.terminal-${connData.toTerminal}`);
                    
                    if (fromTerminal && toTerminal) {
                        const fromRect = fromTerminal.getBoundingClientRect();
                        const toRect = toTerminal.getBoundingClientRect();
                        const canvasRect = circuitCanvas.getBoundingClientRect();
                        
                        createConnection(
                            {
                                component: fromComponent.id,
                                terminal: fromTerminal,
                                x: fromRect.left + fromRect.width / 2 - canvasRect.left,
                                y: fromRect.top + fromRect.height / 2 - canvasRect.top
                            },
                            {
                                component: toComponent.id,
                                terminal: toTerminal,
                                x: toRect.left + toRect.width / 2 - canvasRect.left,
                                y: toRect.top + toRect.height / 2 - canvasRect.top
                            }
                        );
                    }
                }
            });
        }, 50);
    
        // Actualizar lista
        updateCircuitsList();
        
        showNotification('Circuito cargado', `"${circuit.name}" ha sido cargado`, 'success');
    }

    function deleteCircuit(circuitId) {
        if (currentCircuit?.id === circuitId) {
            currentCircuit = null;
            resetSimulation();
            clearCircuit();
        }
        
        circuits = circuits.filter(c => c.id !== circuitId);
        updateCircuitsList();
        
        showNotification('Circuito eliminado', 'El circuito ha sido eliminado', 'error');
    }

    function clearCircuit() {
        // Eliminar todos los componentes
        components.forEach(c => c.element.remove());
        components = [];
        
        // Eliminar todas las conexiones
        connections.forEach(c => c.element.remove());
        connections = [];
        
        // Limpiar selección
        selectedComponent = null;
        componentPropertiesContent.innerHTML = '<div class="no-component-selected">Selecciona un componente para ver/editar sus propiedades</div>';
        deleteComponentBtn.style.display = 'none';
    }

    // Funciones de arrastre
    function startDrag(e) {
        if (e.target.classList.contains('component-terminal')) return;
        
        const component = e.target.closest('.component');
        if (!component) return;
        
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        
        // Guardar la posición inicial del componente
        const comp = components.find(c => c.id === component.id);
        if (comp) {
            comp.startX = parseInt(component.style.left) || 0;
            comp.startY = parseInt(component.style.top) || 0;
            
            // Seleccionar el componente si no está seleccionado
            if (!component.classList.contains('selected')) {
                selectComponent(component, comp.type, comp.properties);
            }
        }
        
        e.preventDefault();
    }

    function handleDrag(e) {
        if (!isDragging || !selectedComponent) return;
        
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        
        const component = selectedComponent.element;
        
        // Calcular nueva posición basada en la posición inicial
        const newX = selectedComponent.startX + dx;
        const newY = selectedComponent.startY + dy;
        
        component.style.left = `${newX}px`;
        component.style.top = `${newY}px`;
        
        // Actualizar posición en el objeto componente
        selectedComponent.x = newX;
        selectedComponent.y = newY;
        
        // Actualizar conexiones
        updateConnections(selectedComponent.id);
        
        e.preventDefault();
    }

    function endDrag(e) {
        isDragging = false;
        e.preventDefault();
    }

    function updateConnections(componentId) {
        const component = components.find(c => c.id === componentId);
        if (!component) return;
        
        const componentEl = component.element;
        const componentRect = componentEl.getBoundingClientRect();
        const canvasRect = circuitCanvas.getBoundingClientRect();
        
        connections.filter(conn => 
            conn.fromComponent === componentId || conn.toComponent === componentId
        ).forEach(conn => {
            const fromComponent = components.find(c => c.id === conn.fromComponent);
            const toComponent = components.find(c => c.id === conn.toComponent);
            
            if (!fromComponent || !toComponent) return;
            
            const fromTerminal = fromComponent.element.querySelector(`.terminal-${conn.fromTerminal}`);
            const toTerminal = toComponent.element.querySelector(`.terminal-${conn.toTerminal}`);
            
            if (!fromTerminal || !toTerminal) return;
            
            const fromRect = fromTerminal.getBoundingClientRect();
            const toRect = toTerminal.getBoundingClientRect();
            
            const fromX = fromRect.left + fromRect.width / 2 - canvasRect.left;
            const fromY = fromRect.top + fromRect.height / 2 - canvasRect.top;
            const toX = toRect.left + toRect.width / 2 - canvasRect.left;
            const toY = toRect.top + toRect.height / 2 - canvasRect.top;
            
            // Calcular puntos de control para una curva suave
            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2;
            
            // Actualizar la curva Bézier
            const d = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
            conn.element.setAttribute('d', d);
        });
    }

    // Funciones de utilidad
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    function showNotification(title, message, type = 'info') {
        notification.querySelector('#notificationTitle').textContent = title;
        notification.querySelector('#notificationMessage').textContent = message;
        
        notification.className = 'notification';
        notification.classList.add(type === 'error' ? 'error' : type === 'success' ? 'success' : '');
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }

    // Inicializar con el primer circuito
    if (circuits.length > 0) {
        loadCircuit(circuits[0].id);
    }
});