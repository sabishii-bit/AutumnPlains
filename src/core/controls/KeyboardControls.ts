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

export class KeyboardControls extends PlayerControls {
    private controls: PointerLockControls;
    private keyStates: Map<string, boolean> = new Map();

    constructor(domElement: HTMLElement) {
        super();
        this.controls = new PointerLockControls(this.camera, domElement);
        domElement.addEventListener('click', () => this.controls.lock());

        // Initialize commands with the keyStates map
        new CommandMovePlayerForward(this.player, this.keyStates);
        new CommandMovePlayerBackward(this.player, this.keyStates);
        new CommandMovePlayerLeft(this.player, this.keyStates);
        new CommandMovePlayerRight(this.player, this.keyStates);
        new CommandPlayerJump(this.player, this.keyStates);
        new CommandToggleWireframe(this.keyStates);

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
        const moveDirection = new THREE.Vector3(this.player.direction.x, 0, this.player.direction.z);
        if (moveDirection.lengthSq() > 0) {
            moveDirection.normalize().multiplyScalar(this.player.moveSpeed * deltaTime);
            moveDirection.applyQuaternion(this.camera.quaternion);
            this.player.updatePosition(deltaTime, moveDirection);
        }

        // Update the camera to follow the player
        this.camera.position.copy(this.player.body.position as unknown as THREE.Vector3);
    }

    public getControls(): PointerLockControls {
        return this.controls;
    }
}
