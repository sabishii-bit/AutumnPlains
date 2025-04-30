import * as THREE from 'three';
import GameObject, { GameObjectOptions, AmmoBodyOptions } from '../GameObject';
import { CharacterState } from './character_state/CharacterState';
import StateManager from './character_state/StateManager';
import { GameObjectManager } from '../../GameObjectManager';
import { CharacterAirborneState } from './character_state/CharacterAirborneState';
import { CharacterJumpingState } from './character_state/CharacterJumpingState';
import { MaterialType } from '../../../physics/PhysicsMaterialsManager';
import { WorldContext } from '../../../global/world/WorldContext';
import { AmmoUtils } from '../../../physics/AmmoUtils';

export abstract class BaseCharacter extends GameObject {
    // Constants for easy adjustment
    private static readonly SCALE_FACTOR = 0.25;
    private static readonly RADIUS = 2 * BaseCharacter.SCALE_FACTOR;
    private static readonly HALF_LENGTH = 4 * BaseCharacter.SCALE_FACTOR;
    private static readonly HEAD_SCALE_FACTOR = 1.5; // Scale factor for the head
    private static readonly FEET_SCALE_FACTOR = 0.5; // Scale factor for the feet
    private static readonly VISUAL_MESH_COLOR = 0xff0000;
    private static readonly VISUAL_MESH_VISIBLE = false;
    private static readonly DEFAULT_JUMP_HEIGHT = 6;
    private static readonly JUMP_FORCE_MULTIPLIER = 5;
    
    public jumpHeight: number;
    public moveSpeed!: number;
    public direction!: THREE.Vector3;
    private currentState!: CharacterState;

    private headBody!: any; // Ammo.btRigidBody
    private feetBody!: any; // Ammo.btRigidBody
    private headShape!: any; // Ammo.btSphereShape
    private feetShape!: any; // Ammo.btSphereShape
    private previousYVelocity: number = 0;
    private lastFeetCollisionTime: number = 0;
    private collisionDebugEnabled: boolean = true; // Toggle for collision debug messages
    private headMotionState!: any; // Ammo.btDefaultMotionState
    private feetMotionState!: any; // Ammo.btDefaultMotionState
    private mainBodyTransform!: any; // Ammo.btTransform for reading position

    constructor(initialPosition: THREE.Vector3) { 
        super({ 
            position: initialPosition,
            materialType: MaterialType.CHARACTER 
        });
        
        // Initialize jump height with default value
        this.jumpHeight = BaseCharacter.DEFAULT_JUMP_HEIGHT;
        
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
    }
    
