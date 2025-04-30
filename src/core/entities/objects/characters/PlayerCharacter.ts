import * as THREE from 'three';
import GameObject from '../GameObject';
import { BaseCharacter } from './BaseCharacter';
import StateManager from './character_state/StateManager';

export class PlayerCharacter extends BaseCharacter {
    public static instance: PlayerCharacter | null = null;
    public jumpHeight: number = 20.0;
    public moveSpeed: number = 7.5;
    public canJump: boolean = true;
    public direction: THREE.Vector3 = new THREE.Vector3();

    private constructor(initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        super(initialPosition);
        
        // Explicitly set properties after initialization
        this.jumpHeight = 20.0;
        this.moveSpeed = 7.5;
        this.canJump = true;
        
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
}
