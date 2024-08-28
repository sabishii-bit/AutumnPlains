import { CharacterState } from './CharacterState';
import { BaseCharacter } from '../BaseCharacter';
import { CharacterIdleState } from './CharacterIdleState';

export class CharacterAirborneState extends CharacterState {
    private static readonly stateName: string = "Airborne";

    constructor(character: BaseCharacter) {
        super();
    }

    // Determines if the character should enter the Airborne state
    public shouldEnterState(character: BaseCharacter): boolean {
        const yVelocity = character.getCollisionBody().velocity.y;

        // Enter the airborne state if the y-velocity is below -0.2 (falling)
        return Math.abs(yVelocity) > CharacterState.epsilon;
    }

    public enter(character: BaseCharacter): void {
        character.setState(this);  // Set this state as the current state
        character.direction.x = 0;
        character.direction.z = 0;
        // Additional logic for entering the Airborne state (e.g., play airborne animation)
    }

    public exit(character: BaseCharacter): void {
        // Clean-up when exiting the Airborne state, automatically enter idle state
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
}
