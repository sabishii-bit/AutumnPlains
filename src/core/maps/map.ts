import { World } from 'cannon-es';
import { Scene } from 'three';
import { Plane } from '../entities/objects/plane/plane';
import { Cube } from '../entities/objects/cube/cube';
import { Lighting } from '../effects/lighting/lighting';
import { Skybox } from '../entities/objects/skybox/skybox';
import { Player } from '../entities/player/player';
import { Renderer } from '../engine/render/renderer';
import { Wall } from '../entities/objects/wall/wall';
import { Tree } from '../entities/objects/imported/tree/tree';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { WorldContext } from '../global/world/world';
import { SceneContext } from '../global/scene/scene';

export class TestMap {
    private ground: Plane;
    private cube: Cube;
    private lighting: Lighting;
    private wall: Wall;
    private skybox: Skybox;
    private player: Player;
    private worldContext: World;
    private sceneContext: Scene;

    constructor(renderer: Renderer) {
        this.worldContext = WorldContext.getInstance();
        this.sceneContext = SceneContext.getInstance();
        this.player = Player.getInstance();
        
        this.ground = new Plane(new THREE.Vector3(0, -1, 0));
        this.cube = new Cube(new THREE.Vector3(0, 1, 0));
        this.lighting = new Lighting(renderer.getRenderer());
        this.wall = new Wall(new THREE.Vector3(10, 2, 0));
        this.skybox = new Skybox(new THREE.Vector3(0, 0, 0));

        // Add objects to the scene
        this.ground.addToScene();
        this.cube.addToScene();
        this.wall.addToScene();
        this.lighting.addToScene();
        this.skybox.addToScene();


        this.setGroundAsDefaultMaterial();
        this.initializeContactMaterialBetweenGroundAndPlayer();
        this.startSpawningCubes();
    }

    private setGroundAsDefaultMaterial() {
        const groundMaterial = this.ground.getBody().material;
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

    update(deltaTime: number) {
        // Implement any dynamic properties or interactions that need to occur each frame
        this.cube.update(deltaTime);
    }

    private startSpawningCubes() {
        window.setInterval(() => {
            this.spawnCube();
        }, 500);
    }

    private spawnCube() {
        const x = Math.floor(Math.random() * 40) - 20; // Random x position between -20 and 20
        const z = Math.floor(Math.random() * 40) - 20; // Random z position between -20 and 20
        const y = Math.floor(Math.random() * 10) + 5;
        const cube = new Cube(new THREE.Vector3(x, y, z));
        cube.addToScene(this.sceneContext);
    }

}
