import * as THREE from 'three';
import { Camera } from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { FirstPersonCamera } from '../camera/camera';
import { Player } from '../entities/player/player';

export class PlayerControls {
    private static instance: PlayerControls;
    private controls: PointerLockControls;
    private direction: THREE.Vector3 = new THREE.Vector3();
    private player: Player;
    private camera: THREE.PerspectiveCamera;
    private controllerLock: boolean; // Removes control from the player

    // Private constructor to enforce singleton property
    private constructor(domElement?: HTMLElement) {
        this.controllerLock = false;
        this.player = Player.getInstance();
        this.camera = FirstPersonCamera.getInstance().getCamera();
        this.controls = new PointerLockControls(this.camera, domElement);

        domElement.addEventListener('click', () => this.controls.lock());
        this.addEventListeners();
    }

    // Static method to access the singleton instance
    public static getInstance(domElement?: HTMLElement): PlayerControls {
        if (!PlayerControls.instance) {
            PlayerControls.instance = new PlayerControls(domElement);
        }
        return PlayerControls.instance;
    }

    private addEventListeners() {
        document.addEventListener('keydown', this.onKeyDown, false);
        document.addEventListener('keyup', this.onKeyUp, false);
    }

    private onKeyDown = (event: KeyboardEvent) => {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.direction.z = -1;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.direction.x = -1;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.direction.z = 1;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.direction.x = 1;
                break;
            case 'Space':
                this.player.jump();
                break;
        }
    };

    private onKeyUp = (event: KeyboardEvent) => {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
            case 'ArrowDown':
            case 'KeyS':
                this.direction.z = 0;
                break;
            case 'ArrowLeft':
            case 'KeyA':
            case 'ArrowRight':
            case 'KeyD':
                this.direction.x = 0;
                break;
        }
    };

    public update(deltaTime: number) {
        if (this.controllerLock) return;

        // Calculate camera-based direction
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(this.camera.quaternion);
        const horizontalQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, euler.y, 0, 'YXZ'));

        const inputVector = new THREE.Vector3(this.direction.x, 0, this.direction.z);
        inputVector.applyQuaternion(horizontalQuaternion).normalize().multiplyScalar(this.player.moveSpeed * deltaTime);

        this.player.updatePosition(deltaTime, inputVector);
        this.camera.position.copy(this.player.body.position as unknown as THREE.Vector3);
    }

    public getControls(): PointerLockControls {
        return this.controls;
    }
}