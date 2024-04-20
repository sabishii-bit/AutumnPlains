import * as THREE from 'three';
import skyboxTestTexture from "../../../../assets/skyboxTest.jpg";
import GameObject from '../gameObject';
import * as CANNON from 'cannon-es';

export class Skybox extends GameObject {
    constructor(initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        super(initialPosition);  // No physics world needed for Skybox
    }

    protected createVisual() {
        const geometry = new THREE.SphereGeometry(450, 60, 40, 0, Math.PI * 2, 0, Math.PI / 2);
        geometry.scale(-1, 1, 1);

        const texture = new THREE.TextureLoader().load(skyboxTestTexture);
        const material = new THREE.MeshBasicMaterial({ map: texture });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = -120;
    }

    protected createPhysics() {
        // Skybox does not need physics, implement as empty or with minimal logic
    }
}

