import * as THREE from 'three';
import { WorldContext } from '../global/world/WorldContext';
import { SceneContext } from '../global/scene/SceneContext';
import { AmmoDebugDrawer } from './AmmoDebugDrawer';

// Declare Ammo global
declare const Ammo: any;

/**
 * Central manager for physics system
 * Handles initialization, stepping, and debugging of Ammo.js physics
 */
export class PhysicsSystem {
    private static instance: PhysicsSystem;
    private physicsWorld: any; // Ammo.btDiscreteDynamicsWorld
    private scene: THREE.Scene;
    private debugDrawer: AmmoDebugDrawer | null = null;
    private debugEnabled: boolean = false;
    private timeStep: number = 1/60;
    private maxSubSteps: number = 10;

    /**
     * Create the physics system
     * @param enableDebug Whether to enable debug visualization
     */
    private constructor(enableDebug: boolean = false) {
        this.physicsWorld = WorldContext.getInstance();
        this.scene = SceneContext.getInstance();
        this.debugEnabled = enableDebug;
        
        // Don't reset gravity - use what was set in WorldContext
        
        if (enableDebug) {
            this.initDebugDrawer();
        }
        
    }

    /**
     * Get the singleton instance of PhysicsSystem
     * @param enableDebug Whether to enable debug visualization (only applies on first creation)
     * @returns PhysicsSystem instance
     */
    public static getInstance(enableDebug: boolean = false): PhysicsSystem {
        if (!PhysicsSystem.instance) {
            PhysicsSystem.instance = new PhysicsSystem(enableDebug);
        }
        return PhysicsSystem.instance;
    }

    /**
     * Initialize the debug drawer for physics visualization
     */
    private initDebugDrawer(): void {
        if (!this.debugDrawer) {
            this.debugDrawer = new AmmoDebugDrawer(this.scene);
            this.physicsWorld.setDebugDrawer(this.debugDrawer.getDebugDrawer());
            
            // Set debug modes
            // 1 = wireframe, 2 = AABB bounds
            this.debugDrawer.setDebugDrawMode(1);
        }
    }

    /**
     * Enable or disable debug visualization
     * @param enabled Whether debug visualization should be enabled
     */
    public setDebugMode(enabled: boolean): void {
        if (enabled && !this.debugDrawer) {
            this.initDebugDrawer();
        }
        
        this.debugEnabled = enabled;
        
        if (this.debugDrawer) {
            this.debugDrawer.setVisible(enabled);
        }
    }

    /**
     * Toggle debug visualization
     * @returns New debug state
     */
    public toggleDebug(): boolean {
        this.setDebugMode(!this.debugEnabled);
        return this.debugEnabled;
    }

    /**
     * Update the physics simulation
     * @param deltaTime Time since last update
     */
    public update(deltaTime: number): void {
        // Step the physics simulation
        this.physicsWorld.stepSimulation(deltaTime, this.maxSubSteps, this.timeStep);
        
        // Update debug visualization if enabled
        if (this.debugEnabled && this.debugDrawer) {
            this.debugDrawer.update();
            this.physicsWorld.debugDrawWorld();
        }
    }

    /**
     * Set the physics simulation time step
     * @param timeStep Fixed time step for physics (default: 1/60)
     * @param maxSubSteps Maximum substeps per frame (default: 10)
     */
    public setTimeStep(timeStep: number, maxSubSteps: number = 10): void {
        this.timeStep = timeStep;
        this.maxSubSteps = maxSubSteps;
    }

    /**
     * Get the underlying Ammo.js physics world
     * @returns Ammo.btDiscreteDynamicsWorld instance
     */
    public getPhysicsWorld(): any {
        return this.physicsWorld;
    }

    /**
     * Set the gravity of the physics world
     * @param gravity THREE.Vector3 representing gravity direction and strength
     */
    public setGravity(gravity: THREE.Vector3): void {
        WorldContext.setWorldGravity(gravity.x, gravity.y, gravity.z);
    }

    /**
     * Get the current gravity of the physics world
     * @returns THREE.Vector3 representing the current gravity
     */
    public getGravity(): THREE.Vector3 {
        const gravity = WorldContext.getGravity();
        return new THREE.Vector3(gravity.x, gravity.y, gravity.z);
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        if (this.debugDrawer) {
            this.debugDrawer.destroy();
            this.debugDrawer = null;
        }
    }
} 