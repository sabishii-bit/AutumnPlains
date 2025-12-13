import * as THREE from 'three';
import { Component } from './Component';
import GameObject from '../objects/GameObject';
import { AmmoUtils } from '../../physics/AmmoUtils';

/**
 * Component for applying forces, impulses, and managing velocity on physics bodies
 */
export class PhysicsForceComponent implements Component {
    private owner!: GameObject;

    public initialize(owner: GameObject): void {
        this.owner = owner;
    }

    /**
     * Apply a force to the center of mass of this object
     * @param force Force vector to apply
     */
    public applyCentralForce(force: THREE.Vector3): void {
        const collisionMesh = this.owner.getCollisionBody();
        if (collisionMesh) {
            AmmoUtils.applyCentralForce(collisionMesh, force);
        }
    }

    /**
     * Apply an impulse to the center of mass of this object
     * @param impulse Impulse vector to apply
     */
    public applyCentralImpulse(impulse: THREE.Vector3): void {
        const collisionMesh = this.owner.getCollisionBody();
        if (collisionMesh) {
            AmmoUtils.applyCentralImpulse(collisionMesh, impulse);
        }
    }

    /**
     * Get the current linear velocity of this object
     * @returns THREE.Vector3 representing the velocity
     */
    public getLinearVelocity(): THREE.Vector3 {
        const collisionMesh = this.owner.getCollisionBody();
        if (collisionMesh) {
            return AmmoUtils.getLinearVelocity(collisionMesh);
        }
        return new THREE.Vector3();
    }

    /**
     * Set the linear velocity of this object
     * @param velocity THREE.Vector3 representing the new velocity
     */
    public setLinearVelocity(velocity: THREE.Vector3): void {
        const collisionMesh = this.owner.getCollisionBody();
        if (collisionMesh) {
            AmmoUtils.setLinearVelocity(collisionMesh, velocity);
        }
    }

    /**
     * Activate the physics body (wake it up)
     * @param forceActivation Whether to force activation
     */
    public activate(forceActivation: boolean = false): void {
        const collisionMesh = this.owner.getCollisionBody();
        if (collisionMesh) {
            AmmoUtils.activateRigidBody(collisionMesh, forceActivation);
        }
    }
}
