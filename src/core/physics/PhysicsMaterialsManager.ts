import { WorldContext } from '../global/world/WorldContext';

/**
 * Predefined material types for easy reference
 */
export enum MaterialType {
    DEFAULT = 'default',
    GROUND = 'ground',
    CHARACTER = 'character',
    WALL = 'wall',
    DYNAMIC = 'dynamic',
    ICE = 'ice',
    BOUNCY = 'bouncy',
    WOOD = 'wood',
    METAL = 'metal',
    // Add more material types as needed
}

/**
 * Interface for material properties
 */
export interface MaterialProperties {
    friction?: number;
    restitution?: number;
    // Add more material properties as needed
}

/**
 * Interface for contact material properties
 */
export interface ContactMaterialProperties {
    friction?: number;
    restitution?: number;
    contactEquationStiffness?: number;
    contactEquationRelaxation?: number;
    frictionEquationStiffness?: number;
    frictionEquationRelaxation?: number;
}

/**
 * Manages physics materials and their interactions in the game world
 */
export class PhysicsMaterialsManager {
    private static instance: PhysicsMaterialsManager;
    private worldContext: any; // Ammo.btDiscreteDynamicsWorld
    private materials: Map<MaterialType, MaterialProperties>;

    /**
     * Initialize the physics materials manager
     */
    private constructor() {
        this.worldContext = WorldContext.getInstance();
        this.materials = new Map();
        
        // Initialize default materials
        this.initializeDefaultMaterials();
    }
    
    /**
     * Get the singleton instance of PhysicsMaterialsManager
     */
    public static getInstance(): PhysicsMaterialsManager {
        if (!PhysicsMaterialsManager.instance) {
            PhysicsMaterialsManager.instance = new PhysicsMaterialsManager();
        }
        return PhysicsMaterialsManager.instance;
    }
    
    /**
     * Initialize default materials with predefined properties
     */
    private initializeDefaultMaterials(): void {
        // Create default material (used when no material is specified)
        this.createMaterial(MaterialType.DEFAULT, { friction: 0.3, restitution: 0.3 });
        
        // Ground material (high friction, no bounce)
        this.createMaterial(MaterialType.GROUND, { friction: 0.8, restitution: 0.0 });
        
        // Character material (moderate friction, no bounce)
        this.createMaterial(MaterialType.CHARACTER, { friction: 0.5, restitution: 0.0 });
        
        // Wall material (moderate friction, low bounce)
        this.createMaterial(MaterialType.WALL, { friction: 0.4, restitution: 0.1 });
        
        // Dynamic objects (moderate friction, moderate bounce)
        this.createMaterial(MaterialType.DYNAMIC, { friction: 0.4, restitution: 0.4 });
        
        // Ice material (very low friction)
        this.createMaterial(MaterialType.ICE, { friction: 0.05, restitution: 0.1 });
        
        // Bouncy material (high restitution)
        this.createMaterial(MaterialType.BOUNCY, { friction: 0.5, restitution: 0.9 });

        console.log("Default materials initialized for Ammo.js");
    }
    
    /**
     * Create a new physics material with the given properties
     * @param type Material type identifier
     * @param properties Material properties
     */
    public createMaterial(type: MaterialType, properties: MaterialProperties = {}): void {
        // In Ammo.js, materials are not created separately like in CANNON
        // Instead, we store the properties to apply them to rigid bodies later
        this.materials.set(type, {
            friction: properties.friction !== undefined ? properties.friction : 0.3,
            restitution: properties.restitution !== undefined ? properties.restitution : 0.3
        });
        
        console.log(`Created material: ${type}`, properties);
    }
    
    /**
     * Get material properties by type
     * @param type Material type
     * @returns The requested material properties or the default material if not found
     */
    public getMaterial(type: MaterialType): MaterialProperties {
        return this.materials.get(type) || this.materials.get(MaterialType.DEFAULT)!;
    }

    /**
     * Apply material properties to a rigid body
     * @param body The Ammo.js rigid body
     * @param materialType The type of material to apply
     */
    public applyMaterialToBody(body: any, materialType: MaterialType): void {
        const properties = this.getMaterial(materialType);
        
        // Apply friction and restitution directly to the body
        if (properties.friction !== undefined) {
            body.setFriction(properties.friction);
            body.setRollingFriction(properties.friction * 0.1); // Add some rolling friction
            body.setSpinningFriction(properties.friction * 0.1); // Add some spinning friction
        }
        
        if (properties.restitution !== undefined) {
            body.setRestitution(properties.restitution);
        }
    }
    
    /**
     * Sets up physics properties for a rigid body construction info object
     * @param rbInfo The rigid body construction info object
     * @param materialType The type of material to apply
     */
    public applyMaterialToRigidBodyInfo(rbInfo: any, materialType: MaterialType): void {
        const properties = this.getMaterial(materialType);
        
        // Apply friction and restitution to the rigid body info
        if (properties.friction !== undefined) {
            rbInfo.m_friction = properties.friction;
            rbInfo.m_rollingFriction = properties.friction * 0.1;
        }
        
        if (properties.restitution !== undefined) {
            rbInfo.m_restitution = properties.restitution;
        }
    }
    
    /**
     * Creates an Ammo.js rigid body with material properties applied
     * @param mass Body mass (0 for static objects)
     * @param shape Ammo.js collision shape
     * @param motionState Ammo.js motion state
     * @param localInertia Ammo.js local inertia vector
     * @param materialType Material type to apply
     * @returns A new Ammo.js rigid body
     */
    public createBodyWithMaterial(
        mass: number,
        shape: any,
        motionState: any,
        localInertia: any,
        materialType: MaterialType
    ): any {
        // Get Ammo instance
        const Ammo = WorldContext.getAmmo();
        
        // Create rigid body construction info
        const rbInfo = new Ammo.btRigidBodyConstructionInfo(
            mass,
            motionState,
            shape,
            localInertia
        );
        
        // Apply material properties to the construction info
        this.applyMaterialToRigidBodyInfo(rbInfo, materialType);
        
        // Create the rigid body
        const body = new Ammo.btRigidBody(rbInfo);
        
        // Apply additional material properties directly to the body
        this.applyMaterialToBody(body, materialType);
        
        // Clean up construction info (memory management)
        Ammo.destroy(rbInfo);
        
        return body;
    }
} 