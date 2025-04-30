import * as THREE from 'three';
import GameObject, { GameObjectOptions } from '../../GameObject';
import { MaterialType, PhysicsMaterialsManager } from '../../../../physics/PhysicsMaterialsManager';
import { AmmoUtils } from '../../../../physics/AmmoUtils';

// Declare Ammo global
declare const Ammo: any;

export class WallEnvironment extends GameObject {
    private width: number;
    private height: number;
    private depth: number;

    constructor(initialPosition: THREE.Vector3, width: number = 10, height: number = 10, depth: number = 1) {
        super({ 
            position: initialPosition,
            materialType: MaterialType.WALL,
            // Don't add to scene automatically, we'll handle it manually
            skipMeshCreation: true
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
        
        // Add to the game object manager
        this.gameObjectManager.addGameObject(this);
        
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
            // Create a box shape with half-extents (Ammo.js uses half-extents directly)
            const halfExtents = new Ammo.btVector3(this.width / 2, this.height / 2, this.depth / 2);
            const shape = new Ammo.btBoxShape(halfExtents);
            
            // Create a static body (mass = 0) using the GameObject's createPhysicsBody method
            this.collisionMesh = this.createPhysicsBody({
                mass: 0, // Static body
                shape: shape,
                position: this.position,
                friction: 0.4,
                restitution: 0.1
            }, MaterialType.WALL);
            
            // Set specific collision flags for a static object
            this.collisionMesh.setCollisionFlags(this.collisionMesh.getCollisionFlags() | 1); // 1 = STATIC_OBJECT
            
            // Set collision filtering (Ammo.js uses different groups/masks system)
            // Group 2 for walls, -1 (all bits set) for mask to collide with everything
            const wallGroup = 2;
            const allGroups = -1;
            this.collisionMesh.getBroadphaseProxy().set_m_collisionFilterGroup(wallGroup);
            this.collisionMesh.getBroadphaseProxy().set_m_collisionFilterMask(allGroups);
            
            // Clean up the half extents object
            Ammo.destroy(halfExtents);
            
            console.log(`Wall collision body created with dimensions ${this.width}x${this.height}x${this.depth}`, {
                position: `(${this.position.x}, ${this.position.y}, ${this.position.z})`,
                halfExtents: `(${this.width/2}, ${this.height/2}, ${this.depth/2})`
            });
        } catch (error) {
            console.error("Error creating wall collision mesh:", error);
        }
    }
    
    /**
     * Override update to maintain the wall's static position
     */
    public update(deltaTime: number): void {
        // Call custom animation logic if any
        this.animate(deltaTime);
        
        // For static objects in Ammo.js, we typically don't need to manually keep them in place
        // as the physics engine handles this correctly for static objects
        
        // For debugging/visualization, we might still want to sync the mesh with the body
        if (this.getWireframeVisibility()) {
            this.syncMeshWithBody();
        }
    }
    
    public animate(deltaTime: number): void {
        // Custom animation logic for walls if needed
        // Walls are static, so no need for complex animation
    }
}
