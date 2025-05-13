import * as THREE from 'three';
import { PlayerControls } from './PlayerControls';
import { MovementJoystick } from './mobile_components/MovementJoystick';
import { LookJoystick } from './mobile_components/LookJoystick';
import { MobileChatComponent } from './mobile_components/MobileChatComponent';

export class MobileControls extends PlayerControls {
    private movementJoystick: MovementJoystick;
    private lookJoystick: LookJoystick;
    private mobileChatComponent: MobileChatComponent;

    constructor() {
        super();
        this.movementJoystick = new MovementJoystick();
        this.lookJoystick = new LookJoystick();
        this.mobileChatComponent = MobileChatComponent.getInstance();
        
        this.initializeJoysticks();
        this.initializeMobileChat();
    }

    private initializeJoysticks(): void {
        this.movementJoystick.initialize(this.camera, this.player);
        this.lookJoystick.initialize(this.camera, this.player);
    }
    
    private initializeMobileChat(): void {
        // Set joystick references to allow the chat component to control their visibility
        this.mobileChatComponent.setJoysticks(this.movementJoystick, this.lookJoystick);
    }

    public update(deltaTime: number): void {
        // Only update joysticks when chat is not open
        if (!this.mobileChatComponent.isOpened()) {
            this.movementJoystick.update(deltaTime);
            this.lookJoystick.update(deltaTime);
        }
    }
}
