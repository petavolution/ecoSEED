/**
 * SteeringComponent.js - Implements steering behaviors for movement
 * Allows entities to move using behaviors like seek, flee, wander, etc.
 */

import Component from '../core/base/Component.js';
import { Entity } from '../core/index.js';

/**
 * Component that adds steering behaviors for entity movement
 * Implements various steering algorithms for natural movement patterns
 */
class SteeringComponent extends Component {
    /**
     * Create a new SteeringComponent
     * @param {Entity} entity - The entity this component belongs to
     * @param {Object} options - Configuration options
     * @param {number} options.maxSpeed - Maximum entity speed
     * @param {number} options.maxForce - Maximum steering force
     * @param {number} options.mass - Entity mass for force calculations
     * @param {number} options.wanderRadius - Radius for wander behavior
     * @param {boolean} options.faceDirection - Whether entity should rotate to face movement direction
     * @param {number} options.arrivalRadius - Distance to start slowing down when seeking
     */
    constructor(entity, options = {}) {
        super('steering', entity);
        
        this.maxSpeed = options.maxSpeed || 100;
        this.maxForce = options.maxForce || 150;
        this.mass = options.mass || 1;
        this.wanderRadius = options.wanderRadius || 50;
        this.faceDirection = options.faceDirection !== undefined ? options.faceDirection : true;
        this.arrivalRadius = options.arrivalRadius || 50;
        
        // Internal properties
        this.velocity = { x: 0, y: 0 };
        this.steeringForce = { x: 0, y: 0 };
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.boundaryData = null;
        
        // Active steering behaviors and their weights
        this.behaviors = new Map();
    }
    
    /**
     * Initialize the component
     */
    init() {
        // Get the entity's transform component
        this.transform = this.entity.getComponent('transform');
        if (!this.transform) {
            console.error('SteeringComponent requires a TransformComponent');
        }
    }
    
    /**
     * Add or update a steering behavior with a specific weight
     * @param {string} behavior - Name of the steering behavior
     * @param {number} weight - Weight of this behavior in the steering calculation
     * @param {Object} [params] - Optional parameters for the behavior
     */
    addBehavior(behavior, weight, params = {}) {
        this.behaviors.set(behavior, { weight, params });
    }
    
    /**
     * Remove a steering behavior
     * @param {string} behavior - Name of the behavior to remove
     */
    removeBehavior(behavior) {
        this.behaviors.delete(behavior);
    }
    
    /**
     * Check if a behavior is active
     * @param {string} behavior - Name of the behavior to check
     * @returns {boolean} True if the behavior is active
     */
    hasBehavior(behavior) {
        return this.behaviors.has(behavior);
    }
    
    /**
     * Set the velocity directly
     * @param {Object} velocity - The new velocity {x, y}
     */
    setVelocity(velocity) {
        this.velocity.x = velocity.x;
        this.velocity.y = velocity.y;
    }
    
    /**
     * Get the current velocity
     * @returns {Object} Current velocity {x, y}
     */
    getVelocity() {
        return { x: this.velocity.x, y: this.velocity.y };
    }
    
    /**
     * Get the current speed (magnitude of velocity)
     * @returns {number} Current speed
     */
    getSpeed() {
        return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    }
    
    /**
     * Update method called each frame
     * @param {number} deltaTime - Time passed since last update in seconds
     */
    update(deltaTime) {
        if (!this.transform) return;
        
        // Reset steering force
        this.steeringForce.x = 0;
        this.steeringForce.y = 0;
        
        // Apply each active behavior
        for (const [behavior, { weight, params }] of this.behaviors.entries()) {
            const force = this._calculateBehavior(behavior, params);
            if (force) {
                // Apply weight to the force
                force.x *= weight;
                force.y *= weight;
                
                // Add to steering force
                this.steeringForce.x += force.x;
                this.steeringForce.y += force.y;
            }
        }
        
        // Apply boundary containment if boundary data exists
        if (this.boundaryData) {
            const boundaryForce = this._calculateBoundaryForce();
            this.steeringForce.x += boundaryForce.x;
            this.steeringForce.y += boundaryForce.y;
        }
        
        // Limit steering force
        const forceMagnitude = Math.sqrt(
            this.steeringForce.x * this.steeringForce.x + 
            this.steeringForce.y * this.steeringForce.y
        );
        
        if (forceMagnitude > this.maxForce) {
            const scale = this.maxForce / forceMagnitude;
            this.steeringForce.x *= scale;
            this.steeringForce.y *= scale;
        }
        
        // Apply force (F = ma, so a = F/m)
        const acceleration = {
            x: this.steeringForce.x / this.mass,
            y: this.steeringForce.y / this.mass
        };
        
        // Update velocity
        this.velocity.x += acceleration.x * deltaTime;
        this.velocity.y += acceleration.y * deltaTime;
        
        // Limit velocity
        const speedMagnitude = Math.sqrt(
            this.velocity.x * this.velocity.x + 
            this.velocity.y * this.velocity.y
        );
        
        if (speedMagnitude > this.maxSpeed) {
            const scale = this.maxSpeed / speedMagnitude;
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }
        
        // Update position
        this.transform.x += this.velocity.x * deltaTime;
        this.transform.y += this.velocity.y * deltaTime;
        
        // Update rotation to face direction of movement if enabled
        if (this.faceDirection && (this.velocity.x !== 0 || this.velocity.y !== 0)) {
            this.transform.rotation = Math.atan2(this.velocity.y, this.velocity.x);
        }
    }
    
