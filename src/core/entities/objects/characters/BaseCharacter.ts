import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import GameObject, { GameObjectOptions } from '../GameObject';
import { CharacterState } from './character_state/CharacterState';
import StateManager from './character_state/StateManager';
import { GameObjectManager } from '../../GameObjectManager';
import { CharacterAirborneState } from './character_state/CharacterAirborneState';
import { CharacterJumpingState } from './character_state/CharacterJumpingState';
import { MaterialType } from '../../../materials/PhysicsMaterialsManager';

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

    private headBody!: CANNON.Body;
    private feetBody!: CANNON.Body;
    private previousYVelocity: number = 0;
    private lastFeetCollisionTime: number = 0;
    private collisionDebugEnabled: boolean = true; // Toggle for collision debug messages

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
    
        // Add the visual mesh to the scene
        this.sceneContext.add(this.visualMesh);
    }
    
    protected createCollisionMesh() {
        if (!this.collisionMesh) {
            try {
                const radius = BaseCharacter.RADIUS;
                const halfLength = BaseCharacter.HALF_LENGTH;

                // Main body of the capsule
                const cylinder = new CANNON.Cylinder(radius, radius, halfLength * 2, 16);
                const cylinderQuaternion = new CANNON.Quaternion();
                cylinderQuaternion.setFromEuler(0, 0, Math.PI / 2); // Align with visual mesh

                // Collision body with improved settings for stability
                this.collisionMesh = this.createPhysicsBody({
                    mass: 7,
                    position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
                    linearDamping: 0.85,       // Reduced from 0.99 for more natural movement
                    angularDamping: 0.99,      // Increased to reduce any minimal rotation
                    fixedRotation: true,       // FIXED: Lock rotation to keep character upright
                    allowSleep: false,         // Keep the character awake
                    sleepSpeedLimit: 0.1,      // Very low sleep threshold if sleep is enabled later
                    sleepTimeLimit: 1          // Short sleep time limit if sleep is enabled later
                });

                // Add the cylinder shape to the main body
                this.collisionMesh.addShape(cylinder, new CANNON.Vec3(0, 0, 0), cylinderQuaternion);
                
                // Improve numerical stability
                this.collisionMesh.updateMassProperties();
                this.collisionMesh.updateBoundingRadius();
                
                // Set character collision group and mask
                this.collisionMesh.collisionFilterGroup = 4; // Character group
                this.collisionMesh.collisionFilterMask = -1; // Collide with everything
                
                // Limit maximum velocity to prevent instability
                this.collisionMesh.velocity.set(0, 0, 0);

                // Lock rotation axes to only allow rotation around the Y axis (vertical axis)
                // This keeps the character upright but allows it to turn
                this.collisionMesh.angularFactor.set(0, 1, 0);

                // Create head and feet with the same material type
                this.headBody = this.createPhysicsBody({
                    mass: 0.1,
                    position: new CANNON.Vec3(this.position.x, this.position.y + halfLength, this.position.z),
                    shape: new CANNON.Sphere(radius * BaseCharacter.HEAD_SCALE_FACTOR),
                    angularDamping: 0.99,
                    fixedRotation: true  // Keep head from rotating independently
                });

                this.feetBody = this.createPhysicsBody({
                    mass: 0.1,
                    position: new CANNON.Vec3(this.position.x, this.position.y - halfLength, this.position.z),
                    shape: new CANNON.Sphere(radius * BaseCharacter.FEET_SCALE_FACTOR),
                    angularDamping: 0.99,
                    fixedRotation: true  // Keep feet from rotating independently
                });
                
                // Set head and feet collision groups
                this.headBody.collisionFilterGroup = 4; // Character group
                this.headBody.collisionFilterMask = -1; // Collide with everything
                this.feetBody.collisionFilterGroup = 4; // Character group
                this.feetBody.collisionFilterMask = -1; // Collide with everything

                // Add bodies to world
                this.worldContext.addBody(this.collisionMesh);
                this.worldContext.addBody(this.headBody);
                this.worldContext.addBody(this.feetBody);

                // Create constraints with some flexibility for more stability
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

                // Add constraints with specific stiffness and relaxation
                this.worldContext.addConstraint(headConstraint);
                this.worldContext.addConstraint(feetConstraint);

                // Add event listeners with error handling
                this.headBody.addEventListener('collide', (event: any) => this.handleHeadCollision(event));
                this.feetBody.addEventListener('collide', (event: any) => this.handleFeetCollision(event));
                
                console.log("Character physics initialized successfully");
            } catch (error) {
                console.error("Error creating character collision mesh:", error);
            }
        }
    }

    private handleHeadCollision(event: any) {
        try {
            // Check to avoid self-collision with own parts
            if (event.body !== this.collisionMesh && event.body !== this.feetBody) {
                if (this.collisionDebugEnabled) {
                    console.log('Head collision detected with external object:', event.body);
                }
            }
        } catch (error) {
            console.error('Error in head collision handler:', error);
        }
    }

    private handleFeetCollision(event: any) {
        try {
            // Check to avoid self-collision with own parts
            if (event.body !== this.collisionMesh && event.body !== this.headBody) {
                if (this.collisionDebugEnabled) {
                    // Safe access to properties with null checks
                    const bodyType = event.body?.material?.name || 'unknown';
                    const bodyPosition = event.body?.position ? 
                        `(${event.body.position.x.toFixed(2)}, ${event.body.position.y.toFixed(2)}, ${event.body.position.z.toFixed(2)})` : 
                        'unknown';
                    
                    console.log(`Feet collision detected with: ${bodyType} at ${bodyPosition}`);
                }
                
                // Record the time of this collision
                this.lastFeetCollisionTime = performance.now();
                
                // Stabilize character on ground impact
                this.stabilizeOnGround();
            }
        } catch (error) {
            console.error('Error in feet collision handler:', error);
        }
    }
    
    /**
     * Stabilizes the character when landing on the ground
     * This helps prevent physics instabilities on impact
     */
    private stabilizeOnGround(): void {
        if (!this.collisionMesh) return;
        
        try {
            // Apply slight damping to vertical velocity on landing
            const currentVelocity = this.collisionMesh.velocity;
            
            // If falling with significant speed, dampen the landing
            if (currentVelocity.y < -5) {
                // Cap the landing velocity to prevent extreme values
                const cappedYVelocity = Math.max(currentVelocity.y, -15);
                
                // Apply damped velocity
                this.collisionMesh.velocity.set(
                    currentVelocity.x * 0.9,  // Slight horizontal damping
                    cappedYVelocity * 0.6,    // Stronger vertical damping
                    currentVelocity.z * 0.9   // Slight horizontal damping
                );
                
                // Ensure character is upright after landing
                this.enforceUpright();
                
                if (this.collisionDebugEnabled) {
                    console.log(`Landing stabilized. Original Y vel: ${currentVelocity.y.toFixed(2)}, New: ${this.collisionMesh.velocity.y.toFixed(2)}`);
                }
            }
        } catch (error) {
            console.error('Error stabilizing character on ground:', error);
        }
    }

    /**
     * Forces the character to remain upright by resetting rotation
     */
    private enforceUpright(): void {
        if (!this.collisionMesh) return;
        
        try {
            // Create a quaternion that only preserves Y-axis rotation
            const currentRotation = this.collisionMesh.quaternion;
            
            // Extract the Y-axis rotation (yaw) only
            const eulerRotation = new CANNON.Vec3();
            currentRotation.toEuler(eulerRotation);
            
            // Create new quaternion with only Y rotation
            const uprightQuaternion = new CANNON.Quaternion();
            uprightQuaternion.setFromEuler(0, eulerRotation.y, 0);
            
            // Apply the upright orientation
            this.collisionMesh.quaternion.copy(uprightQuaternion);
            
            // Reset angular velocity to stop any ongoing rotation
            this.collisionMesh.angularVelocity.set(0, 0, 0);
        } catch (error) {
            console.error('Error enforcing upright position:', error);
        }
    }

    public updatePosition(deltaTime: number, inputVector: THREE.Vector3): void {
        if (!this.collisionMesh) return;
        
        try {
            // Check if there's any input
            if (inputVector.lengthSq() > 0) {
                // When there's input, apply velocity based on input
                inputVector.normalize();
                
                // Store current position before moving (for collision resolution)
                const previousPosition = new CANNON.Vec3().copy(this.collisionMesh.position);
                
                // Apply velocity for movement
                this.collisionMesh.velocity.x = inputVector.x * this.moveSpeed;
                this.collisionMesh.velocity.z = inputVector.z * this.moveSpeed;
                
                // Keep vertical velocity the same (for jumping/falling)
                const currentYVelocity = this.collisionMesh.velocity.y;
                
                // Set a maximum velocity limit to prevent tunneling through walls
                const maxSpeed = 5; // Maximum speed in any direction
                const currentSpeed = Math.sqrt(
                    this.collisionMesh.velocity.x * this.collisionMesh.velocity.x + 
                    this.collisionMesh.velocity.z * this.collisionMesh.velocity.z
                );
                
                if (currentSpeed > maxSpeed) {
                    const scaleFactor = maxSpeed / currentSpeed;
                    this.collisionMesh.velocity.x *= scaleFactor;
                    this.collisionMesh.velocity.z *= scaleFactor;
                }
                
                // Log collision info if debug is enabled
                if (this.collisionDebugEnabled) {
                    console.log(`Character moving with velocity: (${this.collisionMesh.velocity.x.toFixed(2)}, ${this.collisionMesh.velocity.y.toFixed(2)}, ${this.collisionMesh.velocity.z.toFixed(2)})`);
                }
            } else {
                // When there's no input, immediately stop horizontal movement
                this.collisionMesh.velocity.x = 0;
                this.collisionMesh.velocity.z = 0;
            }
            
            // Sync connected bodies
            if (this.headBody && this.feetBody) {
                // Update head and feet positions to match main body
                const halfLength = BaseCharacter.HALF_LENGTH;
                
                this.headBody.position.set(
                    this.collisionMesh.position.x,
                    this.collisionMesh.position.y + halfLength,
                    this.collisionMesh.position.z
                );
                
                this.feetBody.position.set(
                    this.collisionMesh.position.x,
                    this.collisionMesh.position.y - halfLength,
                    this.collisionMesh.position.z
                );
            }
            
            // Ensure character stays upright during movement
            this.enforceUpright();
        } catch (error) {
            console.error('Error updating character position:', error);
        }
    }

    public jump() {
        if (!this.collisionMesh) return;
        
        // Apply a jump impulse instead of directly setting velocity
        // This works better with physics and allows for the jump height to be properly adjusted
        const jumpForce = this.jumpHeight * BaseCharacter.JUMP_FORCE_MULTIPLIER;
        
        // Apply the impulse in the world's up direction
        this.collisionMesh.applyImpulse(
            new CANNON.Vec3(0, jumpForce, 0),
            new CANNON.Vec3(0, 0, 0)
        );
        
        // Set the state to jumping
        this.setState(new CharacterJumpingState(this));
        
        if (this.collisionDebugEnabled) {
            console.log(`Jump applied with force: ${jumpForce} (height: ${this.jumpHeight})`);
        }
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
            
            // Ensure character remains upright during animation
            this.enforceUpright();
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
}
