import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { PlayerCamera } from '../../camera/camera';
import { SceneContext } from '../../global/scene/scene';
import { Renderer } from '../../engine/render/renderer';
import { Scene } from 'three';

export class BloomEffect {
    composer: EffectComposer;
    bloomPass: UnrealBloomPass;
    camera: THREE.Camera = PlayerCamera.getInstance().getCamera();
    renderer: THREE.WebGLRenderer = Renderer.getInstance().getRenderer();
    scene: Scene = SceneContext.getInstance();

    constructor(BloomParams: any = {exposure: 1, bloomStrength: 1.5, bloomThreshold: 0, bloomRadius: 0}) {
        this.composer = new EffectComposer(this.renderer);
        // Render Pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom Pass
        const params = BloomParams;

        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        this.bloomPass.threshold = params.bloomThreshold;
        this.bloomPass.strength = params.bloomStrength;
        this.bloomPass.radius = params.bloomRadius;
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
