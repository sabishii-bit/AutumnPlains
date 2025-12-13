import * as THREE from 'three';
import GameObject, { GameObjectOptions, AmmoBodyOptions } from '../GameObject';
import { CharacterState } from './character_state/CharacterState';
import StateManager from './character_state/StateManager';
import { GameObjectManager } from '../../GameObjectManager';
import { CharacterAirborneState } from './character_state/CharacterAirborneState';
import { CharacterJumpingState } from './character_state/CharacterJumpingState';
import { MaterialType } from '../../../physics/PhysicsMaterialsManager';
import { WorldContext } from '../../../global/world/WorldContext';
import { AmmoUtils } from '../../../physics/AmmoUtils';
import { GroundDetectionComponent } from '../../components/GroundDetectionComponent';
import { CharacterMovementComponent } from '../../components/CharacterMovementComponent';
import { UprightConstraintComponent } from '../../components/UprightConstraintComponent';
import { PhysicsSyncComponent } from '../../components/PhysicsSyncComponent';
import { WireframeComponent } from '../../components/WireframeComponent';
import { PhysicsForceComponent } from '../../components/PhysicsForceComponent';

export abstract class BaseCharacter extends GameObject {
    // Constants for easy adjustment
    private static readonly SCALE_FACTOR = 0.25;
    private static readonly RADIUS = 2 * BaseCharacter.SCALE_FACTOR;
    private static readonly HALF_LENGTH = 4 * BaseCharacter.SCALE_FACTOR;
    private static readonly HEAD_SCALE_FACTOR = 1.5;
    private static readonly FEET_SCALE_FACTOR = 0.5;
    private static readonly VISUAL_MESH_COLOR = 0xff0000;
    private static readonly VISUAL_MESH_VISIBLE = false;
    private static readonly DEFAULT_JUMP_HEIGHT = 1;
    private static readonly JUMP_FORCE_MULTIPLIER = 1;

    public jumpHeight: number;
    public moveSpeed!: number;
    public direction!: THREE.Vector3;
    private currentState!: CharacterState;
    private previousYVelocity: number = 0;
    private collisionDebugEnabled: boolean = true;
    private mainBodyTransform!: any;

    constructor(initialPosition: THREE.Vector3) {
        super({
            position: initialPosition,
            materialType: MaterialType.CHARACTER
        });

        // Initialize jump height with default value
        this.jumpHeight = BaseCharacter.DEFAULT_JUMP_HEIGHT;

        // Add components
        this.addComponent('physicsSync', new PhysicsSyncComponent());
        this.addComponent('wireframe', new WireframeComponent());
        this.addComponent('physicsForce', new PhysicsForceComponent());
        this.addComponent('groundDetection', new GroundDetectionComponent());
        this.addComponent('characterMovement', new CharacterMovementComponent());
        this.addComponent('uprightConstraint', new UprightConstraintComponent());

        // Configure ground detection component
        const groundDetection = this.getComponent<GroundDetectionComponent>('groundDetection');
        if (groundDetection) {
            groundDetection.setHalfHeight(BaseCharacter.HALF_LENGTH);
        }

        // Configure movement component
        const movement = this.getComponent<CharacterMovementComponent>('characterMovement');
        if (movement) {
            movement.setJumpHeight(this.jumpHeight);
            movement.setMoveSpeed(this.moveSpeed || 5);
        }

        // Set the initial state as airborne
        this.setState(new CharacterAirborneState(this));
        StateManager.decideState(this);
    }

    protected createVisualMesh() {
        const radius = BaseCharacter.RADIUS;
        const halfLength = BaseCharacter.HALF_LENGTH;

        const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, halfLength * 2, 16);
        const cylinderMaterial = new THREE.MeshBasicMaterial({ color: BaseCharacter.VISUAL_MESH_COLOR });
        const cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

        const sphereTopGeometry = new THREE.SphereGeometry(radius * BaseCharacter.HEAD_SCALE_FACTOR, 16, 16);
        const sphereTopMesh = new THREE.Mesh(sphereTopGeometry, cylinderMaterial);
        sphereTopMesh.position.set(0, halfLength, 0);

