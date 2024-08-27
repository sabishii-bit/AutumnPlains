import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EngineClock } from '../engine/clock/EngineClock';
import { Renderer } from '../engine/render/Renderer';
import { PlayerCamera } from '../camera/PlayerCamera';
import { TestMap } from '../maps/TestMap';
import { SceneContext } from '../global/scene/SceneContext';
import { WorldContext } from '../global/world/WorldContext';
import { PlayerCharacter } from '../entities/objects/characters/PlayerCharacter';
import { ControllerManager } from '../controls/ControllerManager';
import { GameObjectManager } from '../entities/GameObjectManager';
import { ParticleSystemManager } from '../effects/ParticleSystemManager';
import { UIManager } from '../ui/UIManager';

export default class Initialize {
    private scene: THREE.Scene;
    private renderer: Renderer;
    private camera: PlayerCamera;
    private map: TestMap;
    private world: CANNON.World;
    private engineClock: EngineClock;
    private player: PlayerCharacter;
    private controls: ControllerManager;
    private gameObjectManager: GameObjectManager;
    private particleSystemManager: ParticleSystemManager;
    private uiManager: UIManager;  // Declare UIManager

    constructor() {
        this.world = WorldContext.getInstance();
        this.scene = SceneContext.getInstance();
        this.renderer = Renderer.getInstance();
        this.player = PlayerCharacter.getInstance(new THREE.Vector3(0, 2, 18));
        this.camera = PlayerCamera.getInstance();
        this.controls = ControllerManager.getInstance(document.body);
        this.engineClock = EngineClock.getInstance();
        this.engineClock.start(); // Start the clock
        this.map = new TestMap(this.renderer);
        this.gameObjectManager = new GameObjectManager();
        this.particleSystemManager = new ParticleSystemManager();
        this.uiManager = new UIManager();  // Initialize UIManager
        this.animate();
    }

    private animate = () => {
        requestAnimationFrame(this.animate);
        const frameDeltaTime = this.engineClock.getFrameDeltaTime();
        this.world.step(this.engineClock.getFixedTimeStep());
        this.map.update(frameDeltaTime);
        this.gameObjectManager.updateGameObjects(frameDeltaTime);
        this.particleSystemManager.update(frameDeltaTime);
        this.uiManager.updateUI(frameDeltaTime);  // Update UI components
        this.camera.update(frameDeltaTime);
        this.controls.update(frameDeltaTime);
        this.renderer.getRenderer().render(this.scene, this.camera.getCamera());
    }
}
