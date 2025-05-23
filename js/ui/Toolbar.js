class Toolbar {
    constructor(toolbarSelector, circuitStageEl) {
        this.toolbar = document.querySelector(toolbarSelector);   // Selector de botones de componentes
        this.circuitStage = circuitStageEl;                      // Elemento del canvas donde se agregan componentes
        this.onComponentAdd = null;                              // Callback para agregar componente
        this.onTooltipShow = null;                               // Callback para mostrar tooltip
        this.onTooltipHide = null;                               // Callback para ocultar tooltip
    }

    bindEvents() {
        const buttons = this.toolbar.querySelectorAll('.component-btn');

        buttons.forEach(button => {
            const componentType = button.dataset.component;

            button.addEventListener('click', (e) => {
                if (!this.onComponentAdd) return;

                const rect = this.circuitStage.getBoundingClientRect();
                const x = this.circuitStage.scrollLeft + rect.width / 2 - 50;
                const y = this.circuitStage.scrollTop + rect.height / 2 - 25;

                this.onComponentAdd(componentType, x, y);
            });

            button.addEventListener('mouseenter', (e) => {
                if (this.onTooltipShow) {
                    this.onTooltipShow(button.title, e);
                }
            });

            button.addEventListener('mouseleave', () => {
                if (this.onTooltipHide) {
                    this.onTooltipHide();
                }
            });
        });
    }

    setComponentAddCallback(callback) {
        this.onComponentAdd = callback;
    }

    setTooltipCallbacks(showCallback, hideCallback) {
        this.onTooltipShow = showCallback;
        this.onTooltipHide = hideCallback;
    }
}
