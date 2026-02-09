import { Scene, Color3, Vector3 } from '@babylonjs/core';
import { BaseMap } from './BaseMap';
import { Ground } from '../entities/objects/Ground';
import { OutskirtStand } from '../entities/objects/imported/OutskirtStand';
import type { LightingManager } from '../lighting/LightingManager';

/**
 * Test map with ground, walls, and basic environment
 */
export class TestMap extends BaseMap {
    private ground!: Ground;
    private stand?: OutskirtStand;

    constructor(scene: Scene, lightingManager: LightingManager) {
        super(scene, lightingManager);
    }

    public async initialize(): Promise<void> {
        this.createGround();
        await this.loadImportedModels();
        console.log('TestMap initialized');
    }

    /**
     * Create ground using Ground entity
     */
    private createGround(): void {
        // Create ground entity
        this.ground = new Ground(
            this.scene,
            100, // width
            100, // height
            Vector3.Zero(), // position
            new Color3(0.3, 0.5, 0.3) // green color
        );

        // Make ground invisible but keep physics and pickable for raycasting
        const groundMesh = this.ground.getTransformNode().getChildMeshes()[0];
        if (groundMesh) {
            groundMesh.isVisible = false;
            groundMesh.isPickable = true; // Ensure it's pickable for ground detection raycasts
            this.lightingManager.enableShadowReceiver(groundMesh);
        }
    }


    /**
     * Load imported 3D models asynchronously
     */
    private async loadImportedModels(): Promise<void> {
        try {
            // Load Outskirt Stand at origin with smaller scale and no physics
            this.stand = new OutskirtStand(
                this.scene,
                new Vector3(0, 1, 5), // Raised Y position to align floor with ground
                {
                    scale: new Vector3(0.2, 0.2, 0.2), // Much smaller scale
                    enablePhysics: false // Disable collision
                }
            );
            await this.stand.loadAsync();
            console.log('Outskirt Stand loaded at position:', this.stand.getPosition());

            // Enable shadow casting
            let meshCount = 0;
            this.stand.getRootNodes().forEach(node => {
                node.getChildMeshes().forEach(mesh => {
                    this.lightingManager.addShadowCaster(mesh);
                    meshCount++;
                });
            });
            console.log(`Outskirt Stand: ${meshCount} meshes loaded and configured for shadows`);
        } catch (error) {
            console.error('Failed to load imported models:', error);
        }
    }

    public update(deltaTime: number): void {
        // Update any dynamic map elements here
    }

    public dispose(): void {
        // Clean up imported models
        this.stand?.dispose();

        // Clean up map-specific resources
        console.log('TestMap disposed');
    }
}
