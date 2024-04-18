import { World } from 'cannon-es';
import { Scene } from 'three';
import { Plane } from '../entities/objects/plane/plane';
import { Cube } from '../entities/objects/cube/cube';
import { Lighting } from '../effects/lighting/lighting';
import { Skybox } from '../entities/objects/skybox/skybox';
import { Player } from '../entities/player/player';
import { Renderer } from '../engine/render/renderer';
import { Wall } from '../entities/objects/wall/wall';
import { Tree } from '../entities/imported/tree/tree';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class TestMap {
    private ground: Plane;
    private cube: Cube;
    private lighting: Lighting;
    private wall: Wall;
    private skybox: Skybox;
    private player: Player;
    private worldContext: World;
    private tree: Tree;
    private tree2: Tree;

    constructor(world: World, renderer: Renderer, scene: Scene, player: Player) {
        this.worldContext = world;
        this.player = player;
        
        this.ground = new Plane(this.worldContext, new THREE.Vector3(0, -1, 0));
        this.cube = new Cube(this.worldContext, new THREE.Vector3(0, 1, 0));
        this.lighting = new Lighting(renderer.getRenderer());
        this.wall = new Wall(this.worldContext, new THREE.Vector3(10, 2, 0), 0.25, 10, 10);
        this.skybox = new Skybox(this.worldContext, new THREE.Vector3(0, 0, 0));

        // Add objects to the scene
        this.ground.addToScene(scene);
        this.cube.addToScene(scene);
        this.wall.addToScene(scene);
        this.lighting.addToScene(scene);
        this.skybox.addToScene(scene);
        new Tree(this.worldContext, new THREE.Vector3(-10, 0, 0), scene, )
        this.tree = new Tree(this.worldContext, new THREE.Vector3(-10, 0, 0), scene, {x: 3, y: 4, z: 6});
        this.tree2 = new Tree(this.worldContext, new THREE.Vector3(-8, 0, 5), scene);


        this.setGroundAsDefaultMaterial();
        this.initializeContactMaterialBetweenGroundAndPlayer();
    }

    private setGroundAsDefaultMaterial() {
        const groundMaterial = this.ground.getBody().material;
        this.worldContext.defaultMaterial = groundMaterial;  // Set the ground material as the default for the world
    }

    initializeContactMaterialBetweenGroundAndPlayer() {
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
}
