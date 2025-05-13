import * as THREE from 'three';
import nipplejs from 'nipplejs';
import { PlayerCharacter } from '../../entities/objects/characters/PlayerCharacter';
import { JoystickComponent } from './JoystickComponent';

export class MovementJoystick extends JoystickComponent {
    private inputVector: THREE.Vector3 = new THREE.Vector3();
    
    public initialize(camera: THREE.Camera, player: PlayerCharacter): void {
        this.camera = camera;
        this.player = player;
        
        const zone = this.createJoystickZone('left');
        
        this.joystick = nipplejs.create({
            zone: zone,
            mode: 'static',
            position: { left: '5rem', bottom: '5rem' },
            color: 'red',
        });
        
        this.joystick.on('move', this.handleJoystickMove);
        this.joystick.on('end', this.handleJoystickEnd);
    }
    
    private handleJoystickMove = (evt: any, data: { angle: { radian: number; }; force: number; }): void => {
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
    
    private handleJoystickEnd = (): void => {
        // Reset direction when joystick is released
        this.inputVector.set(0, 0, 0);
        this.player.direction.set(0, 0, 0);
    }
    
    public update(deltaTime: number): void {
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