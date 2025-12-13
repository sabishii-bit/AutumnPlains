import * as THREE from 'three';
import { Component } from './Component';
import GameObject from '../objects/GameObject';
import { PlayerCamera } from '../../camera/PlayerCamera';

/**
 * Component for projectiles that originate from the camera
 * Handles position and direction updates based on camera
 */
export class CameraProjectileComponent implements Component {
    private owner!: GameObject;
    private playerCamera!: PlayerCamera;
    private origin: THREE.Vector3 = new THREE.Vector3();
    private direction: THREE.Vector3 = new THREE.Vector3(0, 0, -1);

    public initialize(owner: GameObject): void {
        this.owner = owner;
        this.playerCamera = PlayerCamera.getInstance();
        this.updateFromCamera();
    }

    /**
     * Update origin and direction from camera
     */
    public updateFromCamera(): void {
        const camera = this.playerCamera.getCamera();

        // Update origin - set to camera position
        this.origin.copy(camera.position);

        // Get world direction vector from camera
        this.direction.set(0, 0, -1);
        this.direction.applyQuaternion(camera.quaternion);
        this.direction.normalize();
    }

    /**
     * Get the projectile's origin point
     */
    public getOrigin(): THREE.Vector3 {
        return this.origin.clone();
    }

    /**
     * Get the projectile's direction vector
     */
    public getDirection(): THREE.Vector3 {
        return this.direction.clone();
    }

    /**
     * Reset the component (updates from camera)
     */
    public reset(): void {
        this.updateFromCamera();
    }
}
