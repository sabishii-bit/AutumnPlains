import { InputCommand } from './InputCommand';
import type { PlayerCharacter } from '../../entities/objects/PlayerCharacter';

/**
 * Command for jumping
 */
export class JumpCommand extends InputCommand {
    private player: PlayerCharacter;
    private wasPressed: boolean = false;

    constructor(player: PlayerCharacter, keyStates: Map<string, boolean>) {
        super(['Space'], keyStates);
        this.player = player;
    }

    public execute(): void {
        // Only trigger jump on initial press, not while held
        const isCurrentlyPressed = this.isActive();

        if (isCurrentlyPressed && !this.wasPressed) {
            const movementComponent = this.player.getMovementComponent();
            // Movement component will handle the actual jump logic
        }

        this.wasPressed = isCurrentlyPressed;
    }

    public release(): void {
        this.wasPressed = false;
    }
}
