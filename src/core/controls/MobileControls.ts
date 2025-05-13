import * as THREE from 'three';
import { PlayerControls } from './PlayerControls';
import { MovementJoystick } from './mobile_components/MovementJoystick';
import { LookJoystick } from './mobile_components/LookJoystick';

export class MobileControls extends PlayerControls {
    private movementJoystick: MovementJoystick;
    private lookJoystick: LookJoystick;

    constructor() {
        super();
        this.movementJoystick = new MovementJoystick();
        this.lookJoystick = new LookJoystick();
        
        this.initializeJoysticks();
    }

    private initializeJoysticks(): void {
        this.movementJoystick.initialize(this.camera, this.player);
        this.lookJoystick.initialize(this.camera, this.player);
    }

    public update(deltaTime: number): void {
        this.movementJoystick.update(deltaTime);
        this.lookJoystick.update(deltaTime);
    }
}
