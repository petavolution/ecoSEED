/**
 * BehaviorComponent.js - Implements AI behaviors for entities
 * Manages state machines, behavior trees, and decision making for game entities
 */

import Component from '../core/base/Component.js';
import { Entity } from '../core/index.js';

/**
 * BehaviorComponent - Manages entity behaviors using a state machine pattern
 */
class BehaviorComponent extends Component {
    /**
     * Create a new BehaviorComponent
     * @param {Entity} entity - The entity this component belongs to
     * @param {Object} options - Configuration options
     * @param {string} options.initialState - Initial state name
     * @param {Object} options.states - State definitions
     * @param {Object} options.globalTransitions - Transitions that apply in any state
     * @param {Function} options.onStateChange - Callback when state changes
     * @param {Object} options.blackboard - Shared data for behavior decisions
     */
    constructor(entity, options = {}) {
        super('behavior', entity);
        
        this.name = 'BehaviorComponent';
        this.states = new Map(); // Map of state name -> state definition
        this.currentState = options.initialState || null;
        this.previousState = null;
        this.stateTime = 0;
        this.globalTransitions = [];
        this.blackboard = new Map(); // Initialize blackboard
        
        // Populate blackboard from options.data if it exists
        if (options.data && typeof options.data === 'object') {
            for (const [key, value] of Object.entries(options.data)) {
                this.blackboard.set(key, value);
            }
        }
        
        // Initialize with default options
        this.debugMode = options.debugMode || false;
        
        // Custom behaviors and cooldowns
        this.behaviors = new Map();
        this.cooldowns = new Map();
        
        // Timers
        this.totalTime = 0;
    }
    
    /**
     * Initialize the component
     */
    init() {
        // Get relevant components
        this.transform = this.entity.getComponent('transform');
        this.steering = this.entity.getComponent('steering');
        
        // Enter initial state
        if (this.currentState) {
            this._enterState(this.currentState);
        } else if (this.states.size > 0) {
            this.changeState([...this.states.keys()][0]);
        }
    }
    
    /**
     * Add a state to the state machine
     * @param {string} stateName - Name of the state
     * @param {object} stateDefinition - State definition object
     */
    addState(stateName, stateDefinition) {
        this.states.set(stateName, stateDefinition);
        return this;
    }
    
    /**
     * Change the current state
     * @param {string} newStateName - Name of the state to change to
     * @returns {boolean} Whether the state change was successful
     */
    changeState(newStateName) {
        // Check if state exists
        if (!this.states.has(newStateName)) {
            console.warn(`State "${newStateName}" does not exist in BehaviorComponent`);
            return false;
        }
        
        // Exit current state if it exists
        if (this.currentState) {
            const currentState = this.states.get(this.currentState);
            if (currentState.exit) {
                currentState.exit(this.entity);
            }
            this.previousState = this.currentState;
        }
        
        // Change state
        this.currentState = newStateName;
        this.stateTime = 0;
        
        // Enter new state
        const newState = this.states.get(newStateName);
        if (newState.enter) {
            this._enterState(newStateName);
        }
        
        if (this.debugMode) {
            console.log(`Entity ${this.entity.name} changed state to "${newStateName}"`);
        }
        
        return true;
    }
    
    /**
     * Add a global transition that can occur from any state
     * @param {Function} condition - Function that returns true when transition should occur
     * @param {string} targetState - State to transition to when condition is met
     */
    addGlobalTransition(condition, targetState) {
        this.globalTransitions.push({
            condition,
            targetState
        });
        return this;
    }
    
    /**
     * Set a value in the behavior blackboard
     * @param {string} key - Blackboard key
     * @param {*} value - Value to store
     */
    setBlackboardValue(key, value) {
        this.blackboard.set(key, value);
        return this;
    }
    
