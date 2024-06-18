import * as THREE from 'three';
import { SceneContext } from '../../global/scene/scene';

export class FogEffect {
    private scene: THREE.Scene = SceneContext.getInstance();
    private fogColor: THREE.Color;
    private fogDensity: number;

    constructor(
        fogColor: THREE.ColorRepresentation = 0x2F2F2F,
        fogDensity: number = 0.02
    ) {
        this.fogColor = new THREE.Color(fogColor);
        this.fogDensity = fogDensity;

        this.initializeFog();
    }

    private initializeFog() {
        // Create a new fog and add it to the scene
        this.scene.fog = new THREE.FogExp2(this.fogColor, this.fogDensity);
    }

    public setFogColor(color: THREE.ColorRepresentation) {
        this.fogColor.set(color);
        if (this.scene.fog instanceof THREE.FogExp2) {
            this.scene.fog.color.set(color);
        }
    }

    public setFogDensity(density: number) {
        this.fogDensity = density;
        if (this.scene.fog instanceof THREE.FogExp2) {
            this.scene.fog.density = density;
        }
    }

    public update(deltaTime: number) {
        // Any updates to fog properties can be handled here
    }
}
