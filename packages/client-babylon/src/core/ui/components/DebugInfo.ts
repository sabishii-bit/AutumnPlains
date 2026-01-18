import type { Vector3 } from '@babylonjs/core';

interface DebugElement {
    element: HTMLElement;
    getValue: () => string | HTMLElement;
    label?: string;
}

/**
 * Debug info UI component
 * Displays FPS, position, velocity, camera rotation, etc.
 */
export class DebugInfo {
    private debugContainer: HTMLElement;
    private debugElements: DebugElement[] = [];
    private frameTimes: number[] = [];

    private readonly lineHeight = 18;
    private readonly basePadding = 10;
    private readonly maxSamples = 60;
    private readonly fontSize = 0.6875;

    // Callbacks for getting dynamic data
    private getPlayerPosition?: () => Vector3;
    private getPlayerVelocity?: () => Vector3;
    private getCameraRotation?: () => Vector3;

    constructor() {
        this.debugContainer = document.createElement('div');
        this.setupContainer();
        this.registerDebugElements();
    }

    private setupContainer(): void {
        this.debugContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            padding: ${this.basePadding}px;
            color: white;
            font-family: Monospace;
            font-size: ${this.fontSize}rem;
            text-shadow:
                -1px -1px 0 #000,
                1px -1px 0 #000,
                -1px 1px 0 #000,
                1px 1px 0 #000;
            z-index: 1000;
            pointer-events: none;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            touch-action: none;
        `;

        document.body.appendChild(this.debugContainer);
    }

    private registerDebugElements(): void {
        // Register position element
        this.registerDebugElement("Position", () => {
            if (this.getPlayerPosition) {
                const pos = this.getPlayerPosition();
                return `X=${pos.x.toFixed(2)}, Y=${pos.y.toFixed(2)}, Z=${pos.z.toFixed(2)}`;
            }
            return "Waiting...";
        });

        // Register velocity element
        this.registerDebugElement("Velocity", () => {
            if (this.getPlayerVelocity) {
                const vel = this.getPlayerVelocity();
                return `X=${vel.x.toFixed(2)}, Y=${vel.y.toFixed(2)}, Z=${vel.z.toFixed(2)}`;
            }
            return "Waiting...";
        });

        // Register camera rotation element
        this.registerDebugElement("Camera", () => {
            if (this.getCameraRotation) {
                const rot = this.getCameraRotation();
                // Convert from radians to degrees
                const pitch = ((rot.x * 180) / Math.PI).toFixed(2);
                const yaw = ((rot.y * 180) / Math.PI).toFixed(2);
                const roll = ((rot.z * 180) / Math.PI).toFixed(2);
                return `Pitch=${pitch}, Yaw=${yaw}, Roll=${roll}`;
            }
            return "Waiting...";
        });

        // Register FPS element
        this.registerDebugElement("FPS", () => {
            if (this.frameTimes.length === 0) return "0";
            const averageDeltaTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
            const fps = 1 / averageDeltaTime;
            const displayFps = Math.floor(fps);
            return displayFps.toString();
        });
    }

    /**
     * Register a new debug element to display
     */
    private registerDebugElement(label: string, getValue: () => string | HTMLElement): DebugElement {
        const element = document.createElement('div');
        element.style.lineHeight = `${this.lineHeight}px`;

        const debugElement: DebugElement = {
            element,
            getValue,
            label
        };

        this.debugElements.push(debugElement);
        this.debugContainer.appendChild(element);

        return debugElement;
    }

    /**
     * Update all registered debug elements
     */
    private updateDebugElements(): void {
        this.debugElements.forEach(debugElement => {
            const value = debugElement.getValue();

            if (value === "") {
                debugElement.element.style.display = 'none';
                return;
            } else {
                debugElement.element.style.display = 'block';
            }

            if (typeof value === 'string') {
                if (debugElement.label) {
                    debugElement.element.textContent = `${debugElement.label}: ${value}`;
                } else {
                    debugElement.element.textContent = value;
                }
            } else {
                // Handle case where value is an HTML element
                debugElement.element.innerHTML = '';
                if (debugElement.label) {
                    const labelSpan = document.createElement('span');
                    labelSpan.textContent = `${debugElement.label}: `;
                    debugElement.element.appendChild(labelSpan);
                }
                debugElement.element.appendChild(value);
            }
        });
    }

    /**
     * Set callback for getting player position
     */
    public setPlayerPositionCallback(callback: () => Vector3): void {
        this.getPlayerPosition = callback;
    }

    /**
     * Set callback for getting player velocity
     */
    public setPlayerVelocityCallback(callback: () => Vector3): void {
        this.getPlayerVelocity = callback;
    }

    /**
     * Set callback for getting camera rotation
     */
    public setCameraRotationCallback(callback: () => Vector3): void {
        this.getCameraRotation = callback;
    }

    public update(deltaTime: number): void {
        // Update FPS calculation
        if (this.frameTimes.length >= this.maxSamples) {
            this.frameTimes.shift();
        }
        this.frameTimes.push(deltaTime);

        // Update all debug elements
        this.updateDebugElements();
    }

    public setVisibility(visible: boolean): void {
        this.debugContainer.style.display = visible ? 'block' : 'none';
    }

    public dispose(): void {
        if (this.debugContainer.parentElement) {
            this.debugContainer.parentElement.removeChild(this.debugContainer);
        }
    }
}