    protected createCollisionMesh() {
        if (!this.collisionMesh) {
            try {
                const Ammo = WorldContext.getAmmo();
                const radius = BaseCharacter.RADIUS;
                const halfLength = BaseCharacter.HALF_LENGTH;

                // Create a transform for the main body
                const transform = new Ammo.btTransform();
                transform.setIdentity();
                transform.setOrigin(new Ammo.btVector3(this.position.x, this.position.y, this.position.z));
                
                // Store transform for later use
                this.mainBodyTransform = new Ammo.btTransform();
                this.mainBodyTransform.setIdentity();
                
                // Create a motion state (manages the transform)
                const motionState = new Ammo.btDefaultMotionState(transform);
                
                // Create a capsule shape for the main body
                // Y up in Ammo.js, so we use Y axis capsule (unlike CANNON's Z axis)
                const capsuleShape = new Ammo.btCapsuleShape(radius, halfLength * 2);
                
                // Calculate inertia for dynamic body
                const mass = 7;
                const localInertia = new Ammo.btVector3(0, 0, 0);
                capsuleShape.calculateLocalInertia(mass, localInertia);
                
                // Create the rigid body construction info
                const rbInfo = new Ammo.btRigidBodyConstructionInfo(
                    mass,
                    motionState,
                    capsuleShape,
                    localInertia
                );
                
                // Create the body and apply damping
                this.collisionMesh = new Ammo.btRigidBody(rbInfo);
                this.collisionMesh.setDamping(0.85, 0.99); // linear and angular damping
                
                // Lock rotation to only allow Y-axis rotation
                this.collisionMesh.setAngularFactor(new Ammo.btVector3(0, 1, 0));
                
                // Prevent sleeping for continuous physics updates
                this.collisionMesh.setActivationState(4); // DISABLE_DEACTIVATION
                
                // Create head and feet shapes
                this.headShape = new Ammo.btSphereShape(radius * BaseCharacter.HEAD_SCALE_FACTOR);
                this.feetShape = new Ammo.btSphereShape(radius * BaseCharacter.FEET_SCALE_FACTOR);
                
                // Create transforms for head and feet
                const headTransform = new Ammo.btTransform();
                headTransform.setIdentity();
                headTransform.setOrigin(new Ammo.btVector3(
                    this.position.x, 
                    this.position.y + halfLength, 
                    this.position.z
                ));
                
                const feetTransform = new Ammo.btTransform();
                feetTransform.setIdentity();
                feetTransform.setOrigin(new Ammo.btVector3(
                    this.position.x, 
                    this.position.y - halfLength, 
                    this.position.z
                ));
                
                // Create motion states
                this.headMotionState = new Ammo.btDefaultMotionState(headTransform);
                this.feetMotionState = new Ammo.btDefaultMotionState(feetTransform);
                
                // Calculate inertia for head and feet
                const headInertia = new Ammo.btVector3(0, 0, 0);
                const feetInertia = new Ammo.btVector3(0, 0, 0);
                this.headShape.calculateLocalInertia(0.1, headInertia);
                this.feetShape.calculateLocalInertia(0.1, feetInertia);
                
                // Create head and feet bodies
                const headRBInfo = new Ammo.btRigidBodyConstructionInfo(
                    0.1,
                    this.headMotionState,
                    this.headShape,
                    headInertia
                );
                
                const feetRBInfo = new Ammo.btRigidBodyConstructionInfo(
                    0.1,
                    this.feetMotionState,
                    this.feetShape,
                    feetInertia
                );
                
                this.headBody = new Ammo.btRigidBody(headRBInfo);
                this.feetBody = new Ammo.btRigidBody(feetRBInfo);
                
                // Apply properties to head and feet
                this.headBody.setDamping(0.9, 0.9);
                this.feetBody.setDamping(0.9, 0.9);
                this.headBody.setActivationState(4); // DISABLE_DEACTIVATION
                this.feetBody.setActivationState(4); // DISABLE_DEACTIVATION
                
                // Apply material properties
                this.physicsManager.applyMaterialToBody(this.collisionMesh, MaterialType.CHARACTER);
                this.physicsManager.applyMaterialToBody(this.headBody, MaterialType.CHARACTER);
                this.physicsManager.applyMaterialToBody(this.feetBody, MaterialType.CHARACTER);
                
                // Add head and feet bodies to the world
                this.worldContext.addRigidBody(this.headBody);
                this.worldContext.addRigidBody(this.feetBody);
                
                // Create constraints (joints) between main body and head/feet
                
                // Head constraint
                const pivotInMainA = new Ammo.btVector3(0, halfLength, 0);
                const pivotInHeadB = new Ammo.btVector3(0, 0, 0);
                const headConstraint = new Ammo.btPoint2PointConstraint(
                    this.collisionMesh,
                    this.headBody,
                    pivotInMainA,
                    pivotInHeadB
                );
                
                // Feet constraint
                const pivotInMainC = new Ammo.btVector3(0, -halfLength, 0);
                const pivotInFeetD = new Ammo.btVector3(0, 0, 0);
                const feetConstraint = new Ammo.btPoint2PointConstraint(
                    this.collisionMesh,
                    this.feetBody,
                    pivotInMainC,
                    pivotInFeetD
                );
                
                // Add constraints to the world
                this.worldContext.addConstraint(headConstraint, true);
                this.worldContext.addConstraint(feetConstraint, true);
                
                // Clean up
                Ammo.destroy(rbInfo);
                Ammo.destroy(headRBInfo);
                Ammo.destroy(feetRBInfo);
                Ammo.destroy(headTransform);
                Ammo.destroy(feetTransform);
                Ammo.destroy(localInertia);
                Ammo.destroy(headInertia);
                Ammo.destroy(feetInertia);
                Ammo.destroy(pivotInMainA);
                Ammo.destroy(pivotInHeadB);
                Ammo.destroy(pivotInMainC);
                Ammo.destroy(pivotInFeetD);
                
                // Setup collision detection callbacks - Ammo.js doesn't support direct event listeners
                // We'll need to handle collisions in the update method
                
                console.log("Character physics initialized successfully");
            } catch (error) {
                console.error("Error creating character collision mesh:", error);
            }
        }
    }