    /**
     * Calculate the steering force for a specific behavior
     * @param {string} behavior - The steering behavior to calculate
     * @param {Object} params - Parameters for the behavior
     * @returns {Object|null} The steering force vector {x, y} or null
     * @private
     */
    _calculateBehavior(behavior, params) {
        switch (behavior) {
            case 'seek':
                return this._seek(params.target);
                
            case 'flee':
                return this._flee(params.target, params.panicDistance);
                
            case 'arrive':
                return this._arrive(params.target, params.slowingDistance || this.arrivalRadius);
                
            case 'pursuit':
                return this._pursuit(params.target);
                
            case 'evade':
                return this._evade(params.target, params.panicDistance);
                
            case 'wander':
                return this._wander(params.wanderJitter || 0.5);
                
            case 'separation':
                return this._separation(params.entities, params.radius || 30);
                
            case 'alignment':
                return this._alignment(params.entities, params.radius || 50);
                
            case 'cohesion':
                return this._cohesion(params.entities, params.radius || 100);
                
            default:
                return null;
        }
    }
    
    /**
     * Seek behavior: steer towards a target position
     * @param {Object} target - Target position {x, y} or entity with transform
     * @returns {Object} Steering force vector
     * @private
     */
    _seek(target) {
        // Get target position
        const targetPos = this._getTargetPosition(target);
        if (!targetPos) return { x: 0, y: 0 };
        
        // Calculate desired velocity
        const desiredVelocity = {
            x: targetPos.x - this.transform.x,
            y: targetPos.y - this.transform.y
        };
        
        // Normalize and scale to max speed
        const distance = Math.sqrt(desiredVelocity.x * desiredVelocity.x + desiredVelocity.y * desiredVelocity.y);
        
        if (distance > 0) {
            desiredVelocity.x = (desiredVelocity.x / distance) * this.maxSpeed;
            desiredVelocity.y = (desiredVelocity.y / distance) * this.maxSpeed;
        }
        
        // Calculate steering force = desired velocity - current velocity
        return {
            x: desiredVelocity.x - this.velocity.x,
            y: desiredVelocity.y - this.velocity.y
        };
    }
    
    /**
     * Flee behavior: steer away from a target position
     * @param {Object} target - Target position {x, y} or entity with transform
     * @param {number} [panicDistance] - Maximum distance to flee from
     * @returns {Object} Steering force vector
     * @private
     */
    _flee(target, panicDistance) {
        // Get target position
        const targetPos = this._getTargetPosition(target);
        if (!targetPos) return { x: 0, y: 0 };
        
        // Calculate distance to target
        const offsetX = this.transform.x - targetPos.x;
        const offsetY = this.transform.y - targetPos.y;
        const distanceSquared = offsetX * offsetX + offsetY * offsetY;
        
        // If we're outside panicDistance, don't flee
        if (panicDistance && distanceSquared > panicDistance * panicDistance) {
            return { x: 0, y: 0 };
        }
        
        // Calculate desired velocity (away from target)
        const desiredVelocity = {
            x: offsetX,
            y: offsetY
        };
        
        // Normalize and scale to max speed
        const distance = Math.sqrt(distanceSquared);
        if (distance > 0) {
            desiredVelocity.x = (desiredVelocity.x / distance) * this.maxSpeed;
            desiredVelocity.y = (desiredVelocity.y / distance) * this.maxSpeed;
        }
        
        // Calculate steering force = desired velocity - current velocity
        return {
            x: desiredVelocity.x - this.velocity.x,
            y: desiredVelocity.y - this.velocity.y
        };
    }
    
