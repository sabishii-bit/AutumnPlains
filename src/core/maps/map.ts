import { Ground } from '../entities/objects/ground/ground';
import { Cube } from '../entities/objects/cube/cube';
import { LightingEffect } from '../effects/lighting/lighting';
import { Skybox } from '../entities/objects/skybox/skybox';
import { Renderer } from '../engine/render/renderer';
import { Wall } from '../entities/objects/wall/wall';
import { JapaneseRestaurant } from '../entities/objects/imported/japanese_restaurant/japanese_restaurant';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GameObjectManager } from '../entities/gameObjectManager';
import { BloomEffect } from '../effects/bloom/bloom';
import { ParticleSystemManager  } from '../effects/particleManager';
import { RainEffect } from '../effects/weather/rain';

export class TestMap {
    private lighting: LightingEffect;
    private bloom: BloomEffect;
    private gameObjectManager: GameObjectManager;
    private rain: RainEffect;

    constructor(renderer: Renderer) {
        this.gameObjectManager = new GameObjectManager();
        this.lighting = new LightingEffect();
        this.bloom = new BloomEffect();
        this.rain = new RainEffect();
        
        new Ground(new THREE.Vector3(0, -1, 0));
        new Cube(new THREE.Vector3(0, 1, 0));
        new Wall(new THREE.Vector3(10, 2, 0));
        new Skybox(new THREE.Vector3(0, 0, 0));
        new JapaneseRestaurant(new THREE.Vector3(10, -1, 0))

        // Add objects and effects to the scene
        this.lighting.addToScene();
        this.gameObjectManager.loadObjects();

    }

    update(deltaTime: number) {
        // Implement any dynamic properties or interactions that need to occur each frame
    }

}
