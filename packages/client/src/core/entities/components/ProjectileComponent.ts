import { Vector3 } from '@babylonjs/core';
import { Component } from './Component';

/**
 * Component for projectile behavior
 * Handles projectile lifetime, velocity, and collision response
 */
export class ProjectileComponent extends Component {
    private velocity: Vector3 = Vector3.Zero();
    private lifetime: number = 0;
    private maxLifetime: number = 5.0; // Default 5 seconds
    private isActive: boolean = false;
    private onHitCallback?: (hitEntity: any, hitPosition: Vector3, hitNormal: Vector3) => void;
    private onExpireCallback?: () => void;

    constructor(maxLifetime: number = 5.0) {
        super();
        this.maxLifetime = maxLifetime;
    }

    public onAttach(entity: any): void {
        super.onAttach(entity);
    }

    public onUpdate(deltaTime: number): void {
        if (!this.isActive) return;

        // Update lifetime
        this.lifetime += deltaTime;

        // Check if projectile has expired
        if (this.lifetime >= this.maxLifetime) {
            this.expire();
            return;
        }

        // Physics handles movement, but we could add custom behavior here
        // For example: homing, gravity override, particle trails, etc.
    }

    /**
     * Launch the projectile with a given velocity
     */
    public launch(velocity: Vector3): void {
        this.velocity = velocity.clone();
        this.lifetime = 0;
        this.isActive = true;

        // Apply velocity to physics body if available
        const physicsComponent = this.entity?.getComponent<any>('physics');
        if (physicsComponent) {
            physicsComponent.setLinearVelocity(velocity);
        }
    }

    /**
     * Handle collision with another entity
     */
    public handleHit(hitEntity: any, hitPosition: Vector3, hitNormal: Vector3): void {
        if (!this.isActive) return;

        // Call custom hit callback if provided
        if (this.onHitCallback) {
            this.onHitCallback(hitEntity, hitPosition, hitNormal);
        }

        // Deactivate projectile
        this.deactivate();
    }

    /**
     * Expire the projectile (lifetime exceeded)
     */
    private expire(): void {
        if (!this.isActive) return;

        // Call custom expire callback if provided
        if (this.onExpireCallback) {
            this.onExpireCallback();
        }

        // Deactivate projectile
        this.deactivate();
    }

    /**
     * Deactivate the projectile
     */
    public deactivate(): void {
        this.isActive = false;
        this.lifetime = 0;

        // Stop physics movement
        const physicsComponent = this.entity?.getComponent<any>('physics');
        if (physicsComponent) {
            physicsComponent.setLinearVelocity(Vector3.Zero());
        }
    }

    /**
     * Reset projectile for reuse (pooling)
     */
    public reset(): void {
        this.velocity = Vector3.Zero();
        this.lifetime = 0;
        this.isActive = false;
    }

    /**
     * Check if projectile is currently active
     */
    public checkActive(): boolean {
        return this.isActive;
    }

    /**
     * Set callback for when projectile hits something
     */
    public setOnHit(callback: (hitEntity: any, hitPosition: Vector3, hitNormal: Vector3) => void): void {
        this.onHitCallback = callback;
    }

    /**
     * Set callback for when projectile expires
     */
    public setOnExpire(callback: () => void): void {
        this.onExpireCallback = callback;
    }

    /**
     * Get current velocity
     */
    public getVelocity(): Vector3 {
        return this.velocity.clone();
    }

    /**
     * Set max lifetime
     */
    public setMaxLifetime(lifetime: number): void {
        this.maxLifetime = lifetime;
    }

    /**
     * Get remaining lifetime
     */
    public getRemainingLifetime(): number {
        return Math.max(0, this.maxLifetime - this.lifetime);
    }

    public onDetach(): void {
        this.reset();
        super.onDetach();
    }
}
