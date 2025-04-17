import BaseKeyboardCommand from './BaseKeyboardCommand';
import { ProjectileManager } from '../../entities/objects/projectiles/ProjectileManager';

export default class CommandFireTestProjectile extends BaseKeyboardCommand {
    private projectileManager: ProjectileManager;
    private cooldownTime: number = 200; // Cooldown in milliseconds to prevent spam
    private lastFireTime: number = 0;

    constructor(keyStates: Map<string, boolean>) {
        // Instead of KeyboardEvent.code, we'll use 'mouse0' for left click
        // This is a custom identifier we'll handle in addEventListeners
        super(['mouse0'], keyStates);
        
        this.projectileManager = ProjectileManager.getInstance();
        
        // Add mouse event listeners
        document.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        document.addEventListener('mouseup', this.onMouseUp.bind(this), false);
    }

    private onMouseDown(event: MouseEvent) {
        // Check if it's a left click (button 0)
        if (event.button === 0 && !BaseKeyboardCommand.pauseState) {
            this.keyStates.set('mouse0', true);
            this.execute();
        }
    }

    private onMouseUp(event: MouseEvent) {
        // Check if it's a left click (button 0)
        if (event.button === 0) {
            this.keyStates.set('mouse0', false);
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
        
        // Use ProjectileManager to create and fire the projectile
        this.projectileManager.fireTestProjectile();
        
        console.log('Test projectile fired!');
    }

    public release() {
        // No action needed on mouse release
    }

    public update() {
        // No continuous update needed for firing
    }
} 