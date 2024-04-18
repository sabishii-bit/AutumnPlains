import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EngineClock } from '../engine/clock/engineClock';
import { Renderer } from '../engine/render/renderer';
import { Camera } from '../camera/camera';
import { TestMap } from '../maps/map';
import { DebuggerInfo } from '../ui/debug';

export default class Initialize {
    private scene: THREE.Scene;
    private renderer: Renderer;
    private camera: Camera;
    private map: TestMap;
    private world: CANNON.World;
    private engineClock: EngineClock;
    private debuggerInfo: DebuggerInfo;

    constructor() {
        this.setupPhysics();
        this.setupScene();
        this.engineClock = new EngineClock();
        this.engineClock.start(); // Start the clock
        this.debuggerInfo = new DebuggerInfo(this.camera.getPlayer(), this.camera.getCamera());
        this.map = new TestMap(this.world, this.renderer, this.scene, this.camera.getPlayer());
        this.animate();
    }

    private setupPhysics() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -30.82, 0);  // Set gravity for the physics world
    }

    private setupScene() {
        this.scene = new THREE.Scene();
        this.renderer = new Renderer();

        // Pass the DOM element where we want to add the listeners, typically it's document.body for full-screen applications
        this.camera = new Camera(this.world, document.body);
    }

    private animate = () => {
        requestAnimationFrame(this.animate);
        const frameDeltaTime = this.engineClock.getFrameDeltaTime();
        this.world.step(this.engineClock.getFixedTimeStep());
        this.map.update(frameDeltaTime);
        this.debuggerInfo.update(frameDeltaTime);
        this.camera.update(frameDeltaTime);
        this.renderer.getRenderer().render(this.scene, this.camera.getCamera());
    }
}
