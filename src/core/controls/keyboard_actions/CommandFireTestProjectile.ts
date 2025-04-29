import BaseKeyboardCommand from './BaseKeyboardCommand';
import { ProjectileManager } from '../../entities/objects/projectiles/ProjectileManager';

export default class CommandFireTestProjectile extends BaseKeyboardCommand {
    private projectileManager: ProjectileManager;
    private cooldownTime: number = 200; // Cooldown in milliseconds to prevent spam
    private lastFireTime: number = 0;

    constructor(keyStates: Map<string, boolean>) {
        // Use 'mouse1' for middle mouse click (button index 1)
        super(['mouse1'], keyStates);
        
        // Get ProjectileManager instance
        this.projectileManager = ProjectileManager.getInstance();
        
        // Add mouse event listeners
        document.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        document.addEventListener('mouseup', this.onMouseUp.bind(this), false);
    }

    private onMouseDown(event: MouseEvent) {
        // Check if it's a middle click (button 1)
        if (event.button === 1 && !BaseKeyboardCommand.pauseState) {
            this.keyStates.set('mouse1', true);
            this.execute();
        }
    }

    private onMouseUp(event: MouseEvent) {
        // Check if it's a middle click (button 1)
        if (event.button === 1) {
            this.keyStates.set('mouse1', false);
            this.release();
        }
    }

    public execute() {
        const currentTime = Date.now();
        
        // Check if cooldown has passed
        if (currentTime - this.lastFireTime < this.cooldownTime) {
            return;
        }
        
        // Reset the last fire time
        this.lastFireTime = currentTime;
        
        // Use ProjectileManager to fire the test projectile
        this.projectileManager.fireTestProjectile();
    }

    public release() {
        // No action needed on mouse release
    }

    public update() {
        // No continuous update needed for this command
    }
} 