import { PlayerCharacter } from '../../entities/objects/characters/PlayerCharacter';
import BaseKeyboardCommand from './BaseKeyboardCommand';
import * as THREE from 'three';

export default class CommandMovePlayerLeft extends BaseKeyboardCommand {
    private player: PlayerCharacter;

    constructor(player: PlayerCharacter, keyStates: Map<string, boolean>) {
        super(['ArrowLeft', 'KeyA'], keyStates); // Pass keys to the base class constructor
        this.player = player;
    }

    public execute() {
        this.player.direction.x -= 1; // Move player left
    }

    public release(): void {
        this.player.direction.x += 1;
    }
}
