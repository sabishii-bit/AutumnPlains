import * as THREE from 'three';
import { World } from 'cannon-es';
import GameObject from '../../objects/gameObject';
import { ModelLoader } from '../../../services/model_loader/modelLoader';
import { Scene } from 'three';
import TreeObj from '../../../../assets/obj/tree/Tree_V11_Final.obj';
import TreeMtl from '../../../../assets/obj/tree/Tree_V11_Final.mtl';

// So webpack doesn't shit itself
const barkTexture = require('../../../../assets/obj/tree/bark_tree.jpg').default;
const leavesTexture1 = require('../../../../assets/obj/tree/leaves_01.jpg').default;
const leavesTexture2 = require('../../../../assets/obj/tree/leaves_02.jpg').default;
const leavesTexture3 = require('../../../../assets/obj/tree/leaves_03.jpg').default;

export class Tree extends GameObject {
    sceneContext: Scene;

    constructor(world: World | null = null, initialPosition: THREE.Vector3, scene: Scene, rotation: XYZ = {x: 0, y: 0, z: 0}) {
        super(world, initialPosition, scene);
        
        this.sceneContext = scene;
        this.createVisual();
    }

    protected createVisual() {
        // Assume ModelLoader is globally accessible or passed as a parameter
        const modelLoader = new ModelLoader();
        modelLoader.loadObjModel(TreeMtl, TreeObj, this.sceneContext, this.position);
        this.setRotation();
    }

    protected createPhysics(world: World) {
        // Optionally create a physical body if needed for collisions
        // This could be a simple bounding box or a more complex shape depending on the model
        // If the model should not interact physically, you might skip this part
    }
}

type XYZ = {
    x: number;
    y: number;
    z: number;
};