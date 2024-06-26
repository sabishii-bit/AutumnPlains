import * as THREE from 'three';
import { Player } from '../entities/player/player';

export class PlayerCamera {
    private static instance: PlayerCamera;
    private camera: THREE.PerspectiveCamera;
    private player: Player;

    // Private constructor to enforce singleton property
    private constructor() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        // Create a Player instance and pass it to the controls
        this.player = Player.getInstance();

        window.addEventListener('resize', this.onWindowResize);
    }

    // Static method to access the singleton instance
    public static getInstance(): PlayerCamera {
        if (!PlayerCamera.instance) {
            PlayerCamera.instance = new PlayerCamera();
        }
        return PlayerCamera.instance;
    }

    // Scales aspect ratio to screen size
    private onWindowResize = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    };

    public update(deltaTime: number) {
        // Synchronize the camera position with the player's body
        this.camera.position.copy(this.player.body.position as unknown as THREE.Vector3);
    }

    public getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }
}
