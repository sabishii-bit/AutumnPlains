import { CharacterState } from './CharacterState';
import { BaseCharacter } from '../BaseCharacter';
import { SceneContext } from '../../../../global/scene/SceneContext';
import { CharacterIdleState } from './CharacterIdleState';
import { CharacterWalkingState } from './CharacterWalkingState';
import * as THREE from 'three';

export class CharacterLandingState extends CharacterState {
    private static readonly stateName: string = "Landing";

    constructor(character: BaseCharacter) {
        super();
    }

    // Determines if the character should enter the Idle state
    public shouldEnterState(character: BaseCharacter): boolean {
        const landed = character.hasLandedRecently();
        return landed;
    }

    public enter(character: BaseCharacter): void {
        character.setState(this);
    }

    public execute(character: BaseCharacter): void {
        character.setAcceleration({y: 0});
    }

    public exit(character: BaseCharacter): void {

    }

    public canJump(character: BaseCharacter): boolean {
        return false;
    }

    public canWalk(character: BaseCharacter): boolean {
        return true;
    }

    public getStateName(): string {
        return CharacterLandingState.stateName;
    }

    public getAllowedNextStates(): (new (character: BaseCharacter) => CharacterState)[] {
        return [CharacterIdleState, CharacterWalkingState];
    }

    private snapToGround(character: BaseCharacter): void {
        const scene = SceneContext.getInstance();
        const raycaster = new THREE.Raycaster();
        const rayOrigin = new THREE.Vector3(
            character.getCollisionBody().position.x,
            character.getCollisionBody().position.y,
            character.getCollisionBody().position.z
        );
    
        // Cast the ray downwards
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        const intersections = raycaster.intersectObjects(scene.children, true);
    
        if (intersections.length > 0) {
            const closestIntersection = intersections[0];
            const groundY = closestIntersection.point.y;
    
            // Log details about the intersection
            console.log('Ground detected beneath player:');
            console.log('Object Name:', closestIntersection.object.name || 'Unnamed Object');
            console.log('Intersection Point:', closestIntersection.point);
            console.log('Distance from player:', closestIntersection.distance);
    
            // Adjust the character's y-position to align with the ground level
            character.getCollisionBody().position.y = groundY + character.getFeetHeight();
            character.getCollisionBody().velocity.y = 0; // Ensure there's no upward velocity
        } else {
            console.log('No ground detected beneath the player.');
        }
    }
}
