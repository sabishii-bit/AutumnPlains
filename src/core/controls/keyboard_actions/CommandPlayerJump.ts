import { PlayerCharacter } from '../../entities/objects/characters/PlayerCharacter';
import BaseKeyboardCommand from './BaseKeyboardCommand';

export default class CommandPlayerJump extends BaseKeyboardCommand {
    private player: PlayerCharacter;

    constructor(player: PlayerCharacter, keyStates: Map<string, boolean>) {
        super(['Space'], keyStates); // Pass keys to the base class constructor
        this.player = player;
    }

    public execute() {
        const currentState = this.player.getCurrentState();

        if (currentState && currentState.canJump(this.player)) {  // Check if jumping is allowed in the current state
            this.player.jump(); // Make the player jump
        }
    }

    public release(): void {
        // No action needed on release for jumping
    }
}
