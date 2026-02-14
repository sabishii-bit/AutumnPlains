import { InputCommand } from './InputCommand';
import { ProjectileManager } from '../../entities/projectiles/ProjectileManager';
import { TestProjectile } from '../../entities/projectiles/TestProjectile';
import { CameraController } from '../../camera/CameraController';

/**
 * Command to fire a test projectile (raycast visual) from the camera
 * Bound to middle mouse button by default
 */
export class FireProjectileCommand extends InputCommand {
    private projectileManager: ProjectileManager;
    private cameraController: CameraController;
    private lastFireTime: number = 0;
    private fireRate: number = 0.2; // Minimum time between shots (seconds)

    constructor(
        keys: string[],
        keyStates: Map<string, boolean>,
        cameraController: CameraController
    ) {
        super(keys, keyStates);
        this.projectileManager = ProjectileManager.getInstance();
        this.cameraController = cameraController;
    }

    public execute(): void {
        // Rate limiting to prevent firing too fast
        const currentTime = performance.now() / 1000;
        if (currentTime - this.lastFireTime < this.fireRate) {
            return;
        }
        this.lastFireTime = currentTime;

        // Get camera position and direction
        const camera = this.cameraController.getCamera();
        const origin = camera.position.clone();
        const direction = camera.getForwardRay(1).direction;

        // Get a test projectile from the pool
        const projectile = this.projectileManager.getProjectile(TestProjectile);

        // Fire the raycast
        projectile.fire(origin, direction);
    }

    /**
     * Set fire rate (minimum time between shots)
     */
    public setFireRate(rate: number): void {
        this.fireRate = rate;
    }
}
