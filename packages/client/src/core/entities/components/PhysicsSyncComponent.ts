import * as THREE from 'three';
import { Component } from './Component';
import GameObject from '../objects/GameObject';
import { WorldContext } from '../../global/world/WorldContext';
import { AmmoUtils } from '../../physics/AmmoUtils';

/**
 * Component responsible for synchronizing visual mesh with physics body
 */
export class PhysicsSyncComponent implements Component {
    private owner!: GameObject;

    public initialize(owner: GameObject): void {
        this.owner = owner;
    }

    public update(deltaTime: number): void {
        const collisionMesh = this.owner.getCollisionBody();
        if (!collisionMesh) return;

        this.syncMeshWithBody();
    }

    private syncMeshWithBody(): void {
        const collisionMesh = this.owner.getCollisionBody();
        const visualMesh = this.owner.getMesh();

        if (!collisionMesh || !visualMesh) return;

        try {
            const Ammo = WorldContext.getAmmo();
            const transform = new Ammo.btTransform();

            // Get the transform from the motion state
            const motionState = collisionMesh.getMotionState();
            if (motionState) {
                motionState.getWorldTransform(transform);
            } else {
                collisionMesh.getMotionState().getWorldTransform(transform);
            }

            // Use AmmoUtils to read the transform into Three.js objects
            const position = visualMesh.position;
            const quaternion = visualMesh.quaternion;

            AmmoUtils.readTransform(transform, position, quaternion);

            // Check for invalid values (NaN, Infinity)
            if (isNaN(position.x) || isNaN(position.y) || isNaN(position.z) ||
                !isFinite(position.x) || !isFinite(position.y) || !isFinite(position.z)) {
                console.error(`Invalid physics position detected for ${this.owner.getId()}:`, position);
                Ammo.destroy(transform);
                return;
            }

            // Check for invalid quaternion values
            if (isNaN(quaternion.x) || isNaN(quaternion.y) || isNaN(quaternion.z) || isNaN(quaternion.w) ||
                !isFinite(quaternion.x) || !isFinite(quaternion.y) || !isFinite(quaternion.z) || !isFinite(quaternion.w)) {
                console.error(`Invalid physics quaternion detected for ${this.owner.getId()}:`, quaternion);
                Ammo.destroy(transform);
                return;
            }

            // Update the internal position value to match the physics body
            this.owner.setPosition(position.clone());

            // Normalize the quaternion to avoid rendering issues
            quaternion.normalize();

            // Clean up transform
            Ammo.destroy(transform);
        } catch (error) {
            console.error('Error syncing mesh with body:', error);
        }
    }
}
