import { InputCommand } from './InputCommand';
import type { PlayerCharacter } from '../../entities/objects/PlayerCharacter';

/**
 * Command for moving right (strafing)
 */
export class MoveRightCommand extends InputCommand {
    private player: PlayerCharacter;

    constructor(player: PlayerCharacter, keyStates: Map<string, boolean>) {
        super(['KeyD', 'ArrowRight'], keyStates);
        this.player = player;
    }

    public execute(): void {
        // Movement is handled by CharacterMovementComponent
    }
}
