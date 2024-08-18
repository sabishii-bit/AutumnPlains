import * as THREE from 'three';
import GameObject from '../../gameObject';
import { ModelLoader } from '../../../../services/model_loader/modelLoader';

export class JapaneseRestaurant extends GameObject {

    constructor(initialPosition: THREE.Vector3) {
        super(initialPosition);
        this.createVisual();
    }

    protected createVisual() {
        const modelLoader = new ModelLoader();
        modelLoader.loadGltfModel("/assets/gltf/japanese_restaurant/scene.gltf", this.position);
    }

    protected createPhysics() {
        // Optionally create a physical body if needed for collisions
        // This could be a simple bounding box or a more complex shape depending on the model
        // If the model should not interact physically, skip this part
    }
}