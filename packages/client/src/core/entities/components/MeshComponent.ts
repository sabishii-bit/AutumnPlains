import { AbstractMesh, Mesh, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';
import { Component } from './Component';

/**
 * Component for visual mesh representation
 * Handles mesh creation and material management
 */
export class MeshComponent extends Component {
    private mesh: AbstractMesh | null = null;
    private material: StandardMaterial | null = null;

    public onAttach(entity: any): void {
        super.onAttach(entity);
    }

    /**
     * Create a box mesh
     * @param size Either a number (uniform size) or Vector3 (width, height, depth)
     */
    public createBox(size: number | { width: number; height: number; depth: number } | import('@babylonjs/core').Vector3 = 1, color?: Color3): void {
        if (!this.entity) return;

        const scene = this.entity.getScene();
        const transformNode = this.entity.getTransformNode();

        if (typeof size === 'number') {
            this.mesh = MeshBuilder.CreateBox('box', { size }, scene);
        } else if ('x' in size) {
            // Vector3 passed
            this.mesh = MeshBuilder.CreateBox('box', { width: size.x, height: size.y, depth: size.z }, scene);
        } else {
            // Object with width/height/depth
            this.mesh = MeshBuilder.CreateBox('box', size, scene);
        }

        this.mesh.parent = transformNode;

        if (color) {
            this.setColor(color);
        }
    }

    /**
     * Create a sphere mesh
     */
    public createSphere(diameter: number = 1, color?: Color3): void {
        if (!this.entity) return;

        const scene = this.entity.getScene();
        const transformNode = this.entity.getTransformNode();

        this.mesh = MeshBuilder.CreateSphere('sphere', { diameter }, scene);
        this.mesh.parent = transformNode;

        if (color) {
            this.setColor(color);
        }
    }

    /**
     * Create a capsule mesh
     */
    public createCapsule(height: number = 2, radius: number = 0.5, color?: Color3): void {
        console.log('MeshComponent.createCapsule: entity exists?', !!this.entity);
        if (!this.entity) {
            console.error('MeshComponent.createCapsule: entity is NULL, cannot create mesh!');
            return;
        }

        const scene = this.entity.getScene();
        const transformNode = this.entity.getTransformNode();

        this.mesh = MeshBuilder.CreateCapsule('capsule', {
            height,
            radius
        }, scene);
        this.mesh.parent = transformNode;
        console.log('MeshComponent.createCapsule: mesh created successfully', this.mesh.name);

        if (color) {
            this.setColor(color);
        }
    }

    /**
     * Set mesh color
     */
    public setColor(color: Color3): void {
        if (!this.mesh) return;

        const scene = this.entity!.getScene();

        if (!this.material) {
            this.material = new StandardMaterial('material', scene);
            this.mesh.material = this.material;
        }

        this.material.diffuseColor = color;
    }

    /**
     * Get the mesh
     */
    public getMesh(): AbstractMesh | null {
        return this.mesh;
    }

    /**
     * Set visibility
     */
    public setVisible(visible: boolean): void {
        if (this.mesh) {
            this.mesh.isVisible = visible;
        }
    }

    public onDetach(): void {
        if (this.material) {
            this.material.dispose();
            this.material = null;
        }
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = null;
        }
        super.onDetach();
    }
}
