import { VirtualJoystick } from './VirtualJoystick';
import { DeviceDetectionService } from '../../services/DeviceDetectionService';

/**
 * MobileInputManager - Manages all mobile-specific input controls
 * Provides a centralized interface for on-screen joysticks
 */
export class MobileInputManager {
    private static instance: MobileInputManager;
    private deviceDetectionService: DeviceDetectionService;
    private isMobileDevice: boolean;

    // Virtual controls
    private movementJoystick: VirtualJoystick | null = null;
    private lookJoystick: VirtualJoystick | null = null;

    // Input state
    private movementInput: { x: number; y: number } = { x: 0, y: 0 };
    private lookInput: { x: number; y: number } = { x: 0, y: 0 };
    private lookJoystickActive: boolean = false;
    private lookJoystickData: any = null;

    // Camera rotation state (matches old client)
    private cameraYRotation: number = 0;
    private yaw: number = 0;
    private pitch: number = 0;
    private camera: any = null;

    private constructor() {
        this.deviceDetectionService = DeviceDetectionService.getInstance();
        this.isMobileDevice = this.deviceDetectionService.isMobile();
    }

    public static getInstance(): MobileInputManager {
        if (!MobileInputManager.instance) {
            MobileInputManager.instance = new MobileInputManager();
        }
        return MobileInputManager.instance;
    }

    /**
     * Initialize mobile controls (only on mobile devices)
     */
    public initialize(): void {
        if (!this.isMobileDevice) {
            console.log('[MobileInputManager] Not a mobile device, skipping initialization');
            return;
        }

        console.log('[MobileInputManager] Initializing mobile controls');

        // Create movement joystick (left side) - matches old client position
        this.movementJoystick = new VirtualJoystick({
            position: { left: '5rem', bottom: '5rem' },
            color: 'red',
            size: 120,
            mode: 'static',
            onMove: (x: number, y: number) => {
                this.movementInput.x = x;
                this.movementInput.y = y;
            },
            onEnd: () => {
                this.movementInput.x = 0;
                this.movementInput.y = 0;
            }
        });
        this.movementJoystick.initialize();

        // Create look joystick (right side) - matches old client position
        this.lookJoystick = new VirtualJoystick({
            position: { right: '5rem', bottom: '5rem' },
            color: 'blue',
            size: 120,
            mode: 'static',
            onStart: () => {
                this.lookJoystickActive = true;
            },
            onMove: (x: number, y: number, force: number, angle: number) => {
                this.lookJoystickData = { force, angle };
                this.lookInput.x = x;
                this.lookInput.y = y;
                // Trigger camera rotation update (matches old client pattern)
                this.updateCameraRotation();
            },
            onEnd: () => {
                this.lookJoystickActive = false;
                this.lookJoystickData = null;
                this.lookInput.x = 0;
                this.lookInput.y = 0;
            }
        });
        this.lookJoystick.initialize();

        console.log('[MobileInputManager] Mobile controls initialized');
    }

    /**
     * Set camera reference for direct rotation control (matches old client)
     * @param camera Babylon.js camera
     */
    public setCamera(camera: any): void {
        this.camera = camera;
        // Don't initialize from camera - start at 0 like old client
        // The old client's yaw/pitch only track joystick deltas
        this.yaw = 0;
        this.pitch = 0;
        console.log('[MobileInputManager] Camera set, yaw/pitch initialized to 0');
    }

    /**
     * Update camera Y rotation for movement calculations
     * @param yRotation Camera's Y rotation in radians
     */
    public updateCameraYRotation(yRotation: number): void {
        this.cameraYRotation = yRotation;
    }

    /**
     * Update camera rotation from look joystick (matches old client's pattern exactly)
     */
    private updateCameraRotation = (): void => {
        const sensitivity = 0.002;
        const maxForce = 0.25;

        if (this.lookJoystickActive && this.lookJoystickData && this.camera) {
            const angle = this.lookJoystickData.angle;
            let force = this.lookJoystickData.force;
            force = Math.min(force, maxForce);

            const deltaYaw = force * Math.cos(angle) * sensitivity;
            const deltaPitch = force * Math.sin(angle) * sensitivity;

            this.yaw += deltaYaw;
            this.pitch -= deltaPitch;
            this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));

            // Apply rotation directly (Babylon.js handles quaternion conversion internally)
            this.camera.rotation.x = this.pitch;
            this.camera.rotation.y = this.yaw;
            this.camera.rotation.z = 0;

            // Continue updating while joystick is active (matches old client)
            requestAnimationFrame(this.updateCameraRotation);
        }
    };

    /**
     * Get movement input as normalized vector
     * Returns camera-relative movement direction
     */
    public getMovementInput(): { x: number; z: number } {
        if (!this.isMobileDevice || !this.movementJoystick) {
            return { x: 0, z: 0 };
        }

        // Get raw joystick input
        // Old client: moveX = Math.cos(angle) * force, moveZ = Math.sin(angle) * force * -1
        // VirtualJoystick gives us: x = Math.cos(angle), y = Math.sin(angle)
        const x = this.movementInput.x;
        const y = this.movementInput.y; // Don't negate - the issue is elsewhere

        if (x === 0 && y === 0) {
            return { x: 0, z: 0 };
        }

        // Transform joystick input to world space based on camera rotation
        // Joystick Y becomes forward/backward (z)
        // Joystick X becomes left/right (x)
        const forward = Math.sin(this.cameraYRotation);
        const right = Math.cos(this.cameraYRotation);

        // Calculate camera-relative movement
        const worldX = (x * right) + (y * forward);
        const worldZ = (y * Math.cos(this.cameraYRotation)) - (x * Math.sin(this.cameraYRotation));

        // Normalize the result
        const length = Math.sqrt(worldX * worldX + worldZ * worldZ);
        if (length > 0) {
            return {
                x: worldX / length,
                z: worldZ / length
            };
        }

        return { x: 0, z: 0 };
    }

    /**
     * Get look input (for camera rotation)
     * Returns normalized x, y delta for camera rotation
     */
    public getLookInput(): { x: number; y: number } {
        if (!this.isMobileDevice || !this.lookJoystick) {
            return { x: 0, y: 0 };
        }

        return {
            x: this.lookInput.x,
            y: this.lookInput.y
        };
    }

    /**
     * Check if mobile controls are active
     */
    public isMobile(): boolean {
        return this.isMobileDevice;
    }

    /**
     * Show mobile controls
     */
    public show(): void {
        if (!this.isMobileDevice) return;

        this.movementJoystick?.show();
        this.lookJoystick?.show();
    }

    /**
     * Hide mobile controls
     */
    public hide(): void {
        if (!this.isMobileDevice) return;

        this.movementJoystick?.hide();
        this.lookJoystick?.hide();
    }

    /**
     * Clean up and dispose all mobile controls
     */
    public dispose(): void {
        this.movementJoystick?.dispose();
        this.lookJoystick?.dispose();

        this.movementJoystick = null;
        this.lookJoystick = null;

        console.log('[MobileInputManager] Disposed');
    }
}
