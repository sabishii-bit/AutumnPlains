import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { SceneContext } from '../../global/scene/SceneContext';
import { WorldContext } from '../../global/world/WorldContext';

export class ImportedModelLoaderService {
    private gltfLoader: GLTFLoader;
    private objLoader: OBJLoader;
    private mtlLoader: MTLLoader;

    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.objLoader = new OBJLoader();
        this.mtlLoader = new MTLLoader();
    }

    public loadObjModel(mtlPath: string, objPath: string, position: THREE.Vector3): void {
        this.mtlLoader.load(mtlPath, (mtl) => {
            mtl.preload();
            this.objLoader.setMaterials(mtl);
            this.objLoader.load(objPath, (root) => {
                root.position.copy(position);
                SceneContext.getInstance().add(root);
            });
        });
    }

    public loadGltfModel(gltfPath: string, position: THREE.Vector3, trimeshCollisionEnabled: boolean = false, physicsBody: CANNON.Body | null = null): void {
        this.gltfLoader.load(
            gltfPath,
            (gltf) => {
                // Traverse the model to enable shadows and set up materials
                gltf.scene.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        const mesh = child as THREE.Mesh;
                        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

                        materials.forEach((material) => {
                            // Ensure the material is compatible with shadows
                            if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshLambertMaterial) {
                                // These materials are already shadow-compatible
                            } else if (material instanceof THREE.MeshBasicMaterial) {
                                // Convert to a standard material that supports shadows
                                mesh.material = new THREE.MeshStandardMaterial({
                                    map: material.map,
                                    color: material.color
                                });
                            } else {
                                // Default to a basic shadow-compatible material
                                mesh.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
                            }
                        });

                        // Enable shadow casting and receiving
                        mesh.castShadow = true;    // Enable casting shadows
                        mesh.receiveShadow = true; // Enable receiving shadows
                    }
                });

                gltf.scene.position.set(position.x, position.y, position.z);
                SceneContext.getInstance().add(gltf.scene);

                // Create a CANNON.Trimesh for physics if enabled
                if (trimeshCollisionEnabled) {
                    this.createTrimeshPhysics(gltf.scene, position, physicsBody);
                }
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded'); // Optional: console log loading progress
            },
            (error) => {
                console.error('An error happened during loading: ' + error); // Log errors that occur
            }
        );
    }

    private createTrimeshPhysics(scene: THREE.Group, position: THREE.Vector3, physicsBody: CANNON.Body | null = null): void {
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                const geometry = child.geometry;
                const vertices = geometry.attributes.position.array;
                const indices = geometry.index ? geometry.index.array : [];

                const cannonShape = new CANNON.Trimesh(
                    Array.from(vertices),
                    Array.from(indices)
                );

                let cannonBody: CANNON.Body;
                if (physicsBody) {
                    cannonBody = physicsBody;
                    cannonBody.position = new CANNON.Vec3(position.x, position.y, position.z);
                } else {
                    cannonBody = new CANNON.Body({
                        mass: 0, // Static body
                        position: new CANNON.Vec3(position.x, position.y, position.z)
                    });
                }

                cannonBody.addShape(cannonShape);

                WorldContext.getInstance().addBody(cannonBody);
            }
        });
    }
}
