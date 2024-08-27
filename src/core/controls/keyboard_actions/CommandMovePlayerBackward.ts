import { PlayerCharacter } from '../../entities/objects/characters/PlayerCharacter';
import BaseKeyboardCommand from './BaseKeyboardCommand';
import * as THREE from 'three';

export default class CommandMovePlayerBackward extends BaseKeyboardCommand {
    private player: PlayerCharacter;

    constructor(player: PlayerCharacter, keyStates: Map<string, boolean>) {
        super(['ArrowDown', 'KeyS'], keyStates); // Pass keys to the base class constructor
        this.player = player;
    }

    public execute() {
        this.player.direction.z += 1; // Move player backward
    }

    public release(): void {
        this.player.direction.z -= 1; // Do inverse
    }
}
