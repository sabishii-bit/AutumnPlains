// Using a dynamic import for Ammo.js
export class WorldContext {
    private static instance: any; // Ammo.btDiscreteDynamicsWorld
    private static collisionConfiguration: any; // Ammo.btDefaultCollisionConfiguration
    private static dispatcher: any; // Ammo.btCollisionDispatcher
    private static broadphase: any; // Ammo.btDbvtBroadphase
    private static solver: any; // Ammo.btSequentialImpulseConstraintSolver
    private static ammo: any; // Store the Ammo instance
    private static ammoInitialized = false;

    private constructor() {
        if (!WorldContext.ammoInitialized) {
            console.error("Ammo must be initialized before creating WorldContext");
            return;
        }
        
        // Create the physics world components
        WorldContext.collisionConfiguration = new WorldContext.ammo.btDefaultCollisionConfiguration();
        WorldContext.dispatcher = new WorldContext.ammo.btCollisionDispatcher(WorldContext.collisionConfiguration);
        WorldContext.broadphase = new WorldContext.ammo.btDbvtBroadphase();
        WorldContext.solver = new WorldContext.ammo.btSequentialImpulseConstraintSolver();
        
        // Create the actual physics world
        WorldContext.instance = new WorldContext.ammo.btDiscreteDynamicsWorld(
            WorldContext.dispatcher,
            WorldContext.broadphase,
            WorldContext.solver,
            WorldContext.collisionConfiguration
        );
        
        // Set gravity - default value
        WorldContext.setWorldGravity(0, -30.82, 0);
    }

    // Static method to get the singleton instance
    public static getInstance(): any { // Ammo.btDiscreteDynamicsWorld
        if (!WorldContext.instance) {
            new WorldContext();
        }
        return WorldContext.instance;
    }

    // Initialize Ammo.js - this must be called before using WorldContext
    public static async initAmmo(): Promise<void> {
        if (!WorldContext.ammoInitialized) {
            try {
                // Dynamically import Ammo.js
                const AmmoModule = await import('ammojs3');
                // Initialize Ammo
                WorldContext.ammo = await AmmoModule.default();
                WorldContext.ammoInitialized = true;
            } catch (error) {
                console.error("Failed to initialize Ammo.js:", error);
                throw error;
            }
        }
    }

    // Clean up resources
    public static destroy(): void {
        if (WorldContext.instance && WorldContext.ammo) {
            WorldContext.ammo.destroy(WorldContext.instance);
            WorldContext.ammo.destroy(WorldContext.solver);
            WorldContext.ammo.destroy(WorldContext.broadphase);
            WorldContext.ammo.destroy(WorldContext.dispatcher);
            WorldContext.ammo.destroy(WorldContext.collisionConfiguration);
            WorldContext.instance = null;
        }
    }

    // Get the Ammo instance
    public static getAmmo(): any {
        if (!WorldContext.ammoInitialized) {
            console.error("Ammo is not initialized yet");
            return null;
        }
        return WorldContext.ammo;
    }
    
    // Set the gravity of the physics world
    public static setWorldGravity(x: number, y: number, z: number): void {
        if (!WorldContext.instance || !WorldContext.ammo) {
            console.error("Physics world not initialized. Cannot set gravity.");
            return;
        }
        
        const gravity = new WorldContext.ammo.btVector3(x, y, z);
        WorldContext.instance.setGravity(gravity);
        console.log(`Gravity set to: (${x}, ${y}, ${z})`);
        
        // Clean up the btVector3 to prevent memory leaks
        WorldContext.ammo.destroy(gravity);
    }
    
    // Get the current gravity vector as an object
    public static getGravity(): {x: number, y: number, z: number} {
        if (!WorldContext.instance) {
            return {x: 0, y: 0, z: 0};
        }
        
        const gravity = WorldContext.instance.getGravity();
        const gravityObj = {
            x: gravity.x(),
            y: gravity.y(),
            z: gravity.z()
        };
        
        return gravityObj;
    }
}
