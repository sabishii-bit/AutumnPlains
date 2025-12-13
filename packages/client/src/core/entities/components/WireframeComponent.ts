import * as THREE from 'three';
import { Component } from './Component';
import GameObject from '../objects/GameObject';
import { SceneContext } from '../../global/scene/SceneContext';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';

/**
 * Component for rendering wireframe visualization of collision meshes
 */
export class WireframeComponent implements Component {
    private owner!: GameObject;
    private wireframeMesh: THREE.LineSegments | null = null;
    private isWireframeVisible: boolean = false;
    private hasCreatedWireframe: boolean = false;
    private sceneContext: THREE.Scene = SceneContext.getInstance();

    public initialize(owner: GameObject): void {
        this.owner = owner;
    }

    /**
     * Create wireframe based on the existing collision mesh
     */
    public createWireframe(): void {
        const collisionMesh = this.owner.getCollisionBody();
        const visualMesh = this.owner.getMesh();

        if (!this.wireframeMesh && !this.hasCreatedWireframe && collisionMesh) {
            try {
                let wireframeGeometry;
                if (visualMesh instanceof THREE.Group) {
                    // If visualMesh is a group, merge its geometries for the wireframe
                    const geometries: THREE.BufferGeometry[] = [];
                    visualMesh.traverse(child => {
                        if (child instanceof THREE.Mesh) {
                            geometries.push((child as THREE.Mesh).geometry);
                        }
                    });

                    if (geometries.length > 0) {
                        wireframeGeometry = mergeGeometries(geometries);
                    } else {
                        console.warn(`No valid geometries found in group for wireframe on ${this.owner.getId()}`);
                        return;
                    }
                } else if (visualMesh instanceof THREE.Mesh) {
                    wireframeGeometry = new THREE.WireframeGeometry((visualMesh as THREE.Mesh).geometry);
                } else {
                    console.warn(`Cannot create wireframe for ${this.owner.getId()} - unsupported mesh type`);
                    return;
                }

                const wireframeMaterial = new THREE.LineBasicMaterial({
                    color: 0x00ff00,
                    depthTest: false,
                    opacity: 0.5,
                    transparent: true
                });
                this.wireframeMesh = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
                this.wireframeMesh.position.copy(visualMesh.position);
                this.wireframeMesh.quaternion.copy(visualMesh.quaternion);
                this.wireframeMesh.scale.copy(visualMesh.scale);

                // Set initial visibility
                this.wireframeMesh.visible = this.isWireframeVisible;
                this.wireframeMesh.renderOrder = 999;

                this.sceneContext.add(this.wireframeMesh);
                this.hasCreatedWireframe = true;

                console.log(`Created wireframe for GameObject ${this.owner.getId()}`);
            } catch (error) {
                console.error(`Failed to create wireframe for ${this.owner.getId()}:`, error);
            }
        }
    }

    /**
     * Toggle the visibility of the wireframe
     */
    public toggleVisibility(): void {
        if (this.wireframeMesh) {
            this.isWireframeVisible = !this.isWireframeVisible;
            (this.wireframeMesh as THREE.Object3D).visible = this.isWireframeVisible;
        } else if (!this.hasCreatedWireframe) {
            this.createWireframe();
            if (this.wireframeMesh) {
                this.isWireframeVisible = true;
                (this.wireframeMesh as THREE.Object3D).visible = this.isWireframeVisible;
            }
        }
    }

    /**
     * Set wireframe visibility
     */
    public setVisibility(isVisible: boolean): void {
        if (this.wireframeMesh) {
            this.isWireframeVisible = isVisible;
            (this.wireframeMesh as THREE.Object3D).visible = this.isWireframeVisible;
        } else if (isVisible && !this.hasCreatedWireframe) {
            this.createWireframe();
            if (this.wireframeMesh) {
                this.isWireframeVisible = isVisible;
                (this.wireframeMesh as THREE.Object3D).visible = this.isWireframeVisible;
            }
        }
    }

    /**
     * Get current wireframe visibility
     */
    public getVisibility(): boolean {
        return this.isWireframeVisible;
    }

    /**
     * Update wireframe position to match visual mesh
     */
    public update(deltaTime: number): void {
        if (this.wireframeMesh) {
            const visualMesh = this.owner.getMesh();
            this.wireframeMesh.position.copy(visualMesh.position);
            this.wireframeMesh.quaternion.copy(visualMesh.quaternion);
        }
    }

    /**
     * Clean up wireframe resources
     */
    public cleanup(): void {
        if (this.wireframeMesh) {
            this.sceneContext.remove(this.wireframeMesh);
            this.wireframeMesh.geometry.dispose();
            if (this.wireframeMesh.material instanceof THREE.Material) {
                this.wireframeMesh.material.dispose();
            }
            this.wireframeMesh = null;
        }
    }
}
