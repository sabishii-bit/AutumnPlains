import { CharacterState } from './CharacterState';
import { BaseCharacter } from '../BaseCharacter';
import { CharacterAirborneState } from './CharacterAirborneState';

export class CharacterJumpingState extends CharacterState {
    private static readonly stateName: string = "Jumping";
    private jumpStartTime: number;
    private readonly MAX_JUMP_STATE_TIME: number = 100; // ms to stay in jump state before moving to airborne

    constructor(character: BaseCharacter) {
        super();
        this.jumpStartTime = performance.now();
    }

    // Determines if the character should enter the Jumping state
    public shouldEnterState(character: BaseCharacter): boolean {
        const yVelocity = parseFloat(character.getCollisionBody().velocity.y.toFixed(2));     
        // Return true if we have significant upward velocity
        return yVelocity > 0.5;
    }

    public enter(character: BaseCharacter): void {
        character.setState(this);
        this.jumpStartTime = performance.now();
    }

    public execute(character: BaseCharacter): void {
        // Check if we should transition to airborne state
        const yVelocity = parseFloat(character.getCollisionBody().velocity.y.toFixed(2));
        const currentTime = performance.now();
        
        // Transition to airborne if:
        // 1. Our upward velocity is decreasing (past apex of jump), or
        // 2. We've been in the jumping state too long
        if (yVelocity < 0.5 || currentTime - this.jumpStartTime > this.MAX_JUMP_STATE_TIME) {
            // Time to transition to airborne
            const airborneState = new CharacterAirborneState(character);
            airborneState.enter(character);
        }
    }

    public exit(character: BaseCharacter): void {
        // Clean-up when exiting the Jump state
    }

    public canJump(character: BaseCharacter): boolean {
        return false; // Can't double-jump
    }

    public canWalk(character: BaseCharacter): boolean {
        return true; // Allow directional control while jumping
    }

    public getStateName(): string {
        return CharacterJumpingState.stateName;
    }

    public getAllowedNextStates(): (new (character: BaseCharacter) => CharacterState)[] {
        return [CharacterAirborneState]; // Jumping can only transition to Airborne
    }
}
