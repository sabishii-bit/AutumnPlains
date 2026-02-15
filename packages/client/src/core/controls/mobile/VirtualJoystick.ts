import nipplejs, { JoystickManager, JoystickOutputData } from 'nipplejs';

/**
 * Configuration options for VirtualJoystick
 */
export interface VirtualJoystickOptions {
    /** Position of the joystick */
    position: {
        left?: string;
        right?: string;
        top?: string;
        bottom?: string;
    };
    /** Color of the joystick */
    color?: string;
    /** Size of the joystick in pixels */
    size?: number;
    /** Joystick mode */
    mode?: 'static' | 'semi' | 'dynamic';
    /** Callback when joystick moves */
    onMove?: (x: number, y: number, force: number, angle: number) => void;
    /** Callback when joystick is released */
    onEnd?: () => void;
    /** Callback when joystick touch starts */
    onStart?: () => void;
}

/**
 * VirtualJoystick - A reusable on-screen joystick component
 * Provides normalized x, y input values between -1 and 1
 */
export class VirtualJoystick {
    private joystick: JoystickManager | null = null;
    private zone: HTMLElement | null = null;
    private options: VirtualJoystickOptions;
    private currentX: number = 0;
    private currentY: number = 0;
    private currentForce: number = 0;
    private currentAngle: number = 0;

    constructor(options: VirtualJoystickOptions) {
        this.options = options;
    }

    /**
     * Initialize and show the joystick
     */
    public initialize(): void {
        if (this.joystick) {
            console.warn('[VirtualJoystick] Already initialized');
            return;
        }

        // Create the zone element
        this.zone = this.createZone();

        // Create the joystick using nipplejs
        this.joystick = nipplejs.create({
            zone: this.zone,
            mode: this.options.mode || 'static',
            position: this.options.position,
            color: this.options.color || 'white',
            size: this.options.size || 120,
            threshold: 0.1,
            fadeTime: 250,
            restOpacity: 0.5
        });

        // Set up event handlers
        this.joystick.on('start', this.handleStart);
        this.joystick.on('move', this.handleMove);
        this.joystick.on('end', this.handleEnd);

        console.log('[VirtualJoystick] Initialized');
    }

    /**
     * Create the zone element for the joystick
     * The zone covers half the screen, positioned based on left/right
     */
    private createZone(): HTMLElement {
        const zone = document.createElement('div');
        zone.style.position = 'absolute';
        zone.style.width = '50%';
        zone.style.height = '50%';
        zone.style.bottom = '0';
        zone.style.zIndex = '1000';
        zone.style.touchAction = 'none';
        zone.style.userSelect = 'none';
        zone.style.pointerEvents = 'auto';

        // Position the zone - only set left OR right to 0, not the position values
        if (this.options.position.left !== undefined) {
            zone.style.left = '0';
        }
        if (this.options.position.right !== undefined) {
            zone.style.right = '0';
        }

        document.body.appendChild(zone);
        console.log('[VirtualJoystick] Zone created with styles:', zone.style.cssText);
        return zone;
    }

    /**
     * Handle joystick start event
     */
    private handleStart = (): void => {
        if (this.options.onStart) {
            this.options.onStart();
        }
    };

    /**
     * Handle joystick move event
     */
    private handleMove = (evt: any, data: JoystickOutputData): void => {
        const angle = data.angle.radian;
        const force = Math.min(data.force, 2.0); // Limit force to prevent extreme values

        // Calculate normalized x and y from angle and force
        // Match old client behavior:
        // moveX = Math.cos(angle) * force
        // moveZ = Math.sin(angle) * force
        const normalizedForce = Math.min(force / 2.0, 1.0); // Normalize force to 0-1
        this.currentX = Math.cos(angle) * normalizedForce;
        this.currentY = Math.sin(angle) * normalizedForce; // Don't invert - let caller handle inversion if needed

        this.currentForce = normalizedForce;
        this.currentAngle = angle;

        if (this.options.onMove) {
            this.options.onMove(this.currentX, this.currentY, this.currentForce, this.currentAngle);
        }
    };

    /**
     * Handle joystick end event
     */
    private handleEnd = (): void => {
        this.currentX = 0;
        this.currentY = 0;
        this.currentForce = 0;
        this.currentAngle = 0;

        if (this.options.onEnd) {
            this.options.onEnd();
        }
    };

    /**
     * Get current normalized X input (-1 to 1)
     */
    public getX(): number {
        return this.currentX;
    }

    /**
     * Get current normalized Y input (-1 to 1)
     */
    public getY(): number {
        return this.currentY;
    }

    /**
     * Get current force (0 to 1)
     */
    public getForce(): number {
        return this.currentForce;
    }

    /**
     * Get current angle in radians
     */
    public getAngle(): number {
        return this.currentAngle;
    }

    /**
     * Show the joystick
     */
    public show(): void {
        if (this.zone) {
            this.zone.style.display = 'block';
        }
    }

    /**
     * Hide the joystick
     */
    public hide(): void {
        if (this.zone) {
            this.zone.style.display = 'none';
        }
    }

    /**
     * Clean up and destroy the joystick
     */
    public dispose(): void {
        if (this.joystick) {
            this.joystick.destroy();
            this.joystick = null;
        }

        if (this.zone && this.zone.parentElement) {
            this.zone.parentElement.removeChild(this.zone);
            this.zone = null;
        }

        console.log('[VirtualJoystick] Disposed');
    }
}
