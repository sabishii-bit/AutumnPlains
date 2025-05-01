import { CharacterState } from './CharacterState';
import { BaseCharacter } from '../BaseCharacter';
import { SceneContext } from '../../../../global/scene/SceneContext';
import { CharacterIdleState } from './CharacterIdleState';
import { CharacterWalkingState } from './CharacterWalkingState';
import * as THREE from 'three';

export class CharacterLandingState extends CharacterState {
    private static readonly stateName: string = "Landing";
    private landingTimer: number = 0;
    private landingDuration: number = 150; // milliseconds to stay in landing state

    constructor(character: BaseCharacter) {
        super();
        this.landingTimer = performance.now();
    }

    // Determines if the character should enter the Idle state
    public shouldEnterState(character: BaseCharacter): boolean {
        return character.isGrounded() || character.hasLandedRecently(100); // Increased time threshold
    }

    public enter(character: BaseCharacter): void {
        character.setState(this);
        this.landingTimer = performance.now();
        
        // Stop vertical movement immediately on landing
        character.setVelocity({ y: 0 });
    }

    public execute(character: BaseCharacter): void {
        // Stop vertical acceleration
        character.setAcceleration({y: 0});
        
        // Snap to ground if needed
        this.snapToGround(character);
        
        // Check if landing animation/state should be complete
        if (performance.now() - this.landingTimer > this.landingDuration) {
            // Transition to idle state when landing is complete
            const nextStateClass = character.getCollisionBody().velocity.lengthSq() > 0.1 
                ? CharacterWalkingState 
                : CharacterIdleState;
            
            const nextState = new nextStateClass(character);
            nextState.enter(character);
        }
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
        const characterPos = character.getCollisionBody().position;
        
        // Create multiple raycast points to better detect landing on objects
        const rayOrigins = [
            new THREE.Vector3(characterPos.x, characterPos.y, characterPos.z),           // Center
            new THREE.Vector3(characterPos.x + 0.2, characterPos.y, characterPos.z),     // Right
            new THREE.Vector3(characterPos.x - 0.2, characterPos.y, characterPos.z),     // Left
            new THREE.Vector3(characterPos.x, characterPos.y, characterPos.z + 0.2),     // Front
            new THREE.Vector3(characterPos.x, characterPos.y, characterPos.z - 0.2)      // Back
        ];
        
        // Direction to cast the ray (downward)
        const downDirection = new THREE.Vector3(0, -1, 0);
        
        // Set maximum distance to check (from character position)
        const maxDistance = 1.5;
        
        // Try each raycast origin until we find a valid ground point
        for (const rayOrigin of rayOrigins) {
            // Cast the ray downwards
            raycaster.set(rayOrigin, downDirection);
            const intersections = raycaster.intersectObjects(scene.children, true);
            
            // Find the first valid intersection
            if (intersections.length > 0) {
                const closestIntersection = intersections[0];
                const groundY = closestIntersection.point.y;
                
                // Log details about the intersection
                console.log('Ground/object detected beneath player:');
                console.log('Object Name:', closestIntersection.object.name || 'Unnamed Object');
                console.log('Intersection Point:', closestIntersection.point);
                console.log('Distance from player:', closestIntersection.distance);
                
                // Only snap if the distance is reasonable (prevent teleporting to faraway objects)
                if (closestIntersection.distance <= maxDistance) {
                    // Adjust the character's y-position to align with the ground level
                    character.getCollisionBody().position.y = groundY + character.getFeetHeight();
                    character.getCollisionBody().velocity.y = 0; // Ensure there's no upward velocity
                    return; // Exit after finding valid ground
                }
            }
        }
        
        // If we get here, no valid ground was found with any raycast
        console.log('No ground detected beneath the player with any raycast.');
    }
}
