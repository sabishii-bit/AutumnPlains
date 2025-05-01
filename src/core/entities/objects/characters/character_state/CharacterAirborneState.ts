import { CharacterState } from './CharacterState';
import { BaseCharacter } from '../BaseCharacter';
import StateManager from './StateManager';
import { CharacterLandingState } from './CharacterLandingState';

export class CharacterAirborneState extends CharacterState {
    private static readonly stateName: string = "Airborne";
    private fallStartTime: number;
    private lastGroundCheckTime: number;
    private readonly GROUND_CHECK_INTERVAL: number = 20; // ms between ground checks
    private readonly MAX_AIRBORNE_TIME: number = 5000; // Maximum ms in airborne state to prevent being stuck
    private readonly MIN_AIRBORNE_TIME: number = 200; // Minimum ms in airborne state to prevent immediate landing
    private initialVelocity: number = 0;
    private wasJumping: boolean = false;

    constructor(character: BaseCharacter | null = null) {
        super();
        this.fallStartTime = performance.now();
        this.lastGroundCheckTime = this.fallStartTime;
        
        // Only try to get velocity if we have a valid character with collision body
        if (character && character.getCollisionBody) {
            try {
                const collisionBody = character.getCollisionBody();
                if (collisionBody && collisionBody.velocity) {
                    this.initialVelocity = collisionBody.velocity.y;
                    this.wasJumping = this.initialVelocity > 0.5;
                }
            } catch (error) {
                // Handle any errors gracefully during initialization
                console.log("Note: Couldn't access character velocity during AirborneState initialization");
                this.initialVelocity = 0;
                this.wasJumping = false;
            }
        }
    }

    // Determines if the character should enter the Airborne state
    public shouldEnterState(character: BaseCharacter): boolean {
        // Only check if we have a valid character with collision body
        if (!character || !character.getCollisionBody) return false;
        
        try {
            // Check if we're moving vertically with significant velocity
            const yVelocity = parseFloat(character.getCollisionBody().velocity.y.toFixed(2));
            
            // If we're not grounded according to raycast, we should be airborne
            const notGrounded = !character.isGrounded();
            
            // We should also be airborne if we have significant vertical velocity
            const hasVerticalVelocity = Math.abs(yVelocity) > CharacterState.epsilon;
            
            // Or if we're at the peak of a jump (point of inflection)
            const atInflection = character.isAtPointOfInflection();
            
            return notGrounded || hasVerticalVelocity || atInflection;
        } catch (error) {
            // Handle any errors gracefully
            console.log("Error in shouldEnterState:", error);
            return false;
        }
    }

    public enter(character: BaseCharacter): void {
        character.setState(this);
        this.fallStartTime = performance.now();
        this.lastGroundCheckTime = this.fallStartTime;
        
        // Safely get the initial velocity
        try {
            // Capture initial velocity to determine if this is a jump or a fall
            this.initialVelocity = character.getCollisionBody().velocity.y;
            this.wasJumping = this.initialVelocity > 0.5;
            
            if (this.wasJumping) {
                console.log("Entering Airborne state (jumping up)");
            } else {
                console.log("Entering Airborne state (falling down)");
            }
        } catch (error) {
            // Handle any errors gracefully
            console.log("Note: Couldn't access character velocity during state entry");
            this.initialVelocity = 0;
            this.wasJumping = false;
        }
    }

    public execute(character: BaseCharacter): void {
        // Make sure we have a valid character
        if (!character || !character.getCollisionBody) return;
        
        const now = performance.now();
        const timeSinceStart = now - this.fallStartTime;
        
        // Don't allow landing state transition for a minimum time if we started with a jump
        // This prevents immediate ground detection right after jumping
        if (this.wasJumping && timeSinceStart < this.MIN_AIRBORNE_TIME) {
            return;
        }
        
        // Only check for ground contact periodically to improve performance
        if (now - this.lastGroundCheckTime >= this.GROUND_CHECK_INTERVAL) {
            this.lastGroundCheckTime = now;
            
            try {
                // Get current velocity for checks
                const velocity = character.getCollisionBody().velocity;
                const yVelocity = parseFloat(velocity.y.toFixed(2));
                
                // Skip ground detection if we're still moving upward significantly
                // This is important for jumps - don't detect ground when we're going up
                if (yVelocity > 0.5) {
                    return;
                }
                
                // Method 1: Check using standard isGrounded which uses raycasting
                // But only if we're moving downward or at the peak
                if (yVelocity <= 0.1 && character.isGrounded()) {
                    this.transitionToLanding(character, "standard ground raycast");
                    return;
                }
                
                // Method 2: If we were jumping, only use extended ground check once we're falling
                // This prevents detecting the ground we just jumped from
                if ((!this.wasJumping || yVelocity < 0) && character.isGrounded(0.2)) {
                    this.transitionToLanding(character, "extended ground raycast (0.2)");
                    return;
                }
                
                // Method 3: Check using hasLandedRecently as a backup
                // But ignore this for the first part of a jump
                if ((!this.wasJumping || timeSinceStart > this.MIN_AIRBORNE_TIME * 1.5) && 
                    character.hasLandedRecently(100)) {
                    this.transitionToLanding(character, "recent collision");
                    return;
                }
                
                // Method 4: Advanced check for when we were falling but suddenly stopped
                // Only trigger this if we're actually falling first
                if (yVelocity < -0.5 && this.previouslyFalling(character) && Math.abs(yVelocity) < 0.1) {
                    this.transitionToLanding(character, "velocity inflection");
                    return;
                }
                
                // Safety check: If we've been airborne too long, force transition
                // This prevents getting stuck in an airborne state indefinitely
                if (timeSinceStart > this.MAX_AIRBORNE_TIME) {
                    console.log("Emergency landing triggered - airborne too long");
                    this.transitionToLanding(character, "timeout");
                    return;
                }
            } catch (error) {
                // Handle any errors gracefully
                console.log("Error in execute:", error);
            }
        }
    }
    
    // Check if the character was previously falling
    private previouslyFalling(character: BaseCharacter): boolean {
        if (!character || !character.getCollisionBody()) return false;
        
        try {
            // Get the character's previous y velocity from the character itself
            return character.getCollisionBody().velocity.y < -0.5;
        } catch (error) {
            // Handle any errors gracefully
            console.log("Error in previouslyFalling:", error);
            return false;
        }
    }
    
    // Helper method to transition to landing state with reason
    private transitionToLanding(character: BaseCharacter, reason: string): void {
        const landingState = new CharacterLandingState(character);
        landingState.enter(character);
        const duration = performance.now() - this.fallStartTime;
        console.log(`Airborne → Landing state (${reason}, after ${duration.toFixed(0)}ms)`);
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
