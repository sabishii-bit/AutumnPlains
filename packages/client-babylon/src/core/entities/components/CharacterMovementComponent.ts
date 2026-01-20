import { Vector3, Scene } from '@babylonjs/core';
import { Component } from './Component';
import { InputManager } from '../../controls/InputManager';
import type { PhysicsComponent } from './PhysicsComponent';

/**
 * Component for character movement control
 * Handles camera-relative walking and jumping with physics
 */
export class CharacterMovementComponent extends Component {
    private moveSpeed: number = 6.5;
    private jumpHeight: number = 8.0;
    private isGrounded: boolean = false;
    private inputManager: InputManager;
    private cameraYRotation: number = 0; // Camera's Y rotation for movement direction
    private scene: Scene | null = null;

    constructor(moveSpeed: number = 6.5, jumpHeight: number = 8.0) {
        super();
        this.moveSpeed = moveSpeed;
        this.jumpHeight = jumpHeight;
        this.inputManager = InputManager.getInstance();
    }

    public onAttach(entity: any): void {
        super.onAttach(entity);
        // Get scene reference from entity when attached
        if (this.entity) {
            this.scene = this.entity.getTransformNode().getScene();
        }
    }

    public onUpdate(deltaTime: number): void {
        if (!this.entity || !this.scene) {
            console.warn('CharacterMovementComponent: entity or scene is null');
            return;
        }

        // Get physics component for physics-based movement
        const physicsComponent = this.entity.getComponent<PhysicsComponent>('physics');
        if (!physicsComponent) {
            console.warn('CharacterMovementComponent: physics COMPONENT is NULL');
            return;
        }

        const body = physicsComponent.getBody();
        if (!body) {
            console.warn('CharacterMovementComponent: physics BODY is NULL (aggregate may not be created yet)');
            return;
        }

        // Update mobile input manager with current camera rotation
        const mobileInputManager = this.inputManager.getMobileInputManager();
        if (mobileInputManager.isMobile()) {
            mobileInputManager.updateCameraYRotation(this.cameraYRotation);
        }

        // Update grounded state using raycasting
        this.updateGroundedState();

        // Get movement input
        const input = this.inputManager.getMovementInput();

        // Debug log movement input
        if (input.x !== 0 || input.z !== 0) {
            console.log('Movement input detected:', input, 'Camera rotation:', this.cameraYRotation);
        }

        // Calculate camera-relative movement direction
        const forward = new Vector3(
            Math.sin(this.cameraYRotation),
            0,
            Math.cos(this.cameraYRotation)
        );
        const right = new Vector3(
            Math.cos(this.cameraYRotation),
            0,
            -Math.sin(this.cameraYRotation)
        );

        // Combine forward/backward and left/right movement
        const moveDirection = forward.scale(input.z).add(right.scale(input.x));
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
        }

        // Get current velocity and preserve Y component (gravity)
        const currentVelocity = body.getLinearVelocity() || Vector3.Zero();

        // Set new velocity with movement
        const newVelocity = new Vector3(
            moveDirection.x * this.moveSpeed,
            currentVelocity.y, // Keep gravity/jump velocity
            moveDirection.z * this.moveSpeed
        );

        body.setLinearVelocity(newVelocity);

        // Handle jumping - only allow if grounded (raycast determines this)
        const jumpPressed = this.inputManager.isJumpPressed();

        if (jumpPressed && this.isGrounded) {
            console.log('Jumping! Grounded:', this.isGrounded);
            this.jump();
        }
    }

    /**
     * Update grounded state using simple height + velocity check
     * Character is grounded if close to ground level and not moving upward
     */
    private updateGroundedState(): void {
        if (!this.entity) return;

        // Get physics component to check velocity
        const physicsComponent = this.entity.getComponent<PhysicsComponent>('physics');
        if (!physicsComponent || !physicsComponent.getBody()) return;

        const body = physicsComponent.getBody()!;
        const position = 'getPosition' in this.entity && typeof (this.entity as any).getPosition === 'function'
            ? (this.entity as any).getPosition()
            : this.entity.getTransformNode().getAbsolutePosition();

        const velocity = body.getLinearVelocity();

        // Simple grounded check: Y position close to ground (1.0) AND velocity is near zero or downward
        // This works because physics keeps the player at Y=1.0 when on ground
        const groundLevel = 1.0;
        const threshold = 0.1;
        const isNearGround = Math.abs(position.y - groundLevel) < threshold;
        const isNotMovingUp = velocity.y <= 0.5;

        const wasGrounded = this.isGrounded;
        this.isGrounded = isNearGround && isNotMovingUp;

        // Debug log when grounded state changes
        if (wasGrounded !== this.isGrounded) {
            console.log('Grounded state changed:', this.isGrounded, 'Y:', position.y.toFixed(2), 'VelY:', velocity.y.toFixed(2));
        }
    }


    /**
     * Make the character jump
     */
    private jump(): void {
        const physicsComponent = this.entity?.getComponent<PhysicsComponent>('physics');
        if (!physicsComponent || !physicsComponent.getBody()) return;

        const body = physicsComponent.getBody()!;

        // Set upward velocity directly instead of using impulse
        // This is more reliable for jumping
        const currentVelocity = body.getLinearVelocity();
        const newVelocity = new Vector3(
            currentVelocity.x,
            this.jumpHeight, // Set Y velocity to jump height
            currentVelocity.z
        );
        body.setLinearVelocity(newVelocity);

        this.isGrounded = false; // We're airborne now
        console.log('Player jumped! New velocity Y:', newVelocity.y);
    }

    /**
     * Set camera Y rotation for camera-relative movement
     */
    public setCameraRotation(yRotation: number): void {
        this.cameraYRotation = yRotation;
    }

    /**
     * Set movement speed
     */
    public setMoveSpeed(speed: number): void {
        this.moveSpeed = speed;
    }

    /**
     * Set jump height
     */
    public setJumpHeight(height: number): void {
        this.jumpHeight = height;
    }

    /**
     * Set grounded state
     */
    public setGrounded(grounded: boolean): void {
        this.isGrounded = grounded;
    }

    /**
     * Get movement speed
     */
    public getMoveSpeed(): number {
        return this.moveSpeed;
    }

    /**
     * Get jump height
     */
    public getJumpHeight(): number {
        return this.jumpHeight;
    }

    /**
     * Get current velocity
     */
    public getVelocity(): Vector3 {
        const physicsComponent = this.entity?.getComponent<PhysicsComponent>('physics');
        if (!physicsComponent || !physicsComponent.getBody()) {
            return Vector3.Zero();
        }
        return physicsComponent.getBody()!.getLinearVelocity();
    }
}
