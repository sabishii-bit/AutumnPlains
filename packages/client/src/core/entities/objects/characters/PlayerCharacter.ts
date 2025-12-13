import * as THREE from 'three';
import GameObject from '../GameObject';
import { BaseCharacter } from './BaseCharacter';
import StateManager from './character_state/StateManager';
import { CharacterMovementComponent } from '../../components/CharacterMovementComponent';

export class PlayerCharacter extends BaseCharacter {
    public static instance: PlayerCharacter | null = null;
    public jumpHeight: number = 6.5;
    public moveSpeed: number = 5.0;
    public canJump: boolean = true;
    public direction: THREE.Vector3 = new THREE.Vector3();

    private constructor(initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        super(initialPosition);

        // Update the movement component with player-specific values
        this.setJumpHeight(this.jumpHeight);
        this.setMoveSpeed(this.moveSpeed);

        console.log("PlayerCharacter initialized with moveSpeed:", this.moveSpeed, "jumpHeight:", this.jumpHeight);
    }

    public static getInstance(initialPosition: THREE.Vector3 = new THREE.Vector3(0, 5, 15)): PlayerCharacter {
        if (!PlayerCharacter.instance) {
            PlayerCharacter.instance = new PlayerCharacter(initialPosition);
        }
        return PlayerCharacter.instance;
    }
    
    // Override jump method to add extra force for player character
    public jump() {
        if (this.canJump) {
            super.jump();
            console.log("Player jumped with force:", this.jumpHeight * this.getJumpForceMultiplier());
        }
    }
    
    /**
     * Set the player's movement speed
     * @param speed New movement speed value
     */
    public setMoveSpeed(speed: number): void {
        this.moveSpeed = speed;
        // Update the movement component
        const movement = this.getComponent<CharacterMovementComponent>('characterMovement');
        if (movement) {
            movement.setMoveSpeed(speed);
        }
        console.log(`Player move speed set to: ${speed}`);
    }
    
    /**
     * Adjust the player's movement speed by the given amount
     * @param amount Amount to adjust movement speed by (can be positive or negative)
     */
    public adjustMoveSpeed(amount: number): void {
        this.moveSpeed += amount;
        if (this.moveSpeed < 0) this.moveSpeed = 0;
        console.log(`Player move speed adjusted to: ${this.moveSpeed}`);
    }
}
