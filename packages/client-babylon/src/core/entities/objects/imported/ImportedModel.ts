import { Scene, Vector3, InstantiatedEntries, AbstractMesh, PhysicsShapeType, PhysicsBody, PhysicsMotionType, PhysicsAggregate } from '@babylonjs/core';
import { Entity } from '../../Entity';
import { ModelLoaderService } from '../../../services/ModelLoaderService';

export interface ImportedModelOptions {
    /** Position to place the model */
    position?: Vector3;
    /** Scale to apply to the model */
    scale?: Vector3;
    /** Rotation in radians (x, y, z) */
    rotation?: Vector3;
    /** Whether to enable shadows */
    enableShadows?: boolean;
    /** Whether to enable physics collision */
    enablePhysics?: boolean;
    /** Physics mass (0 = static, >0 = dynamic) */
    physicsMass?: number;
    /** Physics friction */
    physicsFriction?: number;
    /** Physics restitution (bounciness) */
    physicsRestitution?: number;
    /** Custom name for this instance */
    name?: string;
}

/**
 * Base class for imported 3D models
 * Wraps Babylon.js InstantiatedEntries with optional physics support
 */
export abstract class ImportedModel extends Entity {
    protected modelPath: string;
    protected modelLoader: ModelLoaderService;
    protected instantiatedEntries: InstantiatedEntries | null = null;
    protected options: ImportedModelOptions;
    protected physicsBodies: PhysicsBody[] = [];

    constructor(scene: Scene, modelPath: string, options: ImportedModelOptions = {}) {
        super(scene, options.name || 'ImportedModel');

        this.modelPath = modelPath;
        this.modelLoader = new ModelLoaderService(scene);
        this.options = {
            position: Vector3.Zero(),
            scale: new Vector3(1, 1, 1),
            rotation: Vector3.Zero(),
            enableShadows: true,
            enablePhysics: false,
            physicsMass: 0,
            physicsFriction: 0.5,
            physicsRestitution: 0.2,
            ...options
        };
    }

    /**
     * Load and instantiate the model
     * Must be called after construction (async initialization)
     */
    public async loadAsync(): Promise<void> {
        try {
            // Load and instantiate the model
            this.instantiatedEntries = await this.modelLoader.loadAndInstantiateAsync(
                this.modelPath,
                {
                    position: this.options.position,
                    scale: this.options.scale,
                    rotation: this.options.rotation,
                    enableShadows: this.options.enableShadows,
                    namePrefix: this.entityName
                }
            );

            if (!this.instantiatedEntries) {
                throw new Error(`Failed to instantiate model: ${this.modelPath}`);
            }

            // Parent all root nodes to this entity's transform
            this.instantiatedEntries.rootNodes.forEach(node => {
                node.parent = this.getTransformNode();
            });

            // Setup physics if enabled
            if (this.options.enablePhysics) {
                await this.setupPhysics();
            }

            console.log(`[ImportedModel] Loaded model: ${this.modelPath}`);
        } catch (error) {
            console.error(`[ImportedModel] Failed to load model ${this.modelPath}:`, error);
            throw error;
        }
    }

    /**
     * Setup physics for the model
     * Creates physics bodies for all meshes
     */
    protected async setupPhysics(): Promise<void> {
        if (!this.instantiatedEntries) return;

        const meshes = this.getAllMeshes();
        const mass = this.options.physicsMass ?? 0;
        const friction = this.options.physicsFriction ?? 0.5;
        const restitution = this.options.physicsRestitution ?? 0.2;

        for (const mesh of meshes) {
            // Get physics shape type
            const shapeType = this.createPhysicsShape(mesh);

            // Use PhysicsAggregate for simpler physics setup (works with Havok)
            const aggregate = new PhysicsAggregate(
                mesh,
                shapeType.type,
                { mass, friction, restitution },
                this.scene
            );

            // Store the body for later disposal
            this.physicsBodies.push(aggregate.body);
        }

        console.log(`[ImportedModel] Created ${this.physicsBodies.length} physics bodies`);
    }

    /**
     * Create a physics shape for a mesh
     * Default implementation uses box shape
     * Override in subclasses for custom shapes (mesh, convex hull, etc.)
     */
    protected createPhysicsShape(mesh: AbstractMesh): any {
        // Use box shape by default (most performant)
        return { type: PhysicsShapeType.BOX };
    }

    /**
     * Get all meshes from the instantiated model
     */
    protected getAllMeshes(): AbstractMesh[] {
        if (!this.instantiatedEntries) return [];

        const meshes: AbstractMesh[] = [];
        this.instantiatedEntries.rootNodes.forEach(node => {
            meshes.push(...node.getChildMeshes());
        });

        return meshes;
    }

    /**
     * Get the root nodes of the instantiated model
     */
    public getRootNodes() {
        return this.instantiatedEntries?.rootNodes || [];
    }

    /**
     * Get the instantiated entries
     */
    public getInstantiatedEntries(): InstantiatedEntries | null {
        return this.instantiatedEntries;
    }

    /**
     * Set the position of the model
     */
    public setPosition(position: Vector3): void {
        this.getTransformNode().position = position.clone();
    }

    /**
     * Get the position of the model
     */
    public getPosition(): Vector3 {
        return this.getTransformNode().position;
    }

    /**
     * Set the rotation of the model
     */
    public setRotation(rotation: Vector3): void {
        this.getTransformNode().rotation = rotation.clone();
    }

    /**
     * Set the scale of the model
     */
    public setScale(scale: Vector3): void {
        this.getTransformNode().scaling = scale.clone();
    }

    /**
     * Dispose the model and free resources
     */
    public dispose(): void {
        // Dispose physics bodies
        this.physicsBodies.forEach(body => {
            body.dispose();
        });
        this.physicsBodies = [];

        // Dispose instantiated entries
        if (this.instantiatedEntries) {
            this.instantiatedEntries.rootNodes.forEach(node => {
                node.dispose();
            });
            this.instantiatedEntries = null;
        }

        super.dispose();
    }
}
