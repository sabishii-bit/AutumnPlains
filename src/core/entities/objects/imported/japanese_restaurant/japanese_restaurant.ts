import * as THREE from 'three';
import { World } from 'cannon-es';
import GameObject from '../../gameObject';
import { ModelLoader } from '../../../../services/model_loader/modelLoader';
import { Scene } from 'three';
import Model from '../../../../../assets/gltf/japanese_restaurant/scene.gltf';

const a = require("../../../../../assets/gltf/japanese_restaurant/textures/lambert5_baseColor.jpeg");
const b = require("../../../../../assets/gltf/japanese_restaurant/textures/lambert8_baseColor.jpeg");
const c = require("../../../../../assets/gltf/japanese_restaurant/textures/lambert11_baseColor.jpeg");
const d = require("../../../../../assets/gltf/japanese_restaurant/textures/lambert13_baseColor.jpeg");
const e = require("../../../../../assets/gltf/japanese_restaurant/textures/lambert15_baseColor.jpeg");
const f = require("../../../../../assets/gltf/japanese_restaurant/textures/lambert17_baseColor.jpeg");
const g = require("../../../../../assets/gltf/japanese_restaurant/scene.bin");

export class JapaneseRestaurant extends GameObject {
    sceneContext: Scene;

    constructor(initialPosition: THREE.Vector3) {
        super(initialPosition);
        this.createVisual();
    }

    protected createVisual() {
        const modelLoader = new ModelLoader();
        modelLoader.loadGltfModel(Model, this.position);
    }

    protected createPhysics() {
        // Optionally create a physical body if needed for collisions
        // This could be a simple bounding box or a more complex shape depending on the model
        // If the model should not interact physically, skip this part
    }
}