    // Since Ammo.js doesn't support collision callbacks directly like CANNON, 
    // we'll use a different approach to detect collisions
    
    private checkCollisions() {
        // A simple check for ground collisions based on velocity changes
        if (this.collisionMesh) {
            const velocity = this.collisionMesh.getLinearVelocity();
            const currentY = velocity.y();
            
            // If velocity suddenly changed from negative to near-zero, likely hit ground
            if (this.previousYVelocity < -2 && currentY > -0.5) {
                this.lastFeetCollisionTime = performance.now();
                this.stabilizeOnGround();
            }
            
            // Store for next frame
            this.previousYVelocity = currentY;
        }
    }

    private stabilizeOnGround(): void {
        if (!this.collisionMesh) return;
        
        try {
            const Ammo = WorldContext.getAmmo();
            // Apply slight damping to vertical velocity on landing
            const velocity = this.collisionMesh.getLinearVelocity();
            
            // Apply damped velocity
            const newVelocity = new Ammo.btVector3(
                velocity.x() * 0.9,  // Slight horizontal damping
                velocity.y() * 0.6,  // Stronger vertical damping
                velocity.z() * 0.9   // Slight horizontal damping
            );
            
            this.collisionMesh.setLinearVelocity(newVelocity);
            
            // Ensure character is upright after landing
            this.enforceUpright();
            
            // Clean up
            Ammo.destroy(newVelocity);
        } catch (error) {
            console.error('Error stabilizing character on ground:', error);
        }
    }

    private enforceUpright(): void {
        if (!this.collisionMesh) return;
        
        try {
            const Ammo = WorldContext.getAmmo();
            // Get the current rotation as a quaternion
            const currentRotation = this.collisionMesh.getWorldTransform().getRotation();
            
            // Extract Euler angles from quaternion
            // Note: In Ammo.js we need to use a temporary btTransform to do this cleanly
            const tempTransform = new Ammo.btTransform();
            tempTransform.setIdentity();
            tempTransform.setRotation(currentRotation);
            
            // Create a new transform that only preserves Y rotation
            const uprightTransform = new Ammo.btTransform();
            uprightTransform.setIdentity();
            
            // Create a quaternion for Y rotation only
            const yRotation = new Ammo.btQuaternion();
            yRotation.setEulerZYX(0, tempTransform.getRotation().y(), 0);
            
            // Set the upright rotation
            uprightTransform.setRotation(yRotation);
            
            // Apply the rotation to the rigid body
            this.collisionMesh.getWorldTransform().setRotation(uprightTransform.getRotation());
            
            // Reset angular velocity
            const zeroAngVel = new Ammo.btVector3(0, 0, 0);
            this.collisionMesh.setAngularVelocity(zeroAngVel);
            
            // Clean up
            Ammo.destroy(tempTransform);
            Ammo.destroy(uprightTransform);
            Ammo.destroy(yRotation);
            Ammo.destroy(zeroAngVel);
        } catch (error) {
            console.error('Error enforcing upright position:', error);
        }
    }

