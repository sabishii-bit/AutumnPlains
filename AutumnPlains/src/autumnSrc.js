import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';

class RenderWorld {
    constructor() {
        this._Init();
    }

    _Init() {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(
            60,     // FOV 
            window.innerWidth/window.innerHeight,   // Aspect ratio
            1.0,    // Near plane
            1000    // Far plane
        );
        this.camera.position.set(75,20,0);

        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor("#e5e5e5");
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    
        document.body.appendChild(this.renderer.domElement); // Create canvas element with renderer settings
    
        // Window size continuity:
        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        })
        
        // Controls
        this.controls = new OrbitControls(
        this.camera, this.renderer.domElement);
        this.controls.target.set(0, 20, 0);
        this.controls.update();

        // Loading an object
        const objLoader = new THREE.OBJLoader();
        this.objLoader.load(
            './models/Autumn Plains.obj',
            function ( object ) {
                this.scene.add(object);
            },
            function( xhr ) {
                console.log ( ( xhr.loaded / xhr.total * 100) + '% loaded' ); 
            },
            function ( error ) {
                console.log( 'An error happened' );
            }
        )

        // Test shapes
        this.plane = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100, 10, 10),
        new THREE.MeshStandardMaterial({
            color: 0xA29A98,
            }));
            this.plane.castShadow = false;
            this.plane.receiveShadow = true;
            this. plane.rotation.x = -Math.PI / 2;
        this.scene.add(this.plane);

        this.box = new THREE.Mesh(
        new THREE.BoxGeometry(5, 5, 5),
        new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
        }));
        this.box.position.set(0, 5, 0);
        this.box.castShadow = true;
        this.box.receiveShadow = true;
        this.scene.add(this.box);

        // Light render
        let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
        light.position.set(20, 100, 10);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.left = 100;
        light.shadow.camera.right = -100;
        light.shadow.camera.top = 100;
        light.shadow.camera.bottom = -100;
        this.scene.add(light);

        // Skybox render
        this.loader = new THREE.CubeTextureLoader();
        this.texture = this.loader.load([
            './src/textures/skybox.png',
            './src/textures/skybox.png',
            './src/textures/skybox.png',
            './src/textures/skybox.png',
            './src/textures/skybox.png',
            './src/textures/skybox.png',
        ]);
        this.scene.background = this.texture;

        // Refresh frame
        this._RAF()
    }

    // Request Animation Frame (60 FPS)
    _RAF() {
        requestAnimationFrame(() => {
        // Loop the framerate
        this.renderer.render(this.scene, this.camera);
        this._RAF();
        });
    }
}

new RenderWorld();