import * as THREE from 'three';
import { WorldContext } from '../global/world/WorldContext';

/**
 * Utility class for working with Ammo.js and Three.js
 * Handles conversions between the two libraries and provides common physics operations
 */
export class AmmoUtils {
    /**
     * Get the Ammo instance from WorldContext
     */
    private static getAmmo(): any {
        const ammo = WorldContext.getAmmo();
        if (!ammo) {
            throw new Error("Ammo is not initialized yet. Make sure to call WorldContext.initAmmo() first.");
        }
        return ammo;
    }

    /**
     * Convert a THREE.Vector3 to an Ammo.btVector3
     * @param threeVector THREE.Vector3 to convert
     * @returns New Ammo.btVector3 (caller is responsible for destroying it)
     */
    public static threeToAmmoVec3(threeVector: THREE.Vector3): any {
        const Ammo = this.getAmmo();
        return new Ammo.btVector3(threeVector.x, threeVector.y, threeVector.z);
    }

    /**
     * Convert an Ammo.btVector3 to a THREE.Vector3
     * @param ammoVector Ammo.btVector3 to convert
     * @returns New THREE.Vector3
     */
    public static ammoToThreeVec3(ammoVector: any): THREE.Vector3 {
        const Ammo = this.getAmmo();
        return new THREE.Vector3(
            ammoVector.x(),
            ammoVector.y(),
            ammoVector.z()
        );
    }

    /**
     * Set the values of an existing Ammo.btVector3 from a THREE.Vector3
     * @param ammoVector Ammo.btVector3 to modify
     * @param threeVector THREE.Vector3 to read from
     */
    public static updateAmmoVec3(ammoVector: any, threeVector: THREE.Vector3): void {
        const Ammo = this.getAmmo();
        ammoVector.setValue(threeVector.x, threeVector.y, threeVector.z);
    }

    /**
     * Convert a THREE.Quaternion to an Ammo.btQuaternion
     * @param threeQuat THREE.Quaternion to convert
     * @returns New Ammo.btQuaternion (caller is responsible for destroying it)
     */
    public static threeToAmmoQuat(threeQuat: THREE.Quaternion): any {
        const Ammo = this.getAmmo();
        return new Ammo.btQuaternion(threeQuat.x, threeQuat.y, threeQuat.z, threeQuat.w);
    }

    /**
     * Convert an Ammo.btQuaternion to a THREE.Quaternion
     * @param ammoQuat Ammo.btQuaternion to convert
     * @returns New THREE.Quaternion
     */
    public static ammoToThreeQuat(ammoQuat: any): THREE.Quaternion {
        const Ammo = this.getAmmo();
        return new THREE.Quaternion(
            ammoQuat.x(),
            ammoQuat.y(),
            ammoQuat.z(),
            ammoQuat.w()
        );
    }

    /**
     * Set the values of an existing Ammo.btQuaternion from a THREE.Quaternion
     * @param ammoQuat Ammo.btQuaternion to modify
     * @param threeQuat THREE.Quaternion to read from
     */
    public static updateAmmoQuat(ammoQuat: any, threeQuat: THREE.Quaternion): void {
        const Ammo = this.getAmmo();
        ammoQuat.setValue(threeQuat.x, threeQuat.y, threeQuat.z, threeQuat.w);
    }

    /**
     * Create a new Ammo.btTransform from position and rotation
     * @param position THREE.Vector3 position
     * @param quaternion THREE.Quaternion rotation
     * @returns New Ammo.btTransform (caller is responsible for destroying it)
     */
    public static createTransform(position: THREE.Vector3, quaternion: THREE.Quaternion): any {
        const Ammo = this.getAmmo();
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        
        const origin = this.threeToAmmoVec3(position);
        transform.setOrigin(origin);
        
        transform.setRotation(this.threeToAmmoQuat(quaternion));
        
        // Clean up temporary objects
        Ammo.destroy(origin);
        
        return transform;
    }

    /**
     * Apply a transform to THREE objects
     * @param transform Ammo.btTransform to read
     * @param threePosition THREE.Vector3 to update with position
     * @param threeQuaternion THREE.Quaternion to update with rotation
     */
    public static readTransform(transform: any, threePosition: THREE.Vector3, threeQuaternion: THREE.Quaternion): void {
        // Update position
        const origin = transform.getOrigin();
        threePosition.set(origin.x(), origin.y(), origin.z());
        
        // Update rotation
        const rotation = transform.getRotation();
        threeQuaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
    }

    /**
     * Create a motion state for a rigid body
     * @param position Initial position
     * @param quaternion Initial rotation
     * @returns Ammo.btDefaultMotionState (caller is responsible for destroying it)
     */
    public static createMotionState(position: THREE.Vector3, quaternion: THREE.Quaternion): any {
        const Ammo = this.getAmmo();
        const transform = this.createTransform(position, quaternion);
        const motionState = new Ammo.btDefaultMotionState(transform);
        
        // Clean up transform
        Ammo.destroy(transform);
        
        return motionState;
    }

