import * as THREE from 'three';
import { Camera } from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { PlayerCamera } from '../camera/camera';
import { Player } from '../entities/player/player';
import { DeviceService } from '../services/device/deviceService';
import * as nipplejs from 'nipplejs';

export class PlayerControls {
    private static instance: PlayerControls;
    private controls: PointerLockControls;
    private direction: THREE.Vector3 = new THREE.Vector3();
    private player: Player;
    private camera: THREE.PerspectiveCamera;
    private controllerLock: boolean; // Removes control from the player
    private leftJoystick: nipplejs.JoystickManager;
    private rightJoystick: nipplejs.JoystickManager;

    // Private constructor to enforce singleton property
    private constructor(domElement?: HTMLElement) {
        this.controllerLock = false;
        this.player = Player.getInstance();
        this.camera = PlayerCamera.getInstance().getCamera();
        this.controls = new PointerLockControls(this.camera, domElement);

        domElement.addEventListener('click', () => this.controls.lock());
        this.addEventListeners();

        const deviceService = new DeviceService();
        if (deviceService.isMobile()) {
            this.createVirtualJoysticks();
        }
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

    private createVirtualJoysticks() {
        const leftNipple = nipplejs.create({
            zone: document.body,
            mode: 'static',
            position: { left: '50px', bottom: '50px' },
            color: 'red',
        });

        const rightNipple = nipplejs.create({
            zone: document.body,
            mode: 'static',
            position: { right: '50px', bottom: '50px' },
            color: 'blue',
        });

        leftNipple.on('move', (evt, data) => {
            if (data.direction) {
                const angle = data.angle.degree;
                if (angle >= 45 && angle < 135) {
                    this.direction.z = 1; // down
                } else if (angle >= 135 && angle < 225) {
                    this.direction.x = -1; // left
                } else if (angle >= 225 && angle < 315) {
                    this.direction.z = -1; // up
                } else {
                    this.direction.x = 1; // right
                }
            }
        });

        leftNipple.on('end', () => {
            this.direction.set(0, 0, 0);
        });

        rightNipple.on('move', (evt, data) => {
            if (data.force) {
                const rotation = (data.angle.radian - Math.PI / 2);
                this.camera.rotation.y += rotation * 0.01;
            }
        });

        this.leftJoystick = leftNipple;
        this.rightJoystick = rightNipple;
    }

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