/**
 * Game.js - Main game engine class
 * Optimized implementation for the EcoSEED project
 */

import { Scene } from './base/index.js';
import { eventSystem } from '../systems/EventSystem.js';
import AssetManager from './AssetManager.js';
import InputManager from './InputManager.js';
import GraphicsGenerator from '../graphics/GraphicsGenerator.js';

/**
 * Main Game engine class
 * Manages scenes, game loop, rendering, and input
 */
export default class Game {
  /**
   * Create a new game instance
   * @param {HTMLCanvasElement} canvas - Canvas element to render to
   * @param {Object} options - Game options
   */
  constructor(canvas, options = {}) {
    // Core properties
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dimensions = {
      width: options.width || 800,
      height: options.height || 600
    };
    
    // Set canvas dimensions
    this.canvas.width = this.dimensions.width;
    this.canvas.height = this.dimensions.height;
    
    // Game state
    this.state = {
      running: false,
      debug: options.debug || false,
      paused: false
    };
    
    // Timing information
    this.timing = {
      lastTime: 0,
      deltaTime: 0,
      frameTime: 0,
      frameCount: 0,
      fps: 0,
      maxFPS: options.maxFPS || 60,
      timeStep: options.timeStep || (1 / 60),
      fixedTimeStep: options.fixedTimeStep ?? true
    };
    
    // Core systems
    this.assetManager = new AssetManager();
    this.graphicsGenerator = new GraphicsGenerator(this.assetManager);
    this.eventSystem = eventSystem;
    this.scenes = new Map();
    this.currentScene = null;
    
    // Input handling
    this.inputManager = new InputManager(canvas);
    
    // Bind methods
    this.gameLoop = this.gameLoop.bind(this);
    this._handleResize = this._handleResize.bind(this);
    
    // Add resize listener
    window.addEventListener('resize', this._handleResize);
    
    // Expose FPS for debugging
    window.fps = 0;
  }
  
  /**
   * Start the game loop with the specified or first registered scene
   * @param {string} [initialSceneName] - Optional initial scene name
   */
  async start(initialSceneName) {
    if (this.state.running) return;
    
    if (this.scenes.size === 0) {
      throw new Error('No scenes registered to start');
    }
    
    // Determine scene to start
    const sceneName = initialSceneName && this.scenes.has(initialSceneName)
      ? initialSceneName
      : this.scenes.keys().next().value;
    
    // Initialize and activate scene
    await this.setScene(sceneName);
    
    // Start loop
    this.state.running = true;
    this.timing.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop);
    
