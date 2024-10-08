import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { PlayerCamera } from '../../camera/PlayerCamera';
import { SceneContext } from '../../global/scene/SceneContext';
import { Renderer } from '../../engine/render/Renderer';
import { Scene } from 'three';

export class BloomEffect {
    composer: EffectComposer;
    bloomPass: UnrealBloomPass;
    camera: THREE.Camera = PlayerCamera.getInstance().getCamera();
    renderer: THREE.WebGLRenderer = Renderer.getInstance().getRenderer();
    scene: Scene = SceneContext.getInstance();

    constructor(bloomParams: any = {exposure: 1, bloomStrength: 2.5, bloomThreshold: 0.1, bloomRadius: 0.55}) {
        this.composer = new EffectComposer(this.renderer);
        // Render Pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom Pass
        const params = bloomParams;
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), params.bloomStrength, 0.4, params.bloomRadius);
        this.bloomPass.threshold = params.bloomThreshold;
        this.composer.addPass(this.bloomPass);

        this.updateSize();
        this.render();
    }

    public render() {
        this.composer.render();
    }

    public updateSize() {
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }
}
