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
        const isGrounded = Math.abs(character.getCollisionBody().velocity.y) < CharacterState.epsilon;

        // Only enter Idle state if character is stationary and grounded
        return isStationary && isGrounded;
    }

    // Enter the Idle state
    public enter(character: BaseCharacter): void {
        character.setState(this);  // Set this state as the current state
        // Additional logic for entering the Idle state (e.g., play idle animation)
    }

    // Exit the Idle state and handle state transition
    public exit(character: BaseCharacter): void {
        // Clean-up when exiting the Idle state (e.g., stop idle animation)
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
