import { CharacterState } from './CharacterState';
import { BaseCharacter } from '../BaseCharacter';

export class CharacterIdleState extends CharacterState {
    private static readonly stateName: string = "Idle";

    constructor(character: BaseCharacter) {
        super();
    }

    // Determines if the character should enter the Idle state
    public shouldEnterState(character: BaseCharacter): boolean {
        const isStationary = character.direction.x == 0 && character.direction.z == 0;
        const isGrounded = Math.abs(parseFloat(character.getCollisionBody().velocity.y.toFixed(2))) == 0;

        return isStationary && isGrounded;
    }

    public enter(character: BaseCharacter): void {
        character.setState(this);  // Set this state as the current state
        // Additional logic for entering the Idle state
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
        return CharacterIdleState.stateName;
    }
}
