import { FreeCamera, Vector3, Scene } from '@babylonjs/core';

/**
 * FPS camera controller with mouse look and player following
 * Uses Babylon.js FreeCamera for proper first-person controls
 */
export class CameraController {
    private camera: FreeCamera;
    private scene: Scene;
    private canvas: HTMLCanvasElement;
    private mouseSensitivityX: number = 0.002; // Horizontal mouse look sensitivity
    private mouseSensitivityY: number = 0.002; // Vertical mouse look sensitivity
    private playerEntity: any = null; // Will hold reference to player entity
    private eyeHeight: number = 1.7; // Camera height offset from player position
    private isReady: boolean = false; // Prevent pointer lock during initialization

    constructor(scene: Scene, canvas: HTMLCanvasElement, mouseSensitivity?: number) {
        this.scene = scene;
        this.canvas = canvas;

        // Only override if explicitly provided, otherwise use defaults (0.01)
        if (mouseSensitivity !== undefined) {
            this.mouseSensitivityX = mouseSensitivity;
            this.mouseSensitivityY = mouseSensitivity;
        }

        // Create FPS camera
        this.camera = new FreeCamera(
            'fpsCamera',
            new Vector3(0, this.eyeHeight, 0),
            scene
        );

        // Configure camera properties
        this.camera.fov = Math.PI / 3; // 60 degrees FOV
        this.camera.minZ = 0.1;
        this.camera.maxZ = 1000;
        this.camera.speed = 0; // Disable built-in movement (we handle it via player)
        this.camera.angularSensibility = 0; // Disable built-in mouse look (we handle it manually)
        this.camera.inertia = 0; // No inertia for precise control

        // Set as active camera
        scene.activeCamera = this.camera;

        // We handle all input manually, so we don't need attachControl
        // (attachControl can interfere with our custom pointer lock handling)

        // Set up pointer lock using Babylon.js scene API
        this.setupPointerLock();
    }

    /**
     * Set up pointer lock using Babylon.js scene API
     */
    private setupPointerLock(): void {
        // Use Babylon.js scene pointer lock mechanism
        this.canvas.addEventListener('click', () => {
            // Only allow pointer lock if scene is ready
            if (!document.pointerLockElement && this.isReady) {
                this.canvas.requestPointerLock();
            }
        });

        // Optional: Exit pointer lock on ESC
        document.addEventListener('pointerlockchange', () => {
            if (!document.pointerLockElement) {
                console.log('Pointer lock released');
            }
        });
    }

    /**
     * Mark camera as ready to accept pointer lock
     * Call this after initialization is complete
     */
    public setReady(ready: boolean = true): void {
        this.isReady = ready;
        if (ready) {
            console.log('Camera ready for pointer lock');
        }
    }

    /**
     * Update camera position and rotation based on player and mouse input
     */
    public update(deltaTime: number): void {
        // Update camera position to follow player
        if (this.playerEntity) {
            const playerPosition = this.playerEntity.getPosition();

            // Check for invalid position values
            if (!playerPosition || isNaN(playerPosition.x) || isNaN(playerPosition.y) || isNaN(playerPosition.z)) {
                console.error('Invalid player position:', playerPosition);
                return;
            }

            this.camera.position.x = playerPosition.x;
            this.camera.position.y = playerPosition.y + this.eyeHeight;
            this.camera.position.z = playerPosition.z;

            // Debug log camera position occasionally
            if (Math.random() < 0.01) { // Log 1% of frames
                console.log('Camera pos:', this.camera.position, 'Player pos:', playerPosition);
            }
        }
    }

    /**
     * Apply mouse look rotation
     * @param deltaX Mouse movement in X (horizontal)
     * @param deltaY Mouse movement in Y (vertical)
     */
    public applyMouseLook(deltaX: number, deltaY: number): void {
        // Horizontal rotation (yaw)
        this.camera.rotation.y += deltaX * this.mouseSensitivityX;

        // Vertical rotation (pitch) with clamping
        this.camera.rotation.x += deltaY * this.mouseSensitivityY;

        // Clamp vertical rotation to prevent flipping
        const maxPitch = Math.PI / 2 - 0.01; // Slightly less than 90 degrees
        this.camera.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, this.camera.rotation.x));
    }

    /**
     * Set the player entity to follow
     */
    public setPlayerEntity(entity: any): void {
        this.playerEntity = entity;
    }

    /**
     * Set mouse sensitivity (sets both X and Y)
     */
    public setMouseSensitivity(sensitivity: number): void {
        this.mouseSensitivityX = sensitivity;
        this.mouseSensitivityY = sensitivity;
    }

    /**
     * Set mouse sensitivity separately for X and Y axes
     */
    public setMouseSensitivityXY(sensitivityX: number, sensitivityY: number): void {
        this.mouseSensitivityX = sensitivityX;
        this.mouseSensitivityY = sensitivityY;
    }

    /**
     * Set eye height offset from player position
     */
    public setEyeHeight(height: number): void {
        this.eyeHeight = height;
    }

    /**
     * Get the camera instance
     */
    public getCamera(): FreeCamera {
        return this.camera;
    }

    /**
     * Get camera forward direction (for movement)
     */
    public getForward(): Vector3 {
        return this.camera.getDirection(Vector3.Forward());
    }

    /**
     * Get camera right direction (for strafing)
     */
    public getRight(): Vector3 {
        return this.camera.getDirection(Vector3.Right());
    }

    /**
     * Get camera rotation (yaw, pitch, roll)
     */
    public getRotation(): Vector3 {
        return this.camera.rotation;
    }
}
