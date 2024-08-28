import { CharacterState } from './CharacterState';
import { BaseCharacter } from '../BaseCharacter';

export class CharacterWalkingState extends CharacterState {
    private static readonly stateName: string = "Walking";

    constructor(character: BaseCharacter) {
        super();
    }

    public shouldEnterState(character: BaseCharacter): boolean {
        return (character.direction.x != 0 || character.direction.z != 0) && Math.round(character.getCollisionBody().velocity.y) == 0;
    }

    public enter(character: BaseCharacter): void {
        character.setState(this);  // Set this state as the current state
        // Additional logic for entering the Walking state (e.g., play walking animation)
    }

    public exit(character: BaseCharacter): void {
        // Clean-up when exiting the Walking state (e.g., stop walking animation)
    }

    public canJump(character: BaseCharacter): boolean {
        return true;
    }

    public canWalk(character: BaseCharacter): boolean {
        return true;
    }

    public getStateName(): string {
        return CharacterWalkingState.stateName;
    }
}
