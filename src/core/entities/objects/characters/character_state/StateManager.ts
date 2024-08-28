import { CharacterIdleState } from './CharacterIdleState';
import { CharacterWalkingState } from './CharacterWalkingState';
import { CharacterAirborneState } from './CharacterAirborneState';
import { BaseCharacter } from '../BaseCharacter';
import { CharacterState } from './CharacterState';

export default abstract class StateManager {

    // Ensure that all states are registered
    public static registerStates(): void {
        new CharacterIdleState(null as any);  // Instantiating with a dummy character just for registration
        new CharacterWalkingState(null as any);
        new CharacterAirborneState(null as any);
    }

    public static decideState(character: BaseCharacter): void {
        const stateTypes = CharacterState.getStates();
        const currentState = character.getCurrentState();  // Use getCurrentState instead of getState()

        for (const State of stateTypes) {
            const instance = new State(character);

            // Skip if the character is already in this state
            if (currentState?.getStateName() === instance.getStateName()) {
                continue;
            }
            
            // Determine if the character should transition to this state
            if (instance.shouldEnterState(character)) {
                console.log("Instance", instance);
                // Exit the current state (if any)
                currentState?.exit(character);

                // Enter the new state and update the character's current state
                instance.enter(character);
                return;  // Exit after setting the new state
            }
        }
    }
}
