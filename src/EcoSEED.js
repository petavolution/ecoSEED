/**
 * EcoSEED.js - Main application initialization
 * Simplified entry point for the ecosystem simulation
 */

import { Game, Scene } from './core/index.js';

// Import components to ensure they're registered before use
import TransformComponent from './components/TransformComponent.js';
import PhysicsComponent from './components/PhysicsComponent.js';
import CollisionComponent from './components/CollisionComponent.js';
import SteeringComponent from './components/SteeringComponent.js';
import BehaviorComponent from './components/BehaviorComponent.js';

// Import systems
import RenderSystem from './systems/RenderSystem.js';
import PhysicsSystem from './systems/PhysicsSystem.js';
import SeasonSystem from './systems/SeasonSystem.js';
import WeatherSystem from './systems/WeatherSystem.js';

// Import factory
import EntityFactory from './factories/EntityFactory.js';

// Log component registrations
console.log('EcoSEED: Components loaded');

/**
 * Main ecosystem scene
 */
class EcosystemScene extends Scene {
  constructor(options = {}) {
    super('Ecosystem', options);
    this.worldWidth = options.worldWidth || 2000;
    this.worldHeight = options.worldHeight || 1500;
  }

  /**
   * Called when scene initializes
   */
  onInitialize() {
    console.log('EcosystemScene: Initializing...');

    // Add core systems
    this.addSystem(new RenderSystem({ debug: false }));
    this.addSystem(new PhysicsSystem({ gridCellSize: 64 }));
    this.addSystem(new SeasonSystem({ dayDuration: 60 }));
    this.addSystem(new WeatherSystem());

    // Spawn initial entities
    this._spawnInitialEntities();

    console.log(`EcosystemScene: Initialized with ${this.getEntityCount()} entities`);
  }

  /**
   * Spawn initial ecosystem entities
   */
  _spawnInitialEntities() {
    const factory = EntityFactory;

    // Spawn some lakes
    for (let i = 0; i < 3; i++) {
      const lake = factory.create('lake', this.graphicsGenerator, {
        position: {
          x: 200 + Math.random() * (this.worldWidth - 400),
          y: 200 + Math.random() * (this.worldHeight - 400)
        },
        radius: 50 + Math.random() * 50
      });
      if (lake) this.addEntity(lake);
    }

    // Spawn some grass patches
    for (let i = 0; i < 20; i++) {
      const grass = factory.create('grass', this.graphicsGenerator, {
        position: {
          x: Math.random() * this.worldWidth,
          y: Math.random() * this.worldHeight
        }
      });
      if (grass) this.addEntity(grass);
    }

    // Spawn some animals
    for (let i = 0; i < 5; i++) {
      const animal = factory.create('animal', this.graphicsGenerator, {
        position: {
          x: 100 + Math.random() * (this.worldWidth - 200),
          y: 100 + Math.random() * (this.worldHeight - 200)
        },
        species: 'bunny'
      });
      if (animal) this.addEntity(animal);
    }

    // Spawn some birds
    for (let i = 0; i < 3; i++) {
      const bird = factory.create('bird', this.graphicsGenerator, {
        position: {
          x: 100 + Math.random() * (this.worldWidth - 200),
          y: 100 + Math.random() * (this.worldHeight - 200)
        }
      });
      if (bird) this.addEntity(bird);
    }
  }

  /**
   * Draw background before entities
   */
  onPreDraw(ctx) {
    // Draw sky gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, this.camera.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.camera.width, this.camera.height);

    // Draw simple ground
    ctx.fillStyle = '#7CB342';
    ctx.fillRect(0, this.camera.height * 0.7, this.camera.width, this.camera.height * 0.3);
  }
}

/**
 * Initialize and start the EcoSEED application
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} options - Configuration options
 * @returns {Game} Game instance
 */
export function initialize(canvas, options = {}) {
  console.log('EcoSEED: Starting initialization...');

  // Create game instance
  const game = new Game(canvas, {
    width: options.width || window.innerWidth,
    height: options.height || window.innerHeight,
    debug: options.debug || false
  });

  // Create main scene
  const scene = new EcosystemScene({
    width: options.width || window.innerWidth,
    height: options.height || window.innerHeight,
    worldWidth: options.worldWidth || 2000,
    worldHeight: options.worldHeight || 1500
  });

  // Set game reference on scene
  scene.game = game;

  // Register scene
  game.registerScene('ecosystem', scene);

  // Start game loop
  game.start('ecosystem').then(() => {
    console.log('EcoSEED: Game started successfully');
  }).catch(err => {
    console.error('EcoSEED: Failed to start game:', err);
  });

  return game;
}

export default { initialize };
