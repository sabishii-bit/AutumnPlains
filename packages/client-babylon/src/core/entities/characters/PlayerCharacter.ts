import { Vector3, Color3, PhysicsShapeType, Quaternion } from '@babylonjs/core';
import { Entity } from '../Entity';
import { MeshComponent } from '../components/MeshComponent';
import { PhysicsComponent } from '../components/PhysicsComponent';
import { CharacterMovementComponent } from '../components/CharacterMovementComponent';
import type { Scene } from '@babylonjs/core';

/**
 * Player character entity with physics and movement
 * Combines mesh, physics, and movement components
 */
export class PlayerCharacter extends Entity {
    private meshComponent: MeshComponent;
    private physicsComponent: PhysicsComponent;
    private movementComponent: CharacterMovementComponent;

    constructor(scene: Scene, position: Vector3 = new Vector3(0, 5, 0)) {
        super(scene, 'PlayerCharacter');

        // Add mesh component (box for character)
        this.meshComponent = this.addComponent('mesh', new MeshComponent());
        this.meshComponent.createBox(new Vector3(1, 2, 1), new Color3(1, 1, 1)); // White box (1x2x1 - width, height, depth)

        // Set mesh position BEFORE creating physics (physics uses mesh position at creation time)
        const mesh = this.meshComponent.getMesh();
        if (mesh) {
            mesh.position = position.clone();
            // Make the player mesh invisible (player shouldn't see their own capsule)
            mesh.isVisible = false;
            console.log('PlayerCharacter: mesh position set to', mesh.position);
        }

        // Add physics component with box shape
        this.physicsComponent = this.addComponent('physics', new PhysicsComponent(70, 0.2, 0.8));
        console.log('PlayerCharacter: mesh exists?', !!mesh);
        console.log('PlayerCharacter: scene has physics?', scene.getPhysicsEngine() !== null);
        if (mesh) {
            this.physicsComponent.setMesh(mesh as any, PhysicsShapeType.BOX);

            // Lock rotation on X and Z axes to prevent character from tipping over
            const body = this.physicsComponent.getBody();
            console.log('PlayerCharacter: physics body after setMesh?', !!body);
            if (body) {
                body.setAngularVelocity(Vector3.Zero());
                body.setMassProperties({ inertia: Vector3.Zero() }); // Disable rotation
                console.log('PlayerCharacter: rotation locked successfully');
            } else {
                console.error('PlayerCharacter: FAILED to create physics body!');
            }
        }

        // Add movement component
        this.movementComponent = this.addComponent('movement', new CharacterMovementComponent(6.5, 8.0));

        console.log('PlayerCharacter created at position:', position);
        console.log('PlayerCharacter actual mesh position:', mesh?.position);
    }

    /**
     * Get current position (from physics body if available, otherwise transform)
     */
    public getPosition(): Vector3 {
        // When using physics, get position from the mesh (which physics controls)
        const mesh = this.meshComponent.getMesh();
        if (mesh) {
            // Use getAbsolutePosition() to get world position (mesh is parented to TransformNode)
            return mesh.getAbsolutePosition();
        }
        return this.getTransformNode().position;
    }

    /**
     * Set position (sets both transform and physics body if available)
     */
    public setPosition(position: Vector3): void {
        const mesh = this.meshComponent.getMesh();
        if (mesh) {
            mesh.position = position;
        }
        this.getTransformNode().position = position;

        // Also update physics body if it exists
        const body = this.physicsComponent.getBody();
        if (body && mesh) {
            const rotation = mesh.rotationQuaternion || Quaternion.Identity();
            body.setTargetTransform(position, rotation);
        }
    }

    /**
     * Get movement component
     */
    public getMovementComponent(): CharacterMovementComponent {
        return this.movementComponent;
    }

    /**
     * Get physics component
     */
    public getPhysicsComponent(): PhysicsComponent {
        return this.physicsComponent;
    }
}
