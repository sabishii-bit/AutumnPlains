/**
 * Base class for input commands
 * Implements the Command pattern for modular input handling
 */
export abstract class InputCommand {
    protected keys: string[];
    protected keyStates: Map<string, boolean>;
    public static pauseState: boolean = false;

    constructor(keys: string[], keyStates: Map<string, boolean>) {
        this.keys = keys;
        this.keyStates = keyStates;
    }

    /**
     * Check if any of the command's keys are currently pressed
     */
    protected isActive(): boolean {
        return this.keys.some(key => this.keyStates.get(key) === true);
    }

    /**
     * Check if a specific key is pressed
     */
    protected isKeyPressed(key: string): boolean {
        return this.keyStates.get(key) === true;
    }

    /**
     * Execute the command action (called every frame if key is held)
     */
    public abstract execute(): void;

    /**
     * Called when key is released (optional)
     */
    public release(): void {
        // Override in subclasses if needed
    }

    /**
     * Update method called every frame
     */
    public update(deltaTime: number): void {
        if (!InputCommand.pauseState && this.isActive()) {
            this.execute();
        }
    }

    /**
     * Get the keys this command responds to
     */
    public getKeys(): string[] {
        return this.keys;
    }
}
