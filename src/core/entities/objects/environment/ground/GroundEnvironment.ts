import * as THREE from 'three';
import GameObject from '../../GameObject';
import * as CANNON from 'cannon-es';

export class GroundEnvironment extends GameObject {
    constructor(initialPosition: THREE.Vector3) {
        super(initialPosition); // Call to parent constructor
        this.setGroundAsDefaultMaterial();
        this.initializeContactMaterialBetweenGroundAndPlayer();
    }

    protected createVisual() {
        const geometry = new THREE.PlaneGeometry(500, 500);
        const texture = new THREE.TextureLoader().load('/assets/groundTestTexture.jpg');
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
        this.collisionBody = new CANNON.Body({
            mass: 0,
            shape: shape,
            material: groundMaterial,
        });
        this.collisionBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.worldContext.addBody(this.collisionBody);
    }

    private setGroundAsDefaultMaterial() {
        const groundMaterial = this.getCollisionBody()?.material;
        if (groundMaterial)
            this.worldContext.defaultMaterial = groundMaterial;  // Set the ground material as the default for the world
    }

    private initializeContactMaterialBetweenGroundAndPlayer() {
        const playerMaterial = this.worldContext.defaultMaterial;  // Use the default material, which is now ground's material
        const contactMaterial = new CANNON.ContactMaterial(playerMaterial, playerMaterial, {
            friction: 0.1, // Low friction
            restitution: 0.0, // No bounciness
        });
        this.worldContext.addContactMaterial(contactMaterial);
    }
}
