import * as THREE from 'three';
import { EngineClock } from '../engine/clock/EngineClock';
import { Renderer } from '../engine/render/Renderer';
import { PlayerCamera } from '../camera/PlayerCamera';
import { TestMap } from '../maps/TestMap';
import { SceneContext } from '../global/scene/SceneContext';
import { WorldContext } from '../global/world/WorldContext';
import { PlayerCharacter } from '../entities/objects/characters/PlayerCharacter';
import { ControllerManager } from '../controls/ControllerManager';
import { GameObjectManager } from '../entities/GameObjectManager';
import { ParticleSystemManager } from '../effects/ParticleSystemManager';
import { UIManager } from '../ui/UIManager';
import StateManager from '../entities/objects/characters/character_state/StateManager';
import { ProjectileManager } from '../entities/objects/projectiles/ProjectileManager';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { PhysicsMaterialsManager } from '../physics/PhysicsMaterialsManager';
import { NetworkManager } from '../services/netcode/NetworkManager';

export default class Initialize {
    private scene!: THREE.Scene;
    private renderer!: Renderer;
    private camera!: PlayerCamera;
    private map!: TestMap;
    private world!: any; // Ammo.btDiscreteDynamicsWorld
    private engineClock!: EngineClock;
    private player!: PlayerCharacter;
    private controls!: ControllerManager;
    private gameObjectManager!: GameObjectManager;
    private particleSystemManager!: ParticleSystemManager;
    private uiManager!: UIManager;  // Declare UIManager
    private projectileManager!: ProjectileManager; // Declare ProjectileManager
    private physicsSystem!: PhysicsSystem; // Physics system
    private physicsMaterialsManager!: PhysicsMaterialsManager; // Physics materials manager
    private networkManager: NetworkManager;

    constructor() {
        this.networkManager = NetworkManager.getInstance();
        this.init();
    }

    private async init() {
        try {
            // Initialize Ammo.js first and wait for it to complete
            await WorldContext.initAmmo();
            
            // Create and initialize scene and render components
            this.scene = SceneContext.getInstance();
            this.renderer = Renderer.getInstance();
            
            // Initialize physics world after Ammo is ready
            this.world = WorldContext.getInstance();
            
            // Initialize physics materials (must be after Ammo is initialized)
            this.physicsMaterialsManager = PhysicsMaterialsManager.getInstance();
            
            // Initialize physics system next
            this.physicsSystem = PhysicsSystem.getInstance(false);
            
            // Then initialize the game clock
            this.engineClock = EngineClock.getInstance();
            this.engineClock.start(); // Start the clock
            
            // Initialize state system
            StateManager.registerStates();
            
            // Now initialize all managers
            this.gameObjectManager = GameObjectManager.getInstance();
            this.particleSystemManager = new ParticleSystemManager();
            this.projectileManager = ProjectileManager.getInstance();
            
            // Initialize UI components
            this.uiManager = new UIManager();
            
            // Finally, initialize player and map components
            this.player = PlayerCharacter.getInstance(new THREE.Vector3(0, 2, 18));
            this.camera = PlayerCamera.getInstance();
            this.controls = ControllerManager.getInstance(document.body);
            this.map = new TestMap(this.renderer);
            
            // Connect to the game server
            this.networkManager.connectToServer().catch((err: Error) => {
                console.error('Network connection error during initialization:', err);
            });
            
            this.animate();
            
        } catch (error: unknown) {
            console.error("Error during initialization:", error);
        }
    }


    private animate = () => {
        requestAnimationFrame(this.animate);
        const frameDeltaTime = this.engineClock.getFrameDeltaTime();
        
        // Update physics using the physics system
        this.physicsSystem.update(this.engineClock.getFixedTimeStep());
        
        this.map.update(frameDeltaTime);
        this.gameObjectManager.updateGameObjects(frameDeltaTime);
        this.particleSystemManager.update(frameDeltaTime);
        this.uiManager.updateUI(frameDeltaTime);  // Update UI components
        this.projectileManager.update(frameDeltaTime); // Update ProjectileManager
        this.camera.update(frameDeltaTime);
        this.controls.update(frameDeltaTime);
        this.renderer.getRenderer().render(this.scene, this.camera.getCamera());
    }
}
