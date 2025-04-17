import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import GameObject, { GameObjectOptions } from '../../GameObject';
import { MaterialType, PhysicsMaterialsManager } from '../../../../materials/PhysicsMaterialsManager';
import { SceneContext } from '../../../../global/scene/SceneContext';
import { WorldContext } from '../../../../global/world/WorldContext';

export class WallEnvironment extends GameObject {
    private width: number;
    private height: number;
    private depth: number;

    constructor(initialPosition: THREE.Vector3, width: number = 10, height: number = 10, depth: number = 1) {
        super({ 
            position: initialPosition,
            materialType: MaterialType.WALL,
            // Don't add to scene automatically, we'll handle it manually Changed from addToScene: false to use the new property
        });
        
        this.width = width;
        this.height = height;
        this.depth = depth;
        
        // Initialize the game object properly
        this.initializeWall();
        
        console.log(`Wall created at (${initialPosition.x}, ${initialPosition.y}, ${initialPosition.z}) with dimensions: ${width}x${height}x${depth}`);
    }

    /**
     * Initialize both visual and collision components of the wall
     */
    private initializeWall(): void {
        // First create the visual mesh
        this.createVisualMesh();
        
        // Then create the collision mesh (physics body)
        this.createCollisionMesh();
        
        
        console.log(`Wall fully initialized with both visual and collision meshes`);
    }

    protected createVisualMesh(): void {
        // Create a box geometry based on the dimensions provided
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        
        // Create a material that makes it clear this is a wall
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x6688aa,
            roughness: 0.7,
            metalness: 0.2,
            transparent: false
        });
        
        // Create the wall mesh
        this.visualMesh = new THREE.Mesh(geometry, wallMaterial);
        
        // Set the position to match the given position
        this.visualMesh.position.copy(this.position);
        
        console.log(`Wall visual mesh created with dimensions ${this.width}x${this.height}x${this.depth}`);
    }

    protected createCollisionMesh(): void {
        try {
            // Create a box shape with half-extents
            const halfExtents = new CANNON.Vec3(this.width / 2, this.height / 2, this.depth / 2);
            const shape = new CANNON.Box(halfExtents);
            
            // Get the physics materials manager
            const physicsMaterialsManager = PhysicsMaterialsManager.getInstance();
            
            // Create a static body (mass = 0)
            this.collisionMesh = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
                shape: shape,
                material: physicsMaterialsManager.getMaterial(MaterialType.WALL),
                type: CANNON.Body.STATIC  // Explicitly set as static
            });
            
            // Set specific collision group and mask
            this.collisionMesh.collisionFilterGroup = 2;  // Wall group
            this.collisionMesh.collisionFilterMask = -1;  // Collide with everything
            
            
            // Extra safety to ensure the wall stays in place
            this.collisionMesh.sleep();  // Put the body to sleep since it doesn't need to move
            this.collisionMesh.allowSleep = true;
            this.collisionMesh.sleepSpeedLimit = 0.01;
            this.collisionMesh.sleepTimeLimit = 0.1;
            
            console.log(`Wall collision body created with dimensions ${this.width}x${this.height}x${this.depth}`, {
                position: `(${this.position.x}, ${this.position.y}, ${this.position.z})`,
                halfExtents: `(${halfExtents.x}, ${halfExtents.y}, ${halfExtents.z})`
            });
        } catch (error) {
            console.error("Error creating wall collision mesh:", error);
        }
    }
    
    /**
     * Override update to maintain the wall's static position and ensure it doesn't move
     */
    public update(deltaTime: number): void {
        // Call custom animation logic if any
        this.animate(deltaTime);
        
        // Ensure wall stays in its original position (static)
        if (this.collisionMesh) {
            // Refresh collision properties that might have been changed by the physics engine
            this.collisionMesh.position.set(this.position.x, this.position.y, this.position.z);
            this.collisionMesh.velocity.set(0, 0, 0);
            this.collisionMesh.angularVelocity.set(0, 0, 0);
            
            // Keep the body asleep
            this.collisionMesh.sleep();
        }
    }
    
    public animate(deltaTime: number): void {
        // Custom animation logic for walls if needed
        // Walls are static, so no need for complex animation
    }
}
