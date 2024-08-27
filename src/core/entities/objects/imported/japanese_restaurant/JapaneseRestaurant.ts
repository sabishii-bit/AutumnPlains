import * as THREE from 'three';
import GameObject from '../../GameObject';
import { ImportedModelLoaderService } from '../../../../services/model_loader/ImportedModelLoaderService';

export class JapaneseRestaurant extends GameObject {

    constructor(initialPosition: THREE.Vector3) {
        super(initialPosition);
        this.createVisualMesh();
    }

    protected createVisualMesh() {
        const modelLoader = new ImportedModelLoaderService();
        modelLoader.loadGltfModel("/assets/gltf/japanese_restaurant/scene.gltf", this.position);
    }

    protected createCollisionMesh() {
        // Optionally create a physical body if needed for collisions
        // This could be a simple bounding box or a more complex shape depending on the model
        // If the model should not interact physically, skip this part
    }
}