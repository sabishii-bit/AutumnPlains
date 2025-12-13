import * as THREE from 'three';
import GameObject from '../objects/GameObject';
import { Component } from './Component';
import { SceneContext } from '../../global/scene/SceneContext';

/**
 * Component that manages the visual mesh representation of a GameObject
 * Abstracts mesh creation, visibility, and scene management
 */
export class MeshComponent implements Component {
    private owner!: GameObject;
    private mesh: THREE.Mesh | THREE.Group | null = null;
    private scene: THREE.Scene;
    private isAddedToScene: boolean = false;

    constructor() {
        this.scene = SceneContext.getInstance();
    }

    public initialize(owner: GameObject): void {
        this.owner = owner;
    }

    /**
     * Set the visual mesh for this component
     * @param mesh The THREE.Mesh or THREE.Group to use as the visual representation
     * @param addToScene Whether to automatically add the mesh to the scene (default: true)
     */
    public setMesh(mesh: THREE.Mesh | THREE.Group, addToScene: boolean = true): void {
        // Remove old mesh from scene if it exists
        if (this.mesh && this.isAddedToScene) {
            this.removeFromScene();
        }

        this.mesh = mesh;

        // Add new mesh to scene if requested
        if (addToScene && this.mesh) {
            this.addToScene();
        }
    }

    /**
     * Get the current visual mesh
     */
    public getMesh(): THREE.Mesh | THREE.Group | null {
        return this.mesh;
    }

    /**
     * Add the mesh to the scene
     */
    public addToScene(): void {
        if (this.mesh && !this.isAddedToScene) {
            this.scene.add(this.mesh);
            this.isAddedToScene = true;
        }
    }

    /**
     * Remove the mesh from the scene
     */
    public removeFromScene(): void {
        if (this.mesh && this.isAddedToScene) {
            this.scene.remove(this.mesh);
            this.isAddedToScene = false;
        }
    }

    /**
     * Set the visibility of the mesh
     * @param visible Whether the mesh should be visible
     */
    public setVisible(visible: boolean): void {
        if (this.mesh) {
            this.mesh.visible = visible;
        }
    }

    /**
     * Get the visibility of the mesh
     */
    public isVisible(): boolean {
        return this.mesh ? this.mesh.visible : false;
    }

    /**
     * Toggle the visibility of the mesh
     */
    public toggleVisibility(): void {
        if (this.mesh) {
            this.mesh.visible = !this.mesh.visible;
        }
    }

    /**
     * Update the mesh position
     * @param position The new position
     */
    public setPosition(position: THREE.Vector3): void {
        if (this.mesh) {
            this.mesh.position.copy(position);
        }
    }

    /**
     * Update the mesh rotation
     * @param rotation The new rotation (Euler angles)
     */
    public setRotation(rotation: THREE.Euler): void {
        if (this.mesh) {
            this.mesh.rotation.copy(rotation);
        }
    }

    /**
     * Update the mesh quaternion
     * @param quaternion The new quaternion
     */
    public setQuaternion(quaternion: THREE.Quaternion): void {
        if (this.mesh) {
            this.mesh.quaternion.copy(quaternion);
        }
    }

    /**
     * Update the mesh scale
     * @param scale The new scale
     */
    public setScale(scale: THREE.Vector3): void {
        if (this.mesh) {
            this.mesh.scale.copy(scale);
        }
    }

    /**
     * Get the mesh position
     */
    public getPosition(): THREE.Vector3 {
        return this.mesh ? this.mesh.position.clone() : new THREE.Vector3();
    }

    /**
     * Get the mesh rotation
     */
    public getRotation(): THREE.Euler {
        return this.mesh ? this.mesh.rotation.clone() : new THREE.Euler();
    }

    /**
     * Get the mesh quaternion
     */
    public getQuaternion(): THREE.Quaternion {
        return this.mesh ? this.mesh.quaternion.clone() : new THREE.Quaternion();
    }

    /**
     * Clean up resources
     */
    public cleanup(): void {
        if (this.mesh) {
            this.removeFromScene();

            // Dispose of geometries and materials
            this.mesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });

            this.mesh = null;
        }
    }

    /**
     * Check if a mesh has been set
     */
    public hasMesh(): boolean {
        return this.mesh !== null;
    }
}
