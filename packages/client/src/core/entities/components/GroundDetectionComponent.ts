import * as THREE from 'three';
import { Component } from './Component';
import GameObject from '../objects/GameObject';
import { WorldContext } from '../../global/world/WorldContext';

/**
 * Component for detecting ground contact using raycasting
 * Extracted from BaseCharacter to be reusable by any object that needs ground detection
 */
export class GroundDetectionComponent implements Component {
    private owner!: GameObject;
    private groundRaycastDistance: number = 0.15;
    private isOnGround: boolean = false;
    private raycastStartTime: number = 0;
    private raycastResults: any = null;
    private rayStart: any = null;
    private rayEnd: any = null;
    private previousYVelocity: number = 0;
    private lastCollisionTime: number = 0;
    private worldContext: any;

    // Configuration for character dimensions (can be customized)
    private halfHeight: number = 1.0;

    public initialize(owner: GameObject): void {
        this.owner = owner;
        this.worldContext = WorldContext.getInstance();
        this.initRaycastObjects();
    }

    /**
     * Set the half-height of the character (distance from center to bottom)
     */
    public setHalfHeight(halfHeight: number): void {
        this.halfHeight = halfHeight;
    }

    /**
     * Initialize raycast objects for ground detection
     */
    private initRaycastObjects(): void {
        try {
            const Ammo = WorldContext.getAmmo();

            if (!this.raycastResults) {
                const fromVec = new Ammo.btVector3(0, 0, 0);
                const toVec = new Ammo.btVector3(0, -1, 0);

                this.raycastResults = new Ammo.ClosestRayResultCallback(fromVec, toVec);
                this.rayStart = new Ammo.btVector3(0, 0, 0);
                this.rayEnd = new Ammo.btVector3(0, 0, 0);

                Ammo.destroy(fromVec);
                Ammo.destroy(toVec);
            }
        } catch (error) {
            console.error("Error initializing raycast objects:", error);
        }
    }

    /**
     * Check ground contact using raycasting
     */
    public update(deltaTime: number): void {
        const collisionMesh = this.owner.getCollisionBody();
        if (!collisionMesh) return;

        try {
            const Ammo = WorldContext.getAmmo();
            const now = performance.now();

            // Ensure raycast objects are available
            if (!this.raycastResults || !this.rayStart || !this.rayEnd) {
                this.initRaycastObjects();
                if (!this.raycastResults || !this.rayStart || !this.rayEnd) {
                    return;
                }
            }

            // Check velocity
            const velocity = collisionMesh.getLinearVelocity();
            const yVelocity = velocity.y();

            // If moving upward significantly, skip ground check
            if (yVelocity > 3.0) {
                this.isOnGround = false;
                return;
            }

            // Perform raycast check periodically
            if (now - this.raycastStartTime > 25) {
                this.raycastStartTime = now;

                const motionState = collisionMesh.getMotionState();
                if (!motionState) return;

                const transform = new Ammo.btTransform();
                motionState.getWorldTransform(transform);
                const origin = transform.getOrigin();

                const x = origin.x();
                const y = origin.y();
                const z = origin.z();

                if (isNaN(x) || isNaN(y) || isNaN(z)) {
                    Ammo.destroy(transform);
                    return;
                }

                // Multiple check points for better detection
                const checkPoints = [
                    { x: 0, z: 0 },
                    { x: 0.1, z: 0 },
                    { x: -0.1, z: 0 },
                    { x: 0, z: 0.1 },
                    { x: 0, z: -0.1 }
                ];

                const pointsToCheck = yVelocity > 0 ? [checkPoints[0]] : checkPoints;

                let hitDetected = false;
                for (const point of pointsToCheck) {
                    if (hitDetected) break;

                    this.rayStart.setValue(
                        x + point.x,
                        y - (this.halfHeight * 0.95),
                        z + point.z
                    );

                    this.rayEnd.setValue(
                        x + point.x,
                        y - (this.halfHeight + this.groundRaycastDistance),
                        z + point.z
                    );

                    this.raycastResults.set_m_closestHitFraction(1);
                    this.raycastResults.set_m_collisionObject(null);
                    this.raycastResults.m_rayFromWorld = this.rayStart;
                    this.raycastResults.m_rayToWorld = this.rayEnd;

                    this.worldContext.rayTest(this.rayStart, this.rayEnd, this.raycastResults);

                    if (this.raycastResults.hasHit()) {
                        hitDetected = true;
                        break;
                    }
                }

                const wasGrounded = this.isOnGround;
                if (hitDetected || wasGrounded) {
                    this.isOnGround = hitDetected;
                    if (!wasGrounded && this.isOnGround) {
                        this.lastCollisionTime = now;
                    }
                }

                Ammo.destroy(transform);
            }

            // Velocity change backup detection
            if (yVelocity <= 0) {
                if (this.previousYVelocity < -1 && yVelocity > -0.3) {
                    this.lastCollisionTime = performance.now();
                    this.isOnGround = true;
                }
                this.previousYVelocity = yVelocity;
            }
        } catch (error) {
            console.error('Error checking ground contact:', error);
        }
    }

    /**
     * Check if grounded (with optional extended distance)
     */
    public isGrounded(extendedDistance: number = 0): boolean {
        if (this.isOnGround) {
            return true;
        }

        if (extendedDistance > 0) {
            return this.performExtendedGroundCheck(extendedDistance);
        }

        return this.isOnGround;
    }

    /**
     * Perform an extended ground check with custom distance
     */
    private performExtendedGroundCheck(extendedDistance: number): boolean {
        const collisionMesh = this.owner.getCollisionBody();
        if (!collisionMesh) return false;

        try {
            const Ammo = WorldContext.getAmmo();

            if (!this.raycastResults || !this.rayStart || !this.rayEnd) {
                this.initRaycastObjects();
                if (!this.raycastResults) return false;
            }

            const motionState = collisionMesh.getMotionState();
            if (!motionState) return false;

            const transform = new Ammo.btTransform();
            motionState.getWorldTransform(transform);
            const origin = transform.getOrigin();

            this.rayStart.setValue(
                origin.x(),
                origin.y() - (this.halfHeight * 0.95),
                origin.z()
            );

            this.rayEnd.setValue(
                origin.x(),
                origin.y() - (this.halfHeight + this.groundRaycastDistance + extendedDistance),
                origin.z()
            );

            this.raycastResults.set_m_closestHitFraction(1);
            this.raycastResults.set_m_collisionObject(null);
            this.raycastResults.m_rayFromWorld = this.rayStart;
            this.raycastResults.m_rayToWorld = this.rayEnd;

            this.worldContext.rayTest(this.rayStart, this.rayEnd, this.raycastResults);

            Ammo.destroy(transform);
            return this.raycastResults.hasHit();
        } catch (error) {
            console.error('Error during extended ground check:', error);
            return false;
        }
    }

    /**
     * Check if landed recently
     */
    public hasLandedRecently(threshold: number = 10): boolean {
        const currentTime = performance.now();
        return currentTime - this.lastCollisionTime <= threshold;
    }

    /**
     * Clean up raycast resources
     */
    public cleanup(): void {
        const Ammo = WorldContext.getAmmo();
        if (this.rayStart) {
            Ammo.destroy(this.rayStart);
            this.rayStart = null;
        }
        if (this.rayEnd) {
            Ammo.destroy(this.rayEnd);
            this.rayEnd = null;
        }
        if (this.raycastResults) {
            Ammo.destroy(this.raycastResults);
            this.raycastResults = null;
        }
    }
}
