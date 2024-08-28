import { PlayerCharacter } from '../../entities/objects/characters/PlayerCharacter';
import BaseKeyboardCommand from './BaseKeyboardCommand';

export default class CommandMovePlayerRight extends BaseKeyboardCommand {
    private player: PlayerCharacter;

    constructor(player: PlayerCharacter, keyStates: Map<string, boolean>) {
        super(['ArrowRight', 'KeyD'], keyStates); // Pass keys to the base class constructor
        this.player = player;
    }

    public execute() {
        const currentState = this.player.getCurrentState();

        if (currentState && currentState.canWalk(this.player)) {  // Check if walking is allowed in the current state
            this.player.direction.x += 1; // Move player right
        }
    }

    public release(): void {
        this.player.direction.x = 0;
    }
}
