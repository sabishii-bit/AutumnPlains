export class HUDCrosshairsComponent {
    private static readonly CROSSHAIR_SIZE = 20;  // Size of the crosshair container
    private static readonly LINE_THICKNESS = 1;   // Thickness of the crosshair lines
    private static readonly CROSSHAIR_COLOR = 'gray';  // Color of the crosshair lines
    private static readonly Z_INDEX = 1000;       // Z-index to ensure the crosshairs are on top

    private crosshairsElement: HTMLElement;

    constructor() {
        // Create the crosshairs container element
        this.crosshairsElement = document.createElement('div');
        
        // Style and append the crosshairs element to the document
        this.setupElement();
    }

    private setupElement() {
        const styleText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: ${HUDCrosshairsComponent.CROSSHAIR_SIZE}px;
            height: ${HUDCrosshairsComponent.CROSSHAIR_SIZE}px;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: ${HUDCrosshairsComponent.Z_INDEX};
        `;

        this.crosshairsElement.style.cssText = styleText;

        // Create vertical and horizontal lines
        const verticalLine = document.createElement('div');
        const horizontalLine = document.createElement('div');

        // Style for the lines
        const lineStyle = `
            position: absolute;
            background-color: ${HUDCrosshairsComponent.CROSSHAIR_COLOR};
        `;

        verticalLine.style.cssText = `
            width: ${HUDCrosshairsComponent.LINE_THICKNESS}px;
            height: 100%;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            ${lineStyle}
        `;

        horizontalLine.style.cssText = `
            width: 100%;
            height: ${HUDCrosshairsComponent.LINE_THICKNESS}px;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            ${lineStyle}
        `;

        // Append lines to the crosshairs container
        this.crosshairsElement.appendChild(verticalLine);
        this.crosshairsElement.appendChild(horizontalLine);

        // Append the crosshairs element to the document body
        document.body.appendChild(this.crosshairsElement);
    }

    public setVisibility(visible: boolean) {
        this.crosshairsElement.style.display = visible ? 'block' : 'none';
    }
}
