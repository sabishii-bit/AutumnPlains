import * as THREE from 'three';
import { World } from 'cannon-es';
import GameObject from '../../gameObject';
import { ModelLoader } from '../../../../services/model_loader/modelLoader';
import { Scene } from 'three';
import TreeObj from '../../../../assets/obj/tree/Tree_V11_Final.obj';
import TreeMtl from '../../../../assets/obj/tree/Tree_V11_Final.mtl';

// So webpack doesn't shit itself trying to identify MTL dependencies
const barkTexture = require('../../../../assets/obj/tree/bark_tree.jpg').default;
const leavesTexture1 = require('../../../../assets/obj/tree/leaves_01.jpg').default;
const leavesTexture2 = require('../../../../assets/obj/tree/leaves_02.jpg').default;
const leavesTexture3 = require('../../../../assets/obj/tree/leaves_03.jpg').default;

export class Tree extends GameObject {
    sceneContext: Scene;

    constructor(initialPosition: THREE.Vector3) {
        super(initialPosition);
        this.createVisual();
    }

    protected createVisual() {
        const modelLoader = new ModelLoader();
        modelLoader.loadObjModel(TreeMtl, TreeObj, this.sceneContext, this.position);
    }

    protected createPhysics() {
        // Optionally create a physical body if needed for collisions
        // This could be a simple bounding box or a more complex shape depending on the model
        // If the model should not interact physically, skip this part
    }
}