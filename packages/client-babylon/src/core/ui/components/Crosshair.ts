/**
 * Crosshair UI component
 * Simple center-screen crosshair for aiming
 */
export class Crosshair {
    private static readonly CROSSHAIR_SIZE = 20;
    private static readonly LINE_THICKNESS = 1;
    private static readonly CROSSHAIR_COLOR = 'gray';
    private static readonly Z_INDEX = 1000;

    private crosshairElement: HTMLElement;

    constructor() {
        this.crosshairElement = document.createElement('div');
        this.setupElement();
    }

    private setupElement(): void {
        this.crosshairElement.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: ${Crosshair.CROSSHAIR_SIZE}px;
            height: ${Crosshair.CROSSHAIR_SIZE}px;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: ${Crosshair.Z_INDEX};
        `;

        // Create vertical and horizontal lines
        const verticalLine = document.createElement('div');
        const horizontalLine = document.createElement('div');

        const lineStyle = `
            position: absolute;
            background-color: ${Crosshair.CROSSHAIR_COLOR};
        `;

        verticalLine.style.cssText = `
            width: ${Crosshair.LINE_THICKNESS}px;
            height: 100%;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            ${lineStyle}
        `;

        horizontalLine.style.cssText = `
            width: 100%;
            height: ${Crosshair.LINE_THICKNESS}px;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            ${lineStyle}
        `;

        this.crosshairElement.appendChild(verticalLine);
        this.crosshairElement.appendChild(horizontalLine);

        document.body.appendChild(this.crosshairElement);
    }

    public setVisibility(visible: boolean): void {
        this.crosshairElement.style.display = visible ? 'block' : 'none';
    }

    public dispose(): void {
        if (this.crosshairElement.parentElement) {
            this.crosshairElement.parentElement.removeChild(this.crosshairElement);
        }
    }
}
