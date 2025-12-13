import * as THREE from 'three';
import { Component } from './Component';
import GameObject from '../objects/GameObject';
import { WorldContext } from '../../global/world/WorldContext';

/**
 * Component for character movement and jumping
 */
export class CharacterMovementComponent implements Component {
    private owner!: GameObject;
    public moveSpeed: number = 5;
    public jumpHeight: number = 1;
    private jumpForceMultiplier: number = 1;

    public initialize(owner: GameObject): void {
        this.owner = owner;
    }

    /**
     * Update character position based on input
     */
    public updatePosition(deltaTime: number, inputVector: THREE.Vector3): void {
        const collisionMesh = this.owner.getCollisionBody();
        if (!collisionMesh) return;

        try {
            const Ammo = WorldContext.getAmmo();

            collisionMesh.activate(true);

            if (inputVector.lengthSq() > 0) {
                const velocity = collisionMesh.getLinearVelocity();
                const currentYVelocity = velocity.y();

                const rawMoveSpeed = this.moveSpeed || 5;
                const effectiveSpeed = rawMoveSpeed / 6;

                const newVelocity = new Ammo.btVector3(
                    inputVector.x * effectiveSpeed,
                    currentYVelocity,
                    inputVector.z * effectiveSpeed
                );

                collisionMesh.setLinearVelocity(newVelocity);

                // Try to apply force if available
                try {
                    if (typeof collisionMesh.applyCentralForce === 'function') {
                        const moveForce = effectiveSpeed * 10;
                        const moveDirection = new Ammo.btVector3(
                            inputVector.x * moveForce,
                            0,
                            inputVector.z * moveForce
                        );

                        collisionMesh.applyCentralForce(moveDirection);
                        Ammo.destroy(moveDirection);
                    }
                } catch (forceError) {
                    // Velocity already set
                }

                Ammo.destroy(newVelocity);
            } else {
                // Apply horizontal damping
                const velocity = collisionMesh.getLinearVelocity();
                const newVelocity = new Ammo.btVector3(
                    velocity.x() * 0.9,
                    velocity.y(),
                    velocity.z() * 0.9
                );
                collisionMesh.setLinearVelocity(newVelocity);
                Ammo.destroy(newVelocity);
            }
        } catch (error) {
            console.error('Error updating character position:', error);
        }
    }

    /**
     * Make the character jump
     */
    public jump(): void {
        const collisionMesh = this.owner.getCollisionBody();
        if (!collisionMesh) return;

        try {
            const Ammo = WorldContext.getAmmo();

            const gravity = WorldContext.getGravity();
            const gravityStrength = Math.abs(gravity.y);

            const gravityFactor = gravityStrength / 10;
            const scaledJumpForce = this.jumpHeight * this.jumpForceMultiplier * gravityFactor;
            const jumpForce = Math.max(scaledJumpForce, 1);

            const velocity = collisionMesh.getLinearVelocity();

            const newVelocity = new Ammo.btVector3(
                velocity.x(),
                jumpForce,
                velocity.z()
            );
            collisionMesh.setLinearVelocity(newVelocity);
            Ammo.destroy(newVelocity);

            // Try to apply impulse
            try {
                if (typeof collisionMesh.applyCentralImpulse === 'function') {
                    const jumpVector = new Ammo.btVector3(0, jumpForce * 0.5, 0);
                    collisionMesh.applyCentralImpulse(jumpVector);
                    Ammo.destroy(jumpVector);
                }
            } catch (impulseError) {
                // Velocity already set
            }
        } catch (error) {
            console.error('Error during jump:', error);
        }
    }

    /**
     * Set velocity with optional x, y, z components
     */
    public setVelocity(options: { x?: number; y?: number; z?: number } = {}): void {
        const collisionMesh = this.owner.getCollisionBody();
        if (!collisionMesh) return;

        try {
            const Ammo = WorldContext.getAmmo();
            const velocity = collisionMesh.getLinearVelocity();

            const newVelocityX = options.x !== undefined ? options.x : velocity.x();
            const newVelocityY = options.y !== undefined ? options.y : velocity.y();
            const newVelocityZ = options.z !== undefined ? options.z : velocity.z();

            const newVelocity = new Ammo.btVector3(newVelocityX, newVelocityY, newVelocityZ);
            collisionMesh.setLinearVelocity(newVelocity);

            Ammo.destroy(newVelocity);
        } catch (error) {
            console.error('Error setting velocity:', error);
        }
    }

    /**
     * Set acceleration (converts to force)
     */
    public setAcceleration(options: { x?: number; y?: number; z?: number } = {}): void {
        const collisionMesh = this.owner.getCollisionBody();
        if (!collisionMesh) return;

        try {
            const Ammo = WorldContext.getAmmo();
            const mass = collisionMesh.getMass();

            const forceX = (options.x !== undefined ? options.x : 0) * mass;
            const forceY = (options.y !== undefined ? options.y : 0) * mass;
            const forceZ = (options.z !== undefined ? options.z : 0) * mass;

            collisionMesh.clearForces();

            if (forceX !== 0 || forceY !== 0 || forceZ !== 0) {
                const force = new Ammo.btVector3(forceX, forceY, forceZ);
                collisionMesh.applyCentralForce(force);
                Ammo.destroy(force);
            }
        } catch (error) {
            console.error('Error setting acceleration:', error);
        }
    }

    /**
     * Set move speed
     */
    public setMoveSpeed(speed: number): void {
        this.moveSpeed = speed;
    }

    /**
     * Set jump height
     */
    public setJumpHeight(height: number): void {
        this.jumpHeight = height;
    }

    /**
     * Adjust jump height by amount
     */
    public adjustJumpHeight(amount: number): void {
        this.jumpHeight += amount;
        if (this.jumpHeight < 0) {
            this.jumpHeight = 0;
        }
    }

    /**
     * Get current jump height
     */
    public getJumpHeight(): number {
        return this.jumpHeight;
    }

    /**
     * Get jump force multiplier
     */
    public getJumpForceMultiplier(): number {
        return this.jumpForceMultiplier;
    }
}
