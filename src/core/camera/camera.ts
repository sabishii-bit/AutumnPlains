import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PlayerControls } from '../controls/playerControls';
import { Player } from '../entities/player/player';

export class Camera {
    private camera: THREE.PerspectiveCamera;
    private controls: PlayerControls;
    private player: Player;

    constructor(world: CANNON.World, domElement: HTMLElement) {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        // Create a Player instance and pass it to the controls
        this.player = new Player(world);
        this.controls = new PlayerControls(this.camera, this.player, domElement);

        window.addEventListener('resize', this.onWindowResize);
    }

    private onWindowResize = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    };

    public update(deltaTime: number) {
        this.controls.update(deltaTime);
        // Synchronize the camera position with the player's body
        this.camera.position.copy(this.player.body.position as unknown as THREE.Vector3);
    }

    public getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }

    public getPlayer(): Player {
        return this.player;
    }
}
