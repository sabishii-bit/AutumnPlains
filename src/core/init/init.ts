import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EngineClock } from '../engine/clock/engineClock';
import { Renderer } from '../engine/render/renderer';
import { PlayerCamera } from '../camera/camera';
import { TestMap } from '../maps/map';
import { DebuggerInfo } from '../ui/debug';
import { SceneContext } from '../global/scene/scene';
import { WorldContext } from '../global/world/world';
import { Player } from '../entities/player/player';
import { PlayerControls } from '../controls/playerControls';
import { GameObjectManager } from '../entities/gameObjectManager';

export default class Initialize {
    private scene: THREE.Scene;
    private renderer: Renderer;
    private camera: PlayerCamera;
    private map: TestMap;
    private world: CANNON.World;
    private engineClock: EngineClock;
    private debuggerInfo: DebuggerInfo;
    private player: Player;
    private controls: PlayerControls;
    private gameObjectManager: GameObjectManager;

    constructor() {
        this.world = WorldContext.getInstance();
        this.scene = SceneContext.getInstance();
        this.renderer = Renderer.getInstance();
        this.player = Player.getInstance();
        this.camera = PlayerCamera.getInstance();
        this.controls = PlayerControls.getInstance(document.body);
        this.engineClock = EngineClock.getInstance();
        this.engineClock.start(); // Start the clock
        this.debuggerInfo = new DebuggerInfo();
        this.map = new TestMap(this.renderer);
        this.gameObjectManager = new GameObjectManager();
        this.animate();
    }

    private animate = () => {
        requestAnimationFrame(this.animate);
        const frameDeltaTime = this.engineClock.getFrameDeltaTime();
        this.world.step(this.engineClock.getFixedTimeStep());
        this.map.update(frameDeltaTime);
        this.gameObjectManager.updateGameObjects(frameDeltaTime)
        this.debuggerInfo.update(frameDeltaTime);
        this.camera.update(frameDeltaTime);
        this.controls.update(frameDeltaTime);
        this.renderer.getRenderer().render(this.scene, this.camera.getCamera());
    }
}
