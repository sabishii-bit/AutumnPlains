import { InputCommand } from './InputCommand';
import type { PlayerCharacter } from '../../entities/objects/PlayerCharacter';

/**
 * Command for moving left (strafing)
 */
export class MoveLeftCommand extends InputCommand {
    private player: PlayerCharacter;

    constructor(player: PlayerCharacter, keyStates: Map<string, boolean>) {
        super(['KeyA', 'ArrowLeft'], keyStates);
        this.player = player;
    }

    public execute(): void {
        // Movement is handled by CharacterMovementComponent
    }
}