    /**
     * Arrive behavior: like seek but slows down when nearing target
     * @param {Object} target - Target position {x, y} or entity with transform
     * @param {number} slowingDistance - Distance to start slowing down
     * @returns {Object} Steering force vector
     * @private
     */
    _arrive(target, slowingDistance) {
        // Get target position
        const targetPos = this._getTargetPosition(target);
        if (!targetPos) return { x: 0, y: 0 };
        
        // Calculate desired velocity
        const desiredVelocity = {
            x: targetPos.x - this.transform.x,
            y: targetPos.y - this.transform.y
        };
        
        // Calculate distance to target
        const distance = Math.sqrt(desiredVelocity.x * desiredVelocity.x + desiredVelocity.y * desiredVelocity.y);
        
        // If we're within the slowing radius, scale the speed based on distance
        let speed = this.maxSpeed;
        if (distance < slowingDistance) {
            speed = this.maxSpeed * (distance / slowingDistance);
        }
        
        // Normalize and scale
        if (distance > 0) {
            desiredVelocity.x = (desiredVelocity.x / distance) * speed;
            desiredVelocity.y = (desiredVelocity.y / distance) * speed;
        }
        
        // Calculate steering force = desired velocity - current velocity
        return {
            x: desiredVelocity.x - this.velocity.x,
            y: desiredVelocity.y - this.velocity.y
        };
    }
    
    /**
     * Pursuit behavior: seek to intercept a moving target
     * @param {Object} target - Entity with transform and steering components
     * @returns {Object} Steering force vector
     * @private
     */
    _pursuit(target) {
        if (!target) return { x: 0, y: 0 };
        
        const targetTransform = target.getComponent('transform');
        const targetSteering = target.getComponent('steering');
        
        if (!targetTransform) return { x: 0, y: 0 };
        
        // If target has no velocity, just seek to its position
        if (!targetSteering) {
            return this._seek(targetTransform);
        }
        
        // Calculate the future position based on target's velocity
        const distance = Math.sqrt(
            Math.pow(targetTransform.x - this.transform.x, 2) +
            Math.pow(targetTransform.y - this.transform.y, 2)
        );
        
        // The lookahead time is proportional to the distance and inversely proportional to the sum of speeds
        const targetVelocity = targetSteering.getVelocity();
        const targetSpeed = Math.sqrt(targetVelocity.x * targetVelocity.x + targetVelocity.y * targetVelocity.y);
        const lookAheadTime = distance / (this.maxSpeed + targetSpeed);
        
        // Predict future position
        const futurePosition = {
            x: targetTransform.x + targetVelocity.x * lookAheadTime,
            y: targetTransform.y + targetVelocity.y * lookAheadTime
        };
        
        // Seek to the predicted position
        return this._seek(futurePosition);
    }
    
    /**
     * Evade behavior: flee from a moving target's predicted position
     * @param {Object} target - Entity with transform and steering components
     * @param {number} [panicDistance] - Maximum distance to evade from
     * @returns {Object} Steering force vector
     * @private
     */
    _evade(target, panicDistance) {
        if (!target) return { x: 0, y: 0 };
        
        const targetTransform = target.getComponent('transform');
        const targetSteering = target.getComponent('steering');
        
        if (!targetTransform) return { x: 0, y: 0 };
        
        // Calculate the distance
        const offsetX = targetTransform.x - this.transform.x;
        const offsetY = targetTransform.y - this.transform.y;
        const distanceSquared = offsetX * offsetX + offsetY * offsetY;
        
        // If outside panic distance, don't evade
        if (panicDistance && distanceSquared > panicDistance * panicDistance) {
            return { x: 0, y: 0 };
        }
        
        // If target has no velocity, just flee from its position
        if (!targetSteering) {
            return this._flee(targetTransform, panicDistance);
        }
        
        // Calculate the future position based on target's velocity
        const distance = Math.sqrt(distanceSquared);
        
        // The lookahead time is proportional to the distance
        const targetVelocity = targetSteering.getVelocity();
        const lookAheadTime = distance / this.maxSpeed;
        
        // Predict future position
        const futurePosition = {
            x: targetTransform.x + targetVelocity.x * lookAheadTime,
            y: targetTransform.y + targetVelocity.y * lookAheadTime
        };
        
        // Flee from the predicted position
        return this._flee(futurePosition, panicDistance);
    }
    