    /**
     * Get a value from the behavior blackboard
     * @param {string} key - Blackboard key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} Value from blackboard
     */
    getBlackboardValue(key, defaultValue = null) {
        return this.blackboard.has(key) ? this.blackboard.get(key) : defaultValue;
    }
    
    /**
     * Check if the current state has a specific behavior
     * @param {string} behaviorName - Name of the behavior to check
     * @returns {boolean} Whether the current state has the behavior
     */
    hasCurrentBehavior(behaviorName) {
        if (!this.currentState) return false;
        
        const state = this.states.get(this.currentState);
        return state && state[behaviorName] !== undefined;
    }
    
    /**
     * Return to the previous state
     * @returns {boolean} Whether the state change was successful
     */
    returnToPreviousState() {
        if (!this.previousState) return false;
        return this.changeState(this.previousState);
    }
    
    /**
     * Add a behavior function
     * @param {string} name - Behavior name
     * @param {Function} behavior - Behavior function
     * @param {Object} options - Behavior options
     */
    addBehavior(name, behavior, options = {}) {
        this.behaviors.set(name, {
            fn: behavior,
            options: options,
            active: options.active !== false
        });
    }
    
    /**
     * Remove a behavior
     * @param {string} name - Behavior name
     */
    removeBehavior(name) {
        this.behaviors.delete(name);
    }
    
    /**
     * Enable a behavior
     * @param {string} name - Behavior name
     */
    enableBehavior(name) {
        const behavior = this.behaviors.get(name);
        if (behavior) {
            behavior.active = true;
        }
    }
    
    /**
     * Disable a behavior
     * @param {string} name - Behavior name
     */
    disableBehavior(name) {
        const behavior = this.behaviors.get(name);
        if (behavior) {
            behavior.active = false;
        }
    }
    
    /**
     * Set a state definition
     * @param {string} stateName - Name of the state
     * @param {Object} stateDefinition - State definition object
     */
    setState(stateName, stateDefinition) {
        this.states[stateName] = stateDefinition;
    }
    
    /**
     * Get the current state name
     * @returns {string} Current state name
     */
    getCurrentState() {
        return this.currentState;
    }
    
    /**
     * Check if the current state matches the given state
     * @param {string} stateName - State name to check
     * @returns {boolean} True if current state matches
     */
    isInState(stateName) {
        return this.currentState === stateName;
    }
    
    /**
     * Start a cooldown timer
     * @param {string} name - Cooldown name
     * @param {number} duration - Duration in seconds
     */
    startCooldown(name, duration) {
        this.cooldowns.set(name, duration);
    }
    
    /**
     * Check if a cooldown is active
     * @param {string} name - Cooldown name
     * @returns {boolean} True if cooldown is still active
     */
    isOnCooldown(name) {
        return this.cooldowns.has(name) && this.cooldowns.get(name) > 0;
    }
    
    /**
     * Get remaining cooldown time
     * @param {string} name - Cooldown name
     * @returns {number} Remaining cooldown time in seconds
     */
    getCooldownRemaining(name) {
        return this.cooldowns.has(name) ? this.cooldowns.get(name) : 0;
    }
    
    /**
     * Update method called each frame
     * @param {number} deltaTime - Time passed since last update in seconds
     */
    update(deltaTime) {
        if (!this.enabled || !this.currentState) return;
        
        // Update timers
        this.stateTime += deltaTime;
        this.totalTime += deltaTime;
        
        // Update cooldowns
        for (const [name, time] of this.cooldowns.entries()) {
            const newTime = time - deltaTime;
            if (newTime <= 0) {
                this.cooldowns.delete(name);
            } else {
                this.cooldowns.set(name, newTime);
            }
        }
        
        // Check global transitions
        for (const transition of this.globalTransitions) {
            if (transition.condition(this.entity, this.stateTime)) {
                this.changeState(transition.targetState);
                break;
            }
        }
        
        // Get current state
        const state = this.states.get(this.currentState);
        if (!state) return;
        
        // Execute state update if available
        if (state.update) {
            state.update(this.entity, deltaTime);
        }
        
        // Execute active behaviors
        for (const [name, behavior] of this.behaviors.entries()) {
            if (behavior.active) {
                behavior.fn(this, this.entity, deltaTime);
            }
        }
    }
    
