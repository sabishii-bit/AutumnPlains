import { Vector3, Ray, Scene } from '@babylonjs/core';
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
    private groundRayLength: number = 1.2; // Length of ground detection raycast
    private groundCheckOffset: number = 0.5; // Offset from center for raycasts

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

        // Handle jumping
        const jumpPressed = this.inputManager.isJumpPressed();
        if (jumpPressed) {
            console.log('Jump pressed! Grounded:', this.isGrounded);
        }
        if (jumpPressed && this.isGrounded) {
            this.jump();
        }
    }

    /**
     * Update grounded state using raycasting
     * Uses multiple raycasts around the character position for better detection
     */
    private updateGroundedState(): void {
        if (!this.entity || !this.scene) return;

        // Get position from the actual player (mesh position, not transform node)
        const position = this.entity.getPosition();

        // Check center and 4 points around the character (following best practices)
        const checkPositions = [
            { x: 0, z: 0 },                                  // Center
            { x: this.groundCheckOffset, z: 0 },             // Right
            { x: -this.groundCheckOffset, z: 0 },            // Left
            { x: 0, z: this.groundCheckOffset },             // Forward
            { x: 0, z: -this.groundCheckOffset }             // Back
        ];

        // Character is grounded if any raycast hits ground
        const wasGrounded = this.isGrounded;
        this.isGrounded = false;

        for (const offset of checkPositions) {
            if (this.checkGroundAtPosition(position.x + offset.x, position.z + offset.z)) {
                this.isGrounded = true;
                break;
            }
        }

        // Debug log when grounded state changes
        if (wasGrounded !== this.isGrounded) {
            console.log('Grounded state changed:', this.isGrounded, 'Position Y:', position.y);
        }
    }

    /**
     * Check if ground exists at a specific position using raycast
     * Following Babylon.js best practice: raycast from slightly above the character
     */
    private checkGroundAtPosition(x: number, z: number): boolean {
        if (!this.scene || !this.entity) return false;

        const position = this.entity.getPosition();

        // Start raycast from slightly above the character (Y + 0.5)
        const rayStart = new Vector3(x, position.y + 0.5, z);

        // Cast ray downward
        const rayDirection = Vector3.Down();
        const ray = new Ray(rayStart, rayDirection, this.groundRayLength);

        // Only check pickable and enabled meshes
        const predicate = (mesh: any) => {
            return mesh.isPickable && mesh.isEnabled();
        };

        const pickInfo = this.scene.pickWithRay(ray, predicate);

        return pickInfo?.hit || false;
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
}
