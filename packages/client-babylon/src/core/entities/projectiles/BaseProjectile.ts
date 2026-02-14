import { Vector3, Color3, Scene, PhysicsShapeType, AbstractMesh } from '@babylonjs/core';
import { Entity } from '../Entity';
import { MeshComponent } from '../components/MeshComponent';
import { PhysicsComponent } from '../components/PhysicsComponent';
import { ProjectileComponent } from '../components/ProjectileComponent';

/**
 * Abstract base class for all projectiles
 * Combines mesh, physics, and projectile behavior components
 */
export abstract class BaseProjectile extends Entity {
    protected meshComponent!: MeshComponent;
    protected physicsComponent!: PhysicsComponent;
    protected projectileComponent!: ProjectileComponent;
    protected isPooled: boolean = false;

    constructor(
        scene: Scene,
        position: Vector3 = Vector3.Zero(),
        maxLifetime: number = 5.0
    ) {
        super(scene, 'Projectile');

        // Add mesh component (subclasses will create the actual mesh)
        this.meshComponent = this.addComponent('mesh', new MeshComponent());

        // Add physics component (light projectile, no bounce, low friction)
        this.physicsComponent = this.addComponent('physics', new PhysicsComponent(0.1, 0, 0.1));

        // Add projectile behavior component
        this.projectileComponent = this.addComponent('projectile', new ProjectileComponent(maxLifetime));

        // Set initial position
        this.setPosition(position);

        // Set up collision callback
        this.setupCollisionHandling();
    }

    /**
     * Create the visual mesh for this projectile
     * Must be implemented by subclasses
     */
    protected abstract createVisualMesh(): void;

    /**
     * Get the physics shape type for this projectile
     * Can be overridden by subclasses
     */
    protected getPhysicsShapeType(): PhysicsShapeType {
        return PhysicsShapeType.SPHERE;
    }

    /**
     * Initialize the projectile (called after construction)
     */
    public initialize(): void {
        // Create visual mesh
        this.createVisualMesh();

        // Set up physics
        const mesh = this.meshComponent.getMesh();
        if (mesh) {
            this.physicsComponent.setMesh(mesh as AbstractMesh, this.getPhysicsShapeType());

            // Disable gravity for projectiles (they follow ballistic trajectory set by initial velocity)
            const body = this.physicsComponent.getBody();
            if (body) {
                body.setGravityFactor(0);
            }

            // Initially hide the projectile
            mesh.isVisible = false;
        }
    }

    /**
     * Launch the projectile with a given velocity
     */
    public launch(velocity: Vector3, position?: Vector3): void {
        if (position) {
            this.setPosition(position);
        }

        // Show the projectile
        const mesh = this.meshComponent.getMesh();
        if (mesh) {
            mesh.isVisible = true;
        }

        // Launch via projectile component
        this.projectileComponent.launch(velocity);

        console.log(`Projectile launched from ${this.getPosition()} with velocity ${velocity}`);
    }

    /**
     * Set up collision handling for the projectile
     */
    protected setupCollisionHandling(): void {
        // Set hit callback
        this.projectileComponent.setOnHit((hitEntity, hitPosition, hitNormal) => {
            this.onHit(hitEntity, hitPosition, hitNormal);
        });

        // Set expire callback
        this.projectileComponent.setOnExpire(() => {
            this.onExpire();
        });
    }

    /**
     * Called when projectile hits something
     * Can be overridden by subclasses for custom behavior
     */
    protected onHit(hitEntity: any, hitPosition: Vector3, hitNormal: Vector3): void {
        console.log(`Projectile hit ${hitEntity?.constructor.name || 'unknown'} at ${hitPosition}`);
        this.deactivate();
    }

    /**
     * Called when projectile expires (lifetime exceeded)
     * Can be overridden by subclasses for custom behavior
     */
    protected onExpire(): void {
        console.log('Projectile expired');
        this.deactivate();
    }

    /**
     * Deactivate the projectile (hide and stop physics)
     */
    public deactivate(): void {
        const mesh = this.meshComponent.getMesh();
        if (mesh) {
            mesh.isVisible = false;
        }

        this.projectileComponent.deactivate();
    }

    /**
     * Reset projectile for reuse in object pool
     */
    public reset(): void {
        this.projectileComponent.reset();
        this.deactivate();
    }

    /**
     * Check if projectile is active
     */
    public checkActive(): boolean {
        return this.projectileComponent.checkActive();
    }

    /**
     * Get current position
     */
    public getPosition(): Vector3 {
        const mesh = this.meshComponent.getMesh();
        if (mesh) {
            return mesh.getAbsolutePosition();
        }
        return this.getTransformNode().position;
    }

    /**
     * Set position
     */
    public setPosition(position: Vector3): void {
        const mesh = this.meshComponent.getMesh();
        if (mesh) {
            mesh.position = position.clone();
        }
        this.getTransformNode().position = position.clone();
    }

    /**
     * Mark this projectile as pooled
     */
    public setPooled(pooled: boolean): void {
        this.isPooled = pooled;
    }

    /**
     * Check if this projectile is pooled
     */
    public isInPool(): boolean {
        return this.isPooled;
    }

    /**
     * Get the projectile component
     */
    public getProjectileComponent(): ProjectileComponent {
        return this.projectileComponent;
    }
}
