import * as CANNON from 'cannon-es';
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
    private worldContext: CANNON.World;
    private materials: Map<MaterialType, CANNON.Material>;
    private contactMaterials: Map<string, CANNON.ContactMaterial>;

    /**
     * Initialize the physics materials manager
     */
    private constructor() {
        this.worldContext = WorldContext.getInstance();
        this.materials = new Map();
        this.contactMaterials = new Map();
        
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

        // Setup common contact materials
        this.setupDefaultContactMaterials();
        
        // Set the ground material as the default for the world
        this.worldContext.defaultMaterial = this.getMaterial(MaterialType.DEFAULT);
    }
    
    /**
     * Create default contact materials for common interactions
     */
    private setupDefaultContactMaterials(): void {
        console.log("Setting up contact materials...");
        
        // Character interactions - ADJUSTED FOR STABILITY
        this.createContactMaterial(
            MaterialType.CHARACTER, 
            MaterialType.GROUND, 
            { 
                friction: 0.8,               // Reduced from 1.0 for stability
                restitution: 0.0,           // No bounce
                contactEquationStiffness: 1e6,  // More stable contact
                contactEquationRelaxation: 3,   // More relaxed solving
                frictionEquationStiffness: 1e6,
                frictionEquationRelaxation: 3
            }
        );
        
        this.createContactMaterial(
            MaterialType.CHARACTER, 
            MaterialType.ICE, 
            { friction: 0.1, restitution: 0.0 }
        );
        
        this.createContactMaterial(
            MaterialType.CHARACTER, 
            MaterialType.BOUNCY, 
            { friction: 0.5, restitution: 0.7 }
        );
        
        // Dynamic object interactions
        this.createContactMaterial(
            MaterialType.DYNAMIC, 
            MaterialType.GROUND, 
            { 
                friction: 0.7, 
                restitution: 0.2,  // Slightly reduced bounce
                contactEquationStiffness: 1e6,
                contactEquationRelaxation: 3
            }
        );
        
        this.createContactMaterial(
            MaterialType.DYNAMIC, 
            MaterialType.WALL, 
            { friction: 0.5, restitution: 0.3 }
        );
        
        this.createContactMaterial(
            MaterialType.DYNAMIC, 
            MaterialType.DYNAMIC, 
            { friction: 0.4, restitution: 0.4 }
        );
    }
    
    /**
     * Create a new physics material with the given properties
     * @param type Material type identifier
     * @param properties Material properties
     * @returns The created CANNON.Material
     */
    public createMaterial(type: MaterialType, properties: MaterialProperties = {}): CANNON.Material {
        const material = new CANNON.Material(type);
        
        // Set properties
        if (properties.friction !== undefined) material.friction = properties.friction;
        if (properties.restitution !== undefined) material.restitution = properties.restitution;
        
        // Store in materials map
        this.materials.set(type, material);
        
        return material;
    }
    
    /**
     * Get a material by type
     * @param type Material type
     * @returns The requested material or the default material if not found
     */
    public getMaterial(type: MaterialType): CANNON.Material {
        return this.materials.get(type) || this.materials.get(MaterialType.DEFAULT)!;
    }
    
    /**
     * Create a contact material defining how two materials interact
     * @param typeA First material type
     * @param typeB Second material type
     * @param properties Contact material properties
     * @returns The created CANNON.ContactMaterial
     */
    public createContactMaterial(
        typeA: MaterialType,
        typeB: MaterialType,
        properties: ContactMaterialProperties = {}
    ): CANNON.ContactMaterial {
        const materialA = this.getMaterial(typeA);
        const materialB = this.getMaterial(typeB);
        
        // Create a unique key for the materials pair
        const key = this.getContactMaterialKey(typeA, typeB);
        
        // Create contact material with the provided properties
        const contactMaterial = new CANNON.ContactMaterial(materialA, materialB, {
            friction: properties.friction !== undefined ? properties.friction : 0.3,
            restitution: properties.restitution !== undefined ? properties.restitution : 0.3,
            contactEquationStiffness: properties.contactEquationStiffness,
            contactEquationRelaxation: properties.contactEquationRelaxation,
            frictionEquationStiffness: properties.frictionEquationStiffness,
            frictionEquationRelaxation: properties.frictionEquationRelaxation
        });
        
        // Log contact material creation for debugging
        console.log(`Created contact material: ${typeA} + ${typeB}`, {
            friction: contactMaterial.friction,
            restitution: contactMaterial.restitution,
            stiffness: contactMaterial.contactEquationStiffness,
            relaxation: contactMaterial.contactEquationRelaxation
        });
        
        // Add to world and store in the contact materials map
        this.worldContext.addContactMaterial(contactMaterial);
        this.contactMaterials.set(key, contactMaterial);
        
        return contactMaterial;
    }
    
    /**
     * Get a contact material for two material types
     * @param typeA First material type
     * @param typeB Second material type
     * @returns The contact material if found, otherwise undefined
     */
    public getContactMaterial(typeA: MaterialType, typeB: MaterialType): CANNON.ContactMaterial | undefined {
        const key = this.getContactMaterialKey(typeA, typeB);
        return this.contactMaterials.get(key);
    }
    
    /**
     * Generate a unique key for a pair of material types
     * @param typeA First material type
     * @param typeB Second material type
     * @returns A unique string key
     */
    private getContactMaterialKey(typeA: MaterialType, typeB: MaterialType): string {
        // Sort alphabetically to ensure consistent key regardless of parameter order
        return [typeA, typeB].sort().join('_');
    }
    
    /**
     * Apply a material to a physics body
     * @param body The physics body to apply the material to
     * @param materialType The type of material to apply
     */
    public applyMaterialToBody(body: CANNON.Body, materialType: MaterialType): void {
        const material = this.getMaterial(materialType);
        body.material = material;
    }
    
    /**
     * Creates a body with the appropriate material applied
     * @param options Body creation options
     * @param materialType The type of material to apply
     * @returns A new CANNON.Body with the material applied
     */
    public createBodyWithMaterial(
        options: CANNON.BodyOptions,
        materialType: MaterialType
    ): CANNON.Body {
        const body = new CANNON.Body(options);
        this.applyMaterialToBody(body, materialType);
        return body;
    }
} 