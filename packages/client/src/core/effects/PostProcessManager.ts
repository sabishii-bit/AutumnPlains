import { Scene, DefaultRenderingPipeline, Camera } from '@babylonjs/core';

/**
 * Manages post-processing effects using Babylon.js DefaultRenderingPipeline
 * Includes bloom, image processing, and other visual enhancements
 */
export class PostProcessManager {
    private scene: Scene;
    private camera: Camera;
    private pipeline: DefaultRenderingPipeline;

    constructor(scene: Scene, camera: Camera) {
        this.scene = scene;
        this.camera = camera;

        // Create default rendering pipeline
        this.pipeline = new DefaultRenderingPipeline(
            'defaultPipeline',
            true, // HDR
            scene,
            [camera]
        );

        this.setupBloom();
        this.setupImageProcessing();
        this.setupDepthOfField();

        console.log('PostProcessManager initialized with DefaultRenderingPipeline');
    }

    /**
     * Set up bloom effect (glow)
     */
    private setupBloom(): void {
        // Enable bloom
        this.pipeline.bloomEnabled = true;
        this.pipeline.bloomThreshold = 0.8; // Only bright areas glow
        this.pipeline.bloomWeight = 0.3; // Intensity of bloom
        this.pipeline.bloomKernel = 64; // Size of bloom
        this.pipeline.bloomScale = 0.5; // Scale for performance
    }

    /**
     * Set up image processing (tone mapping, contrast, exposure)
     */
    private setupImageProcessing(): void {
        // Enable image processing
        this.pipeline.imageProcessingEnabled = true;

        if (this.pipeline.imageProcessing) {
            // Tone mapping for HDR
            this.pipeline.imageProcessing.toneMappingEnabled = true;
            this.pipeline.imageProcessing.toneMappingType = 1; // ACES tone mapping

            // Adjust exposure
            this.pipeline.imageProcessing.exposure = 1.0;

            // Adjust contrast
            this.pipeline.imageProcessing.contrast = 1.2;

            // Slight vignette effect
            this.pipeline.imageProcessing.vignetteEnabled = true;
            this.pipeline.imageProcessing.vignetteWeight = 1.5;
            this.pipeline.imageProcessing.vignetteStretch = 0.5;
            this.pipeline.imageProcessing.vignetteCameraFov = 0.8;
        }
    }

    /**
     * Set up depth of field (optional, disabled by default)
     */
    private setupDepthOfField(): void {
        // Disable depth of field by default (can be enabled for cinematics)
        this.pipeline.depthOfFieldEnabled = false;
        this.pipeline.depthOfFieldBlurLevel = 0; // 0 = low, 1 = medium, 2 = high
    }

    /**
     * Enable/disable bloom effect
     */
    public setBloomEnabled(enabled: boolean): void {
        this.pipeline.bloomEnabled = enabled;
    }

    /**
     * Set bloom intensity
     */
    public setBloomIntensity(weight: number): void {
        this.pipeline.bloomWeight = weight;
    }

    /**
     * Set bloom threshold (higher = only brighter objects glow)
     */
    public setBloomThreshold(threshold: number): void {
        this.pipeline.bloomThreshold = threshold;
    }

    /**
     * Enable/disable FXAA anti-aliasing
     */
    public setFXAAEnabled(enabled: boolean): void {
        this.pipeline.fxaaEnabled = enabled;
    }

    /**
     * Set exposure
     */
    public setExposure(exposure: number): void {
        if (this.pipeline.imageProcessing) {
            this.pipeline.imageProcessing.exposure = exposure;
        }
    }

    /**
     * Set contrast
     */
    public setContrast(contrast: number): void {
        if (this.pipeline.imageProcessing) {
            this.pipeline.imageProcessing.contrast = contrast;
        }
    }

    /**
     * Enable/disable depth of field
     */
    public setDepthOfFieldEnabled(enabled: boolean): void {
        this.pipeline.depthOfFieldEnabled = enabled;
    }

    /**
     * Get the rendering pipeline
     */
    public getPipeline(): DefaultRenderingPipeline {
        return this.pipeline;
    }

    /**
     * Dispose of the pipeline
     */
    public dispose(): void {
        this.pipeline.dispose();
    }
}
