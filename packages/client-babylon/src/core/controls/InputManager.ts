import { DeviceSourceManager, DeviceType, PointerEventTypes } from '@babylonjs/core';
import type { Engine, Scene } from '@babylonjs/core';
import type { InputCommand } from './commands/InputCommand';

/**
 * Input manager using Babylon.js DeviceSourceManager
 * Follows Babylon.js best practices for cross-platform input handling
 * Uses command pattern for modular input handling
 * Singleton pattern for global input state
 */
export class InputManager {
    private static instance: InputManager | null = null;
    private deviceSourceManager!: DeviceSourceManager;
    private engine: Engine;
    private scene!: Scene;
    private keys: Map<string, boolean> = new Map();
    private keysPressed: Map<string, boolean> = new Map();
    private keysReleased: Map<string, boolean> = new Map();
    private mouseDelta: { x: number; y: number } = { x: 0, y: 0 };
    private mouseAccumulator: { x: number; y: number } = { x: 0, y: 0 }; // Accumulate mouse movement across frames
    private commands: InputCommand[] = [];
    private keyToCommandMap: Map<string, InputCommand> = new Map();

    private constructor(engine: Engine, scene: Scene) {
        this.engine = engine;
        this.scene = scene;
        this.setupDeviceSourceManager();
        this.setupMouseInput();
    }

    public static initialize(engine: Engine, scene: Scene): InputManager {
        if (!InputManager.instance) {
            InputManager.instance = new InputManager(engine, scene);
        }
        return InputManager.instance;
    }

    public static getInstance(): InputManager {
        if (!InputManager.instance) {
            throw new Error('InputManager not initialized. Call initialize() first.');
        }
        return InputManager.instance;
    }

    /**
     * Set up Babylon.js DeviceSourceManager for input handling
     */
    private setupDeviceSourceManager(): void {
        this.deviceSourceManager = new DeviceSourceManager(this.engine);

        // Wait for devices to be connected, then set up observers
        this.deviceSourceManager.onDeviceConnectedObservable.add((deviceSource) => {
            // Handle keyboard input
            if (deviceSource.deviceType === DeviceType.Keyboard) {
                deviceSource.onInputChangedObservable.add((eventData) => {
                    const keyCode = this.getKeyCodeFromEventData(eventData.inputIndex);
                    const currentState = deviceSource.getInput(eventData.inputIndex);
                    const isPressed = currentState === 1;

                    // Debug log for spacebar
                    if (eventData.inputIndex === 32) {
                        console.log('Space key event! InputIndex:', eventData.inputIndex, 'KeyCode:', keyCode, 'Pressed:', isPressed);
                    }

                    if (isPressed && !this.keys.get(keyCode)) {
                        // Key just pressed
                        this.keysPressed.set(keyCode, true);
                        if (keyCode === 'Space') {
                            console.log('Space key marked as pressed in keysPressed map');
                        }
                    }

                    if (!isPressed && this.keys.get(keyCode)) {
                        // Key just released
                        this.keysReleased.set(keyCode, true);

                        // Call release on associated command
                        const command = this.keyToCommandMap.get(keyCode);
                        if (command) {
                            command.release();
                        }
                    }

                    this.keys.set(keyCode, isPressed);
                });
            }

        });

        console.log('DeviceSourceManager initialized');
    }

