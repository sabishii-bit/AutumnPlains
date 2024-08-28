import * as THREE from 'three';
import GameObject from '../../GameObject';
import * as CANNON from 'cannon-es';

export class SkyboxEnvironment extends GameObject {
    constructor(initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        super(initialPosition);  // No physics world needed for Skybox
    }

    protected createVisualMesh() {
        const geometry = new THREE.SphereGeometry(450, 60, 40, 0, Math.PI * 2, 0, Math.PI / 2);
        geometry.scale(-1, 1, 1);

        const texture = new THREE.TextureLoader().load("/assets/skyboxTest.jpg");
        const material = new THREE.MeshBasicMaterial({ map: texture });

        this.visualMesh = new THREE.Mesh(geometry, material);
        this.visualMesh.position.y = -120;
    }

    protected createCollisionMesh() {
        // Skybox does not need physics, implement as empty or with minimal logic
    }
}

