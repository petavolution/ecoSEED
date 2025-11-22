/**
 * Bird.js - Bird entity implementation
 */

import Omnivore from './Omnivore.js'; // New: extending Omnivore
import EntityFactory from '../factories/EntityFactory.js'; // Import the factory
import TransformComponent from '../components/TransformComponent.js'; // Import needed components
import PhysicsComponent from '../components/PhysicsComponent.js';
import BehaviorComponent from '../components/BehaviorComponent.js';
import BirdFlockingBehavior from '../behaviors/BirdFlockingBehavior.js';
// Import other components if Bird needs them by default (e.g., Collision? Audio?)

/**
 * Bird class representing a bird entity
 * Eats insects and seeds/plants
 */
export class Bird extends Omnivore { // Changed from Animal to Omnivore
    /**
     * Create a new Bird entity
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Set species-specific options before calling super
        options.species = 'bird';
        options.tag = 'bird';
        // Diet includes insects and plant matter (seeds/grass/plant tag)
        options.diet = options.diet || ['bee', 'butterfly', 'dragonfly', 'insect', 'grass', 'plant', 'seeds'];
        options.size = options.size || 0.3;
        options.speed = options.speed || 5.0; // Birds fly fast
        options.perceptionRadius = options.perceptionRadius || 200;
        options.dietPreference = options.dietPreference || { plantRatio: 0.2 }; // Prefer insects

        // Sprite options
        options.sprite = options.sprite || {};
        options.sprite.spriteName = options.sprite.spriteName || 'bird';
        options.sprite.frameSize = options.sprite.frameSize || { width: 32, height: 32 };
        options.sprite.frameCount = options.sprite.frameCount || 4;
        options.sprite.frameDuration = options.sprite.frameDuration || 0.08;
        
        // Call parent constructor (Omnivore)
        super(options);

        if (!this.hasTag('bird')) {
            this.addTag('bird');
        }
        
        // Bird-specific adjustments (flight physics, nesting?)
        const physics = this.getComponent('physics');
        if (physics) {
            physics.drag = 0.04; // Low drag for flight
            physics.mass = (options.size || 0.3) * 0.5; // Birds are light
        }
        
        console.log(`Bird entity ${this.id} created.`);
    }

    // Override methods if needed (e.g., specific flight movement, finding seeds)
     _findNearestFood() {
        // TODO: Could add specific logic to find seeds or prioritize insects
        return super._findNearestFood(); // Use base Omnivore logic for now
    }
}

// Register the factory function for 'bird'
EntityFactory.register('bird', (graphicsGenerator, options) => {
    // Create the Bird instance using its constructor
    const bird = new Bird(options);

    // Add common components (Transform is often added by base class or factory caller)
    // Ensure Transform is present
    if (!bird.hasComponent('transform') && options.position) {
        bird.addComponent(new TransformComponent(bird, {
            x: options.position.x,
            y: options.position.y,
            rotation: options.rotation || 0,
            zIndex: options.zIndex || 10 // Birds often fly above ground stuff
        }));
    }
    // Ensure Physics is present
    if (!bird.hasComponent('physics')) {
        bird.addComponent(new PhysicsComponent(bird, {
            mass: (options.size || 0.3) * 0.5,
            drag: 0.04
            // Max speed etc. could be set here or in constructor
        }));
    }
    // Add default Behavior
    if (!bird.hasComponent('behavior')) {
        bird.addComponent(new BehaviorComponent(bird, new BirdFlockingBehavior()));
    }

    // IMPORTANT: Do NOT add SpriteComponent or GeneratedGraphicsComponent here.
    // Rely on the centralized logic in EntityFactory.create to add the correct one.

    return bird;
});

export default Bird; 