    /**
     * Set up mouse input using scene's pointer observable (Babylon.js best practice)
     */
    private setupMouseInput(): void {
        // Use scene.onPointerObservable for mouse movement (recommended by Babylon.js)
        this.scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
                const event = pointerInfo.event as PointerEvent;

                // Only track mouse delta when pointer is locked
                if (document.pointerLockElement) {
                    // Accumulate mouse movement - don't replace, add to it
                    // This ensures we don't lose mouse events between frames
                    this.mouseAccumulator.x += event.movementX;
                    this.mouseAccumulator.y += event.movementY;
                }
            }
        });
    }

    /**
     * Map Babylon.js keyboard input index to KeyboardEvent.code
     * Based on standard keyboard layout
     */
    private getKeyCodeFromEventData(inputIndex: number): string {
        // Common key mappings (extend as needed)
        const keyMap: { [key: number]: string } = {
            87: 'KeyW',
            65: 'KeyA',
            83: 'KeyS',
            68: 'KeyD',
            32: 'Space',
            13: 'Enter',
            27: 'Escape',
            38: 'ArrowUp',
            37: 'ArrowLeft',
            40: 'ArrowDown',
            39: 'ArrowRight',
            16: 'ShiftLeft',
            17: 'ControlLeft',
            69: 'KeyE',
            70: 'KeyF',
            82: 'KeyR',
        };

        return keyMap[inputIndex] || `Key${inputIndex}`;
    }

    /**
     * Register an input command
     */
    public registerCommand(command: InputCommand): void {
        this.commands.push(command);

        // Map each key to this command for quick lookup
        for (const key of command.getKeys()) {
            this.keyToCommandMap.set(key, command);
        }
    }

    /**
     * Unregister an input command
     */
    public unregisterCommand(command: InputCommand): void {
        const index = this.commands.indexOf(command);
        if (index > -1) {
            this.commands.splice(index, 1);

            // Remove key mappings
            for (const key of command.getKeys()) {
                this.keyToCommandMap.delete(key);
            }
        }
    }

    /**
     * Clear all registered commands
     */
    public clearCommands(): void {
        this.commands = [];
        this.keyToCommandMap.clear();
    }

    /**
     * Release all currently held keys
     * Calls release() on commands for pressed keys and sets all key states to false
     * Used when pausing/unpausing to prevent stuck keys
     */
    public releaseAllHeldKeys(): void {
        // For each key that's currently pressed
        this.keys.forEach((isPressed, key) => {
            if (isPressed) {
                // Find the command associated with this key
                const command = this.keyToCommandMap.get(key);
                if (command) {
                    // Call the release method on the command
                    command.release();
                }
                // Set the key state to false
                this.keys.set(key, false);
            }
        });

        // Clear the pressed/released tracking maps as well
        this.keysPressed.clear();
        this.keysReleased.clear();
    }

    /**
     * Update input state and execute commands (call once per frame)
     */
    public update(deltaTime: number = 0): void {
        // Execute all registered commands
        for (const command of this.commands) {
            command.update(deltaTime);
        }

        // Clear single-frame states
        this.keysPressed.clear();
        this.keysReleased.clear();

        // Reset mouse accumulator for next frame
        // The camera reads from mouseDelta BEFORE this update is called
        this.mouseAccumulator.x = 0;
        this.mouseAccumulator.y = 0;
    }

    /**
     * Check if a key is currently held down
     */
    public isKeyDown(keyCode: string): boolean {
        return this.keys.get(keyCode) || false;
    }

    /**
     * Check if a key was just pressed this frame
     */
    public isKeyPressed(keyCode: string): boolean {
        return this.keysPressed.get(keyCode) || false;
    }

    /**
     * Check if a key was just released this frame
     */
    public isKeyReleased(keyCode: string): boolean {
        return this.keysReleased.get(keyCode) || false;
    }

    /**
     * Get mouse movement delta
     * Returns accumulated mouse movement since last frame
     */
    public getMouseDelta(): { x: number; y: number } {
        // Return the accumulated mouse movement
        // Copy the accumulator to mouseDelta for this frame
        this.mouseDelta.x = this.mouseAccumulator.x;
        this.mouseDelta.y = this.mouseAccumulator.y;
        return { x: this.mouseDelta.x, y: this.mouseDelta.y };
    }

    /**
     * Check if pointer is locked (for mouse look)
     */
    public isPointerLocked(): boolean {
        return document.pointerLockElement !== null;
    }

    /**
     * Get the DeviceSourceManager instance
     */
    public getDeviceSourceManager(): DeviceSourceManager {
        return this.deviceSourceManager;
    }

    /**
     * Get movement input as normalized vector
     */
    public getMovementInput(): { x: number; z: number } {
        let x = 0;
        let z = 0;

        if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) z += 1;
        if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) z -= 1;
        if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) x -= 1;
        if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) x += 1;

        // Normalize diagonal movement
        const length = Math.sqrt(x * x + z * z);
        if (length > 0) {
            x /= length;
            z /= length;
        }

        return { x, z };
    }

    /**
     * Check if jump input is active
     */
    public isJumpPressed(): boolean {
        const pressed = this.isKeyPressed('Space');
        if (pressed) {
            console.log('InputManager: Space key pressed detected!');
        }
        return pressed;
    }

    /**
     * Get the key states map (for commands)
     */
    public getKeyStates(): Map<string, boolean> {
        return this.keys;
    }

    /**
     * Destroy the singleton instance
     */
    public static destroy(): void {
        if (InputManager.instance) {
            InputManager.instance.clearCommands();
        }
        InputManager.instance = null;
    }
}
