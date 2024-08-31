import { CharacterIdleState } from './CharacterIdleState';
import { CharacterWalkingState } from './CharacterWalkingState';
import { CharacterAirborneState } from './CharacterAirborneState';
import { BaseCharacter } from '../BaseCharacter';
import { CharacterState } from './CharacterState';
import { CharacterLandingState } from './CharacterLandingState';

export default abstract class StateManager {

    // Ensure that all states are registered
    public static registerStates(): void {
        new CharacterIdleState(null as any); 
        new CharacterWalkingState(null as any);
        new CharacterAirborneState(null as any);
        new CharacterLandingState(null as any);
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

            // Check if the transition is allowed
            const allowedNextStates = currentState?.getAllowedNextStates() || [];
            if (!allowedNextStates.includes(State)) {
                continue;
            }
            
            // Determine if the character should transition to this state
            if (instance.shouldEnterState(character)) {
                // Exit the current state (if any)
                currentState?.exit(character);

                // Enter the new state and update the character's current state
                instance.enter(character);
                character.setState(instance);
                return;  // Exit after setting the new state
            }
        }
    }

    public static executeState(character: BaseCharacter): void {
        const currentState = character.getCurrentState();
        currentState?.execute(character);
    }
}
