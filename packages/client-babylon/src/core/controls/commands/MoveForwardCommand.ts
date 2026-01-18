import { InputCommand } from './InputCommand';
import type { PlayerCharacter } from '../../entities/objects/PlayerCharacter';

/**
 * Command for moving forward
 */
export class MoveForwardCommand extends InputCommand {
    private player: PlayerCharacter;

    constructor(player: PlayerCharacter, keyStates: Map<string, boolean>) {
        super(['KeyW', 'ArrowUp'], keyStates);
        this.player = player;
    }

    public execute(): void {
        // Movement is handled by CharacterMovementComponent
        // This command just marks that forward movement is active
    }
}
