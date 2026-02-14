import { Engine } from '../engine/Engine';
import { EntityManager } from '../entities/EntityManager';
import { CameraController } from '../camera/CameraController';
import { InputManager } from '../controls/InputManager';
import { ControllerManager } from '../controls/ControllerManager';
import { LightingManager } from '../lighting/LightingManager';
import { PostProcessManager } from '../effects/PostProcessManager';
import { PlayerCharacter } from '../entities/characters/PlayerCharacter';
import { TestMap } from '../maps/TestMap';
import { NetworkManager } from '../networking/NetworkManager';
import { NetworkPlayerManager } from '../networking/NetworkPlayerManager';
import { WebRTCManager } from '../networking/WebRTCManager';
import { ProjectileManager } from '../entities/projectiles/ProjectileManager';
import { Vector3 } from '@babylonjs/core';
import type { MeshComponent } from '../entities/components/MeshComponent';
import { ToggleChatCommand } from '../controls/commands/chat/ToggleChatCommand';
import { FireProjectileCommand } from '../controls/commands/FireProjectileCommand';

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
    private networkManager!: NetworkManager;
    private networkPlayerManager!: NetworkPlayerManager;
    private projectileManager!: ProjectileManager;
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

            // 3. Load map first to get spawn point
            this.map = new TestMap(this.engine.getScene(), this.lightingManager);
            await this.map.initialize();

            // 4. Create player at map's spawn point
            this.player = new PlayerCharacter(
                this.engine.getScene(),
                this.map.getSpawnPoint()
            );
            this.cameraController.setPlayerEntity(this.player);

            // Add player shadows
            const meshComponent = this.player.getComponent<MeshComponent>('mesh');
            const playerMesh = meshComponent?.getMesh();
            if (playerMesh) {
                this.lightingManager.addShadowCaster(playerMesh);
            }

            // 5. Initialize projectile system
            this.projectileManager = ProjectileManager.getInstance();
            this.projectileManager.initialize(this.engine.getScene());

            // 6. Set up input controls
            this.controllerManager = new ControllerManager(this.player);

            // Register chat toggle command (doesn't need player reference)
            const toggleChatCommand = new ToggleChatCommand(this.inputManager.getKeyStates());
            this.inputManager.registerCommand(toggleChatCommand);

            // Register fire projectile command (Middle mouse button)
            const fireProjectileCommand = new FireProjectileCommand(
                ['MouseMiddle'],
                this.inputManager.getKeyStates(),
                this.cameraController
            );
            this.inputManager.registerCommand(fireProjectileCommand);

            // Set camera for mobile input manager (for direct rotation control)
            const mobileInputManager = this.inputManager.getMobileInputManager();
            mobileInputManager.setCamera(this.cameraController.getCamera());

            // 7. Set up networking
            this.networkManager = NetworkManager.getInstance();
            this.networkManager.initializePlayerSync(this.player, this.cameraController);

            // Initialize WebRTC manager for peer-to-peer connections
            const webrtcManager = WebRTCManager.getInstance();
            webrtcManager.initialize();

            // Initialize network player manager
            this.networkPlayerManager = NetworkPlayerManager.getInstance();
            this.networkPlayerManager.initialize(this.engine.getScene());

            await this.connectToServer();

            // 8. Set up UI callbacks
            this.setupUICallbacks();

            // 9. Start update loop
            this.startUpdateLoop();

            // 10. Enable pointer lock now that everything is loaded
            this.cameraController.setReady(true);

            console.log('Game initialization complete!');

        } catch (error) {
            console.error('Error during initialization:', error);
            throw error;
        }
    }

    /**
     * Connect to game server
     */
    private async connectToServer(): Promise<void> {
        try {
            console.log('Connecting to game server...');
            await this.networkManager.connectToServer();
            console.log('Connected to game server');
        } catch (error) {
            console.warn('Failed to connect to server:', error);
            // Don't throw - allow game to continue in offline mode
        }
    }

    /**
     * Setup UI callbacks to display player/camera data
     */
    private setupUICallbacks(): void {
        const debugInfo = this.engine.getUIManager().getDebugInfo();

        // Set player position callback
        debugInfo.setPlayerPositionCallback(() => {
            return this.player.getPosition();
        });

        // Set player velocity callback
        debugInfo.setPlayerVelocityCallback(() => {
            const movementComponent = this.player.getMovementComponent();
            if (movementComponent) {
                return movementComponent.getVelocity();
            }
            return new Vector3(0, 0, 0);
        });

        // Set camera rotation callback
        debugInfo.setCameraRotationCallback(() => {
            return this.cameraController.getRotation();
        });
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

            // Update projectiles
            this.projectileManager.update(deltaTime);

            // Update network players
            this.networkPlayerManager.update(deltaTime);
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
