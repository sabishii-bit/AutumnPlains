import { PlayerCharacter } from '../../entities/objects/character/PlayerCharacter';
import BaseKeyboardCommand from './BaseKeyboardCommand';

export default class CommandPlayerJump extends BaseKeyboardCommand {
    private player: PlayerCharacter;

    constructor(player: PlayerCharacter, keyStates: Map<string, boolean>) {
        super(['Space'], keyStates); // Pass keys to the base class constructor
        this.player = player;
    }

    public execute() {
        this.player.jump(); // Make the player jump
    }

    public release(): void { }
}
