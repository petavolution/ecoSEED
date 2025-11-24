/**
 * BirdFlockingBehavior.js - Flocking behavior for birds
 * Implements separation, alignment, and cohesion for realistic bird movement
 */

/**
 * BirdFlockingBehavior - Configures flocking behavior for birds
 */
export default class BirdFlockingBehavior {
  /**
   * Create flocking behavior configuration
   * @param {Object} options - Behavior options
   */
  constructor(options = {}) {
    // Flocking parameters
    this.separationWeight = options.separationWeight || 1.5;
    this.alignmentWeight = options.alignmentWeight || 1.0;
    this.cohesionWeight = options.cohesionWeight || 0.8;
    this.wanderWeight = options.wanderWeight || 0.4;

    // Radii for different behaviors
    this.separationRadius = options.separationRadius || 30;
    this.alignmentRadius = options.alignmentRadius || 60;
    this.cohesionRadius = options.cohesionRadius || 100;
    this.detectionRadius = options.detectionRadius || 250;

    // Perching behavior
    this.perchProbability = options.perchProbability || 0.3;
    this.perchTimeMin = options.perchTimeMin || 4;
    this.perchTimeMax = options.perchTimeMax || 10;

    // State data
    this.flockEntities = [];
    this.currentPerch = null;
  }

  /**
   * Get the state machine configuration for bird behavior
   * @returns {Object} State machine configuration
   */
  getStateConfig() {
    return {
      initialState: 'flock',
      states: this._createStates()
    };
  }

  /**
   * Create state definitions
   * @returns {Object} State definitions
   * @private
   */
  _createStates() {
    const self = this;

    return {
      flock: {
        enter: (behavior, entity) => {
          const steering = entity.getComponent('steering');
          if (!steering) return;

          // Enable flocking behaviors
          steering.addBehavior('separation', self.separationWeight, {
            radius: self.separationRadius
          });
          steering.addBehavior('alignment', self.alignmentWeight, {
            radius: self.alignmentRadius
          });
          steering.addBehavior('cohesion', self.cohesionWeight, {
            radius: self.cohesionRadius
          });
          steering.addBehavior('wander', self.wanderWeight, {
            wanderJitter: 0.3
          });
        },

        update: (entity, deltaTime) => {
          // Occasionally check if should perch
          if (Math.random() < self.perchProbability * deltaTime * 0.1) {
            const behavior = entity.getComponent('behavior');
            if (behavior) {
              behavior.changeState('perched');
            }
          }
        },

        exit: (behavior, entity) => {
          const steering = entity.getComponent('steering');
          if (steering) {
            steering.removeBehavior('separation');
            steering.removeBehavior('alignment');
            steering.removeBehavior('cohesion');
            steering.removeBehavior('wander');
          }
        }
      },

      perched: {
        enter: (behavior, entity) => {
          const steering = entity.getComponent('steering');
          if (steering) {
            steering.setVelocity({ x: 0, y: 0 });
          }

          // Set perch duration
          const duration = self.perchTimeMin + Math.random() * (self.perchTimeMax - self.perchTimeMin);
          behavior.setBlackboardValue('perchEndTime', behavior.totalTime + duration);
        },

        update: (entity, deltaTime) => {
          const behavior = entity.getComponent('behavior');
          if (!behavior) return;

          const endTime = behavior.getBlackboardValue('perchEndTime');
          if (behavior.totalTime >= endTime) {
            behavior.changeState('flock');
          }
        },

        exit: (behavior, entity) => {
          // Resume flight
        }
      },

      evade: {
        enter: (behavior, entity) => {
          const steering = entity.getComponent('steering');
          const threat = behavior.getBlackboardValue('threat');

          if (steering && threat) {
            steering.addBehavior('evade', 2.0, {
              target: threat,
              panicDistance: self.detectionRadius
            });
          }

          // Set evade duration
          behavior.setBlackboardValue('evadeEndTime', behavior.totalTime + 5);
        },

        update: (entity, deltaTime) => {
          const behavior = entity.getComponent('behavior');
          if (!behavior) return;

          const endTime = behavior.getBlackboardValue('evadeEndTime');
          const threat = behavior.getBlackboardValue('threat');

          if (!threat || behavior.totalTime >= endTime) {
            behavior.setBlackboardValue('threat', null);
            behavior.changeState('flock');
          }
        },

        exit: (behavior, entity) => {
          const steering = entity.getComponent('steering');
          if (steering) {
            steering.removeBehavior('evade');
          }
        }
      }
    };
  }

  /**
   * Set the flock entities for this bird
   * @param {Array} entities - Array of bird entities in the flock
   */
  setFlockEntities(entities) {
    this.flockEntities = entities;
  }
}
