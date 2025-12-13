import * as THREE from 'three';
import { Component } from './Component';
import GameObject from '../objects/GameObject';
import { WorldContext } from '../../global/world/WorldContext';

/**
 * Component for enforcing upright orientation on physics bodies (e.g., characters)
 */
export class UprightConstraintComponent implements Component {
    private owner!: GameObject;

    public initialize(owner: GameObject): void {
        this.owner = owner;
    }

    /**
     * Update to enforce upright orientation
     */
    public update(deltaTime: number): void {
        this.enforceUpright();
    }

    /**
     * Enforce upright position (only Y-axis rotation allowed)
     */
    public enforceUpright(): void {
        const collisionMesh = this.owner.getCollisionBody();
        if (!collisionMesh) return;

        try {
            const Ammo = WorldContext.getAmmo();
            const currentRotation = collisionMesh.getWorldTransform().getRotation();

            const tempTransform = new Ammo.btTransform();
            tempTransform.setIdentity();
            tempTransform.setRotation(currentRotation);

            const uprightTransform = new Ammo.btTransform();
            uprightTransform.setIdentity();

            const yRotation = new Ammo.btQuaternion();
            yRotation.setEulerZYX(0, tempTransform.getRotation().y(), 0);

            uprightTransform.setRotation(yRotation);

            collisionMesh.getWorldTransform().setRotation(uprightTransform.getRotation());

            const zeroAngVel = new Ammo.btVector3(0, 0, 0);
            collisionMesh.setAngularVelocity(zeroAngVel);

            Ammo.destroy(tempTransform);
            Ammo.destroy(uprightTransform);
            Ammo.destroy(yRotation);
            Ammo.destroy(zeroAngVel);
        } catch (error) {
            console.error('Error enforcing upright position:', error);
        }
    }

    /**
     * Stabilize on ground (dampen vertical velocity)
     */
    public stabilizeOnGround(): void {
        const collisionMesh = this.owner.getCollisionBody();
        if (!collisionMesh) return;

        try {
            const Ammo = WorldContext.getAmmo();
            const velocity = collisionMesh.getLinearVelocity();

            const newVelocity = new Ammo.btVector3(
                velocity.x() * 0.9,
                velocity.y() * 0.6,
                velocity.z() * 0.9
            );

            collisionMesh.setLinearVelocity(newVelocity);
            this.enforceUpright();

            Ammo.destroy(newVelocity);
        } catch (error) {
            console.error('Error stabilizing character on ground:', error);
        }
    }
}
