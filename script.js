document.addEventListener('DOMContentLoaded', function() {
    // ... (variables globales sin cambios)
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
    let draggedComponent = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;


    // Inicialización
    initEventListeners();
    loadSampleCircuits();
    updateCircuitsList();

    if (connectionsSvg) {
        connectionsSvg.style.position = 'absolute';
        connectionsSvg.style.top = '0';
        connectionsSvg.style.left = '0';
        connectionsSvg.style.width = '100%';
        connectionsSvg.style.height = '100%';
        connectionsSvg.style.pointerEvents = 'none';
    }

    function initEventListeners() {
        componentsToolbar.addEventListener('click', function(e) {
            if (e.target.closest('.component-btn')) {
                const btn = e.target.closest('.component-btn');
                selectedTool = btn.getAttribute('data-component');
                document.querySelectorAll('.component-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Deseleccionar cualquier componente cuando se elige una nueva herramienta
                deselectComponent();
                showNotification('Herramienta seleccionada', `Componente: ${btn.querySelector('.component-label').textContent}`);
            }
        });

        circuitCanvas.addEventListener('click', function(e) {
            const clickedOnComponent = e.target.closest('.component');
            const clickedOnTerminal = e.target.classList.contains('component-terminal');
            const clickedOnSwitchArea = e.target.closest('.switch-clickable');

            if (clickedOnTerminal || clickedOnSwitchArea) {
                // Estos eventos se manejan por listeners específicos en los terminales o switches.
                // No hacer nada más aquí para evitar conflictos.
                return;
            }

            if (selectedTool && !clickedOnComponent) {
                // Hay una herramienta seleccionada Y NO se hizo clic en un componente existente: Añadir nuevo componente.
                const rect = circuitCanvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                addComponent(selectedTool, x, y);
                selectedTool = null; // Deseleccionar herramienta después de añadir
                document.querySelectorAll('.component-btn').forEach(b => b.classList.remove('active'));
            } else if (!selectedTool && !clickedOnComponent) {
                // NO hay herramienta seleccionada Y se hizo clic en un espacio vacío: Deseleccionar componente actual.
                deselectComponent();
            }
            // Si se hizo clic en un componente (clickedOnComponent es true),
            // el listener de clic del propio componente se encargará de seleccionarlo.
        });


        deleteComponentBtn.addEventListener('click', deleteSelectedComponent);
        simulateBtn.addEventListener('click', startSimulation);
        resetSimulationBtn.addEventListener('click', resetSimulation);

        newCircuitBtn.addEventListener('click', () => {
            showModal('newCircuitModal');
            // ... (estilos del modal sin cambios)
            const modalContent = newCircuitModal.querySelector('.modal-content');
            modalContent.style.borderRadius = '10px';
            modalContent.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
            modalContent.style.overflow = 'hidden';
            newCircuitForm.style.padding = '20px';
            newCircuitForm.style.backgroundColor = '#f9f9f9';
            circuitNameInput.style.padding = '10px';
            circuitNameInput.style.borderRadius = '5px';
            circuitNameInput.style.border = '1px solid #ddd';
            circuitNameInput.style.width = 'calc(100% - 22px)';
            circuitNameInput.style.marginBottom = '15px';
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
                btn.addEventListener('mouseover', () => { btn.style.opacity = '0.8'; btn.style.transform = 'translateY(-2px)'; });
                btn.addEventListener('mouseout', () => { btn.style.opacity = '1'; btn.style.transform = 'translateY(0)'; });
            });
        });
        newCircuitForm.addEventListener('submit', createNewCircuit);

        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', function() { hideModal(btn.getAttribute('data-close-modal')); });
        });

        circuitStage.addEventListener('mousedown', function(e) {
            const componentElement = e.target.closest('.component');
            if (componentElement && !e.target.classList.contains('component-terminal')) {
                startDrag(e, componentElement);
            }
        });
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', endDrag);
    }

    function addComponent(type, x, y) {
        const id = `comp-${nextComponentId++}`;
        const component = document.createElement('div');
        component.className = 'component';
        component.id = id;
        component.style.left = `${x}px`;
        component.style.top = `${y}px`;
        component.dataset.type = type;

        let properties = {};
        let visualContent = '';
        let terminalsData = [];
        // ... (switch case para visualContent y terminalsData sin cambios)
        switch(type) {
            case 'resistor':
                properties = { resistance: 100 };
                visualContent = `<div class="component-header"><span class="component-name">Resistor</span><span class="component-value">${properties.resistance}Ω</span></div><div class="component-visual"><svg viewBox="0 0 24 24"><path d="M4 12 H 6 L 7 9 L 9 15 L 11 9 L 13 15 L 15 9 L 17 15 L 18 12 H 20"/></svg></div>`;
                terminalsData = [{ position: 'left', type: 'terminal' }, { position: 'right', type: 'terminal' }];
                break;
            case 'capacitor':
                properties = { capacitance: 0.001 };
                visualContent = `<div class="component-header"><span class="component-name">Capacitor</span><span class="component-value">1mF</span></div><div class="component-visual"><svg viewBox="0 0 24 24"><path d="M4 12 H 10 M 14 12 H 20 M 10 6 V 18 M 14 6 V 18"/></svg></div>`;
                terminalsData = [{ position: 'left', type: 'terminal' }, { position: 'right', type: 'terminal' }];
                break;
            case 'inductor':
                properties = { inductance: 0.1 };
                visualContent = `<div class="component-header"><span class="component-name">Inductor</span><span class="component-value">100mH</span></div><div class="component-visual"><svg viewBox="0 0 24 24"><path d="M4 12 H 7 C 7 9 9 9 9 12 C 9 15 11 15 11 12 C 11 9 13 9 13 12 C 13 15 15 15 15 12 H 20"/></svg></div>`;
                terminalsData = [{ position: 'left', type: 'terminal' }, { position: 'right', type: 'terminal' }];
                break;
            case 'led':
                properties = { forwardVoltage: 2, color: 'red' };
                visualContent = `<div class="component-header"><span class="component-name">LED</span><span class="component-value">2V</span></div><div class="component-visual"><svg viewBox="0 0 24 24"><path d="M4 12 H 8 L 12 7 L 16 12 H 20 M 12 7 V 17 M 9 17 H 15"/><line x1="17" y1="6" x2="19" y2="4" stroke-width="1.5"/><line x1="18" y1="8" x2="20" y2="6" stroke-width="1.5"/></svg><div class="led-visual" style="background-color: transparent;"></div></div>`;
                terminalsData = [{ position: 'left', type: 'anode' }, { position: 'right', type: 'cathode' }];
                break;
            case 'switch':
                properties = { isClosed: false };
                visualContent = `
                    <div class="component-header"><span class="component-name">Switch</span><span class="component-value">OFF</span></div>
                    <div class="component-visual switch-clickable">
                        <svg viewBox="0 0 24 24">
                            <path d="M4 12 H 8 M 16 12 H 20 M 8 12 L 16 8"/>
                            <circle cx="8" cy="12" r="2.5" fill="white" stroke="currentColor" stroke-width="1"/>
                            <circle cx="16" cy="12" r="2.5" fill="white" stroke="currentColor" stroke-width="1"/>
                        </svg>
                    </div>`;
                terminalsData = [{ position: 'left', type: 'terminal' }, { position: 'right', type: 'terminal' }];
                break;
            case 'battery':
                properties = { voltage: 9 };
                visualContent = `<div class="component-header"><span class="component-name">Batería</span><span class="component-value">9V</span></div><div class="component-visual"><svg viewBox="0 0 24 24"><path d="M4 12 H 8 M 16 12 H 20 M 8 8 V 16 M 12 10 V 14 M 16 8 V 16"/><text x="18.5" y="9" font-size="6" fill="currentColor">+</text><text x="3.5" y="9" font-size="6" fill="currentColor">-</text></svg></div>`;
                terminalsData = [{ position: 'left', type: 'negative' }, { position: 'right', type: 'positive' }];
                break;
            case 'ac_source':
                properties = { amplitude: 5, frequency: 60 };
                visualContent = `<div class="component-header"><span class="component-name">Fuente AC</span><span class="component-value">5V~</span></div><div class="component-visual"><svg viewBox="0 0 24 24"><path d="M4 12 H 7 M 17 12 H 20"/><circle cx="12" cy="12" r="5" stroke-width="1.5" fill="none"/><path d="M 9.5 12 C 9.5 10 10.5 10 11 12 S 13 14 13.5 12 S 14.5 10 15 10" stroke-width="1.2" fill="none"/></svg></div>`;
                terminalsData = [{ position: 'left', type: 'neutral' }, { position: 'right', type: 'hot' }];
                break;
            case 'ground':
                properties = {};
                visualContent = `<div class="component-header"><span class="component-name">Tierra</span></div><div class="component-visual"><svg viewBox="0 0 24 24"><path d="M12 4 V 12 M 8 12 H 16 M 9 15 H 15 M 10.5 18 H 13.5"/></svg></div>`;
                terminalsData = [{ position: 'top', type: 'ground' }];
                break;
        }

        component.innerHTML = visualContent;
        const componentObj = { id, type, element: component, properties, terminals: terminalsData, x, y };

        terminalsData.forEach(terminalSpec => {
            const terminalEl = document.createElement('div');
            terminalEl.className = `component-terminal terminal-${terminalSpec.position}`;
            terminalEl.dataset.position = terminalSpec.position;
            terminalEl.dataset.type = terminalSpec.type;
            component.appendChild(terminalEl);
            terminalEl.addEventListener('mousedown', startConnection);
        });

        // --- Listener de CLIC EN EL COMPONENTE para SELECCIONARLO ---
        component.addEventListener('click', function(event) {
            // No seleccionar si el clic fue en un terminal (manejado por startConnection)
            // o en el área clickeable de un switch (manejado por su propio listener).
            if (event.target.classList.contains('component-terminal') || event.target.closest('.switch-clickable')) {
                return;
            }
            // 'this' es el elemento DOM del componente clicado (component)
            // componentObj está disponible a través del closure
            selectComponent(this, componentObj.type, componentObj.properties);
            event.stopPropagation(); // Detener la propagación para evitar que circuitCanvas lo maneje.
        });

        if (type === 'switch') {
            const switchClickableArea = component.querySelector('.switch-clickable');
            if (switchClickableArea) {
                switchClickableArea.addEventListener('click', function(e) {
                    e.stopPropagation(); // Muy importante aquí para no deseleccionar el switch inmediatamente
                    const swComponent = components.find(c => c.id === component.id);
                    if (swComponent && swComponent.type === 'switch') {
                        swComponent.properties.isClosed = !swComponent.properties.isClosed;
                        const valueDisplay = swComponent.element.querySelector('.component-value');
                        if (valueDisplay) valueDisplay.textContent = swComponent.properties.isClosed ? 'ON' : 'OFF';
                        const svgPath = swComponent.element.querySelector('svg path');
                        if (svgPath) {
                            svgPath.setAttribute('d', swComponent.properties.isClosed ?
                                'M4 12 H 8 M 16 12 H 20 M 8 12 L 16 12' :
                                'M4 12 H 8 M 16 12 H 20 M 8 12 L 16 8'
                            );
                        }
                        if (selectedComponent && selectedComponent.id === swComponent.id) {
                            const selectInProperties = componentPropertiesContent.querySelector('select[data-property="isClosed"]');
                            if (selectInProperties) {
                                selectInProperties.value = swComponent.properties.isClosed.toString();
                            }
                        }
                        if (isSimulating) {
                            updateDynamicComponentsState();
                        }
                        // No es necesario llamar a selectComponent() aquí si el switch ya está seleccionado
                        // o si el comportamiento deseado es solo cambiar el estado sin forzar la selección.
                        // Si se quiere que siempre se seleccione al cambiar estado, añadir:
                        // selectComponent(swComponent.element, swComponent.type, swComponent.properties);
                    }
                });
            }
        }

        circuitStage.appendChild(component);
        components.push(componentObj);
        selectComponent(component, componentObj.type, componentObj.properties);
        return componentObj;
    }

    // --- NUEVA FUNCIÓN PARA DESELECCIONAR ---
    function deselectComponent() {
        if (selectedComponent && selectedComponent.element) {
            selectedComponent.element.classList.remove('selected');
        }
        selectedComponent = null;
        componentPropertiesContent.innerHTML = '<div class="no-component-selected">Selecciona un componente para ver/editar sus propiedades</div>';
        deleteComponentBtn.style.display = 'none';
    }

    function selectComponent(componentElement, type, properties) {
        // Primero, deseleccionar cualquier otro componente que pudiera estar seleccionado
        if (selectedComponent && selectedComponent.element && selectedComponent.element !== componentElement) {
            selectedComponent.element.classList.remove('selected');
        }

        componentElement.classList.add('selected');
        selectedComponent = components.find(c => c.id === componentElement.id);

        if (selectedComponent) {
            showComponentProperties(selectedComponent.type, selectedComponent.properties);
        } else {
             // Esto no debería ocurrir si componentElement.id es válido y está en el array 'components'
            console.error("Error: Componente no encontrado en el array 'components'.", componentElement.id);
            showComponentProperties(type, properties); // Fallback
        }
        deleteComponentBtn.style.display = 'block';
    }

    // ... (showComponentProperties, updateComponentProperties, deleteSelectedComponent, etc., se mantienen igual que en la versión anterior con la corrección del switch)
    function showComponentProperties(type, properties) {
        let propertiesHTML = '';

        switch(type) { 
            case 'resistor':
                propertiesHTML = `<div class="property-group"><div class="property-item"><label class="property-label">Resistencia:</label><input type="number" class="property-input" data-property="resistance" value="${properties.resistance}" min="0" step="1"><span class="property-unit">Ω</span></div></div>`;
                break;
            case 'capacitor':
                propertiesHTML = `<div class="property-group"><div class="property-item"><label class="property-label">Capacitancia:</label><input type="number" class="property-input" data-property="capacitance" value="${properties.capacitance}" min="0.000000001" step="0.000000001"><span class="property-unit">F</span></div></div>`;
                break;
            case 'inductor':
                propertiesHTML = `<div class="property-group"><div class="property-item"><label class="property-label">Inductancia:</label><input type="number" class="property-input" data-property="inductance" value="${properties.inductance}" min="0.000001" step="0.000001"><span class="property-unit">H</span></div></div>`;
                break;
            case 'led':
                propertiesHTML = `
                    <div class="property-group">
                        <div class="property-item"><label class="property-label">Voltaje directo:</label><input type="number" class="property-input" data-property="forwardVoltage" value="${properties.forwardVoltage}" min="0.1" max="5" step="0.1"><span class="property-unit">V</span></div>
                        <div class="property-item"><label class="property-label">Color:</label>
                            <select class="property-input" data-property="color">
                                <option value="red" ${properties.color === 'red' ? 'selected' : ''}>Rojo</option><option value="green" ${properties.color === 'green' ? 'selected' : ''}>Verde</option>
                                <option value="blue" ${properties.color === 'blue' ? 'selected' : ''}>Azul</option><option value="yellow" ${properties.color === 'yellow' ? 'selected' : ''}>Amarillo</option>
                                <option value="white" ${properties.color === 'white' ? 'selected' : ''}>Blanco</option>
                            </select>
                        </div>
                    </div>`;
                break;
            case 'switch':
                propertiesHTML = `
                    <div class="property-group"><div class="property-item"><label class="property-label">Estado:</label>
                        <select class="property-input" data-property="isClosed">
                            <option value="false" ${!properties.isClosed ? 'selected' : ''}>Abierto (OFF)</option><option value="true" ${properties.isClosed ? 'selected' : ''}>Cerrado (ON)</option>
                        </select>
                    </div></div>`;
                break;
            case 'battery':
                propertiesHTML = `<div class="property-group"><div class="property-item"><label class="property-label">Voltaje:</label><input type="number" class="property-input" data-property="voltage" value="${properties.voltage}" min="0.1" step="0.1"><span class="property-unit">V</span></div></div>`;
                break;
            case 'ac_source':
                propertiesHTML = `
                    <div class="property-group">
                        <div class="property-item"><label class="property-label">Amplitud:</label><input type="number" class="property-input" data-property="amplitude" value="${properties.amplitude}" min="0.1" step="0.1"><span class="property-unit">V</span></div>
                        <div class="property-item"><label class="property-label">Frecuencia:</label><input type="number" class="property-input" data-property="frequency" value="${properties.frequency}" min="0.1" step="0.1"><span class="property-unit">Hz</span></div>
                    </div>`;
                break;
            default:
                propertiesHTML = '<div class="no-properties">No hay propiedades para este componente.</div>';
                break;
        } 

        componentPropertiesContent.innerHTML = propertiesHTML;
        document.querySelectorAll('.property-input').forEach(input => {
            input.addEventListener('change', function() { updateComponentProperties(selectedComponent, this); });
            if (input.type === 'number') {
                input.addEventListener('input', function() { updateComponentProperties(selectedComponent, this); });
            }
        });
    }

    function updateComponentProperties(component, input) {
        const propertyName = input.dataset.property;
        let propertyValue = input.value;
        if (!component || !propertyName) return;

        if (input.type === 'number') {
            propertyValue = parseFloat(propertyValue);
            if (isNaN(propertyValue)) {
                 if (propertyName === 'resistance' && component.type === 'resistor') propertyValue = 0;
                 else if (propertyName === 'capacitance' && component.type === 'capacitor') propertyValue = 1e-9;
                 else if (propertyName === 'inductance' && component.type === 'inductor') propertyValue = 1e-6;
                 else propertyValue = 0;
            }
        } else if (input.tagName === 'SELECT' && (propertyValue === 'true' || propertyValue === 'false')) {
            propertyValue = (propertyValue === 'true');
        }
        component.properties[propertyName] = propertyValue;

        const valueDisplay = component.element.querySelector('.component-value');
        switch(component.type) {
            case 'resistor': if (propertyName === 'resistance' && valueDisplay) valueDisplay.textContent = `${component.properties.resistance}Ω`; break;
            case 'capacitor':
                if (propertyName === 'capacitance' && valueDisplay) {
                    const val = component.properties.capacitance; let displayValue = `${val}F`;
                    if (val < 1e-6) displayValue = `${(val * 1e9).toPrecision(3)}nF`;
                    else if (val < 1e-3) displayValue = `${(val * 1e6).toPrecision(3)}µF`;
                    else if (val < 1) displayValue = `${(val * 1e3).toPrecision(3)}mF`;
                    valueDisplay.textContent = displayValue;
                }
                break;
            case 'inductor':
                if (propertyName === 'inductance' && valueDisplay) {
                    const val = component.properties.inductance; let displayValue = `${val}H`;
                    if (val < 1e-3) displayValue = `${(val * 1e6).toPrecision(3)}µH`;
                    else if (val < 1) displayValue = `${(val * 1e3).toPrecision(3)}mH`;
                    valueDisplay.textContent = displayValue;
                }
                break;
            case 'led':
                if (propertyName === 'forwardVoltage' && valueDisplay) valueDisplay.textContent = `${component.properties.forwardVoltage}V`;
                else if (propertyName === 'color' && !isSimulating) {
                    const ledVisual = component.element.querySelector('.led-visual');
                    if (ledVisual) ledVisual.style.backgroundColor = 'transparent';
                }
                break;
            case 'switch':
                if (propertyName === 'isClosed') {
                    if (valueDisplay) valueDisplay.textContent = component.properties.isClosed ? 'ON' : 'OFF';
                    const svgPath = component.element.querySelector('svg path');
                    if (svgPath) svgPath.setAttribute('d', component.properties.isClosed ? 'M4 12 H 8 M 16 12 H 20 M 8 12 L 16 12' : 'M4 12 H 8 M 16 12 H 20 M 8 12 L 16 8');
                    if(isSimulating) updateDynamicComponentsState();
                }
                break;
            case 'battery': if (propertyName === 'voltage' && valueDisplay) valueDisplay.textContent = `${component.properties.voltage}V`; break;
            case 'ac_source': if (propertyName === 'amplitude' && valueDisplay) valueDisplay.textContent = `${component.properties.amplitude}V~`; break;
        }
    }

    function deleteSelectedComponent() {
        if (!selectedComponent) return;
        connections = connections.filter(conn => {
            if (conn.fromComponent === selectedComponent.id || conn.toComponent === selectedComponent.id) {
                const wire = document.getElementById(conn.id);
                if (wire) wire.remove();
                return false;
            }
            return true;
        });
        const index = components.findIndex(c => c.id === selectedComponent.id);
        if (index !== -1) {
            components[index].element.remove();
            components.splice(index, 1);
        }
        // Usar la nueva función para limpiar la selección
        deselectComponent();
        updateConnectionsVisuals();
        if (isSimulating) updateDynamicComponentsState();
    }

    function startConnection(e) {
        e.stopPropagation(); isDragging = false;
        const terminal = e.target;
        const componentEl = terminal.closest('.component');
        const componentData = components.find(c => c.id === componentEl.id);
        if (!componentData) return;
        selectedTerminal = {
            componentId: componentData.id, terminalElement: terminal,
            terminalPosition: terminal.dataset.position, terminalType: terminal.dataset.type,
            x: componentEl.offsetLeft + terminal.offsetLeft + terminal.offsetWidth / 2,
            y: componentEl.offsetTop + terminal.offsetTop + terminal.offsetHeight / 2
        };
        tempWire = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tempWire.classList.add('temp-wire');
        tempWire.setAttribute('x1', selectedTerminal.x); tempWire.setAttribute('y1', selectedTerminal.y);
        tempWire.setAttribute('x2', selectedTerminal.x); tempWire.setAttribute('y2', selectedTerminal.y);
        connectionsSvg.appendChild(tempWire);
        document.body.style.cursor = 'crosshair';
        document.addEventListener('mousemove', drawTempWire);
        document.addEventListener('mouseup', finishConnection);
    }

    function drawTempWire(e) {
        if (!tempWire || !selectedTerminal) return;
        const rect = connectionsSvg.getBoundingClientRect();
        const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        tempWire.setAttribute('x2', x); tempWire.setAttribute('y2', y);
    }

    function finishConnection(e) {
        if (!tempWire || !selectedTerminal) {
            if (tempWire) tempWire.remove();
            tempWire = null; selectedTerminal = null;
            document.removeEventListener('mousemove', drawTempWire);
            document.removeEventListener('mouseup', finishConnection);
            document.body.style.cursor = ''; return;
        }
        document.removeEventListener('mousemove', drawTempWire);
        document.removeEventListener('mouseup', finishConnection);
        document.body.style.cursor = '';
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && target.classList.contains('component-terminal') && target !== selectedTerminal.terminalElement) {
            const toTerminalElement = target;
            const toComponentEl = toTerminalElement.closest('.component');
            const toComponentData = components.find(c => c.id === toComponentEl.id);
            if (toComponentData && toComponentData.id !== selectedTerminal.componentId) {
                createConnection(selectedTerminal, {
                    componentId: toComponentData.id, terminalElement: toTerminalElement,
                    terminalPosition: toTerminalElement.dataset.position, terminalType: toTerminalElement.dataset.type,
                    x: toComponentEl.offsetLeft + toTerminalElement.offsetLeft + toTerminalElement.offsetWidth / 2,
                    y: toComponentEl.offsetTop + toTerminalElement.offsetTop + toTerminalElement.offsetHeight / 2
                });
            }
        }
        if (tempWire) { tempWire.remove(); tempWire = null; }
        selectedTerminal = null;
    }

    function createConnection(from, to) {
        const id = `conn-${nextConnectionId++}`;
        const wire = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        wire.id = id; wire.classList.add('connection-wire');
        const connectionObj = {
            id, fromComponent: from.componentId, fromTerminalPosition: from.terminalPosition, fromTerminalType: from.terminalType,
            toComponent: to.componentId, toTerminalPosition: to.terminalPosition, toTerminalType: to.terminalType, element: wire
        };
        connections.push(connectionObj);
        connectionsSvg.appendChild(wire);
        updateConnectionPath(connectionObj);
        from.terminalElement.classList.add('connected');
        to.terminalElement.classList.add('connected');
    }

    function updateConnectionPath(conn) {
        const fromCompObj = components.find(c => c.id === conn.fromComponent);
        const toCompObj = components.find(c => c.id === conn.toComponent);
        if (!fromCompObj || !toCompObj) {
            if (conn.element) conn.element.remove();
            connections = connections.filter(c => c.id !== conn.id); return;
        }
        const fromTerminalEl = Array.from(fromCompObj.element.querySelectorAll('.component-terminal')).find(t => t.dataset.position === conn.fromTerminalPosition);
        const toTerminalEl = Array.from(toCompObj.element.querySelectorAll('.component-terminal')).find(t => t.dataset.position === conn.toTerminalPosition);
        if (!fromTerminalEl || !toTerminalEl) return;

        const fromX = fromCompObj.element.offsetLeft + fromTerminalEl.offsetLeft + fromTerminalEl.offsetWidth / 2;
        const fromY = fromCompObj.element.offsetTop + fromTerminalEl.offsetTop + fromTerminalEl.offsetHeight / 2;
        const toX = toCompObj.element.offsetLeft + toTerminalEl.offsetLeft + toTerminalEl.offsetWidth / 2;
        const toY = toCompObj.element.offsetTop + toTerminalEl.offsetTop + toTerminalEl.offsetHeight / 2;
        const dx = Math.abs(fromX - toX) * 0.35; const dy = Math.abs(fromY - toY) * 0.35;
        let cp1x, cp1y, cp2x, cp2y;
        if (conn.fromTerminalPosition === 'left' || conn.fromTerminalPosition === 'right') { cp1x = fromX + (conn.fromTerminalPosition === 'left' ? -dx : dx); cp1y = fromY; }
        else { cp1x = fromX; cp1y = fromY + (conn.fromTerminalPosition === 'top' ? -dy : dy); }
        if (conn.toTerminalPosition === 'left' || conn.toTerminalPosition === 'right') { cp2x = toX + (conn.toTerminalPosition === 'left' ? dx : -dx); cp2y = toY; }
        else { cp2x = toX; cp2y = toY + (conn.toTerminalPosition === 'top' ? dy : -dy); }
        conn.element.setAttribute('d', `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`);
    }
    function updateConnectionsVisuals() { connections.forEach(conn => updateConnectionPath(conn)); }

    function findPath(startComponent, startTerminalPos, targetComponent, targetTerminalPos, visitedPathSegments, currentPathDepth = 0) {
        if (currentPathDepth > components.length * 2) return false;

        const visitedKey = `${startComponent.id}:${startTerminalPos}`;
        if (visitedPathSegments.has(visitedKey)) return false;
        visitedPathSegments.add(visitedKey);

        const outgoingWires = connections.filter(conn =>
            (conn.fromComponent === startComponent.id && conn.fromTerminalPosition === startTerminalPos) ||
            (conn.toComponent === startComponent.id && conn.toTerminalPosition === startTerminalPos)
        );

        for (const wire of outgoingWires) {
            let nextCompId, nextCompTerminalEntryPos;
            if (wire.fromComponent === startComponent.id && wire.fromTerminalPosition === startTerminalPos) {
                nextCompId = wire.toComponent;
                nextCompTerminalEntryPos = wire.toTerminalPosition;
            } else {
                nextCompId = wire.fromComponent;
                nextCompTerminalEntryPos = wire.fromTerminalPosition;
            }

            const nextComponent = components.find(c => c.id === nextCompId);
            if (!nextComponent) continue;

            if (nextComponent.id === targetComponent.id && nextCompTerminalEntryPos === targetTerminalPos) {
                return true;
            }

            if (nextComponent.type === 'switch' && !nextComponent.properties.isClosed) {
                continue;
            }

            if (nextComponent.id === targetComponent.id && nextCompTerminalEntryPos !== targetTerminalPos) {
                continue;
            }

            if (nextComponent.type === 'ground' && targetComponent.type === 'ground' && nextComponent.id === targetComponent.id) {
                return true;
            }

            if (nextComponent.terminals && nextComponent.terminals.length === 2) {
                const exitTerminal = nextComponent.terminals.find(t => t.position !== nextCompTerminalEntryPos);
                if (exitTerminal) {
                    if (findPath(nextComponent, exitTerminal.position, targetComponent, targetTerminalPos, new Set(visitedPathSegments), currentPathDepth + 1)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function updateDynamicComponentsState() {
        if (!isSimulating) return;

        const powerSources = components.filter(comp => comp.type === 'battery' || comp.type === 'ac_source');
        const groundComponents = components.filter(comp => comp.type === 'ground');

        if (powerSources.length === 0) {
            components.forEach(c => {
                if (c.type === 'led') {
                    const lv = c.element.querySelector('.led-visual');
                    if (lv) { lv.classList.remove('on'); lv.style.backgroundColor = 'transparent'; }
                }
            });
            return;
        }

        components.forEach(comp => {
            if (comp.type === 'led') {
                const ledVisual = comp.element.querySelector('.led-visual');
                let isPowered = false;

                const anodeTerminal = comp.terminals.find(t => t.type === 'anode');
                const cathodeTerminal = comp.terminals.find(t => t.type === 'cathode');

                if (!anodeTerminal || !cathodeTerminal) {
                    if (ledVisual) { ledVisual.classList.remove('on'); ledVisual.style.backgroundColor = 'transparent'; }
                    return;
                }

                for (const source of powerSources) {
                    const sourcePositiveTerminal = source.terminals.find(t => t.type === 'positive' || t.type === 'hot');
                    const sourceNegativeTerminal = source.terminals.find(t => t.type === 'negative' || t.type === 'neutral');

                    if (!sourcePositiveTerminal || !sourceNegativeTerminal) continue;

                    const pathSourcePosToLedAnode = findPath(source, sourcePositiveTerminal.position, comp, anodeTerminal.position, new Set());
                    let pathLedCathodeToSourceNeg = findPath(comp, cathodeTerminal.position, source, sourceNegativeTerminal.position, new Set());

                    if (!pathLedCathodeToSourceNeg && groundComponents.length > 0) {
                        for (const ground of groundComponents) {
                            const groundTerm = ground.terminals.find(t => t.type === 'ground');
                            if (!groundTerm) continue;

                            const pathLedCathodeToGround = findPath(comp, cathodeTerminal.position, ground, groundTerm.position, new Set());
                            const pathSourceNegToGround = findPath(source, sourceNegativeTerminal.position, ground, groundTerm.position, new Set());

                            if (pathLedCathodeToGround && pathSourceNegToGround) {
                                pathLedCathodeToSourceNeg = true;
                                break;
                            }
                        }
                    }

                    if (pathSourcePosToLedAnode && pathLedCathodeToSourceNeg) {
                        isPowered = true;
                        break;
                    }
                }

                if (isPowered) {
                    ledVisual.style.backgroundColor = comp.properties.color;
                    ledVisual.classList.add('on');
                } else {
                    ledVisual.style.backgroundColor = 'transparent';
                    ledVisual.classList.remove('on');
                }
            }
        });
    }

    function startSimulation() {
        if (isSimulating) return;
        const powerSources = components.filter(comp => comp.type === 'battery' || comp.type === 'ac_source');
        if (powerSources.length === 0) {
            showNotification('Simulación no iniciada', 'No hay fuente de alimentación en el circuito.', 'error');
            simulationStatus.textContent = 'Estado: Detenido (Sin Fuente)';
            components.forEach(comp => {
                if (comp.type === 'led') {
                    const ledVisual = comp.element.querySelector('.led-visual');
                    if (ledVisual) { ledVisual.classList.remove('on'); ledVisual.style.backgroundColor = 'transparent';}
                }
            });
            return;
        }
        isSimulating = true;
        simulationStartTime = Date.now();
        simulationStatus.textContent = 'Estado: Simulando';
        simulateBtn.disabled = true; resetSimulationBtn.disabled = false;
        components.forEach(comp => { comp.element.classList.add('simulating'); });
        updateDynamicComponentsState();
        simulationInterval = setInterval(() => {
            updateSimulationTime();
            updateDynamicComponentsState();
        }, 250);
        showNotification('Simulación iniciada', 'El circuito está siendo simulado.', 'success');
    }

    function resetSimulation() {
        if (simulationInterval) clearInterval(simulationInterval);
        isSimulating = false;
        simulationStatus.textContent = 'Estado: Detenido';
        simulationTime.textContent = '0.00s';
        simulateBtn.disabled = false; resetSimulationBtn.disabled = true;
        components.forEach(comp => {
            comp.element.classList.remove('simulating');
            if (comp.type === 'led') {
                const ledVisual = comp.element.querySelector('.led-visual');
                if (ledVisual) { ledVisual.classList.remove('on'); ledVisual.style.backgroundColor = 'transparent'; }
            }
        });
        showNotification('Simulación reiniciada', 'El circuito ha sido reiniciado.', 'info');
    }

    function updateSimulationTime() {
        if (!isSimulating) return;
        const elapsed = (Date.now() - simulationStartTime) / 1000;
        simulationTime.textContent = `${elapsed.toFixed(2)}s`;
    }

    function startDrag(e, componentElement) {
        if (isSimulating || selectedTerminal) return; // No arrastrar durante simulación o cableado

        // Asegurarse de que el componente que se intenta arrastrar sea el actualmente seleccionado,
        // o seleccionarlo si no lo es, para evitar conflictos de estado.
        // Sin embargo, el drag and drop no debería depender estrictamente de la "selección de propiedades".
        // Es mejor que el drag opere sobre el 'componentElement' que recibió el mousedown.

        draggedComponent = components.find(c => c.id === componentElement.id);
        if (!draggedComponent) return;

        isDragging = true;
        const rect = componentElement.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;

        draggedComponent.element.style.zIndex = 1000;
        draggedComponent.element.style.pointerEvents = 'none'; // Evitar que el componente capture eventos del ratón durante el arrastre
    }

    function handleDrag(e) {
        if (!isDragging || !draggedComponent) return;
        e.preventDefault();

        const stageRect = circuitStage.getBoundingClientRect();
        let newX = e.clientX - stageRect.left - dragOffsetX;
        let newY = e.clientY - stageRect.top - dragOffsetY;

        draggedComponent.element.style.left = `${newX}px`;
        draggedComponent.element.style.top = `${newY}px`;
        draggedComponent.x = newX;
        draggedComponent.y = newY;

        updateConnectionsVisuals();
    }

    function endDrag() {
        if (draggedComponent) {
            draggedComponent.element.style.zIndex = '';
            draggedComponent.element.style.pointerEvents = 'auto'; // Restaurar eventos de puntero
        }
        if (!isDragging) return;
        isDragging = false;
        // draggedComponent = null; // No es estrictamente necesario limpiarlo aquí si no causa problemas.
        updateConnectionsVisuals();
    }

    function showNotification(title, message, type = 'info') {
        if (!notification) return;
        notification.innerHTML = `<strong>${title}</strong><p>${message}</p>`;
        notification.className = `notification-toast ${type}`;
        notification.style.display = 'block';
        setTimeout(() => { notification.style.display = 'none'; }, 3000);
    }
    function showModal(modalId) { const modal = document.getElementById(modalId); if (modal) modal.style.display = 'block'; }
    function hideModal(modalId) { const modal = document.getElementById(modalId); if (modal) modal.style.display = 'none'; }
    function loadSampleCircuits() { /* console.log("loadSampleCircuits placeholder"); */ }
    function updateCircuitsList() { /* console.log("updateCircuitsList placeholder"); */ }
    function createNewCircuit(e) {
        if (e) e.preventDefault();
        const name = circuitNameInput.value.trim();
        if (!name) { showNotification('Error', 'El nombre del circuito no puede estar vacío.', 'error'); return; }
        currentCircuit = { name, components: [], connections: [] };
        circuits.push(currentCircuit);
        components.forEach(c => c.element.remove());
        connections.forEach(conn => { if(conn.element) conn.element.remove(); });
        components = []; connections = [];
        // Usar la nueva función para limpiar la selección
        deselectComponent();
        nextComponentId = 1; nextConnectionId = 1;
        resetSimulation(); updateCircuitsList(); hideModal('newCircuitModal');
        circuitNameInput.value = '';
        showNotification('Circuito Creado', `Nuevo circuito "${name}" listo.`, 'success');
    }
});