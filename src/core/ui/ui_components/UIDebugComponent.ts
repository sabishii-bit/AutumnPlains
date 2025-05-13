import { PlayerCharacter } from "../../entities/objects/characters/PlayerCharacter";
import * as THREE from 'three';
import { PlayerCamera } from "../../camera/PlayerCamera";
import { NetClient, ConnectionState } from "../../services/netcode/NetClient";

interface DebugElement {
    element: HTMLElement;
    getValue: () => string | HTMLElement;
    label?: string;
}

export class UIDebugComponent {
    private player: PlayerCharacter;
    private camera: THREE.Camera;
    private debugContainer: HTMLElement;
    private debugElements: DebugElement[] = [];
    private frameTimes: number[] = [];
    private readonly maxSamples = 60;  // Number of frames to average for FPS
    private netClient: NetClient;
    private readonly lineHeight = 20; // Height in pixels for each debug line
    private readonly basePadding = 10; // Padding from the top of the screen

    constructor() {
        this.player = PlayerCharacter.getInstance();
        this.camera = PlayerCamera.getInstance().getCamera();
        this.netClient = NetClient.getInstance();
        
        // Create container for all debug elements
        this.debugContainer = document.createElement('div');
        this.setupContainer();
        
        // Register all debug elements
        this.registerDebugElements();
    }

    private setupContainer() {
        this.debugContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            padding: ${this.basePadding}px;
            color: white;
            font-family: Monospace;
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

    private registerDebugElements() {
        // Register position element
        this.registerDebugElement("Position", () => {
            try {
                const playerCollisionBody = this.player.getCollisionBody();
                if (playerCollisionBody) {
                    return `X=${playerCollisionBody.position.x.toFixed(2)}, Y=${playerCollisionBody.position.y.toFixed(2)}, Z=${playerCollisionBody.position.z.toFixed(2)}`;
                } else {
                    return "Waiting for physics...";
                }
            } catch (error) {
                console.warn("Error getting position data:", error);
                return "Error";
            }
        });
        
        // Register velocity element
        this.registerDebugElement("Velocity", () => {
            try {
                const playerCollisionBody = this.player.getCollisionBody();
                if (playerCollisionBody) {
                    return `X=${playerCollisionBody.velocity.x.toFixed(2)}, Y=${playerCollisionBody.velocity.y.toFixed(2)}, Z=${playerCollisionBody.velocity.z.toFixed(2)}`;
                } else {
                    return "Waiting for physics...";
                }
            } catch (error) {
                console.warn("Error getting velocity data:", error);
                return "Error";
            }
        });
        
        // Register camera rotation element
        this.registerDebugElement("Camera", () => {
            const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
            const pitch = THREE.MathUtils.radToDeg(euler.x).toFixed(2);
            const yaw = THREE.MathUtils.radToDeg(euler.y).toFixed(2);
            const roll = THREE.MathUtils.radToDeg(euler.z).toFixed(2);
            return `Pitch=${pitch}, Yaw=${yaw}, Roll=${roll}`;
        });
        
        // Register player state element
        this.registerDebugElement("State", () => {
            try {
                const currentState = this.player.getCurrentState();
                return currentState ? currentState.getStateName() : "Unknown";
            } catch (error) {
                console.warn("Error getting player state:", error);
                return "Waiting...";
            }
        });
        
        // Register FPS element
        this.registerDebugElement("FPS", () => {
            const averageDeltaTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
            const fps = 1 / averageDeltaTime;
            // Cap the displayed FPS at 60
            const displayFps = Math.min(60, Math.floor(fps));
            return displayFps.toString();
        });
        
        // Register network status element
        this.registerDebugElement("Server", () => {
            const connectionState = this.netClient.getConnectionState();
            let statusColor = "#ff0000"; // Default red for disconnected
            
            switch(connectionState) {
                case ConnectionState.CONNECTED:
                    statusColor = "#00ff00"; // Green
                    break;
                case ConnectionState.CONNECTING:
                case ConnectionState.RECONNECTING:
                    statusColor = "#ffaa00"; // Orange
                    break;
                case ConnectionState.CONNECTION_ERROR:
                case ConnectionState.DISCONNECTED:
                case ConnectionState.DISCONNECTED_BY_CLIENT:
                case ConnectionState.DISCONNECTED_BY_SERVER:
                    statusColor = "#ff0000"; // Red
                    break;
            }
            
            const statusElement = document.createElement('span');
            statusElement.innerHTML = `${connectionState} <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${statusColor};"></span>`;
            return statusElement;
        });
        
        // Register network details element conditionally
        const networkDetailsElement = this.registerDebugElement("", () => {
            const connectionState = this.netClient.getConnectionState();
            const lastError = this.netClient.getLastError();
            
            if (lastError) {
                return this.netClient.getFormattedErrorMessage();
            } else if (connectionState === ConnectionState.RECONNECTING) {
                const attempts = this.netClient.getReconnectAttempts();
                return `Reconnecting: Attempt ${attempts}`;
            } else {
                return "";
            }
        });
        
        // Hide the network details element when there's no content
        networkDetailsElement.element.style.display = 'none';
    }

    /**
     * Register a new debug element to display
     * @param label The label for this element (empty for no label)
     * @param getValue Function that returns the current value to display
     * @returns The created debug element object
     */
    private registerDebugElement(label: string, getValue: () => string | HTMLElement): DebugElement {
        // Create the element
        const element = document.createElement('div');
        element.style.lineHeight = `${this.lineHeight}px`;
        
        // Add it to our list
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

    public update(deltaTime: number) {
        // Update FPS calculation
        if (this.frameTimes.length >= this.maxSamples) {
            this.frameTimes.shift();  // Remove the oldest time
        }
        this.frameTimes.push(deltaTime);

        // Update all debug elements
        this.updateDebugElements();
    }
}
