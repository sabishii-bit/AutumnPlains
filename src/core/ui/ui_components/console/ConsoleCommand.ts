export interface ConsoleCommand {
  /**
   * The command name without the $ prefix (case-insensitive)
   */
  readonly name: string;
  
  /**
   * Description of what the command does
   */
  readonly description: string;
  
  /**
   * Executes the command
   * @param args Arguments passed to the command
   * @returns Success or failure message
   */
  execute(args?: string[]): Promise<string> | string;
} 