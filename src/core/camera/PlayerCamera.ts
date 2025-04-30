import * as THREE from 'three';
import { PlayerCharacter } from '../entities/objects/characters/PlayerCharacter';

export class PlayerCamera {
    private static instance: PlayerCamera;

    // Constants for camera offsets (will be scaled accordingly)
    private static readonly CAMERA_X_OFFSET = 0; // Adjust this value as needed (e.g., left/right)
    private static readonly CAMERA_Y_OFFSET = 3.75; // Adjust this value as needed (e.g., height/eye level)
    private static readonly CAMERA_Z_OFFSET = 0; // Adjust this value as needed (e.g., forward/backward)

    private camera: THREE.PerspectiveCamera;
    private player: PlayerCharacter;

    // Private constructor to enforce singleton property
    private constructor() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        // Create a Player instance and pass it to the controls
        this.player = PlayerCharacter.getInstance();

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
        try {
            const collisionBodyData = this.player.getCollisionBody();
            if (collisionBodyData) {
                const position = collisionBodyData.position;
                const scaleFactor = this.player.getScaleFactor(); // Assume you have a method to get the scale factor

                // Apply the offsets for X, Y, and Z, scaled appropriately
                this.camera.position.set(
                    position.x + PlayerCamera.CAMERA_X_OFFSET * scaleFactor,
                    position.y + PlayerCamera.CAMERA_Y_OFFSET * scaleFactor,
                    position.z + PlayerCamera.CAMERA_Z_OFFSET * scaleFactor
                );
            }
        } catch (error) {
            console.warn("Error updating camera position:", error);
        }
    }

    public getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }
}