    /**
     * Create a rigid body with the given parameters
     * @param mass Object mass (0 for static objects)
     * @param motionState Motion state for initial transform
     * @param shape Collision shape
     * @param localInertia Local inertia vector (can be zero for static objects)
     * @returns Ammo.btRigidBody (caller is responsible for adding to world and cleanup)
     */
    public static createRigidBody(mass: number, motionState: any, shape: any, localInertia: any): any {
        const Ammo = this.getAmmo();
        const rbInfo = new Ammo.btRigidBodyConstructionInfo(
            mass,
            motionState,
            shape,
            localInertia
        );
        
        const body = new Ammo.btRigidBody(rbInfo);
        
        // Clean up construction info
        Ammo.destroy(rbInfo);
        
        return body;
    }

    /**
     * Apply central impulse to a rigid body (for jumps, impacts, etc.)
     * @param body Ammo.btRigidBody to apply force to
     * @param impulse THREE.Vector3 representing the impulse to apply
     */
    public static applyCentralImpulse(body: any, impulse: THREE.Vector3): void {
        const Ammo = this.getAmmo();
        const ammoImpulse = this.threeToAmmoVec3(impulse);
        body.applyCentralImpulse(ammoImpulse);
        
        // Clean up
        Ammo.destroy(ammoImpulse);
    }

    /**
     * Apply central force to a rigid body (for continuous forces like gravity)
     * @param body Ammo.btRigidBody to apply force to
     * @param force THREE.Vector3 representing the force to apply
     */
    public static applyCentralForce(body: any, force: THREE.Vector3): void {
        const Ammo = this.getAmmo();
        const ammoForce = this.threeToAmmoVec3(force);
        body.applyCentralForce(ammoForce);
        
        // Clean up
        Ammo.destroy(ammoForce);
    }

    /**
     * Get the linear velocity of a rigid body as a THREE.Vector3
     * @param body Ammo.btRigidBody to read velocity from
     * @returns THREE.Vector3 with the current velocity
     */
    public static getLinearVelocity(body: any): THREE.Vector3 {
        const Ammo = this.getAmmo();
        const velocity = body.getLinearVelocity();
        const threeVelocity = this.ammoToThreeVec3(velocity);
        return threeVelocity;
    }

    /**
     * Set the linear velocity of a rigid body
     * @param body Ammo.btRigidBody to set velocity on
     * @param velocity THREE.Vector3 with the desired velocity
     */
    public static setLinearVelocity(body: any, velocity: THREE.Vector3): void {
        const Ammo = this.getAmmo();
        const ammoVelocity = this.threeToAmmoVec3(velocity);
        body.setLinearVelocity(ammoVelocity);
        
        // Clean up
        Ammo.destroy(ammoVelocity);
    }

    /**
     * Get the angular velocity of a rigid body as a THREE.Vector3
     * @param body Ammo.btRigidBody to read angular velocity from
     * @returns THREE.Vector3 with the current angular velocity
     */
    public static getAngularVelocity(body: any): THREE.Vector3 {
        const Ammo = this.getAmmo();
        const angVelocity = body.getAngularVelocity();
        const threeAngVelocity = this.ammoToThreeVec3(angVelocity);
        return threeAngVelocity;
    }

    /**
     * Set the angular velocity of a rigid body
     * @param body Ammo.btRigidBody to set angular velocity on
     * @param velocity THREE.Vector3 with the desired angular velocity
     */
    public static setAngularVelocity(body: any, velocity: THREE.Vector3): void {
        const Ammo = this.getAmmo();
        const ammoVelocity = this.threeToAmmoVec3(velocity);
        body.setAngularVelocity(ammoVelocity);
        
        // Clean up
        Ammo.destroy(ammoVelocity);
    }

    /**
     * Activate a rigid body (wake it up for physics simulation)
     * @param body Ammo.btRigidBody to activate
     * @param forceActivation Whether to force activation even if the body should be sleeping
     */
    public static activateRigidBody(body: any, forceActivation: boolean = false): void {
        const Ammo = this.getAmmo();
        body.activate(forceActivation);
    }

    /**
     * Create a zero vector for inertia calculations
     * @returns Ammo.btVector3 set to (0,0,0) (caller is responsible for cleanup)
     */
    public static createZeroVector(): any {
        const Ammo = this.getAmmo();
        return new Ammo.btVector3(0, 0, 0);
    }

    /**
     * Extract Euler rotation from a transform's quaternion
     * @param transform Ammo.btTransform to get rotation from
     * @returns THREE.Euler object with rotation angles
     */
    public static getEulerFromTransform(transform: any): THREE.Euler {
        const Ammo = this.getAmmo();
        const quat = transform.getRotation();
        const threeQuat = this.ammoToThreeQuat(quat);
        return new THREE.Euler().setFromQuaternion(threeQuat);
    }
} 