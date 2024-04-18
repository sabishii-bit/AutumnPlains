import * as THREE from 'three';

export class Lighting {
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;

    constructor(renderer: THREE.WebGLRenderer) {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(5, 3, 5);
    }

    addToScene(scene: THREE.Scene) {
        scene.add(this.ambientLight);
        scene.add(this.directionalLight);
    }
}