    return this;
  }
  
  /**
   * Stop the game
   */
  stop() {
    this.state.running = false;
    this.inputManager?.destroy();
    console.log('Game stopped');
  }
  
  /**
   * Pause the game
   */
  pause() {
    if (!this.state.paused) {
      this.state.paused = true;
      this.currentScene?.pause();
    }
  }
  
  /**
   * Resume the game
   */
  resume() {
    if (this.state.paused) {
      this.state.paused = false;
      this.currentScene?.resume();
    }
  }
  
  /**
   * Main game loop
   * @param {number} timestamp - Current time from requestAnimationFrame
   */
  gameLoop(timestamp) {
    // Calculate delta time (in seconds)
    const deltaTimeMs = timestamp - this.timing.lastTime;
    this.timing.lastTime = timestamp;
    const deltaTime = Math.min(deltaTimeMs / 1000, 0.1); // Cap to 100ms
    this.timing.deltaTime = deltaTime;

    // Update FPS counter
    this.timing.frameTime += deltaTime;
    this.timing.frameCount++;
    if (this.timing.frameTime >= 1) {
      this.timing.fps = this.timing.frameCount / this.timing.frameTime;
      window.fps = this.timing.fps;
      this.timing.frameCount = 0;
      this.timing.frameTime = 0;
    }

    try {
      // Skip updates if paused
      if (!this.state.paused && this.currentScene) {
        this.currentScene.update(deltaTime);
      }

      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Render current scene
      if (this.currentScene && !this.state.paused) {
        this.currentScene.draw(this.ctx);
      }

      // Draw debug info if enabled
      if (this.state.debug) {
        this._drawDebugInfo();
      }
    } catch (error) {
      console.error('Error in game loop:', error);
      // Continue running to try to recover
    }

    // Request next frame
    if (this.state.running) {
      requestAnimationFrame(this.gameLoop);
    }
  }
  
  /**
   * Register a scene
   * @param {string} name - Scene name
   * @param {Scene} scene - Scene instance
   */
  registerScene(name, scene) {
    if (!(scene instanceof Scene)) {
      console.error(`registerScene: ${name} is not a valid Scene instance`);
      return false;
    }
    
    this.scenes.set(name, scene);
    return true;
  }
  
  /**
   * Set the current scene
   * @param {string} sceneName - Scene name
   */
  async setScene(sceneName) {
    console.log(`Game: Setting scene to '${sceneName}'`);
    
    if (!this.scenes.has(sceneName)) {
      console.error(`Game: Scene '${sceneName}' not found`);
      throw new Error(`Scene '${sceneName}' not found`);
    }
    
    // Deactivate current scene
    if (this.currentScene) {
      console.log(`Game: Deactivating current scene: ${this.currentScene.name}`);
      this.currentScene.deactivate();
    }
    
    // Set and initialize new scene
    this.currentScene = this.scenes.get(sceneName);
    console.log(`Game: New current scene: ${this.currentScene.name}`);
    
    try {
      if (!this.currentScene.initialized) {
        console.log(`Game: Initializing scene ${sceneName}`);
        await this.currentScene.initialize();
        console.log(`Game: Scene ${sceneName} initialized, entity count: ${this.currentScene.getEntityCount()}`);
      } else {
        console.log(`Game: Scene ${sceneName} was already initialized`);
      }
      
      console.log(`Game: Activating scene: ${sceneName}`);
      this.currentScene.activate();
      
      console.log(`Game: Scene switched to: ${sceneName}`);
      return true;
    } catch (error) {
      console.error(`Game: Error setting scene '${sceneName}':`, error);
      return false;
    }
  }
  
  /**
   * Draw debug information
   * @private
   */
  _drawDebugInfo() {
    const ctx = this.ctx;
    const fps = Math.round(this.timing.fps);
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(10, 10, 160, 60);
    
    ctx.fillStyle = 'white';
    ctx.font = '14px monospace';
    ctx.fillText(`FPS: ${fps}`, 20, 30);
    ctx.fillText(`Entities: ${this.currentScene?.getEntityCount() || 0}`, 20, 50);
    
    ctx.restore();
  }
  
  /**
   * Resize the game canvas
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    this.dimensions.width = width;
    this.dimensions.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Update camera in current scene
    if (this.currentScene && this.currentScene.camera) {
      this.currentScene.camera.width = width;
      this.currentScene.camera.height = height;
    }
  }
  
  /**
   * Toggle debug mode
   */
  toggleDebug() {
    this.state.debug = !this.state.debug;
    console.log(`Debug mode: ${this.state.debug ? 'ON' : 'OFF'}`);
  }
  
  /**
   * Check if a key is pressed
   * @param {string} key - Key to check
   * @returns {boolean} True if pressed
   */
  isKeyPressed(key) {
    return this.inputManager?.isKeyPressed(key) || false;
  }
  
  /**
   * Check if a mouse button is pressed
   * @param {number} button - Button to check
   * @returns {boolean} True if pressed
   */
  isMouseButtonPressed(button) {
    return this.inputManager?.isMouseButtonPressed(button) || false;
  }
  
  /**
   * Get the current mouse position
   * @returns {Object} Position with x and y
   */
  getMousePosition() {
    return this.inputManager?.getMousePosition() || { x: 0, y: 0 };
  }
  
  /**
   * Get the current touch positions
   * @returns {Array} Array of touch positions
   */
  getTouchPositions() {
    return this.inputManager?.getTouchPositions() || [];
  }
  
  /**
   * Handle window resize
   * @private
   */
  _handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.resize(width, height);
  }
} 