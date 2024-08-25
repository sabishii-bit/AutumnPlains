import * as THREE from 'three';

export class Renderer {
    private static instance: Renderer;
    private renderer: THREE.WebGLRenderer;

    private constructor() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true // Optional: consider setting alpha for transparent background effects
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true; // Enable shadow maps
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // This can be changed to other types like THREE.PCFShadowMap
        document.body.appendChild(this.renderer.domElement);
        this.setupResizeHandling();
    }

    // Static method to access the singleton instance
    public static getInstance(): Renderer {
        if (!Renderer.instance) {
            Renderer.instance = new Renderer();
        }
        return Renderer.instance;
    }

    public getRenderer(): THREE.WebGLRenderer {
        return this.renderer;
    }

    public updateSize(): void {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private setupResizeHandling(): void {
        window.addEventListener('resize', () => {
            this.updateSize();
            // Add additional resize logic if necessary
        });
    }
}
