import { PlayerCharacter } from '../../entities/objects/characters/PlayerCharacter';
import BaseKeyboardCommand from './BaseKeyboardCommand';

export default class CommandMovePlayerBackward extends BaseKeyboardCommand {
    private player: PlayerCharacter;

    constructor(player: PlayerCharacter, keyStates: Map<string, boolean>) {
        super(['ArrowDown', 'KeyS'], keyStates); // Pass keys to the base class constructor
        this.player = player;
    }

    public execute() {
        const currentState = this.player.getCurrentState();

        if (currentState && currentState.canWalk(this.player)) {  // Check if walking is allowed in the current state
            this.player.direction.z = 1; // Move player backward
        }
    }

    public release(): void {
        this.player.direction.z = 0;
    }
    
    // Continuously check and apply the movement if the key is held down
    public update() {
        super.update(); // Call the base class update method
    }
}