    public updatePosition(deltaTime: number, inputVector: THREE.Vector3): void {
        if (!this.collisionMesh) return;
        
        try {
            const Ammo = WorldContext.getAmmo();
            // Check if there's any input
            if (inputVector.lengthSq() > 0) {
                // When there's input, apply velocity based on input
                inputVector.normalize();
                
                // Get current velocity
                const velocity = this.collisionMesh.getLinearVelocity();
                const currentYVelocity = velocity.y();
                
                // Apply new velocity
                const newVelocity = new Ammo.btVector3(
                    inputVector.x * this.moveSpeed,
                    currentYVelocity,
                    inputVector.z * this.moveSpeed
                );
                
                // Set a maximum velocity limit to prevent tunneling
                const currentSpeed = Math.sqrt(
                    newVelocity.x() * newVelocity.x() + newVelocity.z() * newVelocity.z()
                );
                
                const maxSpeed = 5;
                if (currentSpeed > maxSpeed) {
                    const scaleFactor = maxSpeed / currentSpeed;
                    newVelocity.setX(newVelocity.x() * scaleFactor);
                    newVelocity.setZ(newVelocity.z() * scaleFactor);
                }
                
                this.collisionMesh.setLinearVelocity(newVelocity);
                Ammo.destroy(newVelocity);
                
            } else {
                // When there's no input, stop horizontal movement
                const velocity = this.collisionMesh.getLinearVelocity();
                const newVelocity = new Ammo.btVector3(0, velocity.y(), 0);
                this.collisionMesh.setLinearVelocity(newVelocity);
                Ammo.destroy(newVelocity);
            }
            
            // Ensure character stays upright
            this.enforceUpright();
            
            // Check for collisions
            this.checkCollisions();
        } catch (error) {
            console.error('Error updating character position:', error);
        }
    }

    public jump() {
        if (!this.collisionMesh) return;
        
        try {
            const Ammo = WorldContext.getAmmo();
            // Calculate jump force
            const jumpForce = this.jumpHeight * BaseCharacter.JUMP_FORCE_MULTIPLIER;
            
            // Create force vector
            const jumpVector = new Ammo.btVector3(0, jumpForce, 0);
            
            // Apply the impulse
            this.collisionMesh.applyCentralImpulse(jumpVector);
            
            // Clean up
            Ammo.destroy(jumpVector);
            
            // Set the state to jumping
            this.setState(new CharacterJumpingState(this));
        } catch (error) {
            console.error('Error during jump:', error);
        }
    }

    public setVelocity(options: { x?: number; y?: number; z?: number } = {}): void {
        if (this.collisionMesh) {
            try {
                const Ammo = WorldContext.getAmmo();
                // Get the current velocity
                const velocity = this.collisionMesh.getLinearVelocity();
        
                // Determine the new velocity components, using the current values as default
                const newVelocityX = options.x !== undefined ? options.x : velocity.x();
                const newVelocityY = options.y !== undefined ? options.y : velocity.y();
                const newVelocityZ = options.z !== undefined ? options.z : velocity.z();
        
                // Set the new velocity
                const newVelocity = new Ammo.btVector3(newVelocityX, newVelocityY, newVelocityZ);
                this.collisionMesh.setLinearVelocity(newVelocity);
                
                // Clean up
                Ammo.destroy(newVelocity);
            } catch (error) {
                console.error('Error setting velocity:', error);
            }
        }
    }    

