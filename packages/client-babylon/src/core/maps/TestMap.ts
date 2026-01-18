import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, PhysicsAggregate, PhysicsShapeType } from '@babylonjs/core';
import { BaseMap } from './BaseMap';
import type { LightingManager } from '../lighting/LightingManager';

/**
 * Test map with ground, walls, and basic environment
 */
export class TestMap extends BaseMap {
    constructor(scene: Scene, lightingManager: LightingManager) {
        super(scene, lightingManager);
    }

    public initialize(): void {
        this.createGround();
        this.createTestCubes();
        console.log('TestMap initialized');
    }

    /**
     * Create ground plane
     */
    private createGround(): void {
        const ground = MeshBuilder.CreateGround('ground', {
            width: 100,
            height: 100,
            subdivisions: 4
        }, this.scene);

        // Enable picking for raycasting (ground detection)
        ground.isPickable = true;

        // Create ground material
        const groundMaterial = new StandardMaterial('groundMaterial', this.scene);
        groundMaterial.diffuseColor = new Color3(0.3, 0.5, 0.3); // Greenish
        groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1); // Low specular
        ground.material = groundMaterial;

        // Add physics to ground (static body)
        const groundAggregate = new PhysicsAggregate(
            ground,
            PhysicsShapeType.BOX,
            { mass: 0, restitution: 0.2, friction: 0.8 },
            this.scene
        );
        console.log('Ground physics created:', groundAggregate.body ? 'SUCCESS' : 'FAILED');
        console.log('Ground position:', ground.position);
        console.log('Ground bounds:', ground.getBoundingInfo().boundingBox);

        // Enable shadow receiving
        this.lightingManager.enableShadowReceiver(ground);
    }

    /**
     * Create some test cubes for visual reference
     */
    private createTestCubes(): void {
        // Create a few cubes at different positions
        const positions = [
            new Vector3(5, 1, 5),
            new Vector3(-5, 1, 5),
            new Vector3(5, 1, -5),
            new Vector3(-5, 1, -5)
        ];

        const colors = [
            new Color3(1, 0, 0),    // Red
            new Color3(0, 1, 0),    // Green
            new Color3(0, 0, 1),    // Blue
            new Color3(1, 1, 0)     // Yellow
        ];

        positions.forEach((pos, index) => {
            const cube = MeshBuilder.CreateBox(`cube${index}`, { size: 2 }, this.scene);
            cube.position = pos;
            cube.isPickable = true; // Enable picking for raycasting

            const material = new StandardMaterial(`cubeMaterial${index}`, this.scene);
            material.diffuseColor = colors[index];
            cube.material = material;

            // Add physics to cubes (static for now)
            new PhysicsAggregate(
                cube,
                PhysicsShapeType.BOX,
                { mass: 0, restitution: 0.3, friction: 0.5 },
                this.scene
            );

            // Add to shadow casters
            this.lightingManager.addShadowCaster(cube);
        });
    }

    public update(deltaTime: number): void {
        // Update any dynamic map elements here
    }

    public dispose(): void {
        // Clean up map-specific resources
        console.log('TestMap disposed');
    }
}
