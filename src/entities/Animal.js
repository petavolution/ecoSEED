/**
 * Animal.js - Base class for all animal entities
 * Consolidated implementation for the EcoSEED project
 */

import { Entity } from '../core/index.js';

/**
 * Base Animal class for all animal entities
 * Provides common functionality and components for all animal types
 */
export default class Animal extends Entity {
  /**
   * Create a new animal entity
   * @param {Object} options - Entity options
   * @param {string} options.species - Species name
   * @param {Object} options.position - Initial position {x, y}
   * @param {number} options.size - Size scale factor
   * @param {number} options.speed - Movement speed
   * @param {string} options.seed - Seed for procedural generation
   * @param {Object} options.genetics - Genetic traits
   * @param {Object} options.sprite - Sprite options
   */
  constructor(options = {}) {
    // Call parent constructor with basic entity options
    super({
      name: options.name || options.species || 'Animal',
      tag: options.tag || options.species || 'animal',
      active: options.active !== undefined ? options.active : true
    });
    
    // Add animal tag if not already included
    if (!this.hasTag('animal')) {
      this.addTag('animal');
    }
    
    // Add species tag if provided
    if (options.species && !this.hasTag(options.species)) {
      this.addTag(options.species);
    }
    
    // Store species
    this.species = options.species || 'animal';
    
    // Generate seed if not provided
    this.seed = options.seed || this._generateSeed();
    
    // Generate genetics if not provided
    this.genetics = options.genetics || this._generateGenetics();
    
    // Add transform component
    this.addComponent('transform', {
      position: { 
        x: options.position?.x || 0, 
        y: options.position?.y || 0 
      },
      scale: { 
        x: options.size || 1, 
        y: options.size || 1 
      },
      rotation: 0,
      zIndex: options.zIndex || 10
    });
    
    // Add sprite component if spriteSheet is provided in options
    if (options.sprite && options.sprite.spriteSheet) {
      const spriteConfig = typeof options.sprite === 'object' && options.sprite !== null ? options.sprite : {};
      this.addComponent('sprite', {
        spriteSheet: spriteConfig.spriteSheet, // Use provided sheet
        spriteName: spriteConfig.spriteName || this.species, // Default name to species if not provided
        frameSize: spriteConfig.frameSize || { width: 32, height: 32 },
        frameCount: spriteConfig.frameCount || 1, 
        frameDuration: spriteConfig.frameDuration || 0.1,
        loop: spriteConfig.loop !== undefined ? spriteConfig.loop : true,
        ...spriteConfig
      });
    }
    
    // Add physics component
    this.addComponent('physics', {
      mass: options.mass || 1,
      drag: options.drag || 0.1,
      friction: options.friction || 0,
      restitution: options.restitution || 0.2,
      maxSpeed: options.speed || (2 + this.genetics.speed * 3), // 2-5 based on genetics
      useGravity: false
    });
    
    // Add collision component
    const collisionRadius = (options.size || 1) * 16; // Radius based on size
    this.addComponent('collision', {
      shape: 'circle',
      radius: collisionRadius,
      isTrigger: false,
      collidesWith: ['animal', 'plant', 'terrain']
    });
    
    // Add behavior component with state machine
    this.addComponent('behavior', {
      states: ['idle', 'wander', 'seek', 'flee', 'eat', 'sleep', 'mate', 'dead'],
      initialState: 'idle',
      transitions: this._createBehaviorTransitions(),
      data: {
        // Survival stats
        hunger: options.hunger !== undefined ? options.hunger : 100,
        thirst: options.thirst !== undefined ? options.thirst : 100,
        health: options.health !== undefined ? options.health : 100,
        energy: options.energy !== undefined ? options.energy : 100,
        
        // Rate of stat decrease (per second)
        hungerRate: options.hungerRate || 0.5 * (1 + this.genetics.size * 0.5), // Larger animals get hungry faster
        thirstRate: options.thirstRate || 0.3 * (1 + this.genetics.size * 0.2),
        energyRate: options.energyRate || 0.2,
        
        // Age and lifespan
        age: options.age || 0,
        maxAge: options.maxAge || 300, // Seconds
        ageRate: options.ageRate || 0.05,
        
        // Reproduction
        canBreed: options.canBreed !== undefined ? options.canBreed : false,
        breedingCooldown: options.breedingCooldown || 30, // Seconds
        lastBreedTime: 0,
        pregnancyDuration: options.pregnancyDuration || 20, // Seconds
        isPregnant: options.isPregnant || false,
        pregnancyProgress: 0,
        
        // Targeting
        target: null,
        home: null,
        food: null,
        water: null,
        mate: null,
        threat: null,
        
        // Memory
        knownFoodSources: [],
        knownWaterSources: [],
        knownDangers: [],
        
        // Perception
        perceptionRadius: options.perceptionRadius || 150 * (1 + this.genetics.intelligence * 0.5), // Smarter animals see further
        lastPerceptionUpdate: 0,
        perceptionUpdateRate: 0.5, // Seconds between perception updates
        
        // Movement
        wanderRadius: options.wanderRadius || 100,
        fleeDistance: options.fleeDistance || 200,
        lastPositions: [], // Queue of recent positions to detect stuck behavior
      }
    });
    
    // Add steering component for movement
    this.addComponent('steering', {
      maxSpeed: options.speed || (2 + this.genetics.speed * 3),
      maxForce: options.maxForce || 15 * (1 + this.genetics.dexterity * 0.5), // Steering force scales with dexterity
      enabled: true,
      avoidance: {
        enabled: true,
        radius: collisionRadius * 2
      }
    });
    
    // Set up animal-specific behavior handlers
    // TEMPORARY FIX: Comment out to prevent crash due to BehaviorComponent mismatch
    // this._setupBehaviorHandlers(); 
  }
  
