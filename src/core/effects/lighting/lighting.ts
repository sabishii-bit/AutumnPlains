import * as THREE from 'three';
import { Renderer } from '../../engine/render/renderer';
import { SceneContext } from '../../global/scene/scene';

export class LightingEffect {
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;
    renderer: THREE.WebGLRenderer = Renderer.getInstance().getRenderer();


    constructor() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(5, 3, 5);
    }

    addToScene(scene?: THREE.Scene) {
        if (!scene) {
            scene = SceneContext.getInstance();
        }
        scene.add(this.ambientLight);
        scene.add(this.directionalLight);
    }
}
