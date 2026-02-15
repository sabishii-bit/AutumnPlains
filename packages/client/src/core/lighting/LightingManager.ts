import {
    Scene,
    HemisphericLight,
    DirectionalLight,
    Vector3,
    ShadowGenerator,
    Color3
} from '@babylonjs/core';

/**
 * Manages scene lighting with ambient and directional lights
 * Follows Babylon.js best practices for outdoor scenes
 */
export class LightingManager {
    private scene: Scene;
    private ambientLight: HemisphericLight;
    private directionalLight: DirectionalLight;
    private shadowGenerator!: ShadowGenerator;

    constructor(scene: Scene) {
        this.scene = scene;

        // Create ambient light (hemispheric for outdoor scenes)
        this.ambientLight = new HemisphericLight(
            'ambientLight',
            new Vector3(0, 1, 0),
            scene
        );
        this.ambientLight.intensity = 0.5;
        this.ambientLight.groundColor = new Color3(0.2, 0.2, 0.3); // Slightly blue ground reflection

        // Create directional light (sun)
        this.directionalLight = new DirectionalLight(
            'sunLight',
            new Vector3(-1, -2, -1), // Direction: down and slightly diagonal
            scene
        );
        this.directionalLight.position = new Vector3(20, 40, 20);
        this.directionalLight.intensity = 1.0;
        this.directionalLight.diffuse = new Color3(1, 0.95, 0.8); // Warm sunlight
        this.directionalLight.specular = new Color3(1, 1, 0.9);

        // Set up shadows with best practices
        this.setupShadows();

        console.log('LightingManager initialized');
    }

    /**
     * Set up shadow generation with optimized settings
     */
    private setupShadows(): void {
        // Create shadow generator with high resolution
        this.shadowGenerator = new ShadowGenerator(2048, this.directionalLight);

        // Use Close Exponential Shadow Map for better quality
        this.shadowGenerator.useCloseExponentialShadowMap = true;
        this.shadowGenerator.bias = 0.00001;

        // Enable contact hardening for realistic soft shadows
        this.shadowGenerator.useContactHardeningShadow = true;
        this.shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;

        // Auto-compute shadow frustum for better coverage
        this.directionalLight.autoUpdateExtends = false;
        this.directionalLight.shadowMinZ = 1;
        this.directionalLight.shadowMaxZ = 100;

        // Set shadow camera frustum (adjust based on scene size)
        this.directionalLight.shadowOrthoScale = 0.5; // Tighter = better shadow quality

        console.log('Shadow generation configured');
    }

    /**
     * Add a mesh to cast shadows
     */
    public addShadowCaster(mesh: any): void {
        this.shadowGenerator.addShadowCaster(mesh);
    }

    /**
     * Enable shadow receiving on a mesh
     */
    public enableShadowReceiver(mesh: any): void {
        mesh.receiveShadows = true;
    }

    /**
     * Set sun direction (for day/night cycle)
     */
    public setSunDirection(direction: Vector3): void {
        this.directionalLight.direction = direction;
    }

    /**
     * Set sun intensity
     */
    public setSunIntensity(intensity: number): void {
        this.directionalLight.intensity = intensity;
    }

    /**
     * Set ambient light intensity
     */
    public setAmbientIntensity(intensity: number): void {
        this.ambientLight.intensity = intensity;
    }

    /**
     * Get the shadow generator
     */
    public getShadowGenerator(): ShadowGenerator {
        return this.shadowGenerator;
    }

    /**
     * Get the directional light (sun)
     */
    public getDirectionalLight(): DirectionalLight {
        return this.directionalLight;
    }

    /**
     * Get the ambient light
     */
    public getAmbientLight(): HemisphericLight {
        return this.ambientLight;
    }

    /**
     * Dispose of all lights and shadows
     */
    public dispose(): void {
        this.shadowGenerator.dispose();
        this.directionalLight.dispose();
        this.ambientLight.dispose();
    }
}
