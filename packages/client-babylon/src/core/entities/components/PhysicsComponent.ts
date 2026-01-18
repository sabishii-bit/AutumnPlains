import { Vector3, PhysicsAggregate, PhysicsShapeType, AbstractMesh, PhysicsBody } from '@babylonjs/core';
import { Component } from './Component';

/**
 * Component for physics-based entities
 * Wraps Havok physics aggregate functionality
 */
export class PhysicsComponent extends Component {
    private aggregate: PhysicsAggregate | null = null;
    private body: PhysicsBody | null = null;
    private mesh: AbstractMesh | null = null;
    private mass: number;
    private restitution: number;
    private friction: number;

    constructor(mass: number = 1, restitution: number = 0.2, friction: number = 0.8) {
        super();
        this.mass = mass;
        this.restitution = restitution;
        this.friction = friction;
    }

    public onAttach(entity: any): void {
        super.onAttach(entity);
        // Physics aggregate will be created when setMesh is called
    }

    /**
     * Set the mesh and create physics aggregate
     */
    public setMesh(mesh: AbstractMesh, shapeType: PhysicsShapeType = PhysicsShapeType.BOX): void {
        this.mesh = mesh;

        if (this.mesh && this.entity) {
            const scene = this.entity.getScene();

            console.log('Creating physics aggregate for mesh:', mesh.name, 'shape:', shapeType);

            // Create physics aggregate (replaces impostor in new Babylon.js)
            this.aggregate = new PhysicsAggregate(
                mesh,
                shapeType,
                { mass: this.mass, restitution: this.restitution, friction: this.friction },
                scene
            );

            this.body = this.aggregate.body;
            console.log('Physics body created:', this.body ? 'SUCCESS' : 'FAILED');
        } else {
            console.warn('Cannot create physics: mesh or entity is null');
        }
    }

    /**
     * Apply impulse to the physics body
     */
    public applyImpulse(impulse: Vector3, contactPoint?: Vector3): void {
        if (this.body) {
            this.body.applyImpulse(impulse, contactPoint || this.mesh!.position);
        }
    }

    /**
     * Apply force to the physics body
     */
    public applyForce(force: Vector3, contactPoint?: Vector3): void {
        if (this.body) {
            this.body.applyForce(force, contactPoint || this.mesh!.position);
        }
    }

    /**
     * Set linear velocity
     */
    public setLinearVelocity(velocity: Vector3): void {
        if (this.body) {
            this.body.setLinearVelocity(velocity);
        }
    }

    /**
     * Get linear velocity
     */
    public getLinearVelocity(): Vector3 | null {
        if (this.body) {
            return this.body.getLinearVelocity();
        }
        return null;
    }

    /**
     * Set angular velocity
     */
    public setAngularVelocity(velocity: Vector3): void {
        if (this.body) {
            this.body.setAngularVelocity(velocity);
        }
    }

    /**
     * Get the physics body
     */
    public getBody(): PhysicsBody | null {
        return this.body;
    }

    /**
     * Get the physics aggregate
     */
    public getAggregate(): PhysicsAggregate | null {
        return this.aggregate;
    }

    /**
     * Set mass
     */
    public setMass(mass: number): void {
        this.mass = mass;
        if (this.body) {
            this.body.setMassProperties({ mass });
        }
    }

    public onDetach(): void {
        if (this.aggregate) {
            this.aggregate.dispose();
            this.aggregate = null;
            this.body = null;
        }
        super.onDetach();
    }
}
