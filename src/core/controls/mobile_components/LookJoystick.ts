import * as THREE from 'three';
import nipplejs from 'nipplejs';
import { PlayerCharacter } from '../../entities/objects/characters/PlayerCharacter';
import { JoystickComponent } from './JoystickComponent';

export class LookJoystick extends JoystickComponent {
    private joystickActive: boolean = false;
    private joystickData: any = null;
    private yaw: number = 0;
    private pitch: number = 0;
    
    public initialize(camera: THREE.Camera, player: PlayerCharacter): void {
        this.camera = camera;
        this.player = player;
        
        const zone = this.createJoystickZone('right');
        
        this.joystick = nipplejs.create({
            zone: zone,
            mode: 'static',
            position: { right: '5rem', bottom: '5rem' },
            color: 'blue',
        });
        
        this.joystick.on('start', this.handleJoystickStart);
        this.joystick.on('move', this.handleJoystickMove);
        this.joystick.on('end', this.handleJoystickEnd);
    }
    
    private handleJoystickStart = (): void => {
        this.joystickActive = true;
    }
    
    private handleJoystickMove = (evt: any, data: any): void => {
        this.joystickData = data;
        this.updateCameraRotation();
    }
    
    private handleJoystickEnd = (): void => {
        this.joystickActive = false;
        this.joystickData = null;
    }
    
    private updateCameraRotation = (): void => {
        const sensitivity = 0.004;
        const maxForce = 0.25;

        if (this.joystickActive && this.joystickData) {
            const angle = this.joystickData.angle.radian;
            let force = this.joystickData.force;
            force = Math.min(force, maxForce);
            
            const deltaYaw = force * Math.cos(angle) * sensitivity;
            const deltaPitch = force * Math.sin(angle) * sensitivity;
    
            this.yaw -= deltaYaw;
            this.pitch += deltaPitch;
            this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    
            const quaternion = new THREE.Quaternion();
            quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
            this.camera.quaternion.copy(quaternion);
    
            requestAnimationFrame(this.updateCameraRotation);
        }
    }
    
    public update(deltaTime: number): void {
        // No additional update logic needed as camera rotation is handled by animation frame
    }
} 