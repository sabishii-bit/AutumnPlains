import { InputManager } from './InputManager';
import { MoveForwardCommand } from './commands/MoveForwardCommand';
import { MoveBackwardCommand } from './commands/MoveBackwardCommand';
import { MoveLeftCommand } from './commands/MoveLeftCommand';
import { MoveRightCommand } from './commands/MoveRightCommand';
import { JumpCommand } from './commands/JumpCommand';
import type { PlayerCharacter } from '../entities/objects/PlayerCharacter';
import type { InputCommand } from './commands/InputCommand';

/**
 * Controller manager that sets up and manages input commands
 * Centralizes command registration and configuration
 */
export class ControllerManager {
    private inputManager: InputManager;
    private commands: InputCommand[] = [];

    constructor(player: PlayerCharacter) {
        this.inputManager = InputManager.getInstance();

        // Get shared key states map
        const keyStates = this.inputManager.getKeyStates();

        // Register movement commands
        this.registerCommand(new MoveForwardCommand(player, keyStates));
        this.registerCommand(new MoveBackwardCommand(player, keyStates));
        this.registerCommand(new MoveLeftCommand(player, keyStates));
        this.registerCommand(new MoveRightCommand(player, keyStates));
        this.registerCommand(new JumpCommand(player, keyStates));

        console.log(`Registered ${this.commands.length} input commands`);
    }

    /**
     * Register a command with the input manager
     */
    private registerCommand(command: InputCommand): void {
        this.commands.push(command);
        this.inputManager.registerCommand(command);
    }

    /**
     * Unregister all commands
     */
    public dispose(): void {
        for (const command of this.commands) {
            this.inputManager.unregisterCommand(command);
        }
        this.commands = [];
    }

    /**
     * Get all registered commands (for debugging)
     */
    public getCommands(): InputCommand[] {
        return this.commands;
    }
}