  /**
   * Create the behavior transitions for the state machine
   * @returns {Object} Transitions object for behavior component
   * @private
   */
  _createBehaviorTransitions() {
    return {
      'idle': {
        'hungry': 'seek',
        'thirsty': 'seek',
        'tired': 'sleep',
        'danger': 'flee',
        'timeout': 'wander'
      },
      'wander': {
        'hungry': 'seek',
        'thirsty': 'seek',
        'tired': 'sleep',
        'danger': 'flee',
        'mate_found': 'mate',
        'timeout': 'idle'
      },
      'seek': {
        'target_reached': 'eat',
        'target_lost': 'wander',
        'danger': 'flee',
        'tired': 'sleep'
      },
      'flee': {
        'safe': 'idle',
        'exhausted': 'idle',
        'timeout': 'wander'
      },
      'eat': {
        'finished': 'idle',
        'danger': 'flee',
        'timeout': 'wander'
      },
      'sleep': {
        'rested': 'idle',
        'danger': 'flee',
        'timeout': 'idle'
      },
      'mate': {
        'finished': 'idle',
        'danger': 'flee',
        'timeout': 'wander'
      },
      'dead': {
        // Terminal state
      }
    };
  }
  
  /**
   * Set up behavior handlers for animal states
   * @private
   */
  _setupBehaviorHandlers() {
    const behavior = this.getComponent('behavior');
    if (!behavior) return;
    
    // Set up state handlers
    behavior.setStateHandler('idle', this._handleIdleState.bind(this));
    behavior.setStateHandler('wander', this._handleWanderState.bind(this));
    behavior.setStateHandler('seek', this._handleSeekState.bind(this));
    behavior.setStateHandler('flee', this._handleFleeState.bind(this));
    behavior.setStateHandler('eat', this._handleEatState.bind(this));
    behavior.setStateHandler('sleep', this._handleSleepState.bind(this));
    behavior.setStateHandler('mate', this._handleMateState.bind(this));
    behavior.setStateHandler('dead', this._handleDeadState.bind(this));
    
    // Set up transition conditions
    behavior.setTransitionCondition('hungry', this._isHungry.bind(this));
    behavior.setTransitionCondition('thirsty', this._isThirsty.bind(this));
    behavior.setTransitionCondition('tired', this._isTired.bind(this));
    behavior.setTransitionCondition('danger', this._isInDanger.bind(this));
    behavior.setTransitionCondition('target_reached', this._hasReachedTarget.bind(this));
    behavior.setTransitionCondition('target_lost', this._hasLostTarget.bind(this));
    behavior.setTransitionCondition('safe', this._isSafe.bind(this));
    behavior.setTransitionCondition('finished', this._hasFinishedAction.bind(this));
    behavior.setTransitionCondition('rested', this._isRested.bind(this));
    behavior.setTransitionCondition('exhausted', this._isExhausted.bind(this));
    behavior.setTransitionCondition('mate_found', this._hasMateNearby.bind(this));
  }
  
