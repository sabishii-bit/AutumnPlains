import { PlayerCharacter } from '../../entities/objects/characters/PlayerCharacter';
import BaseKeyboardCommand from './BaseKeyboardCommand';

export default class CommandMovePlayerLeft extends BaseKeyboardCommand {
    private player: PlayerCharacter;

    constructor(player: PlayerCharacter, keyStates: Map<string, boolean>) {
        super(['ArrowLeft', 'KeyA'], keyStates); // Pass keys to the base class constructor
        this.player = player;
    }

    public execute() {
        const currentState = this.player.getCurrentState();

        if (currentState && currentState.canWalk(this.player)) {  // Check if walking is allowed in the current state
            this.player.direction.x -= 1; // Move player left
        }
    }

    public release(): void {
        this.player.direction.x = 0;
    }
}