    /**
     * Wander behavior: random steering for natural exploration
     * @param {number} jitter - Random adjustment factor (0-1)
     * @returns {Object} Steering force vector
     * @private
     */
    _wander(jitter) {
        // Adjust the wander angle by a small random amount
        this.wanderAngle += (Math.random() * 2 - 1) * jitter;
        
        // Calculate the center of the wander circle
        const wanderCenter = {
            x: this.velocity.x,
            y: this.velocity.y
        };
        
        // Normalize to get the forward direction
        const speedMagnitude = Math.sqrt(wanderCenter.x * wanderCenter.x + wanderCenter.y * wanderCenter.y);
        
        if (speedMagnitude > 0) {
            wanderCenter.x = (wanderCenter.x / speedMagnitude) * this.wanderRadius;
            wanderCenter.y = (wanderCenter.y / speedMagnitude) * this.wanderRadius;
        } else {
            // If not moving, use the current rotation to determine forward
            wanderCenter.x = Math.cos(this.transform.rotation) * this.wanderRadius;
            wanderCenter.y = Math.sin(this.transform.rotation) * this.wanderRadius;
        }
        
        // Calculate the displacement force on the circle
        const displacement = {
            x: Math.cos(this.wanderAngle) * this.wanderRadius,
            y: Math.sin(this.wanderAngle) * this.wanderRadius
        };
        
        // Project the force
        const wanderForce = {
            x: wanderCenter.x + displacement.x,
            y: wanderCenter.y + displacement.y
        };
        
        return wanderForce;
    }
    
    /**
     * Separation behavior: steer away from nearby entities
     * @param {Array} entities - Array of entities to avoid
     * @param {number} radius - Distance to check for separation
     * @returns {Object} Steering force vector
     * @private
     */
    _separation(entities, radius) {
        if (!entities || entities.length === 0) {
            return { x: 0, y: 0 };
        }
        
        const separationForce = { x: 0, y: 0 };
        let count = 0;
        
        // Check each entity
        for (const other of entities) {
            // Don't separate from self
            if (other === this.entity) continue;
            
            const otherTransform = other.getComponent('transform');
            if (!otherTransform) continue;
            
            // Calculate vector from other entity
            const offsetX = this.transform.x - otherTransform.x;
            const offsetY = this.transform.y - otherTransform.y;
            const distanceSquared = offsetX * offsetX + offsetY * offsetY;
            
            // If within radius, add repulsion force
            if (distanceSquared < radius * radius && distanceSquared > 0) {
                // Force is inversely proportional to distance
                const distance = Math.sqrt(distanceSquared);
                const scale = (radius - distance) / radius;
                
                // Add scaled repulsion
                separationForce.x += (offsetX / distance) * scale;
                separationForce.y += (offsetY / distance) * scale;
                count++;
            }
        }
        
        // Average the force
        if (count > 0) {
            separationForce.x /= count;
            separationForce.y /= count;
            
            // Scale to max speed
            const magnitude = Math.sqrt(
                separationForce.x * separationForce.x +
                separationForce.y * separationForce.y
            );
            
            if (magnitude > 0) {
                separationForce.x = (separationForce.x / magnitude) * this.maxSpeed;
                separationForce.y = (separationForce.y / magnitude) * this.maxSpeed;
                
                // Subtract current velocity to get steering force
                separationForce.x -= this.velocity.x;
                separationForce.y -= this.velocity.y;
            }
        }
        
        return separationForce;
    }
    
