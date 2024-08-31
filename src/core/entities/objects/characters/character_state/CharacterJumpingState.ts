import { CharacterState } from './CharacterState';
import { BaseCharacter } from '../BaseCharacter';
import { CharacterAirborneState } from './CharacterAirborneState';

export class CharacterJumpingState extends CharacterState {
    private static readonly stateName: string = "Jumping";

    constructor(character: BaseCharacter) {
        super();
    }

    // Determines if the character should enter the Idle state
    public shouldEnterState(character: BaseCharacter): boolean {
        const yVelocity = parseFloat(character.getCollisionBody().velocity.y.toFixed(2));     
        // Include the point of inflection check
        return Math.abs(yVelocity) > 0.01;
    }

    public enter(character: BaseCharacter): void {
        character.setState(this);  // Set this state as the current state
        // Additional logic for entering the Idle state
    }

    public execute(character: BaseCharacter): void {
        
    }

    public exit(character: BaseCharacter): void {
        // Clean-up when exiting the Idle state
    }

    public canJump(character: BaseCharacter): boolean {
        return true;
    }

    public canWalk(character: BaseCharacter): boolean {
        return true;
    }

    public getStateName(): string {
        return CharacterJumpingState.stateName;
    }

    public getAllowedNextStates(): (new (character: BaseCharacter) => CharacterState)[] {
        return [CharacterAirborneState]; // Landing can only transition to Idle
    }
}
