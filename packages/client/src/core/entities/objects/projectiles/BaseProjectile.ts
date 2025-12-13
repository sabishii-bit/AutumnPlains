import * as THREE from 'three';
import GameObject, { GameObjectOptions } from "../GameObject";
import { PlayerCamera } from "../../../camera/PlayerCamera";
import { RaycastCollisionComponent } from "../../components/RaycastCollisionComponent";
import { CameraProjectileComponent } from "../../components/CameraProjectileComponent";

export default abstract class BaseProjectile extends GameObject {
    protected playerCamera: PlayerCamera;
    protected maxRaycastDistance: number = 1000;

    constructor(options: GameObjectOptions = {}) {
        const projectileOptions = {
            ...options,
            addToCollection: false,
            skipMeshCreation: true
        };
        super(projectileOptions);

        this.playerCamera = PlayerCamera.getInstance();

        // Add components
        this.addComponent('cameraProjectile', new CameraProjectileComponent());
        this.addComponent('raycastCollision', new RaycastCollisionComponent());

        // Configure raycast collision
        const raycast = this.getComponent<RaycastCollisionComponent>('raycastCollision');
        if (raycast) {
            raycast.setMaxRaycastDistance(this.maxRaycastDistance);
            raycast.setExcludeTypes([BaseProjectile]);
        }

        // Create meshes after components are ready
        this.createVisualMesh();

        // Add to collection if requested
        if (options.addToCollection !== false) {
            this.gameObjectManager.addGameObject(this);
        }
    }

    public initialize(): void {
        const cameraProj = this.getComponent<CameraProjectileComponent>('cameraProjectile');
        if (cameraProj) {
            cameraProj.updateFromCamera();
        }
        this.createVisualMesh();
    }

    public checkActive(): boolean {
        return this.visualMesh.visible;
    }

    public abstract fire(): void;

    public updateFromCamera(): void {
        const cameraProj = this.getComponent<CameraProjectileComponent>('cameraProjectile');
        if (cameraProj) {
            cameraProj.updateFromCamera();
        }
    }

    public deactivate(): void {
        if (this.visualMesh) {
            this.visualMesh.visible = false;
        }
    }

    public getOrigin(): THREE.Vector3 {
        const cameraProj = this.getComponent<CameraProjectileComponent>('cameraProjectile');
        if (cameraProj) {
            return cameraProj.getOrigin();
        }
        return new THREE.Vector3();
    }

    public getDirection(): THREE.Vector3 {
        const cameraProj = this.getComponent<CameraProjectileComponent>('cameraProjectile');
        if (cameraProj) {
            return cameraProj.getDirection();
        }
        return new THREE.Vector3(0, 0, -1);
    }

    protected abstract createVisualMesh(): void;

    public reset(): void {
        const cameraProj = this.getComponent<CameraProjectileComponent>('cameraProjectile');
        if (cameraProj) {
            cameraProj.reset();
        }

        if (this.visualMesh) {
            this.visualMesh.visible = false;
        }

        console.log(`Projectile reset for recycling`);
    }

    protected checkCollisions(): boolean {
        const raycast = this.getComponent<RaycastCollisionComponent>('raycastCollision');
        const cameraProj = this.getComponent<CameraProjectileComponent>('cameraProjectile');

        if (raycast && cameraProj) {
            const origin = cameraProj.getOrigin();
            const direction = cameraProj.getDirection();
            return raycast.checkCollision(origin, direction);
        }

        return false;
    }

    public getHitObject(): GameObject | null {
        const raycast = this.getComponent<RaycastCollisionComponent>('raycastCollision');
        if (raycast) {
            return raycast.getHitObject();
        }
        return null;
    }

    public getHitPosition(): THREE.Vector3 | null {
        const raycast = this.getComponent<RaycastCollisionComponent>('raycastCollision');
        if (raycast) {
            return raycast.getHitPosition();
        }
        return null;
    }

    public setMaxRaycastDistance(distance: number): void {
        this.maxRaycastDistance = distance;
        const raycast = this.getComponent<RaycastCollisionComponent>('raycastCollision');
        if (raycast) {
            raycast.setMaxRaycastDistance(distance);
        }
    }

    public getHitNormal(): THREE.Vector3 | null {
        const raycast = this.getComponent<RaycastCollisionComponent>('raycastCollision');
        if (raycast) {
            return raycast.getHitNormal();
        }
        return null;
    }
}
