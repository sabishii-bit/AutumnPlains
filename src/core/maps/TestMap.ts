import { GroundEnvironment } from '../entities/objects/environment/ground/GroundEnvironment';
import { LightingEffect } from '../effects/lighting/LightingEffect';
import { SkyboxEnvironment } from '../entities/objects/environment/skybox/SkyboxEnvironment';
import { Renderer } from '../engine/render/Renderer';
import { JapaneseRestaurant } from '../entities/objects/imported/japanese_restaurant/JapaneseRestaurant';
import * as THREE from 'three';
import { GameObjectManager } from '../entities/GameObjectManager';
import { BloomEffect } from '../effects/bloom/BloomEffect';
import { RainWeatherEffect } from '../effects/weather/RainWeatherEffect';
import { CloudWeatherEffect } from '../effects/weather/CloudWeatherEffect';
import { FogWeatherEffect } from '../effects/weather/FogWeatherEffect';
import { CubeProp } from '../entities/objects/props/cube/CubeProp';
import { WallEnvironment } from '../entities/objects/environment/wall/WallEnvironment';
import { OutskirtStand } from '../entities/objects/imported/outskirt_stand/outskirt_stand';

export class TestMap {
    private lighting: LightingEffect;
    private bloom: BloomEffect;
    private gameObjectManager: GameObjectManager;
    private rain: RainWeatherEffect;
    private fog: FogWeatherEffect;
    private clouds: CloudWeatherEffect;

    constructor(renderer: Renderer) {
        this.gameObjectManager = new GameObjectManager();
        this.lighting = new LightingEffect();
        this.bloom = new BloomEffect();
        this.clouds = new CloudWeatherEffect();
        this.rain = new RainWeatherEffect();
        this.fog = new FogWeatherEffect();
        
        new GroundEnvironment(new THREE.Vector3(0, 10, 10));
        new SkyboxEnvironment(new THREE.Vector3(0, 0, 0));
        new OutskirtStand(new THREE.Vector3(0, 0, 5));

        // Add objects and effects to the scene
        this.lighting.addToScene();

    }

    update(deltaTime: number) {
        // Implement any dynamic properties or interactions that need to occur each frame
    }

}
