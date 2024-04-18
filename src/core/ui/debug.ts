import { Player } from "../entities/player/player";
import * as THREE from 'three';
import { FirstPersonCamera } from "../camera/camera";

export class DebuggerInfo {
    private player: Player;
    private camera: THREE.Camera;
    private positionElement: HTMLElement;
    private velocityElement: HTMLElement;
    private fpsElement: HTMLElement;
    private frameTimes: number[] = [];
    private readonly maxSamples = 60;  // Number of frames to average for FPS

    constructor() {
        this.player = Player.getInstance();
        this.camera = FirstPersonCamera.getInstance().getCamera();
        
        // Create HTML elements for displaying the information
        this.positionElement = document.createElement('div');
        this.velocityElement = document.createElement('div');
        this.fpsElement = document.createElement('div');
        
        // Style and append elements to the document
        this.setupElements();
    }

    private setupElements() {
        const styleText = 'position: absolute; top: 0; left: 0; color: black; font-family: Monospace; padding: 10px;';

        this.positionElement.style.cssText = styleText;
        this.velocityElement.style.cssText = styleText;
        this.fpsElement.style.cssText = styleText;
        
        const top = 0;
        this.positionElement.style.top = `${top}px`;
        this.velocityElement.style.top = `${top + 20}px`;
        this.fpsElement.style.top = `${top + 40}px`;

        document.body.appendChild(this.positionElement);
        document.body.appendChild(this.velocityElement);
        document.body.appendChild(this.fpsElement);
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

        // Update the HTML content
        this.positionElement.textContent = `Position: X=${this.player.body.position.x.toFixed(2)}, Y=${this.player.body.position.y.toFixed(2)}, Z=${this.player.body.position.z.toFixed(2)}`;
        this.velocityElement.textContent = `Velocity: X=${this.player.body.velocity.x.toFixed(2)}, Y=${this.player.body.velocity.y.toFixed(2)}, Z=${this.player.body.velocity.z.toFixed(2)}`;
        this.fpsElement.textContent = `FPS: ${fps.toFixed(2)}`;
    }
}
