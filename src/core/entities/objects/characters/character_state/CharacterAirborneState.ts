import { CharacterState } from './CharacterState';
import { BaseCharacter } from '../BaseCharacter';
import { CharacterDeceleratingState } from './CharacterDeceleratingState';
import StateManager from './StateManager';

export class CharacterAirborneState extends CharacterState {
    private static readonly stateName: string = "Airborne";

    constructor(character: BaseCharacter) {
        super();
    }

    // Determines if the character should enter the Airborne state
    public shouldEnterState(character: BaseCharacter): boolean {
        const yVelocity = parseFloat(character.getCollisionBody().velocity.y.toFixed(2));
        // Enter the airborne state if the y-velocity is greater than epsilon and character is moving upwards or falling
        return Math.abs(yVelocity) > CharacterState.epsilon;
    }

    public enter(character: BaseCharacter): void {
        character.setState(this);  // Set this state as the current state
        character.direction.x = 0;
        character.direction.z = 0;
        // Additional logic for entering the Airborne state
    }

    public exit(character: BaseCharacter): void {
        // Transition to decelerating state when exiting airborne
        new CharacterDeceleratingState(character).enter(character);
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
