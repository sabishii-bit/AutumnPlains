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
    private static readonly DEFAULT_JUMP_HEIGHT = 1;
    private static readonly JUMP_FORCE_MULTIPLIER = 1;
    
    public jumpHeight: number;
    public moveSpeed!: number;
    public direction!: THREE.Vector3;
    private currentState!: CharacterState;

    private previousYVelocity: number = 0;
    private lastCollisionTime: number = 0;
    private collisionDebugEnabled: boolean = true; // Toggle for collision debug messages
    private mainBodyTransform!: any; // Ammo.btTransform for reading position
    
    // Raycasting for ground detection
    private groundRaycastDistance: number = 0.15; // Distance to raycast below the character
    private isOnGround: boolean = false;
    private raycastStartTime: number = 0;
    private raycastResults: any = null;
    // Store these vectors to avoid recreating them on every raycast
    private rayStart: any = null; 
    private rayEnd: any = null;

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
        
        // Initialize raycasting objects right away
        this.initRaycastObjects();
    }
    
    /**
     * Initialize raycast objects for ground detection
     */
    private initRaycastObjects(): void {
        try {
            const Ammo = WorldContext.getAmmo();
            
            if (!this.raycastResults) {
                // Initialize from vector and to vector
                const fromVec = new Ammo.btVector3(0, 0, 0);
                const toVec = new Ammo.btVector3(0, -1, 0);
                
                // Create the raycast result callback
                this.raycastResults = new Ammo.ClosestRayResultCallback(fromVec, toVec);
                
                // Create reusable ray vectors
                this.rayStart = new Ammo.btVector3(0, 0, 0);
                this.rayEnd = new Ammo.btVector3(0, 0, 0);
                
                // Clean up temporary vectors
                Ammo.destroy(fromVec);
                Ammo.destroy(toVec);
                
                if (this.collisionDebugEnabled) {
                    console.log("Raycast objects initialized");
                }
            }
        } catch (error) {
            console.error("Error initializing raycast objects:", error);
        }
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
                // Y up in Ammo.js, so we use Y axis capsule
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
                this.collisionMesh.setDamping(0.1, 0.5); // Reduce linear damping to allow gravity to work better
                
                // Lock rotation to only allow Y-axis rotation
                this.collisionMesh.setAngularFactor(new Ammo.btVector3(0, 1, 0));
                
                // Prevent sleeping for continuous physics updates
                this.collisionMesh.setActivationState(4); // DISABLE_DEACTIVATION
                
                // Apply material properties
                this.physicsManager.applyMaterialToBody(this.collisionMesh, MaterialType.CHARACTER);
                
                // Explicitly add to the physics world
                this.worldContext.addRigidBody(this.collisionMesh);
                
                // Ensure body is active
                this.collisionMesh.activate(true);
                
                // Make sure body responds to gravity (ensure flag is properly set)
                this.collisionMesh.setFlags(0);
                
                // Make sure raycast objects are initialized
                this.initRaycastObjects();
                
                // Clean up
                Ammo.destroy(rbInfo);
                Ammo.destroy(transform);
                Ammo.destroy(localInertia);
                
                console.log("Character physics initialized successfully at position", this.position);
                
                // Debug: Print gravity
                const gravity = WorldContext.getGravity();
                console.log("Physics world gravity:", gravity.y);
            } catch (error) {
                console.error("Error creating character collision mesh:", error);
            }
        }
    }

    // Instead of relying on multiple bodies for collision detection,
    // use raycasting to detect ground contact
    private checkGroundContact() {
        if (!this.collisionMesh) return;
        
        try {
            const Ammo = WorldContext.getAmmo();
            const now = performance.now();
            
            // Ensure we have raycast objects
            if (!this.raycastResults || !this.rayStart || !this.rayEnd) {
                this.initRaycastObjects();
                
                // If still null after initialization, skip the raycast this frame
                if (!this.raycastResults || !this.rayStart || !this.rayEnd) {
                    console.warn("Raycast objects not available, skipping ground check");
                    return;
                }
            }
            
            // Check velocity - if we're moving upward significantly, temporarily ignore ground contact
            // This helps prevent false ground detection right after jumping
            const velocity = this.collisionMesh.getLinearVelocity();
            const yVelocity = velocity.y();
            
            // If we're clearly jumping upward, skip the ground check entirely
            if (yVelocity > 3.0) {
                this.isOnGround = false; // Explicitly set to false when jumping upward
                return;
            }
            
            // Ensure transform is initialized
            if (!this.mainBodyTransform) {
                this.mainBodyTransform = new Ammo.btTransform();
                this.mainBodyTransform.setIdentity();
            }
            
            // Only perform raycast check periodically for performance
            if (now - this.raycastStartTime > 25) { // Check every 25ms (increased frequency for better detection)
                this.raycastStartTime = now;
                
                // Get current position
                if (this.collisionMesh.getMotionState()) {
                    // Get the motion state's transform
                    const motionState = this.collisionMesh.getMotionState();
                    if (!motionState) {
                        console.warn("No motion state available for character");
                        return;
                    }
                    
                    // Get the world transform into our transform object
                    motionState.getWorldTransform(this.mainBodyTransform);
                    if (!this.mainBodyTransform) {
                        console.warn("Transform not available after getWorldTransform");
                        return;
                    }
                    
                    // Get the origin from the transform
                    const origin = this.mainBodyTransform.getOrigin();
                    if (!origin) {
                        console.warn("Origin not available from transform");
                        return;
                    }
                    
                    // Make sure we have valid coordinates
                    const x = origin.x();
                    const y = origin.y();
                    const z = origin.z();
                    
                    if (isNaN(x) || isNaN(y) || isNaN(z)) {
                        console.warn("Invalid coordinates from physics transform:", x, y, z);
                        return;
                    }
                    
                    // Set up multiple raycasts from different points of the character's bottom
                    // This helps detect landing on smaller objects
                    const checkPoints = [
                        { x: 0, z: 0 },      // Center point
                        { x: 0.1, z: 0 },    // Slight offset +X
                        { x: -0.1, z: 0 },   // Slight offset -X
                        { x: 0, z: 0.1 },    // Slight offset +Z
                        { x: 0, z: -0.1 }    // Slight offset -Z
                    ];
                    
                    let hitDetected = false;
                    let hitObjectName = "unknown";
                    
                    // Skip certain raycast points if we're jumping, to prevent detecting objects we just jumped from
                    // Only use the center point when jumping to reduce false positives
                    const pointsToCheck = yVelocity > 0 ? [checkPoints[0]] : checkPoints;
                    
                    // Try each point until we find a hit
                    for (const point of pointsToCheck) {
                        if (hitDetected) break;
                        
                        // Set up raycast from the bottom of capsule with offset
                        this.rayStart.setValue(
                            x + point.x,
                            y - (BaseCharacter.HALF_LENGTH * 0.95), // Position closer to the actual bottom
                            z + point.z
                        );
                        
                        this.rayEnd.setValue(
                            x + point.x,
                            y - (BaseCharacter.HALF_LENGTH + this.groundRaycastDistance),
                            z + point.z
                        );
                        
                        // Reset the raycast callback
                        this.raycastResults.set_m_closestHitFraction(1);
                        this.raycastResults.set_m_collisionObject(null);
                        this.raycastResults.m_rayFromWorld = this.rayStart;
                        this.raycastResults.m_rayToWorld = this.rayEnd;
                        
                        // Perform the raycast
                        this.worldContext.rayTest(this.rayStart, this.rayEnd, this.raycastResults);
                        
                        // Check if we hit something
                        if (this.raycastResults.hasHit()) {
                            hitDetected = true;
                            
                            // Try to get the hit object information
                            try {
                                const hitObject = this.raycastResults.get_m_collisionObject();
                                if (hitObject) {
                                    // Get the name from the hit object if available
                                    if (hitObject.name) {
                                        hitObjectName = hitObject.name;
                                    } else if (hitObject.getUserPointer) {
                                        const userData = hitObject.getUserPointer();
                                        if (userData && userData.name) {
                                            hitObjectName = userData.name;
                                        }
                                    }
                                }
                            } catch (e) {
                                // Ignore errors when trying to get object name
                            }
                            
                            break;
                        }
                    }
                    
                    // Update ground state
                    const wasGrounded = this.isOnGround;
                    
                    // Only update if we've found a hit or we're currently grounded
                    // This handles edge cases where we're jumping from a surface
                    if (hitDetected || wasGrounded) {
                        this.isOnGround = hitDetected;
                        
                        // If we just landed, handle the landing
                        if (!wasGrounded && this.isOnGround) {
                            this.lastCollisionTime = now;
                            this.stabilizeOnGround();
                            console.log(`Character landed on object: ${hitObjectName}`);
                        }
                    }
                }
            }
            
            // Also check using velocity changes as a backup method, but only if we're not jumping
            if (this.collisionMesh && yVelocity <= 0) {
                // If velocity suddenly changed from negative to near-zero, likely hit ground
                if (this.previousYVelocity < -1 && yVelocity > -0.3) {
                    this.lastCollisionTime = performance.now();
                    this.stabilizeOnGround();
                    this.isOnGround = true;
                    console.log("Character landed (detected via velocity change)");
                }
                
                // Store for next frame
                this.previousYVelocity = yVelocity;
            }
            
            // Check for contact points as an additional detection method (only when not jumping)
            if (yVelocity <= 0.5) {
                this.checkContactPoints();
            }
            
        } catch (error) {
            console.error('Error checking ground contact:', error);
        }
    }
    
    // New method to check contact points for ground detection
    private checkContactPoints(): void {
        if (!this.collisionMesh) return;
        
        try {
            const Ammo = WorldContext.getAmmo();
            const physicsWorld = this.worldContext;
            
            // Create a contact test to check collisions
            const cb = new Ammo.ConcreteContactResultCallback();
            let hasContact = false;
            
            // Set up callback functions
            cb.addSingleResult = function(
                cp: any, 
                colObj0: any, 
                partId0: any, 
                index0: any, 
                colObj1: any, 
                partId1: any, 
                index1: any
            ) {
                const contactPoint = Ammo.wrapPointer(cp, Ammo.btManifoldPoint);
                const distance = contactPoint.getDistance();
                
                // If distance is very small, we have a contact
                if (distance <= 0.05) {
                    hasContact = true;
                }
                return 0;
            };
            
            // Perform the contact test
            physicsWorld.contactTest(this.collisionMesh, cb);
            
            // Update ground state if contact is detected and we're not already grounded
            if (hasContact && !this.isOnGround) {
                this.isOnGround = true;
                this.lastCollisionTime = performance.now();
                this.stabilizeOnGround();
                console.log("Character landed (detected via contact test)");
            }
            
            // Clean up
            Ammo.destroy(cb);
        } catch (error) {
            // Silently handle - this method is optional and a fallback
            console.log("Contact point check not supported", error);
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
            
            // Make sure the body is active
            this.collisionMesh.activate(true);
            
            // Check if there's any input
            if (inputVector.lengthSq() > 0) {
                // Get current velocity
                const velocity = this.collisionMesh.getLinearVelocity();
                const currentYVelocity = velocity.y();
                
                // Get the actual move speed (normalized by a factor to make it match expected units)
                // A higher divisor makes it less sensitive to very high speeds
                const rawMoveSpeed = this.moveSpeed || 5; // Use default if not set
                const effectiveSpeed = rawMoveSpeed / 6; // Scale down to reasonable value for Ammo.js
                
                // Apply velocity directly for physics objects that don't support forces
                const newVelocity = new Ammo.btVector3(
                    inputVector.x * effectiveSpeed,
                    currentYVelocity,
                    inputVector.z * effectiveSpeed
                );
                
                // DEBUG: Log the speed values occasionally
                if (Math.random() < 0.01) { // 1% chance to log each frame
                    console.log(`Move speed: raw=${rawMoveSpeed}, effective=${effectiveSpeed}, input magnitude=${inputVector.length()}`);
                    console.log(`Velocity magnitude: ${Math.sqrt(newVelocity.x()*newVelocity.x() + newVelocity.z()*newVelocity.z())}`);
                }
                
                // Set the velocity directly
                this.collisionMesh.setLinearVelocity(newVelocity);
                
                // Try to apply force if the method exists - this helps with acceleration
                try {
                    if (typeof this.collisionMesh.applyCentralForce === 'function') {
                        const moveForce = effectiveSpeed * 10; // Force multiplier for better acceleration
                        const moveDirection = new Ammo.btVector3(
                            inputVector.x * moveForce,
                            0,
                            inputVector.z * moveForce
                        );
                        
                        this.collisionMesh.applyCentralForce(moveDirection);
                        Ammo.destroy(moveDirection);
                    }
                } catch (forceError) {
                    // If applying force fails, we already set the velocity directly above
                    console.log("Note: Force-based movement not available, using velocity-based movement");
                }
                
                // Clean up
                Ammo.destroy(newVelocity);
                
            } else {
                // When there's no input, add horizontal damping
                const velocity = this.collisionMesh.getLinearVelocity();
                const newVelocity = new Ammo.btVector3(
                    velocity.x() * 0.9, // Apply horizontal damping
                    velocity.y(),
                    velocity.z() * 0.9  // Apply horizontal damping
                );
                this.collisionMesh.setLinearVelocity(newVelocity);
                Ammo.destroy(newVelocity);
            }
            
            // Ensure character stays upright
            this.enforceUpright();
            
            // Check for ground contact
            this.checkGroundContact();
        } catch (error) {
            console.error('Error updating character position:', error);
            
            // Fallback simple movement if physics fails
            if (inputVector.lengthSq() > 0 && this.visualMesh) {
                const fallbackSpeed = this.moveSpeed / 100; // Scale for reasonable fallback movement
                this.visualMesh.position.x += inputVector.x * fallbackSpeed;
                this.visualMesh.position.z += inputVector.z * fallbackSpeed;
            }
        }
    }

    public jump() {
        if (!this.collisionMesh) return;
        
        try {
            const Ammo = WorldContext.getAmmo();
            
            // Get the current gravity to scale jump force
            const gravity = WorldContext.getGravity();
            const gravityStrength = Math.abs(gravity.y);
            
            // Calculate jump force - scale with gravity strength for consistent jump height
            const gravityFactor = gravityStrength / 10; // Normalize gravity effect
            const scaledJumpForce = this.jumpHeight * BaseCharacter.JUMP_FORCE_MULTIPLIER * gravityFactor;
            const jumpForce = Math.max(scaledJumpForce, 1); // Minimum value to ensure some jumping
            
            // Apply jump using both velocity setting and impulse (if available)
            const velocity = this.collisionMesh.getLinearVelocity();
            
            // Set velocity directly (reliable method)
            const newVelocity = new Ammo.btVector3(
                velocity.x(),
                jumpForce,
                velocity.z()
            );
            this.collisionMesh.setLinearVelocity(newVelocity);
            Ammo.destroy(newVelocity);
            
            // Try to apply impulse if the method exists
            try {
                if (typeof this.collisionMesh.applyCentralImpulse === 'function') {
                    // Create force vector for extra impulse power
                    const jumpVector = new Ammo.btVector3(0, jumpForce * 0.5, 0);
                    this.collisionMesh.applyCentralImpulse(jumpVector);
                    Ammo.destroy(jumpVector);
                }
            } catch (impulseError) {
                console.log("Note: Impulse-based jumping not available, using velocity-based jumping");
            }
            
            // Force ground detection to be false when jumping
            this.isOnGround = false;
            
            // Reset collision time to avoid detecting landing immediately
            this.lastCollisionTime = 0;
            
            // Set the state to jumping
            this.setState(new CharacterJumpingState(this));
            
            if (this.collisionDebugEnabled) {
                console.log(`Jump initiated with force: ${jumpForce} (gravity: ${gravity.y})`);
            }
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
        return currentTime - this.lastCollisionTime <= threshold;
    }
    
    /**
     * Check if the character is currently on the ground
     * @param extendedDistance Optional parameter to extend the raycast distance for lookahead checks
     * @returns True if the character is on the ground
     */
    public isGrounded(extendedDistance: number = 0): boolean {
        // First check the cached ground status
        if (this.isOnGround) {
            return true;
        }
        
        // If we've requested an extended check, perform an immediate raycast
        if (extendedDistance > 0 && this.collisionMesh) {
            try {
                const Ammo = WorldContext.getAmmo();
                
                // Ensure we have raycast objects
                if (!this.raycastResults || !this.rayStart || !this.rayEnd) {
                    this.initRaycastObjects();
                    if (!this.raycastResults) return false;
                }
                
                // Ensure transform is initialized
                if (!this.mainBodyTransform) {
                    this.mainBodyTransform = new Ammo.btTransform();
                    this.mainBodyTransform.setIdentity();
                }
                
                // Get current position
                if (this.collisionMesh.getMotionState()) {
                    const motionState = this.collisionMesh.getMotionState();
                    if (!motionState) return false;
                    
                    // Get the world transform into our transform object
                    motionState.getWorldTransform(this.mainBodyTransform);
                    if (!this.mainBodyTransform) return false;
                    
                    // Get the origin from the transform
                    const origin = this.mainBodyTransform.getOrigin();
                    if (!origin) return false;
                    
                    // Set up raycast from bottom of capsule with extended distance
                    this.rayStart.setValue(
                        origin.x(),
                        origin.y() - (BaseCharacter.HALF_LENGTH * 0.95),
                        origin.z()
                    );
                    
                    this.rayEnd.setValue(
                        origin.x(),
                        origin.y() - (BaseCharacter.HALF_LENGTH + this.groundRaycastDistance + extendedDistance),
                        origin.z()
                    );
                    
                    // Reset the raycast callback
                    this.raycastResults.set_m_closestHitFraction(1);
                    this.raycastResults.set_m_collisionObject(null);
                    this.raycastResults.m_rayFromWorld = this.rayStart;
                    this.raycastResults.m_rayToWorld = this.rayEnd;
                    
                    // Perform the raycast
                    this.worldContext.rayTest(this.rayStart, this.rayEnd, this.raycastResults);
                    
                    // Return hit result for extended check
                    return this.raycastResults.hasHit();
                }
            } catch (error) {
                console.error('Error during extended ground check:', error);
                return false;
            }
        }
        
        // Return the cached ground status if no extended check was requested
        return this.isOnGround;
    }

    public animate(deltaTime: number): void {
        // Perform state-specific actions
        StateManager.executeState(this);

        // Custom animation logic for the player character, if any
        StateManager.decideState(this);
    
        // Check for ground contact
        this.checkGroundContact();
        
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
    
    // Clean up physics resources when the character is destroyed
    public cleanup(): void {
        if (this.rayStart) {
            try {
                const Ammo = WorldContext.getAmmo();
                Ammo.destroy(this.rayStart);
                this.rayStart = null;
            } catch (error) {
                console.error('Error destroying ray start vector:', error);
            }
        }
        
        if (this.rayEnd) {
            try {
                const Ammo = WorldContext.getAmmo();
                Ammo.destroy(this.rayEnd);
                this.rayEnd = null;
            } catch (error) {
                console.error('Error destroying ray end vector:', error);
            }
        }
        
        if (this.raycastResults) {
            try {
                const Ammo = WorldContext.getAmmo();
                Ammo.destroy(this.raycastResults);
                this.raycastResults = null;
            } catch (error) {
                console.error('Error destroying raycast results:', error);
            }
        }
        
        // Let the GameObjectManager handle removal from the scene and physics world
        GameObjectManager.getInstance().deleteObject(this.objectId);
    }

    // Test gravity by applying a vertical impulse and checking fall behavior
    public testGravity(): void {
        if (!this.collisionMesh) return;
        
        try {
            const Ammo = WorldContext.getAmmo();
            
            // Reset velocity first
            const zeroVel = new Ammo.btVector3(0, 0, 0);
            this.collisionMesh.setLinearVelocity(zeroVel);
            Ammo.destroy(zeroVel);
            
            // Get current world gravity
            const gravity = WorldContext.getGravity();
            console.log("Testing character with world gravity:", gravity);
            
            // Apply a small upward impulse to test falling
            const testVel = new Ammo.btVector3(0, 2, 0);
            this.collisionMesh.setLinearVelocity(testVel);
            Ammo.destroy(testVel);
            
            // Set airborne state
            this.setState(new CharacterAirborneState(this));
            this.isOnGround = false;
            
            console.log("Gravity test initiated - character should now fall with gravity:", gravity.y);
        } catch (error) {
            console.error("Error testing gravity:", error);
        }
    }
}
