import { PlayerCharacter } from "../../entities/objects/characters/PlayerCharacter";
import * as THREE from 'three';
import { PlayerCamera } from "../../camera/PlayerCamera";

export class UIDebugComponent {
    private player: PlayerCharacter;
    private camera: THREE.Camera;
    private positionElement: HTMLElement;
    private velocityElement: HTMLElement;
    private fpsElement: HTMLElement;
    private cameraRotationElement: HTMLElement;
    private stateElement: HTMLElement;
    private frameTimes: number[] = [];
    private readonly maxSamples = 60;  // Number of frames to average for FPS

    constructor() {
        this.player = PlayerCharacter.getInstance();
        this.camera = PlayerCamera.getInstance().getCamera();
        
        // Create HTML elements for displaying the information
        this.positionElement = document.createElement('div');
        this.velocityElement = document.createElement('div');
        this.fpsElement = document.createElement('div');
        this.cameraRotationElement = document.createElement('div');
        this.stateElement = document.createElement('div');
        
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
        
        let top = 0;
        this.positionElement.style.top = `${top}px`;
        this.velocityElement.style.top = `${top + 20}px`;
        this.cameraRotationElement.style.top = `${top + 40}px`;
        this.stateElement.style.top = `${top + 60}px`;
        this.fpsElement.style.top = `${top + 80}px`;

        document.body.appendChild(this.positionElement);
        document.body.appendChild(this.velocityElement);
        document.body.appendChild(this.fpsElement);
        document.body.appendChild(this.stateElement);
        document.body.appendChild(this.cameraRotationElement);
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

        // Update the HTML content
        const playerCollisionBody = this.player.getCollisionBody();
        this.positionElement.textContent = `Position: X=${playerCollisionBody.position.x.toFixed(2)}, Y=${playerCollisionBody.position.y.toFixed(2)}, Z=${playerCollisionBody.position.z.toFixed(2)}`;
        this.velocityElement.textContent = `Velocity: X=${playerCollisionBody.velocity.x.toFixed(2)}, Y=${playerCollisionBody.velocity.y.toFixed(2)}, Z=${playerCollisionBody.velocity.z.toFixed(2)}`;
        this.fpsElement.textContent = `FPS: ${fps.toFixed(2)}`;
        this.cameraRotationElement.textContent = `Camera: Pitch=${pitch}, Yaw=${yaw}, Roll=${roll}`;
        
        // Update the state element with the player's current state name
        const currentState = this.player.getCurrentState();
        this.stateElement.textContent = `State: ${currentState ? currentState.getStateName() : "Unknown"}`;
    }
}