    /**
     * Alignment behavior: steer toward the average heading of nearby entities
     * @param {Array} entities - Array of entities to align with
     * @param {number} radius - Distance to check for alignment
     * @returns {Object} Steering force vector
     * @private
     */
    _alignment(entities, radius) {
        if (!entities || entities.length === 0) {
            return { x: 0, y: 0 };
        }
        
        const averageHeading = { x: 0, y: 0 };
        let count = 0;
        
        // Calculate average heading
        for (const other of entities) {
            // Don't align with self
            if (other === this.entity) continue;
            
            const otherTransform = other.getComponent('transform');
            const otherSteering = other.getComponent('steering');
            
            if (!otherTransform || !otherSteering) continue;
            
            // Calculate distance
            const offsetX = otherTransform.x - this.transform.x;
            const offsetY = otherTransform.y - this.transform.y;
            const distanceSquared = offsetX * offsetX + offsetY * offsetY;
            
            // If within radius, include in average
            if (distanceSquared < radius * radius) {
                const otherVelocity = otherSteering.getVelocity();
                averageHeading.x += otherVelocity.x;
                averageHeading.y += otherVelocity.y;
                count++;
            }
        }
        
        // If no neighbors, return zero force
        if (count === 0) {
            return { x: 0, y: 0 };
        }
        
        // Calculate average
        averageHeading.x /= count;
        averageHeading.y /= count;
        
        // Scale to max speed
        const magnitude = Math.sqrt(
            averageHeading.x * averageHeading.x +
            averageHeading.y * averageHeading.y
        );
        
        if (magnitude > 0) {
            averageHeading.x = (averageHeading.x / magnitude) * this.maxSpeed;
            averageHeading.y = (averageHeading.y / magnitude) * this.maxSpeed;
        }
        
        // Return steering force toward average heading
        return {
            x: averageHeading.x - this.velocity.x,
            y: averageHeading.y - this.velocity.y
        };
    }
    
    /**
     * Cohesion behavior: steer toward the center of nearby entities
     * @param {Array} entities - Array of entities to move toward
     * @param {number} radius - Distance to check for cohesion
     * @returns {Object} Steering force vector
     * @private
     */
    _cohesion(entities, radius) {
        if (!entities || entities.length === 0) {
            return { x: 0, y: 0 };
        }
        
        const centerOfMass = { x: 0, y: 0 };
        let count = 0;
        
        // Calculate center of mass
        for (const other of entities) {
            // Don't include self
            if (other === this.entity) continue;
            
            const otherTransform = other.getComponent('transform');
            if (!otherTransform) continue;
            
            // Calculate distance
            const offsetX = otherTransform.x - this.transform.x;
            const offsetY = otherTransform.y - this.transform.y;
            const distanceSquared = offsetX * offsetX + offsetY * offsetY;
            
            // If within radius, include in center of mass
            if (distanceSquared < radius * radius) {
                centerOfMass.x += otherTransform.x;
                centerOfMass.y += otherTransform.y;
                count++;
            }
        }
        
        // If no neighbors, return zero force
        if (count === 0) {
            return { x: 0, y: 0 };
        }
        
        // Calculate average position
        centerOfMass.x /= count;
        centerOfMass.y /= count;
        
        // Seek to the center of mass
        return this._seek(centerOfMass);
    }
    
    /**
     * Calculate boundary avoidance force
     * @returns {Object} Steering force to avoid boundaries
     * @private
     */
    _calculateBoundaryForce() {
        if (!this.boundaryData) {
            return { x: 0, y: 0 };
        }
        
        const { minX, minY, maxX, maxY, padding } = this.boundaryData;
        const force = { x: 0, y: 0 };
        
        // Check x-axis boundaries
        if (this.transform.x < minX + padding) {
            force.x = this.maxForce * ((minX + padding - this.transform.x) / padding);
        } else if (this.transform.x > maxX - padding) {
            force.x = -this.maxForce * ((this.transform.x - (maxX - padding)) / padding);
        }
        
        // Check y-axis boundaries
        if (this.transform.y < minY + padding) {
            force.y = this.maxForce * ((minY + padding - this.transform.y) / padding);
        } else if (this.transform.y > maxY - padding) {
            force.y = -this.maxForce * ((this.transform.y - (maxY - padding)) / padding);
        }
        
        return force;
    }
    
    /**
     * Helper to get target position whether it's a position object or entity
     * @param {Object} target - Position {x, y} or entity with transform
     * @returns {Object|null} Target position or null
     * @private
     */
    _getTargetPosition(target) {
        if (!target) return null;
        
        if (target.x !== undefined && target.y !== undefined) {
            // Target is already a position
            return target;
        } else if (target.getComponent) {
            // Target is an entity, get its transform component
            const targetTransform = target.getComponent('transform');
            if (targetTransform) {
                return { x: targetTransform.x, y: targetTransform.y };
            }
        }
        
        return null;
    }
}

if (Entity?.registerComponent) {
    Entity.registerComponent('steering', SteeringComponent);
}

export default SteeringComponent; 