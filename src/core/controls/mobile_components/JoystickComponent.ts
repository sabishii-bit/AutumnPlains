import * as THREE from 'three';
import nipplejs from 'nipplejs';
import { PlayerCharacter } from '../../entities/objects/characters/PlayerCharacter';

export abstract class JoystickComponent {
    protected joystick!: nipplejs.JoystickManager;
    protected camera!: THREE.Camera;
    protected player!: PlayerCharacter;
    
    public abstract initialize(camera: THREE.Camera, player: PlayerCharacter): void;
    public abstract update(deltaTime: number): void;
    
    protected createJoystickZone(side: 'left' | 'right'): HTMLDivElement {
        const zone = document.createElement('div');
        zone.style.position = 'absolute';
        zone.style[side] = '0';
        zone.style.bottom = '0';
        zone.style.width = '50%';
        zone.style.height = '50%';
        zone.style.zIndex = '100';
        zone.style.userSelect = 'none';
        zone.style.webkitUserSelect = 'none';
        (zone.style as any)['-moz-user-select'] = 'none';
        (zone.style as any)['-ms-user-select'] = 'none';
        zone.style.touchAction = 'none';
        zone.style.pointerEvents = 'auto';
        document.body.appendChild(zone);
        return zone;
    }
    
    public dispose(): void {
        if (this.joystick) {
            this.joystick.destroy();
        }
    }
} 