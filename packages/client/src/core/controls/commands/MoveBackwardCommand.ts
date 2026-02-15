import { InputCommand } from './InputCommand';
import type { PlayerCharacter } from '../../entities/characters/PlayerCharacter';

/**
 * Command for moving backward
 */
export class MoveBackwardCommand extends InputCommand {
    private player: PlayerCharacter;

    constructor(player: PlayerCharacter, keyStates: Map<string, boolean>) {
        super(['KeyS', 'ArrowDown'], keyStates);
        this.player = player;
    }

    public execute(): void {
        // Movement is handled by CharacterMovementComponent
    }
}
