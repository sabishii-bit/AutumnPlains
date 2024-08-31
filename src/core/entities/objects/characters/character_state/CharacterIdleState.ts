import { CharacterState } from './CharacterState';
import { BaseCharacter } from '../BaseCharacter';
import { CharacterWalkingState } from './CharacterWalkingState';
import { CharacterJumpingState } from './CharacterJumpingState';

export class CharacterIdleState extends CharacterState {
    private static readonly stateName: string = "Idle";

    constructor(character: BaseCharacter) {
        super();
    }

    // Determines if the character should enter the Idle state
    public shouldEnterState(character: BaseCharacter): boolean {
        const isStationary = character.direction.x == 0 && character.direction.z == 0;

        return isStationary;
    }

    public enter(character: BaseCharacter): void {
        character.setState(this);  // Set this state as the current state
        // Additional logic for entering the Idle state
        character.setVelocity({x: (0), z: (0)});
    }

    public execute(character: BaseCharacter): void {
        const rateOfDecrease = 0.1;
        const xVelocity = character.getCollisionBody().velocity.x;
        const yVelocity = character.getCollisionBody().velocity.y;
        const zVelocity = character.getCollisionBody().velocity.z;
        // if (xVelocity != 0 || zVelocity != 0)
        //     character.setVelocity({x: (0), z: (0)});
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

    public getAllowedNextStates(): (new (character: BaseCharacter) => CharacterState)[] {
        return [CharacterWalkingState];
    }
}
