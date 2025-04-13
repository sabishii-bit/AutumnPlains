import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import GameObject from '../GameObject';
import { CharacterState } from './character_state/CharacterState';
import StateManager from './character_state/StateManager';
import { GameObjectManager } from '../../GameObjectManager';
import { CharacterAirborneState } from './character_state/CharacterAirborneState';
import { CharacterJumpingState } from './character_state/CharacterJumpingState';

export abstract class BaseCharacter extends GameObject {
    // Constants for easy adjustment
    private static readonly SCALE_FACTOR = 0.25;
    private static readonly RADIUS = 2 * BaseCharacter.SCALE_FACTOR;
    private static readonly HALF_LENGTH = 4 * BaseCharacter.SCALE_FACTOR;
    private static readonly HEAD_SCALE_FACTOR = 1.5; // Scale factor for the head
    private static readonly FEET_SCALE_FACTOR = 0.5; // Scale factor for the feet
    private static readonly VISUAL_MESH_COLOR = 0xff0000;
    private static readonly VISUAL_MESH_VISIBLE = false;
    
    public jumpHeight!: number;
    public moveSpeed!: number;
    public direction!: THREE.Vector3;
    private currentState!: CharacterState;

    private headBody!: CANNON.Body;
    private feetBody!: CANNON.Body;
    private previousYVelocity: number = 0;
    private lastFeetCollisionTime: number = 0;

    constructor(initialPosition: THREE.Vector3) { 
        super(initialPosition);
        
        // Set the initial state as airborne
        this.setState(new CharacterAirborneState(this));
        StateManager.decideState(this);
    }

    protected createVisualMesh() {
        const radius = BaseCharacter.RADIUS;
        const halfLength = BaseCharacter.HALF_LENGTH;
    
        // Create the cylinder geometry for the main body of the capsule
        const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, halfLength * 2, 16);
        const cylinderMaterial = new THREE.MeshBasicMaterial({ color: BaseCharacter.VISUAL_MESH_COLOR });
        const cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    
        // Create the top sphere geometry (scaled for head)
        const sphereTopGeometry = new THREE.SphereGeometry(radius * BaseCharacter.HEAD_SCALE_FACTOR, 16, 16);
        const sphereTopMesh = new THREE.Mesh(sphereTopGeometry, cylinderMaterial);
        sphereTopMesh.position.set(0, halfLength, 0);
    
        // Create the bottom sphere geometry (scaled for feet)
        const sphereBottomGeometry = new THREE.SphereGeometry(radius * BaseCharacter.FEET_SCALE_FACTOR, 16, 16);
        const sphereBottomMesh = new THREE.Mesh(sphereBottomGeometry, cylinderMaterial);
        sphereBottomMesh.position.set(0, -halfLength, 0);
    
        // Combine the cylinder and spheres into a single object
        this.visualMesh = new THREE.Group();
        this.visualMesh.add(cylinderMesh);
        this.visualMesh.add(sphereTopMesh);
        this.visualMesh.add(sphereBottomMesh);
    
        // Set the visibility based on the static constant
        this.visualMesh.visible = BaseCharacter.VISUAL_MESH_VISIBLE;
    
