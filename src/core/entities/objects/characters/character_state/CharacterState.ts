import { BaseCharacter } from "../BaseCharacter";

export abstract class CharacterState {
    private static subclasses: (new (character: BaseCharacter) => CharacterState)[] = [];
    public static readonly epsilon: number = 0.05;  // Special constant that approximates the end of a jump

    constructor() {
        const subclass = this.constructor as (new (character: BaseCharacter) => CharacterState);
        if (!CharacterState.subclasses.includes(subclass)) {
            CharacterState.subclasses.push(subclass);
        }
    }

    public static getStates(): (new (character: BaseCharacter) => CharacterState)[] {
        return CharacterState.subclasses;
    }

    public abstract enter(character: BaseCharacter): void;
    public abstract execute(character: BaseCharacter): void;
    public abstract exit(character: BaseCharacter): void;
    public abstract canJump(character: BaseCharacter): boolean;
    public abstract canWalk(character: BaseCharacter): boolean;
    public abstract getStateName(): string;
    public abstract getAllowedNextStates(): (new (character: BaseCharacter) => CharacterState)[];

    // New method to check if the character should enter this state
    public abstract shouldEnterState(character: BaseCharacter): boolean;
}
