import { PlayerCharacter } from '../../entities/objects/character/PlayerCharacter';
import BaseKeyboardCommand from './BaseKeyboardCommand';
import * as THREE from 'three';

export default class CommandMovePlayerRight extends BaseKeyboardCommand {
    private player: PlayerCharacter;

    constructor(player: PlayerCharacter, keyStates: Map<string, boolean>) {
        super(['ArrowRight', 'KeyD'], keyStates); // Pass keys to the base class constructor
        this.player = player;
    }

    public execute() {
        this.player.direction.x += 1; // Move player right
    }

    public release(): void {
        this.player.direction.x -= 1;
    }
}