        // Add the visual mesh to the scene
        this.sceneContext.add(this.visualMesh);
    }
    
    protected createCollisionMesh() {
        if (!this.collisionMesh) {
            // Create the material for the character
            const characterMaterial = new CANNON.Material('characterMaterial');
            characterMaterial.friction = 1.0;  // Increased from 0.9 for maximum friction
            characterMaterial.restitution = 0.0;  // Zero restitution to prevent bouncing
            const groundMaterial = this.worldContext.defaultMaterial;
            const contactMaterial = new CANNON.ContactMaterial(characterMaterial, groundMaterial, {
                friction: 1.0,  // Increased from 0.9
                restitution: 0.0
            });
            this.worldContext.addContactMaterial(contactMaterial);

            const radius = BaseCharacter.RADIUS;
            const halfLength = BaseCharacter.HALF_LENGTH;

            // Main body of the capsule
            const cylinder = new CANNON.Cylinder(radius, radius, halfLength * 2, 16);
            const cylinderQuaternion = new CANNON.Quaternion();
            cylinderQuaternion.setFromEuler(0, 0, Math.PI / 2); // Align with visual mesh

            // Collision body
            this.collisionMesh = new CANNON.Body({
                mass: 7,
                position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
                linearDamping: 0.99,  // Increased from 0.95 for faster deceleration
                angularDamping: 1,  // Increase angular damping to reduce rotation
                material: characterMaterial, // Apply the material here
            });

            // Add the cylinder shape to the main body
            this.collisionMesh.addShape(cylinder, new CANNON.Vec3(0, 0, 0), cylinderQuaternion);

            // Ensure head and feet also use the same material
            this.headBody = new CANNON.Body({
                mass: 0.1,
                position: new CANNON.Vec3(this.position.x, this.position.y + halfLength, this.position.z),
                shape: new CANNON.Sphere(radius * BaseCharacter.HEAD_SCALE_FACTOR),
                angularDamping: 1,
                material: characterMaterial, // Apply the same material here
            });

            this.feetBody = new CANNON.Body({
                mass: 0.1,
                position: new CANNON.Vec3(this.position.x, this.position.y - halfLength, this.position.z),
                shape: new CANNON.Sphere(radius * BaseCharacter.FEET_SCALE_FACTOR),
                angularDamping: 1,
                material: characterMaterial, // Apply the same material here
            });

            this.worldContext.addBody(this.collisionMesh);
            this.worldContext.addBody(this.headBody);
            this.worldContext.addBody(this.feetBody);

            const headConstraint = new CANNON.PointToPointConstraint(
                this.collisionMesh,
                new CANNON.Vec3(0, halfLength, 0),
                this.headBody,
                new CANNON.Vec3(0, 0, 0)
            );

            const feetConstraint = new CANNON.PointToPointConstraint(
                this.collisionMesh,
                new CANNON.Vec3(0, -halfLength, 0),
                this.feetBody,
                new CANNON.Vec3(0, 0, 0)
            );

            // Event listeners for head and feet collisions
            this.headBody.addEventListener('collide', (event: any) => this.handleHeadCollision(event));
            this.feetBody.addEventListener('collide', (event: any) => this.handleFeetCollision(event));

            this.worldContext.addConstraint(headConstraint);
            this.worldContext.addConstraint(feetConstraint);
        }
    }

    private handleHeadCollision(event: any) {
        if (event.body !== this.collisionMesh && event.body !== this.feetBody) {
            console.log('Head collision detected with external object.');
        }
    }

    private handleFeetCollision(event: any) {
        if (event.body !== this.collisionMesh && event.body !== this.headBody) {
            console.log('Feet collision detected with external object.');

            // Record the time of this collision
            this.lastFeetCollisionTime = performance.now();
        }
    }

    public updatePosition(deltaTime: number, inputVector: THREE.Vector3): void {
        if (this.collisionMesh) {
            // Check if there's any input
            if (inputVector.lengthSq() > 0) {
                // When there's input, apply velocity based on input
                inputVector.normalize();
                this.collisionMesh.velocity.x = inputVector.x * this.moveSpeed;
                this.collisionMesh.velocity.z = inputVector.z * this.moveSpeed;
            } else {
                // When there's no input, immediately stop horizontal movement
                this.collisionMesh.velocity.x = 0;
                this.collisionMesh.velocity.z = 0;
            }
        }
    }

    public jump() {
        this.collisionMesh.velocity.y = this.jumpHeight;
        this.setState(new CharacterJumpingState(this));
    }

    public setVelocity(options: { x?: number; y?: number; z?: number } = {}): void {
        if (this.collisionMesh) {
            // Get the current velocity
            const currentVelocity = this.collisionMesh.velocity;
    
            // Determine the new velocity components, using the current values as default
            const newVelocityX = options.x !== undefined ? options.x : currentVelocity.x;
            const newVelocityY = options.y !== undefined ? options.y : currentVelocity.y;
            const newVelocityZ = options.z !== undefined ? options.z : currentVelocity.z;
    
            // Set the new velocity
            this.collisionMesh.velocity.set(newVelocityX, newVelocityY, newVelocityZ);
        }
    }    

    public setAcceleration(options: { x?: number; y?: number; z?: number } = {}): void {
        if (this.collisionMesh) {
            // Calculate mass to convert acceleration to force
            const mass = this.collisionMesh.mass;
    
            // Get the current acceleration (force / mass)
            const currentAcceleration = new CANNON.Vec3(
                this.collisionMesh.force.x / mass,
                this.collisionMesh.force.y / mass,
                this.collisionMesh.force.z / mass
            );
    
            // Determine the new acceleration components, using the current values as default
            const newAccelerationX = options.x !== undefined ? options.x : currentAcceleration.x;
            const newAccelerationY = options.y !== undefined ? options.y : currentAcceleration.y;
            const newAccelerationZ = options.z !== undefined ? options.z : currentAcceleration.z;
    
            // Set the new force based on the desired acceleration
            this.collisionMesh.force.set(
                newAccelerationX * mass,
                newAccelerationY * mass,
                newAccelerationZ * mass
            );
        }
    }

    public isAtPointOfInflection(): boolean {
        if (!this.collisionMesh) return false;
    
        const threshold = 0.1; // Define the margin of error
    
        // Get the current Y velocity
        const currentYVelocity = this.collisionMesh.velocity.y;
    
        // Check if the character is at the point of inflection within the threshold
        const atInflection = this.previousYVelocity > threshold && currentYVelocity <= threshold;
    
        // Update previousYVelocity for the next frame
        this.previousYVelocity = currentYVelocity;
        return atInflection;
    }

    public hasLandedRecently(threshold: number = 10): boolean {
        const currentTime = performance.now();
        return currentTime - this.lastFeetCollisionTime <= threshold;
    }

    public animate(deltaTime: number): void {
        // Perform state-specific actions
        StateManager.executeState(this);

        // Custom animation logic for the player character, if any
        StateManager.decideState(this);
    
        // Sync the visual mesh with the physics body
        if (this.collisionMesh) {
            this.visualMesh.position.set(
                this.collisionMesh.position.x,
                this.collisionMesh.position.y,
                this.collisionMesh.position.z
            );

            this.visualMesh.quaternion.set(
                this.collisionMesh.quaternion.x,
                this.collisionMesh.quaternion.y,
                this.collisionMesh.quaternion.z,
                this.collisionMesh.quaternion.w
            );
        }
    }

    public getCurrentState(): CharacterState {
        return this.currentState;
    }

    public setState(newState: CharacterState): void {
        this.currentState = newState;
    }

    public getScaleFactor(): number {
        return BaseCharacter.SCALE_FACTOR;
    }

    public getHeadScaleFactor(): number {
        return BaseCharacter.HEAD_SCALE_FACTOR;
    }

    public getFeetScaleFactor(): number {
        return BaseCharacter.FEET_SCALE_FACTOR;
    }

    public getFeetHeight(): number {
        return BaseCharacter.FEET_SCALE_FACTOR * BaseCharacter.SCALE_FACTOR;
    }
}
