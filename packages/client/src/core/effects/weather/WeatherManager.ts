import { Scene, Vector3 } from '@babylonjs/core';
import { RainWeatherEffect } from './RainWeatherEffect';

/**
 * Manages weather effects
 * Singleton pattern for centralized weather control
 */
export class WeatherManager {
    private static instance: WeatherManager;
    private scene!: Scene;
    private rainEffect: RainWeatherEffect | null = null;

    private constructor() {}

    /**
     * Get singleton instance
     */
    public static getInstance(): WeatherManager {
        if (!WeatherManager.instance) {
            WeatherManager.instance = new WeatherManager();
        }
        return WeatherManager.instance;
    }

    /**
     * Initialize with scene
     */
    public initialize(scene: Scene): void {
        this.scene = scene;
        console.log('WeatherManager initialized');
    }

    /**
     * Create rain effect
     */
    public createRain(
        centerPosition: Vector3 = Vector3.Zero(),
        spread: number = 100,
        emitterHeight: number = 50,
        intensity: number = 1000
    ): RainWeatherEffect {
        // Dispose old rain if exists
        if (this.rainEffect) {
            this.rainEffect.dispose();
        }

        // RainWeatherEffect constructor: (scene, particleCount, particleSpeed, ceilingHeight, spread, centerPosition)
        this.rainEffect = new RainWeatherEffect(
            this.scene,
            intensity,      // particleCount
            30,            // particleSpeed (fixed at 30)
            emitterHeight, // ceilingHeight
            spread,        // spread
            centerPosition // centerPosition
        );

        return this.rainEffect;
    }

    /**
     * Get rain effect
     */
    public getRain(): RainWeatherEffect | null {
        return this.rainEffect;
    }

    /**
     * Toggle rain
     */
    public toggleRain(): void {
        if (!this.rainEffect) {
            this.createRain();
        }
        this.rainEffect.toggle();
    }

    /**
     * Start rain
     */
    public startRain(): void {
        if (!this.rainEffect) {
            this.createRain();
        }
        this.rainEffect.start();
    }

    /**
     * Stop rain
     */
    public stopRain(): void {
        if (this.rainEffect) {
            this.rainEffect.stop();
        }
    }

    /**
     * Update weather effects
     */
    public update(deltaTime: number, playerPosition?: Vector3): void {
        if (this.rainEffect) {
            this.rainEffect.update(deltaTime, playerPosition);
        }
    }

    /**
     * Dispose all weather effects
     */
    public dispose(): void {
        if (this.rainEffect) {
            this.rainEffect.dispose();
            this.rainEffect = null;
        }
    }
}
