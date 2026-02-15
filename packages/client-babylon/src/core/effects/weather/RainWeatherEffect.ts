import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, Matrix, Mesh } from '@babylonjs/core';

/**
 * Rain weather effect using thin instances (Babylon.js approach)
 * Each raindrop is a thin instance that falls and resets on ground collision
 */
export class RainWeatherEffect {
    private scene: Scene;
    private raindropMesh: Mesh | null = null;
    private particleCount: number;
    private particleSpeed: number;
    private ceilingHeight: number;
    private spread: number;
    private centerPosition: Vector3;
    private positions: Float32Array;
    private matrices: Float32Array;
    private isActive: boolean = false;

    constructor(
        scene: Scene,
        particleCount: number = 1500,
        particleSpeed: number = 30,
        ceilingHeight: number = 100,
        spread: number = 100,
        centerPosition: Vector3 = Vector3.Zero()
    ) {
        this.scene = scene;
        this.particleCount = particleCount;
        this.particleSpeed = particleSpeed;
        this.ceilingHeight = ceilingHeight;
        this.spread = spread;
        this.centerPosition = centerPosition.clone();
        this.positions = new Float32Array(this.particleCount * 3);
        this.matrices = new Float32Array(this.particleCount * 16); // 16 values per matrix

        this.createRaindrops();
        this.initializePositions();
    }

    /**
     * Create raindrop mesh with thin instances
     */
    private createRaindrops(): void {
        console.log('[RainWeatherEffect] Creating raindrops...');
        console.log(`[RainWeatherEffect] Particle count: ${this.particleCount}`);

        // Create raindrop geometry (thin rectangle like old client)
        this.raindropMesh = MeshBuilder.CreateBox('raindrop', {
            width: 0.02,
            height: 0.5,
            depth: 0.02
        }, this.scene);

        console.log('[RainWeatherEffect] Raindrop mesh created:', this.raindropMesh);

        // Create material (light gray with transparency)
        const raindropMaterial = new StandardMaterial('raindropMaterial', this.scene);
        raindropMaterial.diffuseColor = new Color3(0.8, 0.8, 0.9);
        raindropMaterial.emissiveColor = new Color3(0.3, 0.3, 0.4);
        raindropMaterial.alpha = 0.7;
        this.raindropMesh.material = raindropMaterial;

        this.raindropMesh.isPickable = false;

        // Enable thin instances
        this.raindropMesh.thinInstanceEnablePicking = false;

        console.log(`[RainWeatherEffect] Thin instances will be created for ${this.particleCount} raindrops`);
    }

    /**
     * Initialize particle positions and create thin instances
     */
    private initializePositions(): void {
        if (!this.raindropMesh) {
            console.error('[RainWeatherEffect] Cannot initialize - raindropMesh is null!');
            return;
        }

        console.log('[RainWeatherEffect] Initializing positions...');
        console.log(`[RainWeatherEffect] Spread: ${this.spread}, Height: ${this.ceilingHeight}`);

        const matrixData: Matrix[] = [];

        for (let i = 0; i < this.particleCount; i++) {
            this.positions[i * 3] = Math.random() * this.spread - this.spread / 2 + this.centerPosition.x; // x
            this.positions[i * 3 + 1] = Math.random() * this.ceilingHeight + this.centerPosition.y; // y
            this.positions[i * 3 + 2] = Math.random() * this.spread - this.spread / 2 + this.centerPosition.z; // z

            const matrix = Matrix.Translation(
                this.positions[i * 3],
                this.positions[i * 3 + 1],
                this.positions[i * 3 + 2]
            );

            matrixData.push(matrix);

            // Copy matrix to Float32Array
            matrix.copyToArray(this.matrices, i * 16);

            // Log first 3 positions
            if (i < 3) {
                console.log(`[Rain] Drop ${i}: (${this.positions[i * 3].toFixed(1)}, ${this.positions[i * 3 + 1].toFixed(1)}, ${this.positions[i * 3 + 2].toFixed(1)})`);
            }
        }

        // Set thin instance buffer
        this.raindropMesh.thinInstanceSetBuffer("matrix", this.matrices, 16, false);

        console.log('[RainWeatherEffect] Positions initialized and thin instances created');
    }

    /**
     * Start the rain effect
     */
    public start(): void {
        console.log('[RainWeatherEffect] start() called');
        console.log('[RainWeatherEffect] isActive:', this.isActive);
        console.log('[RainWeatherEffect] raindropMesh exists:', !!this.raindropMesh);

        if (!this.isActive && this.raindropMesh) {
            this.raindropMesh.setEnabled(true);
            this.isActive = true;
            console.log('[RainWeatherEffect] ✓ Rain started');
            console.log('[RainWeatherEffect] Mesh enabled:', this.raindropMesh.isEnabled());
            console.log('[RainWeatherEffect] Mesh visible:', this.raindropMesh.isVisible);
        } else if (!this.raindropMesh) {
            console.error('[RainWeatherEffect] ✗ Cannot start - raindropMesh is null!');
        }
    }

    /**
     * Stop the rain effect
     */
    public stop(): void {
        if (this.isActive && this.raindropMesh) {
            this.raindropMesh.setEnabled(false);
            this.isActive = false;
            console.log('Rain stopped');
        }
    }

    /**
     * Toggle rain on/off
     */
    public toggle(): void {
        if (this.isActive) {
            this.stop();
        } else {
            this.start();
        }
    }

    /**
     * Check if rain is active
     */
    public isRaining(): boolean {
        return this.isActive;
    }

    /**
     * Update rain (move particles down and reset on ground hit)
     */
    public update(deltaTime: number, playerPosition?: Vector3): void {
        if (!this.isActive || !this.raindropMesh) {
            if (Math.random() < 0.01) {
                console.log('[Rain] Update skipped - active:', this.isActive, 'mesh:', !!this.raindropMesh);
            }
            return;
        }

        const speed = this.particleSpeed * deltaTime;
        let resetCount = 0;

        for (let i = 0; i < this.particleCount; i++) {
            // Move particle downward
            this.positions[i * 3 + 1] -= speed;

            // Check if particle hit ground (y <= 0) or went too far below
            if (this.positions[i * 3 + 1] <= 0 || this.positions[i * 3 + 1] < -10) {
                // Reset to top
                this.positions[i * 3] = Math.random() * this.spread - this.spread / 2 + this.centerPosition.x;
                this.positions[i * 3 + 1] = Math.random() * this.ceilingHeight + this.centerPosition.y;
                this.positions[i * 3 + 2] = Math.random() * this.spread - this.spread / 2 + this.centerPosition.z;
                resetCount++;
            }

            // Update matrix in the buffer
            const matrix = Matrix.Translation(
                this.positions[i * 3],
                this.positions[i * 3 + 1],
                this.positions[i * 3 + 2]
            );

            matrix.copyToArray(this.matrices, i * 16);
        }

        // Update the thin instance buffer
        this.raindropMesh.thinInstanceBufferUpdated("matrix");

        // Log every 100 frames (~once per second at 60fps)
        if (Math.random() < 0.01) {
            console.log(`[Rain] Update: Δt=${deltaTime.toFixed(3)}s, speed=${speed.toFixed(2)}, resets=${resetCount}, sample Y=${this.positions[1].toFixed(1)}`);
        }
    }

    /**
     * Dispose of the rain effect
     */
    public dispose(): void {
        if (this.raindropMesh) {
            this.raindropMesh.dispose();
            this.raindropMesh = null;
        }
    }
}
