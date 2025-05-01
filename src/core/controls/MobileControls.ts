import * as THREE from 'three';
import { PlayerControls } from './PlayerControls';
import nipplejs from 'nipplejs';

export class MobileControls extends PlayerControls {
    private leftJoystick!: nipplejs.JoystickManager;
    private rightJoystick!: nipplejs.JoystickManager;
    private rightJoystickActive: boolean = false;
    private rightJoystickData: any = null;
    private yaw: number = 0;
    private pitch: number = 0;
    private inputVector: THREE.Vector3 = new THREE.Vector3();

    constructor() {
        super();
        this.createVirtualJoysticks();
    }

    private createVirtualJoysticks() {
        const leftZone = this.createJoystickZone('left');
        const rightZone = this.createJoystickZone('right');
    
        const leftNipple = nipplejs.create({
            zone: leftZone,
            mode: 'static',
            position: { left: '5rem', bottom: '5rem' },
            color: 'red',
        });
    
        const rightNipple = nipplejs.create({
            zone: rightZone,
            mode: 'static',
            position: { right: '5rem', bottom: '5rem' },
            color: 'blue',
        });
    
        leftNipple.on('move', this.handleLeftJoystickMove);
        leftNipple.on('end', () => {
            // Reset direction when joystick is released
            this.inputVector.set(0, 0, 0);
            this.player.direction.set(0, 0, 0);
        });
    
        rightNipple.on('start', () => {
            this.rightJoystickActive = true;
        });
        rightNipple.on('end', () => {
            this.rightJoystickActive = false;
            this.rightJoystickData = null;
        });
        rightNipple.on('move', (evt, data) => {
            this.rightJoystickData = data;
            this.updateCameraRotation();
        });
    
        this.leftJoystick = leftNipple;
        this.rightJoystick = rightNipple;
    }

    private handleLeftJoystickMove = (evt: any, data: { angle: { radian: any; }; force: any; }) => {
        const angle = data.angle.radian;
        const force = Math.min(data.force, 2.0); // Limit force to prevent extreme speeds
    
        // Calculate direction vector from joystick input
        const moveZ = Math.sin(angle) * force * -1;
        const moveX = Math.cos(angle) * force;
    
        // Store the raw input vector - will be used in update method
        this.inputVector.set(moveX, 0, moveZ);
        
        // Apply camera quaternion to get world-space movement direction
        const moveVector = new THREE.Vector3(moveX, 0, moveZ);
        moveVector.applyQuaternion(this.camera.quaternion);
        moveVector.y = 0;
        moveVector.normalize();
        
        // Store the normalized direction in player.direction (for state management)
        this.player.direction.copy(moveVector);
        
        // Debug mobile movement
        if (Math.random() < 0.01) { // 1% chance to log
            console.log(`Mobile joystick: angle=${angle.toFixed(2)}, force=${force.toFixed(2)}`);
            console.log(`Movement vector: (${moveVector.x.toFixed(2)}, ${moveVector.y.toFixed(2)}, ${moveVector.z.toFixed(2)})`);
        }
    }

    private updateCameraRotation = () => {
        const sensitivity = 0.004;
        const maxForce = 0.25;

        if (this.rightJoystickActive && this.rightJoystickData) {
            const angle = this.rightJoystickData.angle.radian;
            let force = this.rightJoystickData.force;
            force = Math.min(force, maxForce);
            
            const deltaYaw = force * Math.cos(angle) * sensitivity;
            const deltaPitch = force * Math.sin(angle) * sensitivity;
    
            this.yaw -= deltaYaw;
            this.pitch += deltaPitch;
            this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    
            const quaternion = new THREE.Quaternion();
            quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
            this.camera.quaternion.copy(quaternion);
    
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
        // Apply movement if we have input
        if (this.inputVector.lengthSq() > 0) {
            // Scale the input vector with the player's move speed
            const scaledVector = this.inputVector.clone();
            scaledVector.normalize();
            scaledVector.multiplyScalar(this.player.moveSpeed);
            
            // Apply quaternion to get world space direction
            const worldMoveVector = scaledVector.clone();
            worldMoveVector.applyQuaternion(this.camera.quaternion);
            worldMoveVector.y = 0;
            worldMoveVector.normalize();
            worldMoveVector.multiplyScalar(this.player.moveSpeed);
            
            // Update player position using the scaled vector
            this.player.updatePosition(deltaTime, worldMoveVector);
        } else {
            // If no input, still call updatePosition with zero vector
            this.player.updatePosition(deltaTime, new THREE.Vector3(0, 0, 0));
        }
    }
}
