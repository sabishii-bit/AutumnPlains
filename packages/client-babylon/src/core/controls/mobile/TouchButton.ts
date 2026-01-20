/**
 * Configuration options for TouchButton
 */
export interface TouchButtonOptions {
    /** Position of the button */
    position: {
        left?: string;
        right?: string;
        top?: string;
        bottom?: string;
    };
    /** Button label/text */
    label: string;
    /** Button size in pixels */
    size?: number;
    /** Button color */
    color?: string;
    /** Background opacity (0-1) */
    opacity?: number;
    /** Callback when button is pressed */
    onPress?: () => void;
    /** Callback when button is released */
    onRelease?: () => void;
}

/**
 * TouchButton - A reusable on-screen button for mobile controls
 */
export class TouchButton {
    private button: HTMLElement | null = null;
    private options: TouchButtonOptions;
    private isPressed: boolean = false;

    constructor(options: TouchButtonOptions) {
        this.options = options;
    }

    /**
     * Initialize and show the button
     */
    public initialize(): void {
        if (this.button) {
            console.warn('[TouchButton] Already initialized');
            return;
        }

        this.button = this.createButton();
        this.setupEventListeners();

        console.log(`[TouchButton] Initialized: ${this.options.label}`);
    }

    /**
     * Create the button element
     */
    private createButton(): HTMLElement {
        const button = document.createElement('div');
        const size = this.options.size || 60;

        button.style.position = 'absolute';
        button.style.width = `${size}px`;
        button.style.height = `${size}px`;
        button.style.borderRadius = '50%';
        button.style.backgroundColor = this.options.color || 'rgba(255, 255, 255, 0.3)';
        button.style.opacity = String(this.options.opacity || 0.6);
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.color = 'white';
        button.style.fontSize = '14px';
        button.style.fontWeight = 'bold';
        button.style.userSelect = 'none';
        button.style.touchAction = 'none';
        button.style.pointerEvents = 'auto';
        button.style.zIndex = '1000';
        button.style.border = '2px solid rgba(255, 255, 255, 0.5)';
        button.style.transition = 'opacity 0.1s, transform 0.1s';
        button.textContent = this.options.label;

        // Position the button
        if (this.options.position.left !== undefined) {
            button.style.left = this.options.position.left;
        }
        if (this.options.position.right !== undefined) {
            button.style.right = this.options.position.right;
        }
        if (this.options.position.top !== undefined) {
            button.style.top = this.options.position.top;
        }
        if (this.options.position.bottom !== undefined) {
            button.style.bottom = this.options.position.bottom;
        }

        document.body.appendChild(button);
        return button;
    }

    /**
     * Set up touch and mouse event listeners
     */
    private setupEventListeners(): void {
        if (!this.button) return;

        // Touch events
        this.button.addEventListener('touchstart', this.handlePress, { passive: false });
        this.button.addEventListener('touchend', this.handleRelease, { passive: false });
        this.button.addEventListener('touchcancel', this.handleRelease, { passive: false });

        // Mouse events (for testing on desktop)
        this.button.addEventListener('mousedown', this.handlePress);
        this.button.addEventListener('mouseup', this.handleRelease);
        this.button.addEventListener('mouseleave', this.handleRelease);
    }

    /**
     * Handle button press
     */
    private handlePress = (event: Event): void => {
        event.preventDefault();
        event.stopPropagation();

        if (this.isPressed) return;

        this.isPressed = true;

        // Visual feedback
        if (this.button) {
            this.button.style.opacity = '1';
            this.button.style.transform = 'scale(0.95)';
        }

        if (this.options.onPress) {
            this.options.onPress();
        }
    };

    /**
     * Handle button release
     */
    private handleRelease = (event: Event): void => {
        event.preventDefault();
        event.stopPropagation();

        if (!this.isPressed) return;

        this.isPressed = false;

        // Visual feedback
        if (this.button) {
            this.button.style.opacity = String(this.options.opacity || 0.6);
            this.button.style.transform = 'scale(1)';
        }

        if (this.options.onRelease) {
            this.options.onRelease();
        }
    };

    /**
     * Check if button is currently pressed
     */
    public getPressed(): boolean {
        return this.isPressed;
    }

    /**
     * Show the button
     */
    public show(): void {
        if (this.button) {
            this.button.style.display = 'flex';
        }
    }

    /**
     * Hide the button
     */
    public hide(): void {
        if (this.button) {
            this.button.style.display = 'none';
        }
    }

    /**
     * Clean up and destroy the button
     */
    public dispose(): void {
        if (this.button && this.button.parentElement) {
            this.button.parentElement.removeChild(this.button);
            this.button = null;
        }

        console.log(`[TouchButton] Disposed: ${this.options.label}`);
    }
}
