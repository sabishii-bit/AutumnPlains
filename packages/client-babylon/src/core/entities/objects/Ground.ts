import { Vector3, Color3, PhysicsShapeType, MeshBuilder, StandardMaterial } from '@babylonjs/core';
import { Entity } from '../Entity';
import { PhysicsComponent } from '../components/PhysicsComponent';
import type { Scene } from '@babylonjs/core';

/**
 * Ground entity with physics collision
 * Simple ground plane for the game world
 */
export class Ground extends Entity {
    private physicsComponent: PhysicsComponent;

    constructor(
        scene: Scene,
        width: number = 100,
        height: number = 100,
        position: Vector3 = Vector3.Zero(),
        color: Color3 = new Color3(0.3, 0.5, 0.3)
    ) {
        super(scene, 'Ground');

        // Create ground mesh directly (not using component for simplicity)
        const ground = MeshBuilder.CreateGround('ground', {
            width,
            height,
            subdivisions: 4
        }, scene);

        // Parent to this entity's transform
        ground.parent = this.getTransformNode();
        ground.isPickable = true; // Enable picking for raycasting

        // Apply material
        const groundMaterial = new StandardMaterial('groundMaterial', scene);
        groundMaterial.diffuseColor = color;
        groundMaterial.specularColor = new Color3(0.1, 0.1, 0.1); // Low specular
        ground.material = groundMaterial;

        // Set position
        this.getTransformNode().position = position;

        // Add physics component (static body - mass: 0)
        this.physicsComponent = this.addComponent('physics', new PhysicsComponent(0, 0.2, 0.8));
        this.physicsComponent.setMesh(ground as any, PhysicsShapeType.BOX);

        console.log('Ground created at position:', position, 'size:', width, 'x', height);
    }

    /**
     * Get the physics component
     */
    public getPhysicsComponent(): PhysicsComponent {
        return this.physicsComponent;
    }
}
