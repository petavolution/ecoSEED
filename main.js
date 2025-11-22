/**
 * main.js - Main entry point for EcoSEED
 * Handles initialization and startup
 */

import { initialize } from './src/EcoSEED.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Get canvas element
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas element not found. Creating it.');
    createCanvas();
  }
  
  // Initialize game
  initializeGame();
  
  // Add event listeners
  setupEventListeners();
});

/**
 * Create canvas element if it doesn't exist
 */
function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.id = 'gameCanvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.backgroundColor = '#87CEEB'; // Sky blue background
  
  document.body.appendChild(canvas);
  
  return canvas;
}

/**
 * Initialize game
 */
function initializeGame() {
  const canvas = document.getElementById('gameCanvas');
  
  // Set canvas size to window dimensions
  resizeCanvas();
  
  // Initialize game
  const game = initialize(canvas, {
    width: canvas.width,
    height: canvas.height,
    debug: false
  });
  
  // Store game instance globally for debugging
  window.ecoseedGame = game;
  
  // Display info box
  displayWelcomeMessage();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Handle window resize
  window.addEventListener('resize', resizeCanvas);
  
  // Handle keyboard events
  window.addEventListener('keydown', handleKeyDown);
  
  // Handle touch events
  document.addEventListener('touchstart', handleTouchStart);
  
  // Enable debug mode with D key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'd' && window.ecoseedGame) {
      window.ecoseedGame.toggleDebug();
    }
  });
  
  // Handle clicks
  document.addEventListener('click', (e) => {
    // Enable audio on first user interaction (for browsers that block autoplay)
    fixAudioAutoplayIssues();
  });
}

/**
 * Resize canvas to window dimensions
 */
function resizeCanvas() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Update game dimensions if it's initialized
  if (window.ecoseedGame) {
    window.ecoseedGame.resize(canvas.width, canvas.height);
  }
}

/**
 * Handle keyboard input
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyDown(e) {
  // Pass keyboard events to game if initialized
  if (window.ecoseedGame) {
    // Game handles keyboard events through its input system
  }
}

/**
 * Handle touch input
 * @param {TouchEvent} e - Touch event
 */
function handleTouchStart(e) {
  // Prevent default to avoid scrolling
  e.preventDefault();
  
  // Pass touch events to game if initialized
  if (window.ecoseedGame) {
    // Game handles touch events through its input system
  }
}

/**
 * Fix audio autoplay issues on some browsers
 */
function fixAudioAutoplayIssues() {
  // Create a silent audio context and play it
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0; // Silent
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
    source.stop(0.001); // Very short duration
    
    // Remove the event listener once audio is enabled
    document.removeEventListener('click', fixAudioAutoplayIssues);
  } catch (err) {
    console.warn('Audio context not supported:', err);
  }
}

/**
 * Display welcome message
 */
function displayWelcomeMessage() {
  // Create welcome message container
  const message = document.createElement('div');
  message.id = 'welcomeMessage';
  message.style.position = 'absolute';
  message.style.top = '20px';
  message.style.left = '20px';
  message.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  message.style.color = 'white';
  message.style.padding = '15px';
  message.style.borderRadius = '5px';
  message.style.zIndex = '1000';
  message.style.maxWidth = '400px';
  message.style.transition = 'opacity 1s ease-in-out';
  
  message.innerHTML = `
    <h2 style="margin: 0 0 10px 0; color: #4CAF50;">Welcome to EcoSEED</h2>
    <p>An ecosystem simulation where you can observe the harmonics of living worlds.</p>
    <p>Click to interact with the environment.</p>
    <button id="closeWelcomeBtn" style="background: #4CAF50; border: none; padding: 5px 10px; color: white; cursor: pointer;">
      Got it
    </button>
  `;
  
  document.body.appendChild(message);
  
  // Add close button event
  document.getElementById('closeWelcomeBtn').addEventListener('click', () => {
    message.style.opacity = '0';
    setTimeout(() => {
      message.remove();
    }, 1000);
  });
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    message.style.opacity = '0';
    setTimeout(() => {
      message.remove();
    }, 1000);
  }, 10000);
} 