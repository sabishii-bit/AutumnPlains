import * as THREE from 'three';
import GameObject from '../gameObject';
import * as CANNON from 'cannon-es';
import groundTestTexture from "../../../../assets/groundTestTexture.jpg";

export class Plane extends GameObject {
    constructor(initialPosition: THREE.Vector3) {
        super(initialPosition); // Call to parent constructor
    }

    protected createVisual() {
        const geometry = new THREE.PlaneGeometry(500, 500);
        const texture = new THREE.TextureLoader().load(groundTestTexture);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(50, 50);

        const material = new THREE.MeshPhongMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        this.mesh = new THREE.Mesh(geometry, material); // Override the initial placeholder mesh
        this.mesh.rotation.x = -Math.PI / 2;
    }

    protected createPhysics() {
        const shape = new CANNON.Plane();
        const groundMaterial = new CANNON.Material("groundMaterial");
        this.body = new CANNON.Body({
            mass: 0,
            shape: shape,
            material: groundMaterial,
        });
        this.body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.worldContext.addBody(this.body);
    }
}
