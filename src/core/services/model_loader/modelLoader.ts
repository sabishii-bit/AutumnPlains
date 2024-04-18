import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { Scene } from 'three';

export class ModelLoader {
    private gltfLoader: GLTFLoader;
    private objLoader: OBJLoader;
    private mtlLoader: MTLLoader;

    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.objLoader = new OBJLoader();
        this.mtlLoader = new MTLLoader();
    }

    public loadObjModel(mtlPath: string, objPath: string, sceneContext: Scene, position: THREE.Vector3): void {
        this.mtlLoader.load(mtlPath, (mtl) => {
            mtl.preload();
            this.objLoader.setMaterials(mtl);
            this.objLoader.load(objPath, (root) => {
                root.position.copy(position);
                sceneContext.add(root);
            });
        });
    }

    
}