        const sphereBottomGeometry = new THREE.SphereGeometry(radius * BaseCharacter.FEET_SCALE_FACTOR, 16, 16);
        const sphereBottomMesh = new THREE.Mesh(sphereBottomGeometry, cylinderMaterial);
        sphereBottomMesh.position.set(0, -halfLength, 0);

        this.visualMesh = new THREE.Group();
        this.visualMesh.add(cylinderMesh);
        this.visualMesh.add(sphereTopMesh);
        this.visualMesh.add(sphereBottomMesh);

        this.visualMesh.visible = BaseCharacter.VISUAL_MESH_VISIBLE;
    }

    protected createCollisionMesh() {
        if (!this.collisionMesh) {
            try {
                const Ammo = WorldContext.getAmmo();
                const radius = BaseCharacter.RADIUS;
                const halfLength = BaseCharacter.HALF_LENGTH;

                const transform = new Ammo.btTransform();
                transform.setIdentity();
                transform.setOrigin(new Ammo.btVector3(this.position.x, this.position.y, this.position.z));

                this.mainBodyTransform = new Ammo.btTransform();
                this.mainBodyTransform.setIdentity();

                const motionState = new Ammo.btDefaultMotionState(transform);
                const capsuleShape = new Ammo.btCapsuleShape(radius, halfLength * 2);

                const mass = 7;
                const localInertia = new Ammo.btVector3(0, 0, 0);
                capsuleShape.calculateLocalInertia(mass, localInertia);

                const rbInfo = new Ammo.btRigidBodyConstructionInfo(
                    mass,
                    motionState,
                    capsuleShape,
                    localInertia
                );

                this.collisionMesh = new Ammo.btRigidBody(rbInfo);
                this.collisionMesh.setDamping(0.1, 0.5);

                this.collisionMesh.setAngularFactor(new Ammo.btVector3(0, 1, 0));
                this.collisionMesh.setActivationState(4); // DISABLE_DEACTIVATION

                this.physicsManager.applyMaterialToBody(this.collisionMesh, MaterialType.CHARACTER);

                this.worldContext.addRigidBody(this.collisionMesh);
                this.collisionMesh.activate(true);
                this.collisionMesh.setFlags(0);

                Ammo.destroy(rbInfo);
                Ammo.destroy(transform);
                Ammo.destroy(localInertia);

                console.log("Character physics initialized successfully at position", this.position);

                const gravity = WorldContext.getGravity();
                console.log("Physics world gravity:", gravity.y);
            } catch (error) {
                console.error("Error creating character collision mesh:", error);
            }
        }
    }

    public updatePosition(deltaTime: number, inputVector: THREE.Vector3): void {
        const movement = this.getComponent<CharacterMovementComponent>('characterMovement');
        if (movement) {
            movement.updatePosition(deltaTime, inputVector);
        }
    }

    public jump() {
        const movement = this.getComponent<CharacterMovementComponent>('characterMovement');
        if (movement) {
            movement.jump();
            this.setState(new CharacterJumpingState(this));
        }
    }

    public setVelocity(options: { x?: number; y?: number; z?: number } = {}): void {
        const movement = this.getComponent<CharacterMovementComponent>('characterMovement');
        if (movement) {
            movement.setVelocity(options);
        }
    }

    public setAcceleration(options: { x?: number; y?: number; z?: number } = {}): void {
        const movement = this.getComponent<CharacterMovementComponent>('characterMovement');
        if (movement) {
            movement.setAcceleration(options);
        }
    }

    public isAtPointOfInflection(): boolean {
        if (!this.collisionMesh) return false;

        const threshold = 0.1;
        const velocity = this.collisionMesh.getLinearVelocity();
        const currentYVelocity = velocity.y();

        const atInflection = this.previousYVelocity > threshold && currentYVelocity <= threshold;
        this.previousYVelocity = currentYVelocity;
        return atInflection;
    }

    public hasLandedRecently(threshold: number = 10): boolean {
        const groundDetection = this.getComponent<GroundDetectionComponent>('groundDetection');
        if (groundDetection) {
            return groundDetection.hasLandedRecently(threshold);
        }
        return false;
    }

    public isGrounded(extendedDistance: number = 0): boolean {
        const groundDetection = this.getComponent<GroundDetectionComponent>('groundDetection');
        if (groundDetection) {
            return groundDetection.isGrounded(extendedDistance);
        }
        return false;
    }

    public animate(deltaTime: number): void {
        StateManager.executeState(this);
        StateManager.decideState(this);
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

    public getHeadScaleFactor(): number {
        return BaseCharacter.HEAD_SCALE_FACTOR;
    }

    public getFeetScaleFactor(): number {
        return BaseCharacter.FEET_SCALE_FACTOR;
    }

    public getFeetHeight(): number {
        return BaseCharacter.FEET_SCALE_FACTOR * BaseCharacter.SCALE_FACTOR;
    }

    public setJumpHeight(height: number): void {
        this.jumpHeight = height;
        const movement = this.getComponent<CharacterMovementComponent>('characterMovement');
        if (movement) {
            movement.setJumpHeight(height);
        }
        if (this.collisionDebugEnabled) {
            console.log(`Jump height set to: ${height}`);
        }
    }

    public adjustJumpHeight(amount: number): void {
        this.jumpHeight += amount;
        if (this.jumpHeight < 0) {
            this.jumpHeight = 0;
        }
        const movement = this.getComponent<CharacterMovementComponent>('characterMovement');
        if (movement) {
            movement.setJumpHeight(this.jumpHeight);
        }
        if (this.collisionDebugEnabled) {
            console.log(`Jump height adjusted to: ${this.jumpHeight}`);
        }
    }

    public resetJumpHeight(): void {
        this.jumpHeight = BaseCharacter.DEFAULT_JUMP_HEIGHT;
        const movement = this.getComponent<CharacterMovementComponent>('characterMovement');
        if (movement) {
            movement.setJumpHeight(this.jumpHeight);
        }
    }

    public getJumpHeight(): number {
        return this.jumpHeight;
    }

    public getJumpForceMultiplier(): number {
        return BaseCharacter.JUMP_FORCE_MULTIPLIER;
    }

    /**
     * Get collision body data (for legacy compatibility)
     * @deprecated Use getPhysicsBody() instead to get the actual Ammo rigid body
     */
    public getCollisionBodyData(): { position: THREE.Vector3, velocity: THREE.Vector3 } {
        const position = new THREE.Vector3(this.position.x, this.position.y, this.position.z);
        const velocity = new THREE.Vector3();

        if (this.collisionMesh) {
            try {
                const Ammo = WorldContext.getAmmo();

                if (!this.mainBodyTransform) {
                    this.mainBodyTransform = new Ammo.btTransform();
                    this.mainBodyTransform.setIdentity();
                }

                const transform = this.mainBodyTransform;

                if (this.collisionMesh.getMotionState()) {
                    this.collisionMesh.getMotionState().getWorldTransform(transform);
                    const ammoPos = transform.getOrigin();
                    position.set(ammoPos.x(), ammoPos.y(), ammoPos.z());

                    const ammoVel = this.collisionMesh.getLinearVelocity();
                    velocity.set(ammoVel.x(), ammoVel.y(), ammoVel.z());
                } else {
                    console.warn("Physics body doesn't have a valid motion state yet");
                }
            } catch (error) {
                console.error('Error getting collision body data:', error);
            }
        }

        return {
            position: position,
            velocity: velocity
        };
    }

    public cleanup(): void {
        GameObjectManager.getInstance().deleteObject(this.objectId);
    }

    public testGravity(): void {
        if (!this.collisionMesh) return;

        try {
            const Ammo = WorldContext.getAmmo();

            const zeroVel = new Ammo.btVector3(0, 0, 0);
            this.collisionMesh.setLinearVelocity(zeroVel);
            Ammo.destroy(zeroVel);

            const gravity = WorldContext.getGravity();
            console.log("Testing character with world gravity:", gravity);

            const testVel = new Ammo.btVector3(0, 2, 0);
            this.collisionMesh.setLinearVelocity(testVel);
            Ammo.destroy(testVel);

            this.setState(new CharacterAirborneState(this));

            console.log("Gravity test initiated - character should now fall with gravity:", gravity.y);
        } catch (error) {
            console.error("Error testing gravity:", error);
        }
    }
}
