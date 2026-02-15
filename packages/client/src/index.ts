import { Initialize } from './core/init/Initialize';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    if (!canvas) {
        throw new Error('Canvas element not found');
    }

    // Initialize the game
    new Initialize(canvas);
});
