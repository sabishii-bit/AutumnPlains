import * as THREE from 'three';

export class EngineClock {
    private static instance: EngineClock;
    private clock: THREE.Clock;
    public readonly fixedTimeStep: number = 1.0 / 60.0; // 60 Hz, matching physics updates

    private constructor() {
        this.clock = new THREE.Clock(false); // Do not start the clock immediately
    }

    public static getInstance(): EngineClock {
        if (!EngineClock.instance) {
            EngineClock.instance = new EngineClock();
        }
        return EngineClock.instance;
    }

    // Call this once per frame to retrieve the time since the last rendered frame
    public getFrameDeltaTime(): number {
        return this.clock.getDelta(); // Three.js's Clock manages the delta time correctly
    }

    // Use for physics updates
    public getFixedTimeStep(): number {
        return this.fixedTimeStep;
    }

    // Start or reset the clock
    public start(): void {
        this.clock.start();
    }
}
