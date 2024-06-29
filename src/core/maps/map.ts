import { Ground } from '../entities/objects/ground/ground';
import { LightingEffect } from '../effects/lighting/lighting';
import { Skybox } from '../entities/objects/skybox/skybox';
import { Renderer } from '../engine/render/renderer';
import { JapaneseRestaurant } from '../entities/objects/imported/japanese_restaurant/japanese_restaurant';
import * as THREE from 'three';
import { GameObjectManager } from '../entities/gameObjectManager';
import { BloomEffect } from '../effects/bloom/bloom';
import { RainEffect } from '../effects/weather/rain';
import { CloudEffect } from '../effects/weather/clouds';
import { FogEffect } from '../effects/weather/fog';

export class TestMap {
    private lighting: LightingEffect;
    private bloom: BloomEffect;
    private gameObjectManager: GameObjectManager;
    private rain: RainEffect;
    private fog: FogEffect;
    private clouds: CloudEffect;

    constructor(renderer: Renderer) {
        this.gameObjectManager = new GameObjectManager();
        this.lighting = new LightingEffect();
        this.bloom = new BloomEffect();
        this.clouds = new CloudEffect();
        this.rain = new RainEffect();
        this.fog = new FogEffect();
        
        new Ground(new THREE.Vector3(0, -1, 0));
        new Skybox(new THREE.Vector3(0, 0, 0));
        new JapaneseRestaurant(new THREE.Vector3(10, 0, 0));
        //new LittleTokyo(new THREE.Vector3(20, 0, 0));

        // Add objects and effects to the scene
        this.lighting.addToScene();
        this.gameObjectManager.loadObjects();

    }

    update(deltaTime: number) {
        // Implement any dynamic properties or interactions that need to occur each frame
    }

}
