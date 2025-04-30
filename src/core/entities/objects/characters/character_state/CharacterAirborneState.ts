import { CharacterState } from './CharacterState';
import { BaseCharacter } from '../BaseCharacter';
import StateManager from './StateManager';
import { CharacterLandingState } from './CharacterLandingState';

export class CharacterAirborneState extends CharacterState {
    private static readonly stateName: string = "Airborne";

    constructor(character: BaseCharacter) {
        super();
    }

    // Determines if the character should enter the Airborne state
    public shouldEnterState(character: BaseCharacter): boolean {
        const yVelocity = parseFloat(character.getCollisionBody().velocity.y.toFixed(1));     
        // Include the point of inflection check
        return Math.abs(yVelocity) > CharacterState.epsilon || character.isAtPointOfInflection();
    }
    

    public enter(character: BaseCharacter): void {
        character.setState(this);  // Set this state as the current state
        // Additional logic for entering the Airborne state
    }

    public execute(character: BaseCharacter): void {
        // Check if the character has landed
        if (character.isGrounded() || character.hasLandedRecently()) {
            // If we've landed, transition to landing state
            const landingState = new CharacterLandingState(character);
            landingState.enter(character);
        }
    }

    public exit(character: BaseCharacter): void {
        
    }

    public canJump(character: BaseCharacter): boolean {
        return false;
    }

    public canWalk(character: BaseCharacter): boolean {
        return false;
    }

    public getStateName(): string {
        return CharacterAirborneState.stateName;
    }

    public getAllowedNextStates(): (new (character: BaseCharacter) => CharacterState)[] {
        return [CharacterLandingState]; // Airborne can only transition to Landing
    }
}
