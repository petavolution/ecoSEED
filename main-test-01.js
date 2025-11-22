/**
 * main-test-01.js - Entry point for rendering test
 */

// Import core Game and necessary components/scenes
import Game from './src/core/Game.js';
import TestRenderScene from './src/scenes/TestRenderScene.js'; 
// Assuming EcoSEED.js handles component registration, we might not need direct imports here?
// But let's import it to potentially use the initializer if needed, though we'll customize.
import * as EcoSEED from './src/EcoSEED.js'; 

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    // Ensure canvas covers window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (window.testGame) {
            window.testGame.resize(canvas.width, canvas.height);
        }
    });

    // Initialize the game specifically for this test
    console.log("Initializing Render Test Game...");
    const gameOptions = {
        width: canvas.width,
        height: canvas.height,
        debug: true, // Enable debug for this test
        fixedTimeStep: true
    };

    // Create the Game instance directly
    const game = new Game(canvas, gameOptions);
    window.testGame = game; // Expose for debugging

    // Register the specific test scene
    game.registerScene('renderTest', new TestRenderScene({
        game: game,
        assetManager: game.assetManager, // Pass manager from game
        graphicsGenerator: game.graphicsGenerator // Pass generator from game
    }));

    // Start the game with the test scene
    game.start('renderTest').catch(err => {
        console.error('Error starting render test game:', err);
    });
}); 