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
    
    public jumpHeight!: number;
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
            
            // Ensure character stays upright during movement
            this.enforceUpright();
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
}
