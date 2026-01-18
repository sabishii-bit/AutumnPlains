import {
    Engine as BabylonEngine,
    Scene,
    Vector3,
    HavokPlugin
} from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { EntityManager } from '../entities/EntityManager';
import { CameraController } from '../camera/CameraController';
import { InputManager } from '../controls/InputManager';
import { LightingManager } from '../lighting/LightingManager';
import { PostProcessManager } from '../effects/PostProcessManager';

/**
 * Main engine class - handles core rendering, physics, and systems
 * Initialization logic moved to Initialize class for better separation
 */
export class Engine {
    private babylonEngine: BabylonEngine;
    private scene!: Scene;
    private canvas: HTMLCanvasElement;
    private entityManager!: EntityManager;
    private cameraController!: CameraController;
    private inputManager!: InputManager;
    private lightingManager!: LightingManager;
    private postProcessManager!: PostProcessManager;
    private havokPlugin!: HavokPlugin;
    private lastFrameTime: number = 0;
    private updateCallbacks: Array<(deltaTime: number) => void> = [];

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.babylonEngine = new BabylonEngine(canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            disableWebGL2Support: false
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.babylonEngine.resize();
        });
    }

    /**
     * Initialize all game systems
     */
    public async initialize(): Promise<void> {
        console.log('Initializing Babylon.js engine...');

        // Create scene
        this.scene = new Scene(this.babylonEngine);
        this.scene.clearColor.set(0.5, 0.7, 1.0, 1.0); // Sky blue

        // Initialize physics with Havok
        await this.initializePhysics();

        // Initialize core systems
        this.entityManager = EntityManager.initialize(this.scene);
        this.inputManager = InputManager.initialize(this.babylonEngine, this.scene);
        this.cameraController = new CameraController(this.scene, this.canvas);

        // Set up lighting with shadows
        this.lightingManager = new LightingManager(this.scene);

        // Set up post-processing effects (bloom, etc.)
        this.postProcessManager = new PostProcessManager(
            this.scene,
            this.cameraController.getCamera()
        );

        console.log('Engine core systems initialized');

        // Start render loop
        this.startRenderLoop();
    }

    /**
     * Initialize Havok physics engine
     */
    private async initializePhysics(): Promise<void> {
        console.log('Initializing Havok physics...');

        try {
            const havokInstance = await HavokPhysics();
            this.havokPlugin = new HavokPlugin(true, havokInstance);
            this.scene.enablePhysics(new Vector3(0, -15, 0), this.havokPlugin);
            console.log('Havok physics initialized with gravity: 0, -15, 0');
        } catch (error) {
            console.error('Failed to initialize Havok physics:', error);
            throw error;
        }
    }


    /**
     * Start the main render loop
     */
    private startRenderLoop(): void {
        this.lastFrameTime = performance.now();

        this.babylonEngine.runRenderLoop(() => {
            const currentTime = performance.now();
            const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
            this.lastFrameTime = currentTime;

            // Update all systems
            this.update(deltaTime);

            // Render the scene
            this.scene.render();
        });
    }

    /**
     * Update all game systems
     */
    private update(deltaTime: number): void {
        // Apply mouse look to camera
        const mouseDelta = this.inputManager.getMouseDelta();
        if (this.inputManager.isPointerLocked()) {
            this.cameraController.applyMouseLook(mouseDelta.x, mouseDelta.y);
        }

        // Update all entities BEFORE clearing input (so they can read this frame's input)
        this.entityManager.update(deltaTime);

        // Execute custom update callbacks (for map, player update, etc.)
        for (const callback of this.updateCallbacks) {
            callback(deltaTime);
        }

        // Update camera position
        this.cameraController.update(deltaTime);

        // Update input LAST (clears single-frame input states after everyone has read them)
        this.inputManager.update(deltaTime);
    }

    /**
     * Add a custom update callback
     */
    public addUpdateCallback(callback: (deltaTime: number) => void): void {
        this.updateCallbacks.push(callback);
    }

    /**
     * Get the Babylon engine instance
     */
    public getBabylonEngine(): BabylonEngine {
        return this.babylonEngine;
    }

    /**
     * Get the scene
     */
    public getScene(): Scene {
        return this.scene;
    }

    /**
     * Get the entity manager
     */
    public getEntityManager(): EntityManager {
        return this.entityManager;
    }

    /**
     * Get the camera controller
     */
    public getCameraController(): CameraController {
        return this.cameraController;
    }

    /**
     * Get the input manager
     */
    public getInputManager(): InputManager {
        return this.inputManager;
    }

    /**
     * Get the lighting manager
     */
    public getLightingManager(): LightingManager {
        return this.lightingManager;
    }

    /**
     * Get the post-process manager
     */
    public getPostProcessManager(): PostProcessManager {
        return this.postProcessManager;
    }

    /**
     * Dispose of the engine
     */
    public dispose(): void {
        this.updateCallbacks = [];
        this.lightingManager.dispose();
        this.postProcessManager.dispose();
        this.entityManager.clear();
        InputManager.destroy();
        this.scene.dispose();
        this.babylonEngine.dispose();
    }
}
