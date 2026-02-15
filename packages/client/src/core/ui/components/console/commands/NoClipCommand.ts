import { ConsoleCommand } from '../ConsoleCommand';

/**
 * Command to toggle noclip mode (fly through walls, camera-directed movement)
 */
export class NoClipCommand implements ConsoleCommand {
  public readonly name = 'noclip';
  public readonly description = 'Toggle noclip mode (fly through walls)';
  private static isNoClipEnabled: boolean = false;

  /**
   * Get the current noclip state
   */
  public static isEnabled(): boolean {
    return NoClipCommand.isNoClipEnabled;
  }

  execute(): string {
    // Toggle noclip state
    NoClipCommand.isNoClipEnabled = !NoClipCommand.isNoClipEnabled;

    const status = NoClipCommand.isNoClipEnabled ? 'enabled' : 'disabled';
    console.log(`[NoClip] Noclip ${status}`);

    // Dispatch custom event so PlayerCharacter can listen and respond
    const event = new CustomEvent('noclip_toggle', {
      detail: { enabled: NoClipCommand.isNoClipEnabled }
    });
    document.dispatchEvent(event);

    return `Noclip ${status}`;
  }
}
