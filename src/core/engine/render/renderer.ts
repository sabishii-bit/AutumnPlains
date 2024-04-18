import * as THREE from 'three';

export class Renderer {
    renderer: THREE.WebGLRenderer;

    constructor() {
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

    getRenderer() {
        return this.renderer;
    }

    updateSize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // If you're managing a camera globally here, you should also update its aspect ratio:
        // camera.aspect = window.innerWidth / window.innerHeight;
        // camera.updateProjectionMatrix();
    }

    private setupResizeHandling() {
        window.addEventListener('resize', () => {
            this.updateSize();
            // Add additional resize logic if necessary
        });
    }
}
