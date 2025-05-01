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

    constructor() {
        this.init();
    }

    private async init() {
        try {
            // Initialize Ammo.js first and wait for it to complete
            console.log("Initializing Ammo.js...");
            await WorldContext.initAmmo();
            console.log("Ammo.js initialized successfully");
            
            // Create and initialize scene and render components
            this.scene = SceneContext.getInstance();
            this.renderer = Renderer.getInstance();
            
            // Initialize physics world after Ammo is ready
            this.world = WorldContext.getInstance();
            
            // Set custom gravity (y value controls strength)
            WorldContext.setWorldGravity(0, -20, 0);
            console.log("Current gravity:", WorldContext.getGravity());
            
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
            
            this.animate();
            
            // Set up key events for debug controls
            this.setupDebugControls();
        } catch (error) {
            console.error("Error during initialization:", error);
        }
    }
    
    /**
     * Set up keyboard controls for debugging
     */
    private setupDebugControls(): void {
        // Add event listener for physics debug toggle (P key)
        window.addEventListener('keydown', (event) => {
            // Toggle physics debug visualization on 'P' key
            if (event.key === 'p' || event.key === 'P') {
                this.physicsSystem.toggleDebug();
            }
            
            // Gravity testing controls
            // G+1: Light gravity
            if (event.key === '1' && event.altKey) {
                WorldContext.setWorldGravity(0, -5, 0);
                console.log("Gravity set to LIGHT:", WorldContext.getGravity());
                // Test on player if available
                if (this.player) {
                    this.player.testGravity();
                }
            }
            // G+2: Medium gravity
            else if (event.key === '2' && event.altKey) {
                WorldContext.setWorldGravity(0, -15, 0);
                console.log("Gravity set to MEDIUM:", WorldContext.getGravity());
                if (this.player) {
                    this.player.testGravity();
                }
            }
            // G+3: Heavy gravity
            else if (event.key === '3' && event.altKey) {
                WorldContext.setWorldGravity(0, -30, 0);
                console.log("Gravity set to HEAVY:", WorldContext.getGravity());
                if (this.player) {
                    this.player.testGravity();
                }
            }
            // G+0: Zero gravity
            else if (event.key === '0' && event.altKey) {
                WorldContext.setWorldGravity(0, 0, 0);
                console.log("Gravity set to ZERO:", WorldContext.getGravity());
                if (this.player) {
                    this.player.testGravity();
                }
            }
            
            // Movement speed testing controls (with Shift key)
            // Shift+1: Slow movement
            if (event.key === '1' && event.shiftKey && this.player) {
                this.player.setMoveSpeed(15);
                console.log("Movement speed set to SLOW");
            }
            // Shift+2: Medium movement
            else if (event.key === '2' && event.shiftKey && this.player) {
                this.player.setMoveSpeed(30);
                console.log("Movement speed set to MEDIUM");
            }
            // Shift+3: Fast movement
            else if (event.key === '3' && event.shiftKey && this.player) {
                this.player.setMoveSpeed(60);
                console.log("Movement speed set to FAST");
            }
            // Shift+4: Very fast movement
            else if (event.key === '4' && event.shiftKey && this.player) {
                this.player.setMoveSpeed(120);
                console.log("Movement speed set to VERY FAST");
            }
            // Shift+Arrow Up: Increase movement speed
            else if (event.key === 'ArrowUp' && event.shiftKey && this.player) {
                this.player.adjustMoveSpeed(10);
            }
            // Shift+Arrow Down: Decrease movement speed
            else if (event.key === 'ArrowDown' && event.shiftKey && this.player) {
                this.player.adjustMoveSpeed(-10);
            }
        });
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
