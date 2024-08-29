import { PlayerCharacter } from '../../entities/objects/characters/PlayerCharacter';
import BaseKeyboardCommand from './BaseKeyboardCommand';

export default class CommandMovePlayerForward extends BaseKeyboardCommand {
    private player: PlayerCharacter;

    constructor(player: PlayerCharacter, keyStates: Map<string, boolean>) {
        super(['ArrowUp', 'KeyW'], keyStates); // Pass keys to the base class constructor
        this.player = player;
    }

    public execute() {
        const currentState = this.player.getCurrentState();
        
        if (currentState && currentState.canWalk(this.player)) {  // Check if walking is allowed in the current state
            this.player.direction.z = -1; // Set forward movement
        }
    }

    public release(): void {
        this.player.direction.z = 0; // Stop forward movement
    }

    public update() {
        super.update();
    }
}