  /**
   * Generate a seed string for procedural generation
   * @returns {string} Random seed string
   * @private
   */
  _generateSeed() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  
  /**
   * Generate genetic traits based on seed
   * @returns {Object} Genetic traits object
   * @private
   */
  _generateGenetics() {
    // Convert seed to number for deterministic randomness
    let seedValue = 0;
    for (let i = 0; i < this.seed.length; i++) {
      seedValue += this.seed.charCodeAt(i);
    }
    
    // Use seedValue to generate deterministic random numbers
    const rand = (min = 0, max = 1) => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      const random = seedValue / 233280;
      return min + random * (max - min);
    };
    
    // Generate genetic traits
    return {
      intelligence: rand(0.2, 1.0), // Affects perception, learning
      speed: rand(0.2, 1.0),        // Affects movement speed
      strength: rand(0.2, 1.0),     // Affects combat, carrying
      dexterity: rand(0.2, 1.0),    // Affects precision, steering
      size: rand(0.5, 1.5),         // Affects physical size, health
      fertility: rand(0.2, 1.0),    // Affects breeding success
      lifespan: rand(0.5, 1.5),     // Affects maximum age
      aggression: rand(0.0, 1.0),   // Affects fight/flight decisions
      metabolism: rand(0.5, 1.5)    // Affects hunger/thirst rates
    };
  }
  
  // State Handlers
  
  /**
   * Handle idle state behavior
   * @param {number} deltaTime - Time elapsed since last update
   * @private
   */
  _handleIdleState(deltaTime) {
    const behavior = this.getComponent('behavior');
    const steering = this.getComponent('steering');
    
    // In idle state, the animal should stop moving
    if (steering) {
      steering.idle();
    }
    
    // Randomly transition to wander state after some time
    behavior.setStateTimeout('idle', Math.random() * 5 + 2); // 2-7 seconds
  }
  
  /**
   * Handle wander state behavior
   * @param {number} deltaTime - Time elapsed since last update
   * @private
   */
  _handleWanderState(deltaTime) {
    const behavior = this.getComponent('behavior');
    const steering = this.getComponent('steering');
    
    if (steering) {
      // Use wander behavior
      steering.wander({
        radius: behavior.data.wanderRadius,
        distance: 60,
        jitter: 5 * deltaTime
      });
    }
    
    // Update perception to find targets, dangers, etc.
    this._updatePerception(deltaTime);
    
    // Set timeout to return to idle after a while
    behavior.setStateTimeout('wander', Math.random() * 10 + 5); // 5-15 seconds
  }
  
  /**
   * Handle seek state behavior
   * @param {number} deltaTime - Time elapsed since last update
   * @private
   */
  _handleSeekState(deltaTime) {
    const behavior = this.getComponent('behavior');
    const steering = this.getComponent('steering');
    const transform = this.getComponent('transform');
    
    // Find food or water if needed
    if (this._isHungry() && !behavior.data.food) {
      behavior.data.food = this._findNearestFood();
    }
    
    if (this._isThirsty() && !behavior.data.water) {
      behavior.data.water = this._findNearestWater();
    }
    
    // Set target based on most urgent need
    if (behavior.data.hunger < behavior.data.thirst && behavior.data.food) {
      behavior.data.target = behavior.data.food;
    } else if (behavior.data.water) {
      behavior.data.target = behavior.data.water;
    } else {
      // No valid target, go back to wandering
      behavior.changeState('wander');
      return;
    }
    
    // Seek the target
    if (steering && behavior.data.target) {
      steering.seek(behavior.data.target);
    }
    
    // Check if reached target
    if (transform && behavior.data.target) {
      const dx = transform.x - behavior.data.target.x;
      const dy = transform.y - behavior.data.target.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < 25) { // 5 units radius
        behavior.triggerTransition('target_reached');
      }
    }
    
    // Update perception to find dangers
    this._updatePerception(deltaTime);
    
    // Set timeout to go back to wandering if stuck seeking
    behavior.setStateTimeout('seek', 20); // 20 seconds
  }
  
  /**
   * Handle flee state behavior
   * @param {number} deltaTime - Time elapsed since last update
   * @private
   */
  _handleFleeState(deltaTime) {
    const behavior = this.getComponent('behavior');
    const steering = this.getComponent('steering');
    const transform = this.getComponent('transform');
    
    // If no threat, go back to idle
    if (!behavior.data.threat) {
      behavior.triggerTransition('safe');
      return;
    }
    
    // Flee from the threat
    if (steering && behavior.data.threat) {
      steering.flee(behavior.data.threat, behavior.data.fleeDistance);
    }
    
    // Check if safe distance has been reached
    if (transform && behavior.data.threat) {
      const dx = transform.x - behavior.data.threat.x;
      const dy = transform.y - behavior.data.threat.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq > behavior.data.fleeDistance * behavior.data.fleeDistance) {
        behavior.data.threat = null;
        behavior.triggerTransition('safe');
      }
    }
    
    // Consume energy faster while fleeing
    behavior.data.energy -= behavior.data.energyRate * 3 * deltaTime;
    
    // If energy is too low, become exhausted
    if (behavior.data.energy < 10) {
      behavior.triggerTransition('exhausted');
    }
    
    // Set timeout to go back to wandering if stuck fleeing
    behavior.setStateTimeout('flee', 10); // 10 seconds
  }
  
  /**
   * Handle eat state behavior
   * @param {number} deltaTime - Time elapsed since last update
   * @private
   */
  _handleEatState(deltaTime) {
    const behavior = this.getComponent('behavior');
    const steering = this.getComponent('steering');
    
    // Stop moving while eating
    if (steering) {
      steering.idle();
    }
    
    // Eat food
    if (behavior.data.food) {
      if (behavior.data.food.nutrition) {
        // Gain nutrition from food
        behavior.data.hunger = Math.min(100, behavior.data.hunger + behavior.data.food.nutrition * deltaTime * 10);
        
        // Food is consumed
        if (behavior.data.hunger >= 90) {
          behavior.data.food = null;
          behavior.triggerTransition('finished');
        }
      } else {
        // Generic food with no nutrition value
        behavior.data.hunger = Math.min(100, behavior.data.hunger + 20 * deltaTime);
        
        // Finished eating after a while
        if (behavior.data.hunger >= 90) {
          behavior.data.food = null;
          behavior.triggerTransition('finished');
        }
      }
    } else {
      behavior.triggerTransition('finished');
    }
    
    // Update perception to find dangers
    this._updatePerception(deltaTime);
    
    // Set timeout to go back to wandering if stuck eating
    behavior.setStateTimeout('eat', 5); // 5 seconds
  }
  
  /**
   * Handle sleep state behavior
   * @param {number} deltaTime - Time elapsed since last update
   * @private
   */
  _handleSleepState(deltaTime) {
    const behavior = this.getComponent('behavior');
    const steering = this.getComponent('steering');
    
    // Stop moving while sleeping
    if (steering) {
      steering.idle();
    }
    
    // Regain energy while sleeping
    behavior.data.energy = Math.min(100, behavior.data.energy + 15 * deltaTime);
    
    // If energy is high enough, wake up
    if (behavior.data.energy > 90) {
      behavior.triggerTransition('rested');
    }
    
    // Still update perception for dangers, but less frequently
    if (Math.random() < 0.2 * deltaTime) {
      this._updatePerception(deltaTime);
    }
    
    // Set timeout to go back to wandering if something disturbs sleep
    behavior.setStateTimeout('sleep', 15); // 15 seconds
  }
  
  /**
   * Handle mate state behavior
   * @param {number} deltaTime - Time elapsed since last update
   * @private
   */
  _handleMateState(deltaTime) {
    const behavior = this.getComponent('behavior');
    const steering = this.getComponent('steering');
    const transform = this.getComponent('transform');
    
    // If no mate, go back to idle
    if (!behavior.data.mate) {
      behavior.triggerTransition('finished');
      return;
    }
    
    // Move towards mate if not close enough
    if (steering && behavior.data.mate && transform) {
      const dx = transform.x - behavior.data.mate.x;
      const dy = transform.y - behavior.data.mate.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq > 25) { // Not close enough
        steering.seek(behavior.data.mate);
      } else {
        // Close enough to mate
        steering.idle();
        
        // Mating logic
        if (!behavior.data.isPregnant && behavior.data.mate.canBreed) {
          // Successful mating
          behavior.data.isPregnant = true;
          behavior.data.pregnancyProgress = 0;
          behavior.data.lastBreedTime = behavior.data.time;
          
          // Reset mate's breeding cooldown
          behavior.data.mate.lastBreedTime = behavior.data.time;
          behavior.data.mate.canBreed = false;
          
          // Done mating
          behavior.data.mate = null;
          behavior.triggerTransition('finished');
        }
      }
    }
    
    // Set timeout to go back to wandering if stuck mating
    behavior.setStateTimeout('mate', 10); // 10 seconds
  }
  
  /**
   * Handle dead state behavior
   * @param {number} deltaTime - Time elapsed since last update
   * @private
   */
  _handleDeadState(deltaTime) {
    const steering = this.getComponent('steering');
    const sprite = this.getComponent('sprite');
    
    // Stop moving when dead
    if (steering) {
      steering.idle();
    }
    
    // Change sprite to dead animation if available
    if (sprite && sprite.setAnimation && sprite.hasAnimation('dead')) {
      sprite.setAnimation('dead');
    }
    
    // Fade out over time
    this.alpha = Math.max(0, (this.alpha || 1) - 0.1 * deltaTime);
    
    // Remove entity when fully faded
    if (this.alpha <= 0.1) {
      this.destroy();
    }
  }
  
  // Transition conditions
  
  /**
   * Check if animal is hungry
   * @returns {boolean} True if hungry
   * @private
   */
  _isHungry() {
    const behavior = this.getComponent('behavior');
    return behavior && behavior.data.hunger < 30;
  }
  
  /**
   * Check if animal is thirsty
   * @returns {boolean} True if thirsty
   * @private
   */
  _isThirsty() {
    const behavior = this.getComponent('behavior');
    return behavior && behavior.data.thirst < 30;
  }
  
  /**
   * Check if animal is tired
   * @returns {boolean} True if tired
   * @private
   */
  _isTired() {
    const behavior = this.getComponent('behavior');
    return behavior && behavior.data.energy < 20;
  }
  
  /**
   * Check if animal is in danger
   * @returns {boolean} True if in danger
   * @private
   */
  _isInDanger() {
    const behavior = this.getComponent('behavior');
    return behavior && behavior.data.threat !== null;
  }
  
  /**
   * Check if animal has reached target
   * @returns {boolean} True if target reached
   * @private
   */
  _hasReachedTarget() {
    const behavior = this.getComponent('behavior');
    const transform = this.getComponent('transform');
    
    if (!behavior || !transform || !behavior.data.target) return false;
    
    const dx = transform.x - behavior.data.target.x;
    const dy = transform.y - behavior.data.target.y;
    const distSq = dx * dx + dy * dy;
    
    return distSq < 25; // 5 units radius
  }
  
  /**
   * Check if animal has lost target
   * @returns {boolean} True if target lost
   * @private
   */
  _hasLostTarget() {
    const behavior = this.getComponent('behavior');
    return behavior && !behavior.data.target;
  }
  
  /**
   * Check if animal is safe from danger
   * @returns {boolean} True if safe
   * @private
   */
  _isSafe() {
    const behavior = this.getComponent('behavior');
    return behavior && !behavior.data.threat;
  }
  
  /**
   * Check if animal has finished current action
   * @returns {boolean} True if finished
   * @private
   */
  _hasFinishedAction() {
    // This is handled uniquely in each state
    return false;
  }
  
  /**
   * Check if animal is rested
   * @returns {boolean} True if rested
   * @private
   */
  _isRested() {
    const behavior = this.getComponent('behavior');
    return behavior && behavior.data.energy > 90;
  }
  
  /**
   * Check if animal is exhausted
   * @returns {boolean} True if exhausted
   * @private
   */
  _isExhausted() {
    const behavior = this.getComponent('behavior');
    return behavior && behavior.data.energy < 10;
  }
  
  /**
   * Check if there is a potential mate nearby
   * @returns {boolean} True if mate found
   * @private
   */
  _hasMateNearby() {
    const behavior = this.getComponent('behavior');
    return behavior && behavior.data.mate !== null;
  }
  
  // Perception and targeting methods
  
  /**
   * Update perception to find targets, dangers, etc.
   * @param {number} deltaTime - Time elapsed since last update
   * @private
   */
  _updatePerception(deltaTime) {
    const behavior = this.getComponent('behavior');
    if (!behavior) return;
    
    // Only update perception periodically to save performance
    behavior.data.lastPerceptionUpdate += deltaTime;
    if (behavior.data.lastPerceptionUpdate < behavior.data.perceptionUpdateRate) {
      return;
    }
    
    // Reset timer
    behavior.data.lastPerceptionUpdate = 0;
    
    // Get nearby entities
    this._scanForThreats();
    
    // If not hungry or thirsty, scan for potential mates
    if (!this._isHungry() && !this._isThirsty() && behavior.data.canBreed) {
      this._scanForMates();
    }
  }
  
  /**
   * Scan for predators and other threats
   * @private
   */
  _scanForThreats() {
    const behavior = this.getComponent('behavior');
    const transform = this.getComponent('transform');
    
    if (!behavior || !transform || !this.scene) return;
    
    // Get nearby entities that might be threats
    const threats = this.scene.findEntitiesByTag('predator');
    
    // Find closest threat
    let closestThreat = null;
    let closestDistSq = behavior.data.perceptionRadius * behavior.data.perceptionRadius;
    
    for (const threat of threats) {
      if (threat === this) continue; // Skip self
      
      const threatTransform = threat.getComponent('transform');
      if (!threatTransform) continue;
      
      const dx = transform.x - threatTransform.x;
      const dy = transform.y - threatTransform.y;
      const distSq = dx * dx + dy * dy;
      
      // Check if in perception range and closer than current threat
      if (distSq < closestDistSq) {
        // Check if this animal is prey for the threat
        if (this._isPredatorOf(threat, this)) {
          closestThreat = threat;
          closestDistSq = distSq;
        }
      }
    }
    
    // Update current threat
    behavior.data.threat = closestThreat;
  }
  
  /**
   * Scan for potential mates
   * @private
   */
  _scanForMates() {
    const behavior = this.getComponent('behavior');
    const transform = this.getComponent('transform');
    
    if (!behavior || !transform || !this.scene) return;
    
    // Only look for mates if not already pregnant
    if (behavior.data.isPregnant) return;
    
    // Only look for mates of same species
    const potentialMates = this.scene.findEntitiesByTag(this.species);
    
    // Find closest valid mate
    let closestMate = null;
    let closestDistSq = behavior.data.perceptionRadius * behavior.data.perceptionRadius;
    
    for (const mate of potentialMates) {
      if (mate === this) continue; // Skip self
      
      const mateTransform = mate.getComponent('transform');
      if (!mateTransform) continue;
      
      const mateBehavior = mate.getComponent('behavior');
      if (!mateBehavior || !mateBehavior.data.canBreed) continue; // Skip if not ready to breed
      
      const dx = transform.x - mateTransform.x;
      const dy = transform.y - mateTransform.y;
      const distSq = dx * dx + dy * dy;
      
      // Check if in perception range and closer than current mate
      if (distSq < closestDistSq) {
        closestMate = mate;
        closestDistSq = distSq;
      }
    }
    
    // Update current mate
    behavior.data.mate = closestMate;
  }
  
  /**
   * Find nearest food source
   * @returns {Object|null} Nearest food source or null if none found
   * @private
   */
  _findNearestFood() {
    // This should be overridden by subclasses to find appropriate food
    return null;
  }
  
  /**
   * Find nearest water source
   * @returns {Object|null} Nearest water source or null if none found
   * @private
   */
  _findNearestWater() {
    // This should be overridden by subclasses to find water
    return null;
  }
  
  /**
   * Check if one animal is a predator of another
   * @param {Animal} predator - Potential predator
   * @param {Animal} prey - Potential prey
   * @returns {boolean} True if predator preys on prey
   * @private
   */
  _isPredatorOf(predator, prey) {
    // This should be overridden by subclasses with proper predator-prey relationships
    return false;
  }
  
  /**
   * Update animal state for one frame
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(deltaTime) {
    super.update(deltaTime);
    
    const behavior = this.getComponent('behavior');
    if (!behavior) return;
    
    // Use blackboard methods for data access
    let hunger = behavior.getBlackboardValue('hunger', 100);
    let thirst = behavior.getBlackboardValue('thirst', 100);
    let energy = behavior.getBlackboardValue('energy', 100);
    let age = behavior.getBlackboardValue('age', 0);
    let health = behavior.getBlackboardValue('health', 100);
    let isPregnant = behavior.getBlackboardValue('isPregnant', false);
    let pregnancyProgress = behavior.getBlackboardValue('pregnancyProgress', 0);
    let canBreed = behavior.getBlackboardValue('canBreed', false);
    let lastBreedTime = behavior.getBlackboardValue('lastBreedTime', 0);

    const hungerRate = behavior.getBlackboardValue('hungerRate', 0.5);
    const thirstRate = behavior.getBlackboardValue('thirstRate', 0.3);
    const energyRate = behavior.getBlackboardValue('energyRate', 0.2);
    const ageRate = behavior.getBlackboardValue('ageRate', 0.05);
    const maxAge = behavior.getBlackboardValue('maxAge', 300);
    const pregnancyDuration = behavior.getBlackboardValue('pregnancyDuration', 20);
    const breedingCooldown = behavior.getBlackboardValue('breedingCooldown', 30);
    const currentTime = behavior.getBlackboardValue('time'); // Assuming time is put on blackboard elsewhere?
                                                           // Or use totalTime from behavior component itself?
    // Let's use totalTime for now if 'time' isn't explicitly set.
    const effectiveTime = currentTime !== undefined ? currentTime : behavior.totalTime;

    // Update survival stats
    hunger = Math.max(0, hunger - hungerRate * deltaTime);
    thirst = Math.max(0, thirst - thirstRate * deltaTime);
    energy = Math.max(0, energy - energyRate * deltaTime);
    age = age + ageRate * deltaTime;

    // Store updated values back to blackboard
    behavior.setBlackboardValue('hunger', hunger);
    behavior.setBlackboardValue('thirst', thirst);
    behavior.setBlackboardValue('energy', energy);
    behavior.setBlackboardValue('age', age);
    
    // Handle death conditions
    if (hunger <= 0 || thirst <= 0 || health <= 0 || age >= maxAge) {
      if (behavior.currentState !== 'dead') {
        behavior.changeState('dead'); // Assuming changeState works correctly
      }
      // Need to return here, otherwise pregnancy/breeding checks might run on dead animal
      return; 
    }
    
    // Handle pregnancy
    if (isPregnant) {
      pregnancyProgress += deltaTime;
      behavior.setBlackboardValue('pregnancyProgress', pregnancyProgress);
      
      if (pregnancyProgress >= pregnancyDuration) {
        // Give birth
        this._giveBirth(); // Assumes this method exists and works
        behavior.setBlackboardValue('isPregnant', false);
        behavior.setBlackboardValue('pregnancyProgress', 0);
        // Reset breeding cooldown? Add this logic if needed.
        // behavior.setBlackboardValue('lastBreedTime', effectiveTime);
        // behavior.setBlackboardValue('canBreed', false); 
      }
    }
    
    // Update breeding cooldown
    if (!canBreed && breedingCooldown > 0) {
      if (effectiveTime - lastBreedTime >= breedingCooldown) {
        behavior.setBlackboardValue('canBreed', true);
      }
    }
  }
  
  /**
   * Give birth to offspring
   * @private
   */
  _giveBirth() {
    // This should be overridden by subclasses to create appropriate offspring
  }
  
  /**
   * Create a child animal by mixing parent genetics
   * @param {Animal} mate - The other parent
   * @returns {Object} Genetics for offspring
   * @private
   */
  _createChildGenetics(mate) {
    const childGenetics = {};
    
    // Mix genetics from both parents
    for (const trait in this.genetics) {
      if (Object.prototype.hasOwnProperty.call(this.genetics, trait) && 
          Object.prototype.hasOwnProperty.call(mate.genetics, trait)) {
        // Mix traits with random variation
        const avg = (this.genetics[trait] + mate.genetics[trait]) / 2;
        childGenetics[trait] = avg + (Math.random() * 0.2 - 0.1); // +/- 10% variation
        
        // Clamp to valid range
        childGenetics[trait] = Math.max(0, Math.min(childGenetics[trait], 1));
      }
    }
    
    return childGenetics;
  }
} 