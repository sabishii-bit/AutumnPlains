import { CharacterState } from './CharacterState';
import { BaseCharacter } from '../BaseCharacter';

export class CharacterWalkingState extends CharacterState {
    private static readonly stateName: string = "Walking";

    constructor(character: BaseCharacter) {
        super();
    }

    public shouldEnterState(character: BaseCharacter): boolean {
        const isWalking = (character.direction.x !== 0 || character.direction.z !== 0);
        const isGrounded = Math.abs(parseFloat(character.getCollisionBody().velocity.y.toFixed(2))) == 0;

        return isWalking && isGrounded;
    }

    public enter(character: BaseCharacter): void {
        character.setState(this);  // Set this state as the current state
        // Additional logic for entering the Walking state
    }

    public exit(character: BaseCharacter): void {
        // Clean-up when exiting the Walking state
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
