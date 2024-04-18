import * as CANNON from 'cannon-es';

export class WorldContext {
    private static instance: CANNON.World;

    private constructor() {
        // Create the CANNON.World object directly here
        const world = new CANNON.World();
        world.gravity.set(0, -30.82, 0);  // Set gravity for the physics world
        WorldContext.instance = world;
    }

    // Static method to get the singleton instance
    public static getInstance(): CANNON.World {
        if (!WorldContext.instance) {
            new WorldContext();
        }
        return WorldContext.instance;
    }
}
