import { ConsoleCommand } from './ConsoleCommand';

/**
 * Manages the registration and execution of console commands
 */
export class CommandRegistry {
  private static instance: CommandRegistry | null = null;
  private commands: Map<string, ConsoleCommand> = new Map();
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Register a command with the registry
   * @param command The command implementation to register
   */
  public registerCommand(command: ConsoleCommand): void {
    const commandName = command.name.toLowerCase();
    if (this.commands.has(commandName)) {
      console.warn(`Command "${commandName}" is already registered. Overwriting...`);
    }
    this.commands.set(commandName, command);
    console.log(`Registered command: $${commandName}`);
  }
  
  /**
   * Executes a command by name
   * @param commandStr The full command string (with $ prefix and args)
   * @returns Result message or error message
   */
  public async executeCommand(commandStr: string): Promise<string> {
    // Remove $ prefix and split into command and args
    const input = commandStr.substring(1).trim();
    const parts = input.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.length > 1 ? parts.slice(1) : [];
    
    const command = this.commands.get(commandName);
    if (!command) {
      return `Unknown command: $${commandName}. Type $help for available commands.`;
    }
    
    try {
      const result = await Promise.resolve(command.execute(args));
      return result;
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error);
      return `Error executing $${commandName}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Checks if a string is a command (starts with $)
   * @param text The text to check
   * @returns True if the text appears to be a command
   */
  public isCommand(text: string): boolean {
    return text.startsWith('$');
  }
  
  /**
   * Get all registered commands
   * @returns Map of all registered commands
   */
  public getAllCommands(): Map<string, ConsoleCommand> {
    return new Map(this.commands);
  }
} 