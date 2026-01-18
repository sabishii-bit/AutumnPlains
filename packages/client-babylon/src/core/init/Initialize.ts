import { Engine } from '../engine/Engine';
import { EntityManager } from '../entities/EntityManager';
import { CameraController } from '../camera/CameraController';
import { InputManager } from '../controls/InputManager';
import { ControllerManager } from '../controls/ControllerManager';
import { LightingManager } from '../lighting/LightingManager';
import { PostProcessManager } from '../effects/PostProcessManager';
import { PlayerCharacter } from '../entities/characters/PlayerCharacter';
import { TestMap } from '../maps/TestMap';
import { Vector3 } from '@babylonjs/core';
import type { MeshComponent } from '../entities/components/MeshComponent';

/**
 * Initialize class - handles all game initialization in proper order
 * Separates initialization logic from Engine class
 */
export class Initialize {
    private engine!: Engine;
    private entityManager!: EntityManager;
    private cameraController!: CameraController;
    private inputManager!: InputManager;
    private controllerManager!: ControllerManager;
    private lightingManager!: LightingManager;
    private postProcessManager!: PostProcessManager;
    private player!: PlayerCharacter;
    private map!: TestMap;

    constructor(canvas: HTMLCanvasElement) {
        this.init(canvas);
    }

    /**
     * Initialize all game systems in the correct order
     */
    private async init(canvas: HTMLCanvasElement): Promise<void> {
        try {
            console.log('Starting game initialization...');

            // 1. Create and initialize the engine
            this.engine = new Engine(canvas);
            await this.engine.initialize();

            // 2. Get initialized systems from engine
            this.entityManager = this.engine.getEntityManager();
            this.cameraController = this.engine.getCameraController();
            this.inputManager = this.engine.getInputManager();
            this.lightingManager = this.engine.getLightingManager();
            this.postProcessManager = this.engine.getPostProcessManager();

            // 3. Create player (spawn at Y=2, which is just above ground for a 2m tall capsule)
            this.player = new PlayerCharacter(
                this.engine.getScene(),
                new Vector3(0, 2, 0)
            );
            this.cameraController.setPlayerEntity(this.player);

            // Add player shadows
            const meshComponent = this.player.getComponent<MeshComponent>('mesh');
            const playerMesh = meshComponent?.getMesh();
            if (playerMesh) {
                this.lightingManager.addShadowCaster(playerMesh);
            }

            // 4. Set up input controls
            this.controllerManager = new ControllerManager(this.player);

            // 5. Load map
            this.map = new TestMap(this.engine.getScene(), this.lightingManager);
            await this.map.initialize();

            // 6. Start update loop
            this.startUpdateLoop();

            // 7. Enable pointer lock now that everything is loaded
            this.cameraController.setReady(true);

            console.log('Game initialization complete!');

        } catch (error) {
            console.error('Error during initialization:', error);
            throw error;
        }
    }

    /**
     * Start the main update loop
     */
    private startUpdateLoop(): void {
        // Engine handles its own render loop
        // Add map update, player update, and camera rotation sync
        this.engine.addUpdateCallback((deltaTime) => {
            // Update player movement direction based on camera rotation
            const movementComponent = this.player.getMovementComponent();
            if (movementComponent) {
                const cameraRotation = this.cameraController.getRotation();
                movementComponent.setCameraRotation(cameraRotation.y);
            }

            // Update player (physics, movement, etc.)
            this.player.update(deltaTime);

            // Update map
            this.map.update(deltaTime);
        });
    }

    /**
     * Get the engine instance
     */
    public getEngine(): Engine {
        return this.engine;
    }

    /**
     * Get the player instance
     */
    public getPlayer(): PlayerCharacter {
        return this.player;
    }

    /**
     * Get the current map
     */
    public getMap(): TestMap {
        return this.map;
    }
}
