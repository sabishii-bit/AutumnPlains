import * as THREE from 'three';
import { Renderer } from '../../engine/render/Renderer';
import { SceneContext } from '../../global/scene/SceneContext';

export class LightingEffect {
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;
    renderer: THREE.WebGLRenderer = Renderer.getInstance().getRenderer();

    constructor() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);

        // Set up the directional light
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(5, 3, 5);

        // Enable shadow casting
        this.directionalLight.castShadow = true;

        // Set shadow properties for penumbra effect
        this.directionalLight.shadow.mapSize.width = 2048;  // Higher value for better quality
        this.directionalLight.shadow.mapSize.height = 2048; // Higher value for better quality
        this.directionalLight.shadow.camera.near = 0.5; // Adjust near plane of the shadow camera
        this.directionalLight.shadow.camera.far = 500; // Adjust far plane of the shadow camera
        this.directionalLight.shadow.camera.left = -50; // Adjust shadow camera frustum
        this.directionalLight.shadow.camera.right = 50;
        this.directionalLight.shadow.camera.top = 50;
        this.directionalLight.shadow.camera.bottom = -50;
        this.directionalLight.shadow.bias = -0.0001; // Adjust bias to reduce shadow artifacts
        this.directionalLight.shadow.radius = 1; // Set shadow radius for penumbra effect
    }

    addToScene(scene?: THREE.Scene) {
        if (!scene) {
            scene = SceneContext.getInstance();
        }
        scene.add(this.ambientLight);
        scene.add(this.directionalLight);
    }
}
