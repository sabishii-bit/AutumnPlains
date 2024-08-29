import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import GameObject from '../GameObject';
import { CharacterState } from './character_state/CharacterState';
import StateManager from './character_state/StateManager';
import { GameObjectManager } from '../../GameObjectManager';
import { CharacterAirborneState } from './character_state/CharacterAirborneState';
import { CharacterDeceleratingState } from './character_state/CharacterDeceleratingState';

export abstract class BaseCharacter extends GameObject {
    // Constants for easy adjustment
    private static readonly SCALE_FACTOR = 0.25;
    private static readonly RADIUS = 2 * BaseCharacter.SCALE_FACTOR;
    private static readonly HALF_LENGTH = 4 * BaseCharacter.SCALE_FACTOR;
    private static readonly VISUAL_MESH_COLOR = 0xff0000;
    private static readonly VISUAL_MESH_VISIBLE = false;
    
    public jumpHeight!: number;
    public moveSpeed!: number;
    public direction!: THREE.Vector3;
    private currentState!: CharacterState;
    public canJump!: boolean;
    private characterMaterial: CANNON.Material;

    private headBody!: CANNON.Body;
    private feetBody!: CANNON.Body;

    constructor(initialPosition: THREE.Vector3) { 
        super(initialPosition);
        
        // Configure the character material with higher friction and lower restitution
        this.characterMaterial = new CANNON.Material('characterMaterial');
        this.characterMaterial.friction = 10.5; // Increase friction to reduce rolling
        this.characterMaterial.restitution = 0; // Reduce restitution to decrease bounce
        
        StateManager.decideState(this);
    }

    protected createVisualMesh() {
        const radius = BaseCharacter.RADIUS;
        const halfLength = BaseCharacter.HALF_LENGTH;
    
        // Create the cylinder geometry for the main body of the capsule
        const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, halfLength * 2, 16);
        const cylinderMaterial = new THREE.MeshBasicMaterial({ color: BaseCharacter.VISUAL_MESH_COLOR });
        const cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    
        // Create the top sphere geometry
        const sphereTopGeometry = new THREE.SphereGeometry(radius, 16, 16);
        const sphereTopMesh = new THREE.Mesh(sphereTopGeometry, cylinderMaterial);
        sphereTopMesh.position.set(0, halfLength, 0);
    
        // Create the bottom sphere geometry
        const sphereBottomGeometry = new THREE.SphereGeometry(radius, 16, 16);
        const sphereBottomMesh = new THREE.Mesh(sphereBottomGeometry, cylinderMaterial);
        sphereBottomMesh.position.set(0, -halfLength, 0);
    
        // Combine the cylinder and spheres into a single object
        this.visualMesh = new THREE.Group();
        this.visualMesh.add(cylinderMesh);
        this.visualMesh.add(sphereTopMesh);
        this.visualMesh.add(sphereBottomMesh);
    
        // Set the visibility based on the static constant
        this.visualMesh.visible = BaseCharacter.VISUAL_MESH_VISIBLE;
    
        // Add the visual mesh to the scene
        this.sceneContext.add(this.visualMesh);
    }
    
    protected createCollisionMesh() {
        if (!this.collisionMesh) {
            const radius = BaseCharacter.RADIUS;
            const halfLength = BaseCharacter.HALF_LENGTH;

            // Create the main body of the capsule (cylinder)
            const cylinder = new CANNON.Cylinder(radius, radius, halfLength * 2, 16);
            const cylinderQuaternion = new CANNON.Quaternion();
            cylinderQuaternion.setFromEuler(0, 0, Math.PI / 2); // Rotate the cylinder to align with the visual mesh

            // Initialize the main collision body
            this.collisionMesh = new CANNON.Body({
                mass: 7,
                position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z),
                linearDamping: 0.9,
                angularDamping: 1,  // Increase angular damping to reduce rotation
                material: this.characterMaterial, // Apply the material with adjusted friction and restitution
            });

            // Add the cylinder shape to the main body
            this.collisionMesh.addShape(cylinder, new CANNON.Vec3(0, 0, 0), cylinderQuaternion);

            // Create the top and bottom spheres as separate bodies
            this.headBody = new CANNON.Body({
                mass: 0.1, // Give it a small mass so it moves with the main body
                position: new CANNON.Vec3(this.position.x, this.position.y + halfLength, this.position.z),
                shape: new CANNON.Sphere(radius),
                angularDamping: 1, // Increase angular damping to reduce rotation
                material: this.characterMaterial, // Apply the material with adjusted friction and restitution
            });

            this.feetBody = new CANNON.Body({
                mass: 0.1, // Give it a small mass so it moves with the main body
                position: new CANNON.Vec3(this.position.x, this.position.y - halfLength, this.position.z),
                shape: new CANNON.Sphere(radius),
                angularDamping: 1, // Increase angular damping to reduce rotation
                material: this.characterMaterial, // Apply the material with adjusted friction and restitution
            });

            // Lock angular motion around X and Z axes to prevent rolling
            this.feetBody.angularFactor.set(0, 1, 0);
            this.headBody.angularFactor.set(0, 1, 0);

            // Add the collision bodies to the world
            this.worldContext.addBody(this.collisionMesh);
            this.worldContext.addBody(this.headBody);
            this.worldContext.addBody(this.feetBody);

            // Use PointToPointConstraints to connect head and feet to the main body
            const headConstraint = new CANNON.PointToPointConstraint(
                this.collisionMesh,
                new CANNON.Vec3(0, halfLength, 0),
                this.headBody,
                new CANNON.Vec3(0, 0, 0)
            );

            const feetConstraint = new CANNON.PointToPointConstraint(
                this.collisionMesh,
                new CANNON.Vec3(0, -halfLength, 0),
                this.feetBody,
                new CANNON.Vec3(0, 0, 0)
            );

            // Add constraints to the world
            this.worldContext.addConstraint(headConstraint);
            this.worldContext.addConstraint(feetConstraint);

            // Event listeners for head and feet collisions
            this.headBody.addEventListener('collide', (event: any) => this.handleHeadCollision(event));
            this.feetBody.addEventListener('collide', (event: any) => this.handleFeetCollision(event));
        }
    }

    private handleHeadCollision(event: any) {
        if (event.body !== this.collisionMesh && event.body !== this.feetBody) {
            console.log('Head collision detected with external object.');
            // Implement custom logic for head collision (e.g., double damage)
        }
    }

    private handleFeetCollision(event: any) {
        if (event.body !== this.collisionMesh && event.body !== this.headBody) {
            console.log('Feet collision detected with external object.');
        }
    }
    

    public abstract updatePosition(deltaTime: number, inputVector: THREE.Vector3): void;
    public abstract jump(): void;

    public animate(deltaTime: number): void {
        // Custom animation logic for the player character, if any
        StateManager.decideState(this);
    
        // Sync the visual mesh with the physics body
        if (this.collisionMesh) {
            this.visualMesh.position.set(
                this.collisionMesh.position.x,
                this.collisionMesh.position.y,
                this.collisionMesh.position.z
            );

            this.visualMesh.quaternion.set(
                this.collisionMesh.quaternion.x,
                this.collisionMesh.quaternion.y,
                this.collisionMesh.quaternion.z,
                this.collisionMesh.quaternion.w
            );
        }
    }

    public getCurrentState(): CharacterState {
        return this.currentState;
    }

    public setState(newState: CharacterState): void {
        this.currentState = newState;
    }

    public getScaleFactor(): number {
        return BaseCharacter.SCALE_FACTOR;
    }
}
