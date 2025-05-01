import { CharacterState } from './CharacterState';
import { BaseCharacter } from '../BaseCharacter';
import StateManager from './StateManager';
import { CharacterLandingState } from './CharacterLandingState';

export class CharacterAirborneState extends CharacterState {
    private static readonly stateName: string = "Airborne";
    private fallStartTime: number;
    private lastGroundCheckTime: number;
    private readonly GROUND_CHECK_INTERVAL: number = 20; // ms between ground checks

    constructor(character: BaseCharacter) {
        super();
        this.fallStartTime = performance.now();
        this.lastGroundCheckTime = this.fallStartTime;
    }

    // Determines if the character should enter the Airborne state
    public shouldEnterState(character: BaseCharacter): boolean {
        // Check if we're moving vertically with significant velocity
        const yVelocity = parseFloat(character.getCollisionBody().velocity.y.toFixed(2));
        
        // If we're not grounded according to raycast, we should be airborne
        const notGrounded = !character.isGrounded();
        
        // We should also be airborne if we have significant vertical velocity
        const hasVerticalVelocity = Math.abs(yVelocity) > CharacterState.epsilon;
        
        // Or if we're at the peak of a jump (point of inflection)
        const atInflection = character.isAtPointOfInflection();
        
        return notGrounded || hasVerticalVelocity || atInflection;
    }

    public enter(character: BaseCharacter): void {
        character.setState(this);
        this.fallStartTime = performance.now();
        this.lastGroundCheckTime = this.fallStartTime;
        
        if (character.getCollisionBody().velocity.y > 0) {
            console.log("Entering Airborne state (rising)");
        } else {
            console.log("Entering Airborne state (falling)");
        }
    }

    public execute(character: BaseCharacter): void {
        const now = performance.now();
        
        // Only check for ground contact periodically to improve performance
        if (now - this.lastGroundCheckTime >= this.GROUND_CHECK_INTERVAL) {
            this.lastGroundCheckTime = now;
            
            // Check for ground contact using isGrounded() which uses raycasting
            if (character.isGrounded()) {
                // If raycasting indicates we're on ground, transition to landing
                const landingState = new CharacterLandingState(character);
                landingState.enter(character);
                console.log(`Airborne → Landing state (ground detected by raycast after ${(now - this.fallStartTime).toFixed(0)}ms)`);
                return;
            }
            
            // Check using hasLandedRecently as a backup
            if (character.hasLandedRecently(100)) {
                // Transition to landing based on recent collision
                const landingState = new CharacterLandingState(character);
                landingState.enter(character);
                console.log(`Airborne → Landing state (recent collision detected after ${(now - this.fallStartTime).toFixed(0)}ms)`);
                return;
            }
            
            // Advanced check: If vertical velocity is near zero and we're very close to ground
            const yVelocity = parseFloat(character.getCollisionBody().velocity.y.toFixed(2));
            if (Math.abs(yVelocity) < 0.1 && this.isNearGround(character)) {
                const landingState = new CharacterLandingState(character);
                landingState.enter(character);
                console.log(`Airborne → Landing state (near-ground check, vel=${yVelocity})`);
                return;
            }
        }
    }

    // Helper method to check if we're very close to the ground
    private isNearGround(character: BaseCharacter): boolean {
        // Use an extended raycast to check slightly further below the character
        // This helps with detection when landing on slopes or uneven terrain
        return character.isGrounded(0.1); // Check with a small extension to the regular ground distance
    }

    public exit(character: BaseCharacter): void {
        console.log("Exiting Airborne state");
    }

    public canJump(character: BaseCharacter): boolean {
        return false; // Can't jump while airborne (no double jump)
    }

    public canWalk(character: BaseCharacter): boolean {
        return false;
    }

    public getStateName(): string {
        return CharacterAirborneState.stateName;
    }

    public getAllowedNextStates(): (new (character: BaseCharacter) => CharacterState)[] {
        return [CharacterLandingState]; // Airborne can only transition to Landing
    }
}