    public setAcceleration(options: { x?: number; y?: number; z?: number } = {}): void {
        if (this.collisionMesh) {
            try {
                const Ammo = WorldContext.getAmmo();
                // Calculate mass to convert acceleration to force
                const mass = this.collisionMesh.getMass();
        
                // Get the current force directly (no getter for force in Ammo)
                // Instead, we'll just create a new force vector
                
                // Convert acceleration to force (F = ma)
                const forceX = (options.x !== undefined ? options.x : 0) * mass;
                const forceY = (options.y !== undefined ? options.y : 0) * mass;
                const forceZ = (options.z !== undefined ? options.z : 0) * mass;
                
                // Clear existing forces
                this.collisionMesh.clearForces();
                
                // Apply the new force if any component is non-zero
                if (forceX !== 0 || forceY !== 0 || forceZ !== 0) {
                    const force = new Ammo.btVector3(forceX, forceY, forceZ);
                    this.collisionMesh.applyCentralForce(force);
                    Ammo.destroy(force);
                }
            } catch (error) {
                console.error('Error setting acceleration:', error);
            }
        }
    }

    public isAtPointOfInflection(): boolean {
        if (!this.collisionMesh) return false;
    
        const threshold = 0.1; // Define the margin of error
    
        // Get the current Y velocity
        const velocity = this.collisionMesh.getLinearVelocity();
        const currentYVelocity = velocity.y();
    
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
    
        // Update position of head and feet bodies from constraints
        // Ammo.js does this automatically through the constraints
        
        // Check for collisions (since we don't have direct event listeners)
        this.checkCollisions();
        
        // Additional custom animations could go here
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

    /**
     * Sets the jump height to a new value
     * @param height The new jump height value
     */
    public setJumpHeight(height: number): void {
        this.jumpHeight = height;
        if (this.collisionDebugEnabled) {
            console.log(`Jump height set to: ${height}`);
        }
    }

    /**
     * Increases or decreases the jump height by the given amount
     * @param amount The amount to adjust the jump height by (positive or negative)
     */
    public adjustJumpHeight(amount: number): void {
        this.jumpHeight += amount;
        // Ensure jump height doesn't go negative
        if (this.jumpHeight < 0) {
            this.jumpHeight = 0;
        }
        if (this.collisionDebugEnabled) {
            console.log(`Jump height adjusted to: ${this.jumpHeight}`);
        }
    }

    /**
     * Resets the jump height to the default value
     */
    public resetJumpHeight(): void {
        this.jumpHeight = BaseCharacter.DEFAULT_JUMP_HEIGHT;
    }

    /**
     * Gets the current jump height
     * @returns The current jump height
     */
    public getJumpHeight(): number {
        return this.jumpHeight;
    }

    /**
     * Gets the jump force multiplier
     * @returns The current jump force multiplier
     */
    public getJumpForceMultiplier(): number {
        return BaseCharacter.JUMP_FORCE_MULTIPLIER;
    }

    // Method to get collision body data in a format compatible with previous Cannon-ES code
    public getCollisionBody(): { position: THREE.Vector3, velocity: THREE.Vector3 } {
        const position = new THREE.Vector3(this.position.x, this.position.y, this.position.z);
        const velocity = new THREE.Vector3();
        
        if (this.collisionMesh) {
            try {
                const Ammo = WorldContext.getAmmo();
                
                // Use a local transform if the main one isn't initialized yet
                if (!this.mainBodyTransform) {
                    this.mainBodyTransform = new Ammo.btTransform();
                    this.mainBodyTransform.setIdentity();
                }
                
                // Get position from Ammo
                const transform = this.mainBodyTransform;
                
                // Safely get the transform
                if (this.collisionMesh.getMotionState()) {
                    this.collisionMesh.getMotionState().getWorldTransform(transform);
                    const ammoPos = transform.getOrigin();
                    position.set(ammoPos.x(), ammoPos.y(), ammoPos.z());
                    
                    // Get velocity from Ammo
                    const ammoVel = this.collisionMesh.getLinearVelocity();
                    velocity.set(ammoVel.x(), ammoVel.y(), ammoVel.z());
                } else {
                    console.warn("Physics body doesn't have a valid motion state yet");
                }
            } catch (error) {
                console.error('Error getting collision body data:', error);
            }
        }
        
        // Return an object with the same structure as was expected from Cannon-ES
        return {
            position: position,
            velocity: velocity
        };
    }
}
