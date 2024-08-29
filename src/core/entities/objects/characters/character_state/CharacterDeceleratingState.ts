import { CharacterState } from './CharacterState';
import { BaseCharacter } from '../BaseCharacter';
import { CharacterIdleState } from './CharacterIdleState';

// TODO: Fix this class
export class CharacterDeceleratingState extends CharacterState {
    private static readonly stateName: string = "Decelerating";

    constructor(character: BaseCharacter) {
        super();
    }

    // Determines if the character should enter the Decelerating state
    public shouldEnterState(character: BaseCharacter): boolean {
        const yVelocity = parseFloat(character.getCollisionBody().velocity.y.toFixed(2));
        const xVelocity = parseFloat(character.getCollisionBody().velocity.x.toFixed(2));
        const zVelocity = parseFloat(character.getCollisionBody().velocity.z.toFixed(2));

        // Enter decelerating state if the character is not airborne and is stabilizing
        const isStabilizing = Math.abs(yVelocity) < CharacterState.epsilon;
        const isSlowingDown = Math.abs(xVelocity) < 0.1 || Math.abs(zVelocity) < 0.1;
        const isNotIdle = Math.abs(xVelocity) != 0 && Math.abs(zVelocity) != 0 && character.direction.x != 0 && character.direction.z != 0;

        return isStabilizing && isSlowingDown && isNotIdle;
    }

    public enter(character: BaseCharacter): void {
        character.setState(this);  // Set this state as the current state
        // Additional logic for entering the decelerating state
    }

    public exit(character: BaseCharacter): void {
        // Clean-up when exiting the decelerating state
        new CharacterIdleState(character).enter(character);
    }

    public canJump(character: BaseCharacter): boolean {
        return true;
    }

    public canWalk(character: BaseCharacter): boolean {
        return true;
    }

    public getStateName(): string {
        return CharacterDeceleratingState.stateName;
    }
}
