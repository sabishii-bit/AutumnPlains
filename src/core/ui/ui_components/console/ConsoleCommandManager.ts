import { CommandRegistry } from './CommandRegistry';
import { ClearCommand } from './commands/ClearCommand';
/**
 * Manages the initialization and registration of all console commands
 */
export class ConsoleCommandManager {
  private static instance: ConsoleCommandManager | null = null;
  private commandRegistry: CommandRegistry;
  private initialized: boolean = false;
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ConsoleCommandManager {
    if (!ConsoleCommandManager.instance) {
      ConsoleCommandManager.instance = new ConsoleCommandManager();
    }
    return ConsoleCommandManager.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.commandRegistry = CommandRegistry.getInstance();
  }
  
  /**
   * Initialize all available console commands
   */
  public initialize(): void {
    if (this.initialized) {
      console.warn('ConsoleCommandManager is already initialized');
      return;
    }
    
    // Register core commands
    this.commandRegistry.registerCommand(new ClearCommand());
    
    // Add more commands here as they are created
    
    this.initialized = true;
    console.log('Console command system initialized');
  }
  
  /**
   * Check if text is a command and execute it if so
   * @param text The input text
   * @returns true if the text was a command and was handled
   */
  public async handlePotentialCommand(text: string): Promise<{ wasCommand: boolean, result?: string }> {
    if (!this.commandRegistry.isCommand(text)) {
      return { wasCommand: false };
    }
    
    const result = await this.commandRegistry.executeCommand(text);
    return { wasCommand: true, result };
  }
} 