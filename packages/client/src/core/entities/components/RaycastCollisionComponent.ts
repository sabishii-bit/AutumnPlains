import * as THREE from 'three';
import { Component } from './Component';
import GameObject from '../objects/GameObject';
import { WorldContext } from '../../global/world/WorldContext';
import { GameObjectManager } from '../GameObjectManager';

/**
 * Component for raycast-based collision detection
 * Useful for projectiles and hitscan weapons
 */
export class RaycastCollisionComponent implements Component {
    private owner!: GameObject;
    private hitObject: GameObject | null = null;
    private hitPosition: THREE.Vector3 | null = null;
    private hitNormal: THREE.Vector3 | null = null;
    private maxRaycastDistance: number = 1000;
    private worldContext: any;
    private excludeTypes: any[] = [];

    public initialize(owner: GameObject): void {
        this.owner = owner;
        this.worldContext = WorldContext.getInstance();
    }

    /**
     * Set types to exclude from collision detection
     */
    public setExcludeTypes(types: any[]): void {
        this.excludeTypes = types;
    }

    /**
     * Set maximum raycast distance
     */
    public setMaxRaycastDistance(distance: number): void {
        this.maxRaycastDistance = distance;
    }

    /**
     * Perform raycast collision check
     * @param origin Starting point of the ray
     * @param direction Direction of the ray (normalized)
     * @returns True if hit detected
     */
    public checkCollision(origin: THREE.Vector3, direction: THREE.Vector3): boolean {
        try {
            const Ammo = WorldContext.getAmmo();

            const rayFrom = new Ammo.btVector3(origin.x, origin.y, origin.z);
            const rayTo = new Ammo.btVector3(
                origin.x + direction.x * this.maxRaycastDistance,
                origin.y + direction.y * this.maxRaycastDistance,
                origin.z + direction.z * this.maxRaycastDistance
            );

            const rayCallback = new Ammo.ClosestRayResultCallback(rayFrom, rayTo);

            // Set collision filter
            rayCallback.set_m_collisionFilterGroup(0xFFFF);
            rayCallback.set_m_collisionFilterMask(0xFFFF & ~(4));

            // Perform raycast
            this.worldContext.rayTest(rayFrom, rayTo, rayCallback);

            const hasHit = rayCallback.hasHit();

            if (hasHit) {
                const hitPointWorld = rayCallback.get_m_hitPointWorld();
                const hitNormalWorld = rayCallback.get_m_hitNormalWorld();
                const hitObject = rayCallback.get_m_collisionObject();

                this.hitPosition = new THREE.Vector3(
                    hitPointWorld.x(),
                    hitPointWorld.y(),
                    hitPointWorld.z()
                );

                this.hitNormal = new THREE.Vector3(
                    hitNormalWorld.x(),
                    hitNormalWorld.y(),
                    hitNormalWorld.z()
                );

                // Find GameObject from collision body
                this.hitObject = this.findGameObjectFromCollisionBody(hitObject);

                // Clean up
                Ammo.destroy(rayCallback);
                Ammo.destroy(rayFrom);
                Ammo.destroy(rayTo);

                return true;
            } else {
                this.hitObject = null;
                this.hitPosition = null;
                this.hitNormal = null;

                Ammo.destroy(rayCallback);
                Ammo.destroy(rayFrom);
                Ammo.destroy(rayTo);

                return false;
            }
        } catch (error) {
            console.error("Error during raycast collision check:", error);
            this.hitObject = null;
            this.hitPosition = null;
            this.hitNormal = null;
            return false;
        }
    }

    /**
     * Find GameObject from Ammo collision body
     */
    private findGameObjectFromCollisionBody(hitObject: any): GameObject | null {
        const allObjects = GameObjectManager.getAllGameObjects();

        const foundObject = allObjects.find((obj: GameObject) => {
            if (!obj.getCollisionBody()) return false;

            // Skip excluded types
            for (const excludeType of this.excludeTypes) {
                if (obj instanceof excludeType) return false;
            }

            try {
                const objBody = obj.getCollisionBody();

                if (objBody === hitObject) return true;

                const objProxy = objBody.getBroadphaseHandle();
                const hitProxy = hitObject.getBroadphaseHandle();
                if (objProxy && hitProxy && objProxy.equals(hitProxy)) return true;

                if (typeof objBody.getUserIndex === 'function' &&
                    typeof hitObject.getUserIndex === 'function') {
                    return objBody.getUserIndex() === hitObject.getUserIndex();
                }

                return false;
            } catch (error) {
                return false;
            }
        }) || null;

        // If no object found, try to identify by position/normal
        if (!foundObject && this.hitNormal && this.hitPosition) {
            if (Math.abs(this.hitNormal.y) > 0.9 && Math.abs(this.hitPosition.y) < 0.2) {
                const groundObjects = allObjects.filter(obj =>
                    obj.constructor.name.includes('Ground') ||
                    obj.constructor.name.includes('Environment'));

                if (groundObjects.length > 0) {
                    return groundObjects[0];
                }
            }
        }

        return foundObject;
    }

    /**
     * Get the hit object
     */
    public getHitObject(): GameObject | null {
        return this.hitObject;
    }

    /**
     * Get the hit position
     */
    public getHitPosition(): THREE.Vector3 | null {
        return this.hitPosition ? this.hitPosition.clone() : null;
    }

    /**
     * Get the hit normal
     */
    public getHitNormal(): THREE.Vector3 | null {
        return this.hitNormal ? this.hitNormal.clone() : null;
    }

    /**
     * Reset collision data
     */
    public reset(): void {
        this.hitObject = null;
        this.hitPosition = null;
        this.hitNormal = null;
    }
}
