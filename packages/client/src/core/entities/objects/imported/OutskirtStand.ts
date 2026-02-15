import { Scene, Vector3, PhysicsShapeType } from '@babylonjs/core';
import { ImportedModel, ImportedModelOptions } from './ImportedModel';
import { getModelPath } from '@autumnplains/assets';

/**
 * Outskirt Stand imported model
 * Loads the outskirt_stand GLTF model with physics
 */
export class OutskirtStand extends ImportedModel {
    constructor(scene: Scene, position: Vector3, options: Partial<ImportedModelOptions> = {}) {
        const modelPath = getModelPath('environment/outskirt_stand/Outskirt_Stand.gltf');

        super(scene, modelPath, {
            position,
            scale: new Vector3(0.13, 0.13, 0.13), // Default scale from old client
            rotation: Vector3.Zero(),
            enableShadows: true,
            enablePhysics: true, // Enable physics for collision
            physicsMass: 0, // Static object
            physicsFriction: 0.8,
            physicsRestitution: 0.1,
            name: 'OutskirtStand',
            ...options
        });
    }

    /**
     * Override to use mesh collision for more accurate physics
     * For static architecture, mesh collision is fine performance-wise
     */
    protected createPhysicsShape(mesh: any): any {
        // Use mesh shape for accurate collision on static objects
        return { type: PhysicsShapeType.MESH };
    }
}
