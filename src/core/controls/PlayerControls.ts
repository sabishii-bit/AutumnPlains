import * as THREE from 'three';
import { PlayerCharacter } from '../entities/objects/character/PlayerCharacter';
import { PlayerCamera } from '../camera/PlayerCamera';

export abstract class PlayerControls {
    protected player: PlayerCharacter;
    protected camera: THREE.PerspectiveCamera;
    protected controllerLock: boolean = false; // Removes control from the player

    constructor() {
        this.player = PlayerCharacter.getInstance();
        this.camera = PlayerCamera.getInstance().getCamera();
    }

    public abstract update(deltaTime: number): void;

    protected updatePlayerPosition(deltaTime: number) {
        if (this.controllerLock) return;

        const direction = this.player.direction;  // Use the direction from PlayerCharacter
        if (direction.lengthSq() > 0) {
            const moveDirection = direction.clone().normalize().multiplyScalar(deltaTime);
            this.player.updatePosition(deltaTime, moveDirection);
        }

        // Update the camera to follow the player
        this.camera.position.copy(this.player.body.position as unknown as THREE.Vector3);
    }

    public setControllerLock(lock: boolean) {
        this.controllerLock = lock;
    }
}