import * as THREE from 'three';
import { SceneContext } from '../../global/scene/scene';

export class CloudEffect {
    private scene: THREE.Scene = SceneContext.getInstance();
    private cloudGeometry: THREE.PlaneGeometry;
    private cloudMaterials: THREE.MeshBasicMaterial[];
    private cloudMeshes: THREE.Mesh[];
    private particleCount: number;
    private spread: number;
    private centerPosition: THREE.Vector3;
    private cloudCeiling: number;

    constructor(
        particleCount: number = 10000,
        spread: number = 1000,
        centerPosition: THREE.Vector3 = new THREE.Vector3(0, 50, 0),
        cloudCeiling: number = 100
    ) {
        this.particleCount = particleCount;
        this.spread = spread;
        this.centerPosition = centerPosition;
        this.cloudMeshes = [];
        this.cloudCeiling = cloudCeiling;

        const textureLoader = new THREE.TextureLoader();
        const cloudTextures = [
            textureLoader.load("/assets/images/clouds/cloud1.png"),
            textureLoader.load("/assets/images/clouds/cloud2.png"),
            textureLoader.load("/assets/images/clouds/cloud3.png"),
            textureLoader.load("/assets/images/clouds/cloud4.png")
        ];

        this.cloudMaterials = cloudTextures.map(texture => new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false
        }));

        this.cloudGeometry = new THREE.PlaneGeometry(50, 30);

        this.createClouds();
    }

    private createClouds() {
        for (let i = 0; i < this.particleCount; i++) {
            const material = this.cloudMaterials[Math.floor(Math.random() * this.cloudMaterials.length)];
            const mesh = new THREE.Mesh(this.cloudGeometry, material);

            mesh.position.set(
                Math.random() * this.spread - this.spread / 2 + this.centerPosition.x,
                Math.random() * this.cloudCeiling + this.centerPosition.y,
                Math.random() * this.spread - this.spread / 2 + this.centerPosition.z
            );

            // Ensure the clouds are horizontal
            mesh.rotation.x = Math.PI / 2; // Rotate 90 degrees to lie flat

            this.cloudMeshes.push(mesh);
            this.scene.add(mesh);
        }
    }

    public update(deltaTime: number, camera: THREE.Camera) {
        this.cloudMeshes.forEach(mesh => {
            mesh.lookAt(camera.position);
            mesh.rotateX(-Math.PI / 2); // Correct rotation to face the camera
        });
    }
}
