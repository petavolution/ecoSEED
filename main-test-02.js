/**
 * main-test-02.js - Optimized entry point for EcoSEED rendering test
 * Focuses on grass rendering with flying creatures
 */

import AssetManager from './src/core/AssetManager.js';
import Game from './src/core/Game.js';
import SimpleRenderScene from './src/scenes/SimpleRenderScene.js';

// Single instance of the game
let ecoseedGame = null;

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApplication);

/**
 * Initialize the application
 */
function initializeApplication() {
  try {
    // Get or create canvas
    const canvas = getCanvas();
    
    // Create and start game
    startGame(canvas);
    
    // Setup event listeners
    setupEventListeners();
    
    // Hide loading screen after game starts
    setTimeout(hideLoadingScreen, 1000);
  } catch (error) {
    console.error('Error initializing application:', error);
    showErrorMessage(error.message);
  }
}

/**
 * Get canvas element or create one if it doesn't exist
 * @returns {HTMLCanvasElement} Canvas element
 */
function getCanvas() {
  let canvas = document.getElementById('gameCanvas');
  
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.backgroundColor = '#87CEEB'; // Sky blue background
    document.body.appendChild(canvas);
  }
  
  // Set canvas size to window dimensions
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  return canvas;
}

/**
 * Create and start the game
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
function startGame(canvas) {
  // Create core components
  const assetManager = new AssetManager();
  ecoseedGame = new Game(canvas, {
    width: canvas.width,
    height: canvas.height,
    debug: false
  });
  
  // Set up the scene
  const graphicsGenerator = ecoseedGame.graphicsGenerator;
  const renderScene = new SimpleRenderScene({
    game: ecoseedGame,
    assetManager,
    graphicsGenerator
  });
  
  // Register and start scene
  ecoseedGame.registerScene('simpleRender', renderScene);
  ecoseedGame.start('simpleRender')
    .then(() => {
      // Dispatch ready event when game has started successfully
      document.dispatchEvent(new CustomEvent('ecoseedReady'));
      console.log('EcoSEED simulation started successfully');
    })
    .catch(err => {
      console.error('Error starting game:', err);
      showErrorMessage('Failed to start game engine');
    });
  
  // Store globally for debugging
  window.ecoseedGame = ecoseedGame;
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Handle window resize
  window.addEventListener('resize', handleResize);
  
  // Toggle debug mode with D key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'd' && ecoseedGame) {
      ecoseedGame.toggleDebug();
    }
  });
}

/**
 * Handle window resize
 */
function handleResize() {
  if (!ecoseedGame) return;
  
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ecoseedGame.resize(canvas.width, canvas.height);
}

/**
 * Hide loading screen with transition
 */
function hideLoadingScreen() {
  const loading = document.getElementById('loading');
  if (!loading) return;
  
  loading.style.opacity = '0';
  loading.style.transition = 'opacity 0.5s ease-in-out';
  
  setTimeout(() => {
    loading.remove();
  }, 500);
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showErrorMessage(message) {
  if (typeof window.showError === 'function') {
    window.showError(message);
  } else {
    const loading = document.getElementById('loading');
    
    if (loading) {
      const loadingTitle = loading.querySelector('h1');
      const loadingText = loading.querySelector('p:last-child');
      const spinner = loading.querySelector('.spinner');
      
      if (loadingTitle) loadingTitle.textContent = 'Error';
      if (loadingText) loadingText.textContent = message || 'Failed to initialize';
      if (spinner) spinner.style.display = 'none';
    } else {
      alert(`Error: ${message || 'Failed to initialize'}`);
    }
  }
} 