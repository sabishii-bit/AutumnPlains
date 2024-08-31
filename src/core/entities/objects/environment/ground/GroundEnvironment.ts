import * as THREE from 'three';
import GameObject from '../../GameObject';
import * as CANNON from 'cannon-es';

export class GroundEnvironment extends GameObject {
    private groundMaterial: CANNON.Material;

    constructor(initialPosition: THREE.Vector3) {
        super(initialPosition); // Call to parent constructor
        this.groundMaterial = new CANNON.Material("groundMaterial"); // Initialize the ground material
        this.groundMaterial.restitution = 0.0; // Ensure no bounce on the ground material
        this.setGroundAsDefaultMaterial();
    }

    protected createVisualMesh() {
        const geometry = new THREE.PlaneGeometry(500, 500);
        const texture = new THREE.TextureLoader().load('/assets/groundTestTexture.jpg');
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(50, 50);

        const material = new THREE.MeshPhongMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        this.visualMesh = new THREE.Mesh(geometry, material); // Override the initial placeholder mesh
        this.visualMesh.rotation.x = -Math.PI / 2;
    }

    protected createCollisionMesh() {
        const shape = new CANNON.Plane();
        this.collisionMesh = new CANNON.Body({
            mass: 0,
            shape: shape,
            material: this.groundMaterial, // Use the initialized ground material
        });
        this.collisionMesh.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.worldContext.addBody(this.collisionMesh);
    }

    private setGroundAsDefaultMaterial() {
        this.worldContext.defaultMaterial = this.groundMaterial; // Set the ground material as the default for the world
    }
}
