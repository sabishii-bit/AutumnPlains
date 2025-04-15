import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { PlayerControls } from './PlayerControls';
import CommandMovePlayerForward from './keyboard_actions/CommandMovePlayerForward';
import CommandMovePlayerBackward from './keyboard_actions/CommandMovePlayerBackward';
import CommandMovePlayerLeft from './keyboard_actions/CommandMovePlayerLeft';
import CommandMovePlayerRight from './keyboard_actions/CommandMovePlayerRight';
import CommandPlayerJump from './keyboard_actions/CommandPlayerJump';
import BaseKeyboardCommand from './keyboard_actions/BaseKeyboardCommand';
import CommandToggleWireframe from './keyboard_actions/CommandToggleWireframe';
import { ImportedModelLoaderService } from '../services/model_loader/ImportedModelLoaderService';

export class KeyboardControls extends PlayerControls {
    private controls: PointerLockControls;
    private keyStates: Map<string, boolean> = new Map();
    private commands: BaseKeyboardCommand[] = [];

    constructor(domElement: HTMLElement) {
        super();
        this.controls = new PointerLockControls(this.camera, domElement);
        domElement.addEventListener('click', () => this.controls.lock());

        // Initialize commands with the keyStates map and store them in the commands array
        this.commands.push(new CommandMovePlayerForward(this.player, this.keyStates));
        this.commands.push(new CommandMovePlayerBackward(this.player, this.keyStates));
        this.commands.push(new CommandMovePlayerLeft(this.player, this.keyStates));
        this.commands.push(new CommandMovePlayerRight(this.player, this.keyStates));
        this.commands.push(new CommandPlayerJump(this.player, this.keyStates));
        this.commands.push(new CommandToggleWireframe(this.keyStates));

        // Listen for pointer lock changes
        document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this), false);
        document.addEventListener('pointerlockerror', this.onPointerLockError.bind(this), false);
    }

    private onPointerLockChange() {
        const isLocked = document.pointerLockElement === this.controls.domElement;
        if (!isLocked) {
            // Pointer lock has been released, e.g., by pressing Escape
            BaseKeyboardCommand.pauseState = true; // Set the game to pause
            BaseKeyboardCommand.releaseAllHeldKeys();
        } else {
            // Pointer lock is engaged
            BaseKeyboardCommand.pauseState = false; // Resume the game
        }
    }

    private onPointerLockError() {
        console.error("Pointer lock failed to engage.");
    }

    public update(deltaTime: number) {
        // Call the update method on each command to check if they should execute
        for (const command of this.commands) {
            command.update(); // Ensure continuous execution if the key is held down
        }

        const moveDirection = new THREE.Vector3(this.player.direction.x, 0, this.player.direction.z);
    
        if (moveDirection.lengthSq() > 0) {
            moveDirection.normalize().multiplyScalar(this.player.moveSpeed * deltaTime);
    
            // Apply the camera's rotation to the movement direction
            moveDirection.applyQuaternion(this.camera.quaternion);
    
            // Project movement direction onto the horizontal plane
            moveDirection.y = 0; // Ignore any vertical movement
            moveDirection.normalize(); // Re-normalize the direction vector
    
            this.player.updatePosition(deltaTime, moveDirection);
        }

        ImportedModelLoaderService.updateWireframes();
    }

    public getControls(): PointerLockControls {
        return this.controls;
    }
}
