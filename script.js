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
    const circuitsList = document.getElementById('circuitsList'); // Assuming this exists
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
    let circuits = []; // Assuming this is used with load/save
    let nextComponentId = 1;
    let nextConnectionId = 1;
    let isDragging = false;
    let dragStartX = 0; // MODIFIED: Used differently in my drag logic
    let dragStartY = 0; // MODIFIED: Used differently in my drag logic
    let draggedComponent = null; // ADDED: For improved drag and drop
    let dragOffsetX = 0; // ADDED: For improved drag and drop
    let dragOffsetY = 0; // ADDED: For improved drag and drop


    // Inicialización
    initEventListeners();
    loadSampleCircuits(); // User's function, ensure it's defined or comment out
    updateCircuitsList(); // User's function, ensure it's defined or comment out

    // ADDED: Ensure connections SVG is set up for drawing
    if (connectionsSvg) {
        connectionsSvg.style.position = 'absolute';
        connectionsSvg.style.top = '0';
        connectionsSvg.style.left = '0';
        connectionsSvg.style.width = '100%';
        connectionsSvg.style.height = '100%';
        connectionsSvg.style.pointerEvents = 'none'; // So it doesn't interfere with component clicks
    }


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
            selectedTool = null; // Deselect tool after adding
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
            circuitNameInput.style.width = 'calc(100% - 22px)'; // Adjust for padding/border
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
        // MODIFIED: Using a more specific drag start
        circuitStage.addEventListener('mousedown', function(e) {
            const componentElement = e.target.closest('.component');
            // Only start drag if clicking on component body, not a terminal
            if (componentElement && !e.target.classList.contains('component-terminal')) {
                startDrag(e, componentElement); // Pass the specific element
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
        component.dataset.type = type; // ADDED: Helpful for CSS or selection
        
        let properties = {};
        let visualContent = '';
        let terminals = []; // MODIFIED: Ensure this is always defined

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
                        <div class="led-visual" style="background-color: transparent;"></div> 
                    </div>
                `;// MODIFIED: led-visual added with transparent initial bg
                terminals = [
                    { position: 'left', type: 'anode' },  // Terminal izquierdo como ánodo
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
                            <circle cx="8" cy="12" r="2.5" fill="white" stroke="currentColor" stroke-width="1"/>
                            <circle cx="16" cy="12" r="2.5" fill="white" stroke="currentColor" stroke-width="1"/>
                        </svg>
                        <div class="switch-visual"></div>
                    </div>
                `; // MODIFIED: Added circles to SVG and default path to open
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
                            <text x="18.5" y="9" font-size="6" fill="currentColor">+</text> 
                            <text x="5.5" y="9" font-size="6" fill="currentColor">-</text>
                        </svg>
                    </div>
                `; // MODIFIED: Corrected +/- text placement to match terminal types
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
                             <path d="M4 12 H 7 M 17 12 H 20"/>
                             <circle cx="12" cy="12" r="5" stroke-width="1.5" fill="none"/>
                             <path d="M 9.5 12 C 9.5 10 10.5 10 11 12 S 13 14 13.5 12 S 14.5 10 15 10" stroke-width="1.2" fill="none"/>
                        </svg>
                        <div class="ac-source-waveform" style="display:none;"> 
                            <div class="ac-source-waveform-preview"></div>
                        </div>
                    </div>
                `; // MODIFIED: Slightly different AC symbol, kept user's waveform divs if they plan to use them
                terminals = [
                    { position: 'left', type: 'neutral' }, // Or hot, depends on convention
                    { position: 'right', type: 'hot' }    // Or neutral
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
            terminals, // MODIFIED: Storing terminal info for simulation logic
            x,
            y
        };
        
        components.push(componentObj);
        selectComponent(component, type, properties); // Select the newly added component
        
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
                            <input type="number" class="property-input" data-property="resistance" value="${properties.resistance}" min="0" step="1">
                            <span class="property-unit">Ω</span>
                        </div>
                    </div>
                `; // MODIFIED: Using input for direct edit
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
                            <input type="number" class="property-input" data-property="forwardVoltage" value="${properties.forwardVoltage}" min="0.1" max="5" step="0.1">
                            <span class="property-unit">V</span>
                        </div>
                        <div class="property-item">
                            <label class="property-label">Color:</label>
                            <select class="property-input" data-property="color">
                                <option value="red" ${properties.color === 'red' ? 'selected' : ''}>Rojo</option>
                                <option value="green" ${properties.color === 'green' ? 'selected' : ''}>Verde</option>
                                <option value="blue" ${properties.color === 'blue' ? 'selected' : ''}>Azul</option>
                                <option value="yellow" ${properties.color === 'yellow' ? 'selected' : ''}>Amarillo</option>
                                <option value="white" ${properties.color === 'white' ? 'selected' : ''}>Blanco</option>
                            </select>
                        </div>
                    </div>
                `; // MODIFIED: Added white color option
                break;
            
            case 'switch':
                propertiesHTML = `
                    <div class="property-group">
                        <div class="property-item">
                            <label class="property-label">Estado:</label>
                            <select class="property-input" data-property="isClosed">
                                <option value="false" ${!properties.isClosed ? 'selected' : ''}>Abierto (OFF)</option>
                                <option value="true" ${properties.isClosed ? 'selected' : ''}>Cerrado (ON)</option>
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
                            <input type="number" class="property-input" data-property="voltage" value="${properties.voltage}" min="0.1" step="0.1">
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
                    </div>
                `; // MODIFIED: Added frequency
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
            // ADDED: Update on 'input' for number types for immediate feedback
            if (input.type === 'number') {
                input.addEventListener('input', function() {
                    updateComponentProperties(selectedComponent, this);
                });
            }
        });
    }

    function updateComponentProperties(component, input) {
        const propertyName = input.dataset.property;
        let propertyValue = input.value;

        if (!component || !propertyName) return;

        // MODIFIED: Convert to correct type
        if (input.type === 'number') {
            propertyValue = parseFloat(propertyValue);
            if (isNaN(propertyValue)) { // Handle invalid number input
                 if (propertyName === 'resistance' && component.type === 'resistor') propertyValue = 0;
                 else if (propertyName === 'capacitance' && component.type === 'capacitor') propertyValue = 0.000000001;
                 else if (propertyName === 'inductance' && component.type === 'inductor') propertyValue = 0.000001;
                 // Add more defaults if necessary
                 else propertyValue = 0;
            }
        } else if (input.tagName === 'SELECT' && (propertyValue === 'true' || propertyValue === 'false')) {
            propertyValue = (propertyValue === 'true');
        }
        
        component.properties[propertyName] = propertyValue;


        // MODIFIED: Update visual representation based on property changes
        const valueDisplay = component.element.querySelector('.component-value');

        switch(component.type) {
            case 'resistor': 
                if (propertyName === 'resistance' && valueDisplay) {
                    valueDisplay.textContent = `${component.properties.resistance}Ω`;
                }
                break;
            
            case 'capacitor':
                if (propertyName === 'capacitance' && valueDisplay) {
                    const val = component.properties.capacitance;
                    let displayValue = `${val}F`;
                    if (val < 0.000001) displayValue = `${(val * 1000000000).toPrecision(3)}nF`;
                    else if (val < 0.001) displayValue = `${(val * 1000000).toPrecision(3)}µF`;
                    else if (val < 1) displayValue = `${(val * 1000).toPrecision(3)}mF`;
                    valueDisplay.textContent = displayValue;
                }
                break;
            
            case 'inductor':
                if (propertyName === 'inductance' && valueDisplay) {
                    const val = component.properties.inductance;
                    let displayValue = `${val}H`;
                    if (val < 0.001) displayValue = `${(val * 1000000).toPrecision(3)}µH`;
                    else if (val < 1) displayValue = `${(val * 1000).toPrecision(3)}mH`;
                    valueDisplay.textContent = displayValue;
                }
                break;
            
            case 'led':
                if (propertyName === 'forwardVoltage' && valueDisplay) {
                    valueDisplay.textContent = `${component.properties.forwardVoltage}V`;
                } else if (propertyName === 'color') {
                    // Visual color update during simulation, not directly here unless it's off
                    if (!isSimulating) {
                         const ledVisual = component.element.querySelector('.led-visual');
                         if (ledVisual) ledVisual.style.backgroundColor = 'transparent'; // Off state
                    }
                }
                break;
            
            case 'switch':
                if (propertyName === 'isClosed') {
                    if (valueDisplay) valueDisplay.textContent = component.properties.isClosed ? 'ON' : 'OFF';
                    const svgPath = component.element.querySelector('svg path');
                    if (svgPath) {
                        if (component.properties.isClosed) {
                            svgPath.setAttribute('d', 'M4 12 H 8 M 16 12 H 20 M 8 12 L 16 12'); // Closed
                        } else {
                            svgPath.setAttribute('d', 'M4 12 H 8 M 16 12 H 20 M 8 12 L 16 8'); // Open
                        }
                    }
                    // const switchVisual = component.element.querySelector('.switch-visual');
                    // if (switchVisual) component.properties.isClosed ? switchVisual.classList.add('on') : switchVisual.classList.remove('on');
                }
                break;
            
            case 'battery':
                if (propertyName === 'voltage' && valueDisplay) {
                    valueDisplay.textContent = `${component.properties.voltage}V`;
                }
                break;
            
            case 'ac_source':
                if (propertyName === 'amplitude' && valueDisplay) {
                    valueDisplay.textContent = `${component.properties.amplitude}V~`;
                }
                // Frequency or other properties don't typically change the main value display in this format
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
        updateConnectionsVisuals(); // ADDED: Refresh connection lines
    }

    // Funciones de conexiones
    function startConnection(e) {
        e.stopPropagation();
        isDragging = false; // ADDED: Ensure not in component drag mode

        const terminal = e.target;
        const componentEl = terminal.closest('.component');
        const componentData = components.find(c => c.id === componentEl.id);
        
        if (!componentData) return; // Should not happen if DOM is consistent

        selectedTerminal = {
            componentId: componentData.id,
            terminalElement: terminal,
            terminalPosition: terminal.dataset.position, // MODIFIED: Store position and type from dataset
            terminalType: terminal.dataset.type,
            // MODIFIED: Coordinates relative to the connectionsSvg container for consistency
            x: componentEl.offsetLeft + terminal.offsetLeft + terminal.offsetWidth / 2,
            y: componentEl.offsetTop + terminal.offsetTop + terminal.offsetHeight / 2
        };
        
        // Crear línea temporal
        tempWire = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tempWire.classList.add('temp-wire');
        tempWire.setAttribute('x1', selectedTerminal.x);
        tempWire.setAttribute('y1', selectedTerminal.y);
        tempWire.setAttribute('x2', selectedTerminal.x); // Initialize x2, y2 to the start
        tempWire.setAttribute('y2', selectedTerminal.y);
        connectionsSvg.appendChild(tempWire);
        
        // Cambiar cursor
        document.body.style.cursor = 'crosshair';
        // circuitStage.style.cursor = 'crosshair'; // Not needed if body has it
        
        // Escuchar movimiento del ratón
        document.addEventListener('mousemove', drawTempWire);
        document.addEventListener('mouseup', finishConnection);
    }

    function drawTempWire(e) {
        if (!tempWire || !selectedTerminal) return;
        
        // MODIFIED: Coordinates relative to connectionsSvg
        const rect = connectionsSvg.getBoundingClientRect(); 
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        tempWire.setAttribute('x2', x);
        tempWire.setAttribute('y2', y);
    }

    function finishConnection(e) {
        if (!tempWire || !selectedTerminal) { // ADDED: Cleanup if something went wrong
            if (tempWire) tempWire.remove();
            tempWire = null;
            selectedTerminal = null;
            document.removeEventListener('mousemove', drawTempWire);
            document.removeEventListener('mouseup', finishConnection);
            document.body.style.cursor = '';
            return;
        }
        
        // Eliminar eventos temporales
        document.removeEventListener('mousemove', drawTempWire);
        document.removeEventListener('mouseup', finishConnection);
        
        // Restaurar cursor
        document.body.style.cursor = '';
        // circuitStage.style.cursor = '';
        
        // Verificar si se soltó sobre otro terminal
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && target.classList.contains('component-terminal') && target !== selectedTerminal.terminalElement) { // ADDED: Check not same terminal
            const toTerminalElement = target;
            const toComponentEl = toTerminalElement.closest('.component');
            const toComponentData = components.find(c => c.id === toComponentEl.id);
            
            if (toComponentData && toComponentData.id !== selectedTerminal.componentId) { // ADDED: Check component exists and not same component
                createConnection(selectedTerminal, { 
                    componentId: toComponentData.id, 
                    terminalElement: toTerminalElement,
                    terminalPosition: toTerminalElement.dataset.position, // MODIFIED: Store position and type
                    terminalType: toTerminalElement.dataset.type,
                    x: toComponentEl.offsetLeft + toTerminalElement.offsetLeft + toTerminalElement.offsetWidth / 2,
                    y: toComponentEl.offsetTop + toTerminalElement.offsetTop + toTerminalElement.offsetHeight / 2
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
        // MODIFIED: Using path for Bezier curves
        const wire = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        wire.id = id;
        wire.classList.add('connection-wire');
        
        // ADDED: Store detailed terminal info in the connection object
        const connectionObj = {
            id,
            fromComponent: from.componentId,
            fromTerminalPosition: from.terminalPosition,
            fromTerminalType: from.terminalType,
            toComponent: to.componentId,
            toTerminalPosition: to.terminalPosition,
            toTerminalType: to.terminalType,
            element: wire
        };
        connections.push(connectionObj);
        connectionsSvg.appendChild(wire);
        
        updateConnectionPath(connectionObj); // ADDED: Draw the path

        // Marcar terminales como conectados
        from.terminalElement.classList.add('connected');
        to.terminalElement.classList.add('connected');
    }

    // ADDED: Function to update a single connection's path (Bezier curve)
    function updateConnectionPath(conn) {
        const fromCompObj = components.find(c => c.id === conn.fromComponent);
        const toCompObj = components.find(c => c.id === conn.toComponent);

        if (!fromCompObj || !toCompObj) { // If a component was deleted
            if (conn.element) conn.element.remove(); // Remove wire from SVG
            connections = connections.filter(c => c.id !== conn.id); // Remove from array
            return;
        }

        const fromTerminalEl = Array.from(fromCompObj.element.querySelectorAll('.component-terminal'))
                                .find(t => t.dataset.position === conn.fromTerminalPosition);
        const toTerminalEl = Array.from(toCompObj.element.querySelectorAll('.component-terminal'))
                                .find(t => t.dataset.position === conn.toTerminalPosition);
        
        if (!fromTerminalEl || !toTerminalEl) return; // Should not happen

        const fromX = fromCompObj.element.offsetLeft + fromTerminalEl.offsetLeft + fromTerminalEl.offsetWidth / 2;
        const fromY = fromCompObj.element.offsetTop + fromTerminalEl.offsetTop + fromTerminalEl.offsetHeight / 2;
        const toX = toCompObj.element.offsetLeft + toTerminalEl.offsetLeft + toTerminalEl.offsetWidth / 2;
        const toY = toCompObj.element.offsetTop + toTerminalEl.offsetTop + toTerminalEl.offsetHeight / 2;

        // Simple Bezier curve control points for a gentle curve
        const dx = Math.abs(fromX - toX) * 0.35;
        const dy = Math.abs(fromY - toY) * 0.35;

        let cp1x, cp1y, cp2x, cp2y;

        // Basic logic for horizontal/vertical preference
        if (conn.fromTerminalPosition === 'left' || conn.fromTerminalPosition === 'right') {
            cp1x = fromX + (conn.fromTerminalPosition === 'left' ? -dx : dx);
            cp1y = fromY;
        } else { // top or bottom
            cp1x = fromX;
            cp1y = fromY + (conn.fromTerminalPosition === 'top' ? -dy : dy);
        }

        if (conn.toTerminalPosition === 'left' || conn.toTerminalPosition === 'right') {
            cp2x = toX + (conn.toTerminalPosition === 'left' ? dx : -dx);
            cp2y = toY;
        } else { // top or bottom
            cp2x = toX;
            cp2y = toY + (conn.toTerminalPosition === 'top' ? dy : -dy);
        }
        
        const d = `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`;
        conn.element.setAttribute('d', d);
    }

    // ADDED: Function to update all connection visuals (e.g., after a component moves)
    function updateConnectionsVisuals() {
        connections.forEach(conn => updateConnectionPath(conn));
    }


    // Funciones de simulación
    // MODIFIED: Major changes to implement power source check
    function startSimulation() {
        if (isSimulating) return;
        
        // ADDED: Check for power sources
        const powerSources = components.filter(comp => comp.type === 'battery' || comp.type === 'ac_source');

        if (powerSources.length === 0) {
            showNotification('Simulación no iniciada', 'No hay fuente de alimentación (batería o fuente AC) en el circuito.', 'error');
            simulationStatus.textContent = 'Estado: Detenido (Sin Fuente)';
            // Ensure LEDs are off if trying to simulate without power
            components.forEach(comp => {
                if (comp.type === 'led') {
                    const ledVisual = comp.element.querySelector('.led-visual');
                    if (ledVisual) {
                        ledVisual.classList.remove('on');
                        ledVisual.style.backgroundColor = 'transparent';
                    }
                }
            });
            return; // Do not start simulation
        }
        // ADDED: End of power source check

        isSimulating = true;
        simulationStartTime = Date.now();
        simulationStatus.textContent = 'Estado: Simulando';
        simulateBtn.disabled = true;
        resetSimulationBtn.disabled = false;
        
        components.forEach(comp => {
            comp.element.classList.add('simulating');
        });
        
        updateDynamicComponentsState(); // ADDED: Initial update of component states (e.g., LEDs)

        simulationInterval = setInterval(() => {
            updateSimulationTime();
            updateDynamicComponentsState(); // ADDED: Update states periodically
        } , 250); // MODIFIED: Slightly longer interval for visual updates
        
        showNotification('Simulación iniciada', 'El circuito está siendo simulado.', 'success');
    }

    // ADDED: Function to update states of dynamic components like LEDs
    // This is a VERY basic visual simulation, not a real electrical calculation.
    function updateDynamicComponentsState() {
        if (!isSimulating) return;

        const powerSources = components.filter(comp => comp.type === 'battery' || comp.type === 'ac_source');
        // This check is somewhat redundant as startSimulation already does it, but good for safety
        if (powerSources.length === 0) { 
            components.forEach(c => {
                if (c.type === 'led') {
                    const lv = c.element.querySelector('.led-visual');
                    if (lv) { lv.classList.remove('on'); lv.style.backgroundColor = 'transparent'; }
                }
            });
            return;
        }

        // Example logic for LEDs:
        // A more robust solution would involve graph traversal to check for a complete circuit path
        // from a power source, through the LED (respecting polarity), and back to the source/ground.
        components.forEach(comp => {
            if (comp.type === 'led') {
                const ledVisual = comp.element.querySelector('.led-visual');
                if (ledVisual) {
                    let isPotentiallyPowered = false; // This needs sophisticated logic

                    // --- START OF PLACEHOLDER LOGIC (NEEDS REPLACEMENT WITH REAL CIRCUIT ANALYSIS) ---
                    // This is a very naive check: if any switch is closed (or no switches exist),
                    // and there's a power source, we assume the LED *might* be on.
                    // This DOES NOT check connectivity or polarity.
                    const switches = components.filter(c => c.type === 'switch');
                    const allRelevantSwitchesClosed = switches.length > 0 ? switches.every(s => s.properties.isClosed) : true;

                    if (allRelevantSwitchesClosed && powerSources.length > 0) {
                        // To correctly implement "si no llega electricidad no pase corriente":
                        // 1. Build a graph representation of the circuit.
                        // 2. For each LED:
                        //    a. Find its anode and cathode nodes.
                        //    b. Trace path from power source positive terminal to anode.
                        //    c. Trace path from cathode to power source negative terminal (or ground).
                        //    d. Ensure both paths exist and form a complete loop.
                        //    e. Ensure voltage across LED (V_anode - V_cathode) > forwardVoltage.
                        // This is complex and beyond simple DOM checks.
                        isPotentiallyPowered = true; // Placeholder: Assume powered for now
                    }
                    // --- END OF PLACEHOLDER LOGIC ---

                    if (isPotentiallyPowered) {
                        ledVisual.style.backgroundColor = comp.properties.color;
                        ledVisual.classList.add('on'); // CSS class for glow effect
                    } else {
                        ledVisual.style.backgroundColor = 'transparent';
                        ledVisual.classList.remove('on');
                    }
                }
            }
        });
    }


    // ADDED: Full resetSimulation function if not fully present in user's original
    function resetSimulation() {
        if (simulationInterval) clearInterval(simulationInterval);
        isSimulating = false;
        simulationStatus.textContent = 'Estado: Detenido';
        simulationTime.textContent = '0.00s'; // Reset time display
        simulateBtn.disabled = false;
        resetSimulationBtn.disabled = true;

        components.forEach(comp => {
            comp.element.classList.remove('simulating');
            if (comp.type === 'led') {
                const ledVisual = comp.element.querySelector('.led-visual');
                if (ledVisual) {
                    ledVisual.classList.remove('on');
                    ledVisual.style.backgroundColor = 'transparent'; // Turn off LED
                }
            }
            // Restore switch visual to its property state
            if (comp.type === 'switch') {
                 const svgPath = comp.element.querySelector('svg path');
                 if (svgPath) {
                     if (comp.properties.isClosed) {
                        svgPath.setAttribute('d', 'M4 12 H 8 M 16 12 H 20 M 8 12 L 16 12');
                     } else {
                        svgPath.setAttribute('d', 'M4 12 H 8 M 16 12 H 20 M 8 12 L 16 8');
                     }
                 }
            }
        });
        showNotification('Simulación reiniciada', 'El circuito ha sido reiniciado.', 'info');
    }

    // ADDED: Function to update simulation time display
    function updateSimulationTime() {
        if (!isSimulating) return;
        const elapsed = (Date.now() - simulationStartTime) / 1000;
        simulationTime.textContent = `${elapsed.toFixed(2)}s`;
    }
    

    // MODIFIED: Drag and Drop functions for robustness
    function startDrag(e, componentElement) { // componentElement is passed
        if (isSimulating || selectedTerminal) return; // No dragging during simulation or wiring

        draggedComponent = components.find(c => c.id === componentElement.id);
        if (!draggedComponent) return;

        isDragging = true;
        // Calculate offset from mouse pointer to component's top-left corner
        const rect = componentElement.getBoundingClientRect();
        // const canvasRect = circuitCanvas.getBoundingClientRect(); // Not needed if coords are relative to stage parent
        
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        
        draggedComponent.element.style.zIndex = 1000; // Bring to front
        draggedComponent.element.style.pointerEvents = 'none'; // Prevent component from capturing mouse events during drag
    }

    function handleDrag(e) {
        if (!isDragging || !draggedComponent) return;
        e.preventDefault();

        const stageRect = circuitStage.getBoundingClientRect(); // Drag relative to the circuitStage

        let newX = e.clientX - stageRect.left - dragOffsetX;
        let newY = e.clientY - stageRect.top - dragOffsetY;

        // Optional: Constrain to circuitStage boundaries
        // newX = Math.max(0, Math.min(newX, stageRect.width - draggedComponent.element.offsetWidth));
        // newY = Math.max(0, Math.min(newY, stageRect.height - draggedComponent.element.offsetHeight));

        draggedComponent.element.style.left = `${newX}px`;
        draggedComponent.element.style.top = `${newY}px`;
        
        // Update component's stored coordinates
        draggedComponent.x = newX;
        draggedComponent.y = newY;

        updateConnectionsVisuals(); // Update connected wires
    }

    function endDrag(e) {
        if (draggedComponent) {
            draggedComponent.element.style.zIndex = ''; // Reset z-index
            draggedComponent.element.style.pointerEvents = 'auto'; // Restore pointer events
        }
        if (!isDragging) return; // Only act if dragging was actually active

        isDragging = false;
        // draggedComponent = null; // Keep it if needed for other logic, or clear if only for drag op
        updateConnectionsVisuals(); // Final update of wires
    }


    // Utility functions (ensure these are defined or adapt as needed)
    // ADDED: showNotification if not fully present
    function showNotification(title, message, type = 'info') { // type can be 'success', 'error', 'warning', 'info'
        if (!notification) return;
        notification.innerHTML = `<strong>${title}</strong><p>${message}</p>`;
        notification.className = `notification-toast ${type}`; // Allows styling based on type
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
    
    // ADDED: showModal and hideModal if not fully present
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'block';
    }

    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }
    
    // Placeholder functions from user's init, ensure they are defined elsewhere or are simple stubs
    function loadSampleCircuits() { 
        // console.log("loadSampleCircuits called - implement if needed");
    }
    function updateCircuitsList() {
        // console.log("updateCircuitsList called - implement if needed");
        // Example:
        // if (!circuitsList) return;
        // circuitsList.innerHTML = '';
        // circuits.forEach((circuit, index) => {
        //     const li = document.createElement('li');
        //     li.textContent = circuit.name || `Circuito ${index + 1}`;
        //     // Add event listener to load circuit
        //     circuitsList.appendChild(li);
        // });
    }
    function createNewCircuit(e) {
        if (e) e.preventDefault(); // Prevent form submission if called from event
        const name = circuitNameInput.value.trim();
        if (!name) {
            showNotification('Error', 'El nombre del circuito no puede estar vacío.', 'error');
            return;
        }
        // Basic new circuit logic (expand as needed)
        currentCircuit = { name, components: [], connections: [] };
        circuits.push(currentCircuit); // Add to list of all circuits
        
        // Clear workspace for the new circuit
        components.forEach(c => c.element.remove());
        connections.forEach(conn => { if(conn.element) conn.element.remove(); });
        components = [];
        connections = [];
        selectedComponent = null;
        nextComponentId = 1; // Reset IDs for the new circuit context if desired
        nextConnectionId = 1;
        if(componentPropertiesContent) componentPropertiesContent.innerHTML = '<div class="no-component-selected">Selecciona un componente para ver/editar sus propiedades</div>';
        if(deleteComponentBtn) deleteComponentBtn.style.display = 'none';
        
        resetSimulation(); // Ensure simulation is stopped and reset
        updateCircuitsList(); // Update the list of circuits
        hideModal('newCircuitModal');
        circuitNameInput.value = ''; // Clear input
        showNotification('Circuito Creado', `Nuevo circuito "${name}" listo.`, 'success');
        // console.log("Current circuit set to:", name);
    }

});