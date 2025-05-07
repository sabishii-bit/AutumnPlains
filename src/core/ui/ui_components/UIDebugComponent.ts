import { PlayerCharacter } from "../../entities/objects/characters/PlayerCharacter";
import * as THREE from 'three';
import { PlayerCamera } from "../../camera/PlayerCamera";
import { NetClient, ConnectionState } from "../../services/netcode/NetClient";

export class UIDebugComponent {
    private player: PlayerCharacter;
    private camera: THREE.Camera;
    private positionElement: HTMLElement;
    private velocityElement: HTMLElement;
    private fpsElement: HTMLElement;
    private cameraRotationElement: HTMLElement;
    private stateElement: HTMLElement;
    private networkStatusElement: HTMLElement;
    private networkDetailsElement: HTMLElement;
    private frameTimes: number[] = [];
    private readonly maxSamples = 60;  // Number of frames to average for FPS
    private netClient: NetClient;

    constructor() {
        this.player = PlayerCharacter.getInstance();
        this.camera = PlayerCamera.getInstance().getCamera();
        this.netClient = NetClient.getInstance();
        
        // Create HTML elements for displaying the information
        this.positionElement = document.createElement('div');
        this.velocityElement = document.createElement('div');
        this.fpsElement = document.createElement('div');
        this.cameraRotationElement = document.createElement('div');
        this.stateElement = document.createElement('div');
        this.networkStatusElement = document.createElement('div');
        this.networkDetailsElement = document.createElement('div');
        
        // Style and append elements to the document
        this.setupElements();
    }

    private setupElements() {
        const styleText = `
            position: absolute; 
            top: 0; 
            left: 0; 
            color: white; 
            font-family: Monospace; 
            padding: 10px;
            text-shadow: 
                -1px -1px 0 #000,  
                1px -1px 0 #000,
                -1px 1px 0 #000,
                1px 1px 0 #000;
        `;

        this.positionElement.style.cssText = styleText;
        this.velocityElement.style.cssText = styleText;
        this.fpsElement.style.cssText = styleText;
        this.cameraRotationElement.style.cssText = styleText;
        this.stateElement.style.cssText = styleText;
        this.networkStatusElement.style.cssText = styleText;
        this.networkDetailsElement.style.cssText = styleText;
        
        let top = 0;
        this.positionElement.style.top = `${top}px`;
        this.velocityElement.style.top = `${top + 20}px`;
        this.cameraRotationElement.style.top = `${top + 40}px`;
        this.stateElement.style.top = `${top + 60}px`;
        this.fpsElement.style.top = `${top + 80}px`;
        this.networkStatusElement.style.top = `${top + 100}px`;
        this.networkDetailsElement.style.top = `${top + 120}px`; // One line below network status

        document.body.appendChild(this.positionElement);
        document.body.appendChild(this.velocityElement);
        document.body.appendChild(this.fpsElement);
        document.body.appendChild(this.stateElement);
        document.body.appendChild(this.cameraRotationElement);
        document.body.appendChild(this.networkStatusElement);
        document.body.appendChild(this.networkDetailsElement);
    }

    public update(deltaTime: number) {
        // Assume deltaTime is in seconds, no conversion needed
        if (this.frameTimes.length >= this.maxSamples) {
            this.frameTimes.shift();  // Remove the oldest time
        }
        this.frameTimes.push(deltaTime);

        // Calculate average frame time
        const averageDeltaTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        const fps = 1 / averageDeltaTime;

        // Extract Euler angles from the camera quaternion
        const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
        const pitch = THREE.MathUtils.radToDeg(euler.x).toFixed(2);
        const yaw = THREE.MathUtils.radToDeg(euler.y).toFixed(2);
        const roll = THREE.MathUtils.radToDeg(euler.z).toFixed(2);

        // Get player data safely
        try {
            // Get collision body data
            const playerCollisionBody = this.player.getCollisionBody();
            
            // Update position and velocity
            if (playerCollisionBody) {
                this.positionElement.textContent = `Position: X=${playerCollisionBody.position.x.toFixed(2)}, Y=${playerCollisionBody.position.y.toFixed(2)}, Z=${playerCollisionBody.position.z.toFixed(2)}`;
                this.velocityElement.textContent = `Velocity: X=${playerCollisionBody.velocity.x.toFixed(2)}, Y=${playerCollisionBody.velocity.y.toFixed(2)}, Z=${playerCollisionBody.velocity.z.toFixed(2)}`;
            } else {
                this.positionElement.textContent = "Position: Waiting for physics...";
                this.velocityElement.textContent = "Velocity: Waiting for physics...";
            }
        } catch (error) {
            console.warn("Error getting physics data for UI:", error);
            this.positionElement.textContent = "Position: Error";
            this.velocityElement.textContent = "Velocity: Error";
        }
        
        // These don't depend on physics
        this.fpsElement.textContent = `FPS: ${fps.toFixed(0)}`;
        this.cameraRotationElement.textContent = `Camera: Pitch=${pitch}, Yaw=${yaw}, Roll=${roll}`;
        
        // Update the state element with the player's current state name
        try {
            const currentState = this.player.getCurrentState();
            this.stateElement.textContent = `State: ${currentState ? currentState.getStateName() : "Unknown"}`;
        } catch (error) {
            console.warn("Error getting player state:", error);
            this.stateElement.textContent = "State: Waiting...";
        }
        
        // Update network status with detailed information
        this.updateNetworkStatus();
    }
    
    /**
     * Update the network status display with detailed connection information
     */
    private updateNetworkStatus(): void {
        const connectionState = this.netClient.getConnectionState();
        const isConnected = this.netClient.isConnected();
        
        // Set status color based on connection state
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
                statusColor = "#ff0000"; // Red
                break;
            case ConnectionState.DISCONNECTED:
            case ConnectionState.DISCONNECTED_BY_CLIENT:
            case ConnectionState.DISCONNECTED_BY_SERVER:
                statusColor = "#ff0000"; // Red
                break;
        }
        
        // Display basic connection status with colored indicator
        this.networkStatusElement.innerHTML = `Server: ${connectionState} <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${statusColor};"></span>`;
        
        // Display error information if available
        const lastError = this.netClient.getLastError();
        if (lastError) {
            const errorText = this.netClient.getFormattedErrorMessage();
            this.networkDetailsElement.textContent = errorText;
            this.networkDetailsElement.style.display = 'block';
        } else {
            // Show reconnection attempts if reconnecting
            if (connectionState === ConnectionState.RECONNECTING) {
                const attempts = this.netClient.getReconnectAttempts();
                this.networkDetailsElement.textContent = `Attempt ${attempts}`;
                this.networkDetailsElement.style.display = 'block';
            } else {
                this.networkDetailsElement.style.display = 'none';
            }
        }
    }
}