    /**
     * Enter a state and run its entry actions
     * @param {string} stateName - State to enter
     * @param {Object} params - Parameters for the state
     * @private
     */
    _enterState(stateName, params = {}) {
        const state = this.states.get(stateName);
        if (state && state.enter) {
            state.enter(this, this.entity, params);
        }
    }
    
    /**
     * Exit a state and run its exit actions
     * @param {string} stateName - State to exit
     * @private
     */
    _exitState(stateName) {
        const state = this.states.get(stateName);
        if (state && state.exit) {
            state.exit(this, this.entity);
        }
    }
    
    /**
     * Clone the behavior component
     * @returns {BehaviorComponent} A new behavior component instance
     */
    clone() {
        const clone = new BehaviorComponent({
            debugMode: this.debugMode
        });
        
        // Clone states
        this.states.forEach((state, stateName) => {
            clone.addState(stateName, {...state});
        });
        
        // Clone global transitions
        this.globalTransitions.forEach(transition => {
            clone.addGlobalTransition(transition.condition, transition.targetState);
        });
        
        return clone;
    }
}

// Common state machine templates for different entity types
BehaviorComponent.Templates = {
    /**
     * Create a basic animal behavior state machine
     * @param {Object} options - Configuration options
     * @returns {Object} State machine definition
     */
    createAnimalBehavior: (options = {}) => {
        const idleTime = options.idleTime || { min: 2, max: 5 };
        const wanderTime = options.wanderTime || { min: 3, max: 8 };
        const panicTime = options.panicTime || { min: 3, max: 6 };
        const fleeDistance = options.fleeDistance || 150;
        const detectionRadius = options.detectionRadius || 200;
        
        return {
            states: {
                idle: {
                    enter: (behavior, entity) => {
                        const steering = entity.getComponent('steering');
                        if (steering) {
                            steering.removeBehavior('wander');
                            steering.setVelocity({ x: 0, y: 0 });
                        }
                        
                        // Set random idle duration
                        const duration = idleTime.min + Math.random() * (idleTime.max - idleTime.min);
                        behavior.setBlackboardValue('stateEndTime', behavior.totalTime + duration);
                    },
                    update: (behavior, entity, deltaTime, stateTime) => {
                        // Transition to wander when idle time expires
                        const endTime = behavior.getBlackboardValue('stateEndTime');
                        if (behavior.totalTime >= endTime) {
                            behavior.changeState('wander');
                        }
                    },
                    transitions: {
                        // Detect threats and flee
                        flee: {
                            condition: (behavior) => {
                                const threat = behavior.getBlackboardValue('threat');
                                return threat && behavior._distanceToEntity(threat) < detectionRadius;
                            },
                            targetState: 'flee'
                        }
                    }
                },
                wander: {
                    enter: (behavior, entity) => {
                        const steering = entity.getComponent('steering');
                        if (steering) {
                            steering.addBehavior('wander', 1.0, { wanderJitter: 0.5 });
                        }
                        
                        // Set random wander duration
                        const duration = wanderTime.min + Math.random() * (wanderTime.max - wanderTime.min);
                        behavior.setBlackboardValue('stateEndTime', behavior.totalTime + duration);
                    },
                    update: (behavior, entity, deltaTime, stateTime) => {
                        // Transition to idle when wander time expires
                        const endTime = behavior.getBlackboardValue('stateEndTime');
                        if (behavior.totalTime >= endTime) {
                            behavior.changeState('idle');
                        }
                    },
                    exit: (behavior, entity) => {
                        const steering = entity.getComponent('steering');
                        if (steering) {
                            steering.removeBehavior('wander');
                        }
                    },
                    transitions: {
                        // Detect threats and flee
                        flee: {
                            condition: (behavior) => {
                                const threat = behavior.getBlackboardValue('threat');
                                return threat && behavior._distanceToEntity(threat) < detectionRadius;
                            },
                            targetState: 'flee'
                        }
                    }
                },
                flee: {
                    enter: (behavior, entity, params) => {
                        const threat = behavior.getBlackboardValue('threat');
                        if (!threat) return;
                        
                        const steering = entity.getComponent('steering');
                        if (steering) {
                            steering.removeBehavior('wander');
                            steering.addBehavior('flee', 1.0, { 
                                target: threat,
                                panicDistance: fleeDistance * 1.5
                            });
                        }
                        
                        // Set panic duration
                        const duration = panicTime.min + Math.random() * (panicTime.max - panicTime.min);
                        behavior.setBlackboardValue('stateEndTime', behavior.totalTime + duration);
                    },
                    update: (behavior, entity, deltaTime, stateTime) => {
                        const threat = behavior.getBlackboardValue('threat');
                        
                        // If no threat or threat is far away, end flee state
                        if (!threat || behavior._distanceToEntity(threat) > fleeDistance) {
                            behavior.changeState('wander');
                            return;
                        }
                        
                        // End flee state after timeout
                        const endTime = behavior.getBlackboardValue('stateEndTime');
                        if (behavior.totalTime >= endTime) {
                            behavior.changeState('wander');
                        }
                    },
                    exit: (behavior, entity) => {
                        const steering = entity.getComponent('steering');
                        if (steering) {
                            steering.removeBehavior('flee');
                        }
                    }
                }
            },
            globalTransitions: {}
        };
    },
    
    /**
     * Create a flocking bird behavior
     * @param {Object} options - Configuration options
     * @returns {Object} State machine definition
     */
    createBirdBehavior: (options = {}) => {
        const flockWeight = options.flockWeight || 0.6;
        const wanderWeight = options.wanderWeight || 0.4;
        const perchProbability = options.perchProbability || 0.3;
        const perchTime = options.perchTime || { min: 4, max: 10 };
        const threatFleeTime = options.threatFleeTime || { min: 4, max: 8 };
        const separationWeight = options.separationWeight || 1.5;
        const alignmentWeight = options.alignmentWeight || 1.0;
        const cohesionWeight = options.cohesionWeight || 0.8;
        const separationRadius = options.separationRadius || 30;
        const alignmentRadius = options.alignmentRadius || 60;
        const cohesionRadius = options.cohesionRadius || 100;
        const detectionRadius = options.detectionRadius || 250;
        
        return {
            states: {
                flock: {
                    enter: (behavior, entity) => {
                        const steering = entity.getComponent('steering');
                        if (!steering) return;
                        
                        const flockEntities = behavior.getBlackboardValue('flockEntities', []);
                        
                        // Apply flocking behaviors
                        steering.addBehavior('separation', separationWeight, { 
                            entities: flockEntities, 
                            radius: separationRadius 
                        });
                        steering.addBehavior('alignment', alignmentWeight, { 
                            entities: flockEntities, 
                            radius: alignmentRadius 
                        });
                        steering.addBehavior('cohesion', cohesionWeight, { 
                            entities: flockEntities, 
                            radius: cohesionRadius 
                        });
                        steering.addBehavior('wander', wanderWeight, { wanderJitter: 0.3 });
                        
                        // Apply boundary avoidance if boundaries are defined
                        const bounds = behavior.getBlackboardValue('boundaries');
                        if (bounds) {
                            steering.boundaryData = {
                                minX: bounds.x,
                                minY: bounds.y,
                                maxX: bounds.x + bounds.width,
                                maxY: bounds.y + bounds.height,
                                padding: bounds.padding || 50
                            };
                        }
                        
                        // Set random perch check time
                        behavior.setBlackboardValue('perchCheckTime', behavior.totalTime + 5 + Math.random() * 5);
                    },
                    update: (behavior, entity, deltaTime, stateTime) => {
                        // Occasionally check if bird should perch
                        const perchCheckTime = behavior.getBlackboardValue('perchCheckTime');
                        if (behavior.totalTime >= perchCheckTime) {
                            // Random chance to perch
                            if (Math.random() < perchProbability) {
                                const perches = behavior.getBlackboardValue('perches', []);
                                if (perches.length > 0) {
                                    // Find closest perch
                                    let closestPerch = null;
                                    let closestDistance = Infinity;
                                    
                                    const transform = entity.getComponent('transform');
                                    if (!transform) return;
                                    
                                    for (const perch of perches) {
                                        if (perch.available) {
                                            const distance = behavior._distanceTo(
                                                transform.x, transform.y, 
                                                perch.x, perch.y
                                            );
                                            
                                            if (distance < closestDistance) {
                                                closestPerch = perch;
                                                closestDistance = distance;
                                            }
                                        }
                                    }
                                    
                                    if (closestPerch) {
                                        behavior.setBlackboardValue('targetPerch', closestPerch);
                                        behavior.changeState('flyToPerch');
                                        return;
                                    }
                                }
                            }
                            
                            // Set next perch check time
                            behavior.setBlackboardValue('perchCheckTime', behavior.totalTime + 5 + Math.random() * 5);
                        }
                        
                        // Update flocking entities
                        const flockEntities = behavior.getBlackboardValue('flockEntities', []);
                        const flockLeader = behavior.getBlackboardValue('flockLeader');
                        const steering = entity.getComponent('steering');
                        
                        if (steering && flockLeader && flockLeader !== entity) {
                            // Follow leader with more weight if this bird isn't the leader
                            steering.addBehavior('pursuit', flockWeight, { target: flockLeader });
                        }
                    },
                    exit: (behavior, entity) => {
                        const steering = entity.getComponent('steering');
                        if (steering) {
                            steering.removeBehavior('separation');
                            steering.removeBehavior('alignment');
                            steering.removeBehavior('cohesion');
                            steering.removeBehavior('wander');
                            steering.removeBehavior('pursuit');
                        }
                    },
                    transitions: {}
                },
                flyToPerch: {
                    enter: (behavior, entity) => {
                        const perch = behavior.getBlackboardValue('targetPerch');
                        if (!perch) {
                            behavior.changeState('flock');
                            return;
                        }
                        
                        // Mark perch as unavailable
                        perch.available = false;
                        
                        const steering = entity.getComponent('steering');
                        if (steering) {
                            steering.removeBehavior('wander');
                            steering.removeBehavior('separation');
                            steering.removeBehavior('alignment');
                            steering.removeBehavior('cohesion');
                            
                            // Set arrive behavior to fly to perch
                            steering.addBehavior('arrive', 1.0, {
                                target: { x: perch.x, y: perch.y },
                                slowingDistance: 50
                            });
                        }
                    },
                    update: (behavior, entity, deltaTime, stateTime) => {
                        const perch = behavior.getBlackboardValue('targetPerch');
                        if (!perch) {
                            behavior.changeState('flock');
                            return;
                        }
                        
                        // Check if we've reached the perch
                        const transform = entity.getComponent('transform');
                        if (transform) {
                            const distance = behavior._distanceTo(
                                transform.x, transform.y, 
                                perch.x, perch.y
                            );
                            
                            if (distance < 10) {
                                behavior.changeState('perched');
                            }
                        }
                    },
                    exit: (behavior, entity) => {
                        const steering = entity.getComponent('steering');
                        if (steering) {
                            steering.removeBehavior('arrive');
                        }
                    },
                    transitions: {}
                },
                perched: {
                    enter: (behavior, entity) => {
                        const steering = entity.getComponent('steering');
                        if (steering) {
                            // Stop all movement
                            steering.setVelocity({ x: 0, y: 0 });
                        }
                        
                        // Set position exactly on perch
                        const perch = behavior.getBlackboardValue('targetPerch');
                        const transform = entity.getComponent('transform');
                        if (perch && transform) {
                            transform.x = perch.x;
                            transform.y = perch.y;
                        }
                        
                        // Set random perch duration
                        const duration = perchTime.min + Math.random() * (perchTime.max - perchTime.min);
                        behavior.setBlackboardValue('stateEndTime', behavior.totalTime + duration);
                    },
                    update: (behavior, entity, deltaTime, stateTime) => {
                        // End perching when time expires
                        const endTime = behavior.getBlackboardValue('stateEndTime');
                        if (behavior.totalTime >= endTime) {
                            behavior.changeState('flock');
                        }
                    },
                    exit: (behavior, entity) => {
                        // Free up the perch
                        const perch = behavior.getBlackboardValue('targetPerch');
                        if (perch) {
                            perch.available = true;
                            behavior.setBlackboardValue('targetPerch', null);
                        }
                    },
                    transitions: {}
                },
                evadeThreats: {
                    enter: (behavior, entity) => {
                        const threat = behavior.getBlackboardValue('threat');
                        if (!threat) {
                            behavior.changeState('flock');
                            return;
                        }
                        
                        const steering = entity.getComponent('steering');
                        if (steering) {
                            // Clear other behaviors
                            steering.removeBehavior('separation');
                            steering.removeBehavior('alignment');
                            steering.removeBehavior('cohesion');
                            steering.removeBehavior('wander');
                            
                            // Add evade behavior with high weight
                            steering.addBehavior('evade', 2.0, { 
                                target: threat, 
                                panicDistance: detectionRadius * 1.2
                            });
                            
                            // Add some wander to make movement more natural
                            steering.addBehavior('wander', 0.2, { wanderJitter: 0.5 });
                        }
                        
                        // Set random flee duration
                        const duration = threatFleeTime.min + Math.random() * (threatFleeTime.max - threatFleeTime.min);
                        behavior.setBlackboardValue('stateEndTime', behavior.totalTime + duration);
                    },
                    update: (behavior, entity, deltaTime, stateTime) => {
                        const threat = behavior.getBlackboardValue('threat');
                        
                        // If threat is gone or flee time expires, return to flocking
                        if (!threat || behavior.totalTime >= behavior.getBlackboardValue('stateEndTime')) {
                            behavior.changeState('flock');
                            return;
                        }
                    },
                    exit: (behavior, entity) => {
                        const steering = entity.getComponent('steering');
                        if (steering) {
                            steering.removeBehavior('evade');
                            steering.removeBehavior('wander');
                        }
                    },
                    transitions: {}
                }
            },
            globalTransitions: {
                // Detect threats and evade
                detectThreat: {
                    condition: (behavior) => {
                        // Skip if already evading
                        if (behavior.isInState('evadeThreats')) return false;
                        
                        // Skip if perched (birds don't notice threats while perched)
                        if (behavior.isInState('perched')) return false;
                        
                        const threat = behavior.getBlackboardValue('threat');
                        return threat && behavior._distanceToEntity(threat) < detectionRadius;
                    },
                    targetState: 'evadeThreats'
                }
            }
        };
    }
};

// Add helper methods to the prototype
BehaviorComponent.prototype._distanceToEntity = function(entity) {
    if (!entity || !this.transform) return Infinity;
    
    const otherTransform = entity.getComponent('transform');
    if (!otherTransform) return Infinity;
    
    return this._distanceTo(
        this.transform.x, this.transform.y,
        otherTransform.x, otherTransform.y
    );
};

BehaviorComponent.prototype._distanceTo = function(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
};

// Register the component with the Entity system
if (Entity?.registerComponent) {
    Entity.registerComponent('behavior', BehaviorComponent);
}

export default BehaviorComponent; 