import * as THREE from 'three';

export class SceneContext {
    private static instance: THREE.Scene;

    private constructor() {
        // Create and configure the THREE.Scene instance
        const scene = new THREE.Scene();
        SceneContext.instance = scene;
    }

    public static getInstance(): THREE.Scene {
        if (!SceneContext.instance) {
            new SceneContext();
        }
        return SceneContext.instance;
    }
}
