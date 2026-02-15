import { Vector3, Color3, Scene, Sprite, SpriteManager, Texture, Quaternion } from '@babylonjs/core';
import { Entity } from '../Entity';
import { MeshComponent } from '../components/MeshComponent';

/**
 * RemotePlayer - Represents other players in the game world
 * Simplified representation without physics (server authoritative)
 */
export class RemotePlayer extends Entity {
    private static instanceCount = 0;
    private static spriteManager: SpriteManager | null = null;

    private meshComponent: MeshComponent;
    private playerId: string = '';
    private nameSprite: Sprite | null = null;
    private scene: Scene;

    // Visual configuration
    private readonly REMOTE_PLAYER_COLOR = new Color3(1, 1, 1); // White color

    // Interpolation for smooth movement
    private targetPosition: Vector3 | null = null;
    private targetRotation: Quaternion | null = null;
    private interpolationSpeed: number = 15; // Higher = faster interpolation (good for 50ms updates)

    constructor(scene: Scene, playerId: string, position: Vector3 = new Vector3(0, 2, 0)) {
        super(scene, `RemotePlayer_${RemotePlayer.instanceCount++}`);

        this.scene = scene;
        this.playerId = playerId;

        // Create visual mesh (1x2x1 box matching the old client)
        this.meshComponent = this.addComponent('mesh', new MeshComponent());
        this.meshComponent.createBox(new Vector3(1, 2, 1), this.REMOTE_PLAYER_COLOR);

        // Set initial position
        // Network sends physics body position (y=1), but visual mesh needs to be at y=2
        // Local player has this same 1-unit offset between physics and visual
        const mesh = this.meshComponent.getMesh();
        if (mesh) {
            const visualPos = position.clone();
            visualPos.y += 1; // Match local player's visual offset
            mesh.position = visualPos;
        }

        // Create name tag
        this.createNameTag();

        console.log(`RemotePlayer created: ${playerId} at`, position);
    }

    /**
     * Initialize sprite manager (called once for all remote players)
     */
    private static initializeSpriteManager(scene: Scene): void {
        if (!RemotePlayer.spriteManager) {
            // Create a simple white texture for the name tag background
            RemotePlayer.spriteManager = new SpriteManager(
                'remotePlayerNameTags',
                '', // No texture needed, we'll create dynamic textures
                100, // Max number of sprites
                { width: 256, height: 64 },
                scene
            );
        }
    }

    /**
     * Create a name tag sprite above the player
     */
    private createNameTag(): void {
        if (!this.playerId) return;

        try {
            // For now, we'll skip the sprite approach and use a simple approach
            // Babylon.js sprites work differently than THREE.js
            // We could use GUI or dynamic textures here in the future

            console.log(`Name tag created for player: ${this.playerId}`);
        } catch (error) {
            console.error('Error creating name tag:', error);
        }
    }

    /**
     * Get the player ID
     */
    public getPlayerId(): string {
        return this.playerId;
    }

    /**
     * Set position of the remote player
     */
    public setPosition(position: Vector3): void {
        const mesh = this.meshComponent.getMesh();
        if (mesh) {
            mesh.position = position.clone();
        }
        this.getTransformNode().position = position.clone();
    }

    /**
     * Get current position
     */
    public getPosition(): Vector3 {
        const mesh = this.meshComponent.getMesh();
        if (mesh) {
            return mesh.getAbsolutePosition();
        }
        return this.getTransformNode().position;
    }

    /**
     * Set rotation using quaternion
     */
    public setRotation(x: number, y: number, z: number, w: number): void {
        const mesh = this.meshComponent.getMesh();
        if (mesh) {
            if (!mesh.rotationQuaternion) {
                mesh.rotationQuaternion = new Quaternion(x, y, z, w);
            } else {
                mesh.rotationQuaternion.set(x, y, z, w);
            }
        }
    }

    /**
     * Set target position for interpolation
     */
    public setTargetPosition(position: Vector3): void {
        // Network sends physics body position (y=1), but visual mesh needs to be at y=2
        // Apply the same +1 Y offset as in constructor
        const visualPos = position.clone();
        visualPos.y += 1;
        this.targetPosition = visualPos;
    }

    /**
     * Set target rotation for interpolation
     */
    public setTargetRotation(x: number, y: number, z: number, w: number): void {
        this.targetRotation = new Quaternion(x, y, z, w);
    }

    /**
     * Update method - interpolates position and rotation for smooth movement
     */
    public onUpdate(deltaTime: number): void {
        const mesh = this.meshComponent.getMesh();
        if (!mesh) return;

        // Interpolate position
        if (this.targetPosition) {
            const currentPos = mesh.position;
            const distance = Vector3.Distance(currentPos, this.targetPosition);

            // If very close, snap to target to avoid jitter
            if (distance < 0.01) {
                mesh.position.copyFrom(this.targetPosition);
                this.targetPosition = null;
            } else {
                // Smooth interpolation using lerp
                const t = Math.min(1.0, this.interpolationSpeed * deltaTime);
                Vector3.LerpToRef(currentPos, this.targetPosition, t, mesh.position);
            }
        }

        // Interpolate rotation
        if (this.targetRotation) {
            if (!mesh.rotationQuaternion) {
                mesh.rotationQuaternion = this.targetRotation.clone();
                this.targetRotation = null;
            } else {
                // Smooth rotation interpolation using slerp
                const t = Math.min(1.0, this.interpolationSpeed * deltaTime);
                Quaternion.SlerpToRef(mesh.rotationQuaternion, this.targetRotation, t, mesh.rotationQuaternion);

                // If very close, snap to target
                if (Quaternion.AreClose(mesh.rotationQuaternion, this.targetRotation, 0.001)) {
                    mesh.rotationQuaternion.copyFrom(this.targetRotation);
                    this.targetRotation = null;
                }
            }
        }
    }

    /**
     * Cleanup when removing the remote player
     */
    public dispose(): void {
        if (this.nameSprite) {
            this.nameSprite.dispose();
            this.nameSprite = null;
        }

        super.dispose();
        console.log(`RemotePlayer disposed: ${this.playerId}`);
    }
}
