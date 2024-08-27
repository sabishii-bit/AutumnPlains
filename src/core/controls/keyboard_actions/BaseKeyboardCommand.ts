export default abstract class BaseKeyboardCommand {
    protected keys: string[]; // Keys that trigger the command
    protected keyStates: Map<string, boolean>;
    private activeKey: string | null = null; // Track the currently active key
    public static pauseState: boolean = false;

    // Store all command instances
    private static commands: BaseKeyboardCommand[] = [];

    constructor(keys: string[], keyStates: Map<string, boolean>) {
        this.keys = keys;
        this.keyStates = keyStates;

        // Automatically register the key events in the map
        this.keys.forEach(key => this.keyStates.set(key, false));

        // Add this command to the static list of commands
        BaseKeyboardCommand.commands.push(this);

        // Bind event listeners
        this.addEventListeners();
    }

    private addEventListeners() {
        document.addEventListener('keydown', this.onKeyDown.bind(this), false);
        document.addEventListener('keyup', this.onKeyUp.bind(this), false);
    }

    private onKeyDown(event: KeyboardEvent) {
        if (BaseKeyboardCommand.pauseState) {
            return;
        }

        if (this.keys.includes(event.code)) {
            if (this.activeKey === null) {
                this.activeKey = event.code;
                this.keyStates.set(event.code, true);
                this.execute(); // Execute the command when a key is pressed
            }
        }
    }

    private onKeyUp(event: KeyboardEvent) {
        if (this.keys.includes(event.code)) {
            if (event.code === this.activeKey) {
                this.keyStates.set(event.code, false);
                this.release(); // Handle key release
                this.activeKey = null; // Reset the active key
            }
        }
    }

    public abstract execute(): void; // Command execution logic on key down

    public abstract release(): void; // Command logic on key up

    // Static method to handle all active keys when the game is paused
    public static releaseAllHeldKeys() {
        BaseKeyboardCommand.commands.forEach(command => {
            if (command.activeKey !== null) {
                command.keyStates.set(command.activeKey, false);
                command.release(); // Trigger release for the active key
                command.activeKey = null;
            }
        });
    }
}
