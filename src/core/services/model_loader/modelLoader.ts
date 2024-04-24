import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { SceneContext } from '../../global/scene/scene';

export class ModelLoader {
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

    public loadGltfModel(gltfPath: string, position: THREE.Vector3): void {
        this.gltfLoader.load(
            gltfPath,
            (gltf) => {
                gltf.scene.position.set(position.x, position.y, position.z);
                SceneContext.getInstance().add(gltf.scene);
            }, (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded'); // Optional: console log loading progress
            }, (error) => {
                console.error('An error happened during loading: ' + error); // Log errors that occur
            }
        );
    }

    
}
