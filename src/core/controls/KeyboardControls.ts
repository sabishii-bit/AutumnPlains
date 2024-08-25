import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { PlayerControls } from './PlayerControls';

export  class KeyboardControls extends PlayerControls {
    private controls: PointerLockControls;
    private keyStates: Map<string, boolean> = new Map();

    constructor(domElement: HTMLElement) {
        super();
        this.controls = new PointerLockControls(this.camera, domElement);
        domElement.addEventListener('click', () => this.controls.lock());
        this.addEventListeners();
    }

    private addEventListeners() {
        document.addEventListener('keydown', this.onKeyDown, false);
        document.addEventListener('keyup', this.onKeyUp, false);
    }

    private onKeyDown = (event: KeyboardEvent) => {
        this.keyStates.set(event.code, true);
        this.updateDirection();

        if (event.code === 'Space') {
            this.player.jump();  // Call the jump function on the player object
        }
    };

    private onKeyUp = (event: KeyboardEvent) => {
        this.keyStates.delete(event.code);
        this.updateDirection();
    };

    private updateDirection() {
        this.direction.set(0, 0, 0); // Reset direction
        if (this.keyStates.has('ArrowUp') || this.keyStates.has('KeyW')) {
            this.direction.z -= 1;
        }
        if (this.keyStates.has('ArrowDown') || this.keyStates.has('KeyS')) {
            this.direction.z += 1;
        }
        if (this.keyStates.has('ArrowLeft') || this.keyStates.has('KeyA')) {
            this.direction.x -= 1;
        }
        if (this.keyStates.has('ArrowRight') || this.keyStates.has('KeyD')) {
            this.direction.x += 1;
        }
    }

    public update(deltaTime: number) {
        const moveDirection = new THREE.Vector3(this.direction.x, 0, this.direction.z);
        if (moveDirection.lengthSq() > 0) {
            moveDirection.normalize().multiplyScalar(this.player.moveSpeed * deltaTime);
            moveDirection.applyQuaternion(this.camera.quaternion);
            this.player.updatePosition(deltaTime, moveDirection);
        }

        // Update the camera to follow the player
        this.camera.position.copy(this.player.body.position as unknown as THREE.Vector3);
    }

    public getControls(): PointerLockControls {
        return this.controls;
    }
}
