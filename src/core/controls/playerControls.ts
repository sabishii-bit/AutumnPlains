import * as THREE from 'three';
import { Camera } from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { PlayerCamera } from '../camera/camera';
import { Player } from '../entities/player/player';
import { DeviceService } from '../services/device/deviceService';
import nipplejs from 'nipplejs';

export class PlayerControls {
    private static instance: PlayerControls;
    private controls: PointerLockControls;
    private direction: THREE.Vector3 = new THREE.Vector3();
    private player: Player;
    private camera: THREE.PerspectiveCamera;
    private controllerLock: boolean; // Removes control from the player
    private leftJoystick: nipplejs.JoystickManager;
    private rightJoystick: nipplejs.JoystickManager;
    private keyStates: Map<string, boolean> = new Map();
    private rightJoystickActive: boolean = false;
    private rightJoystickData: any = null;
    private yaw: number = 0;
    private pitch: number = 0;
    private deviceService: DeviceService;

    // Private constructor to enforce singleton property
    private constructor(domElement?: HTMLElement) {
        this.deviceService = new DeviceService();
        this.controllerLock = false;
        this.player = Player.getInstance();
        this.camera = PlayerCamera.getInstance().getCamera();
        this.controls = new PointerLockControls(this.camera, domElement);

        if (this.deviceService.isDesktop())
            domElement.addEventListener('click', () => this.controls.lock());
        
        if (this.deviceService.isMobile()) {
            this.createVirtualJoysticks();
        }

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

    private createVirtualJoysticks() {
        // Create zones for left and right joysticks
        const leftZone = this.createJoystickZone('left');
        const rightZone = this.createJoystickZone('right');
    
        // Initialize left joystick for movement
        const leftNipple = nipplejs.create({
            zone: leftZone,
            mode: 'static',
            position: { left: '5rem', bottom: '5rem' },
            color: 'red',
        });
    
        // Initialize right joystick for camera control
        const rightNipple = nipplejs.create({
            zone: rightZone,
            mode: 'static',
            position: { right: '5rem', bottom: '5rem' },
            color: 'blue',
        });
    
        // Movement handler for left joystick
        leftNipple.on('move', this.handleLeftJoystickMove);
        leftNipple.on('end', () => this.direction.set(0, 0, 0));
    
        // Camera control handler for right joystick
        rightNipple.on('start', (evt, data) => {
            this.rightJoystickActive = true;
        });
        rightNipple.on('end', () => {
            this.rightJoystickActive = false;
            this.rightJoystickData = null; // Reset joystick data on end
        });
        rightNipple.on('move', (evt, data) => {
            this.rightJoystickData = data;
            this.updateCameraRotation();
        });
    
        this.leftJoystick = leftNipple;
        this.rightJoystick = rightNipple;
    }

    private handleLeftJoystickMove = (evt, data) => {
        const angle = data.angle.radian;
        const force = data.force;
    
        // Calculate the movement direction based on the joystick angle and force
        const moveZ = Math.sin(angle) * force * -1; // Invert Z direction
        const moveX = Math.cos(angle) * force;
    
        // Create a movement vector
        const moveVector = new THREE.Vector3(moveX, 0, moveZ);
    
        // Transform the movement vector by the camera's orientation
        moveVector.applyQuaternion(this.camera.quaternion);
    
        // Keep the movement direction in the horizontal plane
        moveVector.y = 0;
        moveVector.normalize();
    
        // Scale by the player's movement speed
        moveVector.multiplyScalar(this.player.moveSpeed);
    
        // Update the direction vector
        this.direction.copy(moveVector);
    }
    
    private updateCameraRotation = () => {
        const sensitivity = 0.004; // Adjust this value to set the desired sensitivity
        const maxForce = 0.25; // Adjust this value to set the maximum force
    
        if (this.rightJoystickActive && this.rightJoystickData) {
            const angle = this.rightJoystickData.angle.radian;
            let force = this.rightJoystickData.force;
    
            // Clamp the force to the maximum value
            force = Math.min(force, maxForce);
            
            // Calculate the delta values with sensitivity applied
            const deltaYaw = force * Math.cos(angle) * sensitivity;
            const deltaPitch = force * Math.sin(angle) * sensitivity;
    
            // Update yaw and pitch based on joystick input
            this.yaw -= deltaYaw;
            this.pitch += deltaPitch;
    
            // Clamp the pitch rotation to avoid flipping the camera
            this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    
            // Compute the new camera quaternion based on yaw and pitch
            const quaternion = new THREE.Quaternion();
            quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
            this.camera.quaternion.copy(quaternion);
    
            // Continue updating the camera rotation
            requestAnimationFrame(this.updateCameraRotation);
        }
    }
    

    private createJoystickZone(side: 'left' | 'right'): HTMLDivElement {
        const zone = document.createElement('div');
        zone.style.position = 'absolute';
        zone.style[side] = '0';
        zone.style.bottom = '0';
        zone.style.width = '50%';
        zone.style.height = '50%';
        zone.style.zIndex = '100';
        zone.style.userSelect = 'none';
        zone.style.webkitUserSelect = 'none';
        zone.style.touchAction = 'none';
        document.body.appendChild(zone);
        return zone;
    }

    public update(deltaTime: number) {
        if (this.controllerLock) return;
    
        // Methods for handling the different controls are fickle and may need to be updated later on to avoid this ugly logic check
        if (this.deviceService.isMobile()) {
            if (this.direction.lengthSq() > 0) {
                const moveDirection = this.direction.clone().normalize().multiplyScalar(deltaTime);
                this.player.updatePosition(deltaTime, moveDirection);
            }
        } else if (this.deviceService.isDesktop()) {
            const moveDirection = new THREE.Vector3(this.direction.x, 0, this.direction.z);
            if (moveDirection.lengthSq() > 0) {
                moveDirection.normalize().multiplyScalar(this.player.moveSpeed * deltaTime);
                moveDirection.applyQuaternion(this.camera.quaternion);
                this.player.updatePosition(deltaTime, moveDirection);
            } 
        }
    
        // Update the camera to follow the player
        this.camera.position.copy(this.player.body.position as unknown as THREE.Vector3);
    }

    public getControls(): PointerLockControls {
        return this.controls;
    }
}
