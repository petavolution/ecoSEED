/**
 * PhysicsComponent.js - Handles physics properties for entities
 * Part of the EcoSEED component system
 */

import Component from '../core/base/Component.js';
import { Entity } from '../core/index.js';

/**
 * PhysicsComponent handles physics properties and behaviors
 */
export default class PhysicsComponent extends Component {
  /**
   * Create a physics component
   * @param {Entity} entity - The entity this component belongs to
   * @param {Object} options - Component options
   * @param {number} options.mass - Mass of the entity (0 = immovable)
   * @param {number} options.drag - Drag coefficient (0-1)
   * @param {number} options.friction - Friction coefficient (0-1)
   * @param {number} options.restitution - Bounciness (0-1)
   * @param {boolean} options.useGravity - Whether gravity affects this entity
   * @param {number} options.maxSpeed - Maximum speed (0 = unlimited)
   * @param {boolean} options.enabled - Whether physics is enabled
   */
  constructor(entity, options = {}) {
    super('physics', entity);
    
    // Physical properties
    this.mass = options.mass !== undefined ? options.mass : 1;
    this.drag = options.drag !== undefined ? options.drag : 0.1;
    this.friction = options.friction !== undefined ? options.friction : 0.2;
    this.restitution = options.restitution !== undefined ? options.restitution : 0.2;
    this.useGravity = options.useGravity !== undefined ? options.useGravity : false;
    this.maxSpeed = options.maxSpeed !== undefined ? options.maxSpeed : 0;
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    
    // Current state
    this.velocityX = 0;
    this.velocityY = 0;
    this.angularVelocity = 0;
    
    // Forces to apply each update
    this.forceX = 0;
    this.forceY = 0;
    this.torque = 0;
    
    // If entity already has a transform, initialize from it
    const transform = entity.getComponent('transform');
    if (transform) {
      this._prevX = transform.x;
      this._prevY = transform.y;
    }
  }
  
  /**
   * Enable physics
   * @returns {PhysicsComponent} This component for chaining
   */
  enable() {
    this.enabled = true;
    return this;
  }
  
  /**
   * Disable physics
   * @returns {PhysicsComponent} This component for chaining
   */
  disable() {
    this.enabled = false;
    return this;
  }
  
  /**
   * Set physics properties
   * @param {Object} options - Physics properties to set
   * @returns {PhysicsComponent} This component for chaining
   */
  setProperties(options) {
    if (options.mass !== undefined) this.mass = options.mass;
    if (options.drag !== undefined) this.drag = options.drag;
    if (options.friction !== undefined) this.friction = options.friction;
    if (options.restitution !== undefined) this.restitution = options.restitution;
    if (options.useGravity !== undefined) this.useGravity = options.useGravity;
    if (options.maxSpeed !== undefined) this.maxSpeed = options.maxSpeed;
    
    return this;
  }
  
  /**
   * Set velocity directly
   * @param {number} x - X velocity
   * @param {number} y - Y velocity
   * @returns {PhysicsComponent} This component for chaining
   */
  setVelocity(x, y) {
    this.velocityX = x;
    this.velocityY = y;
    return this;
  }
  
  /**
   * Add velocity
   * @param {number} x - X velocity to add
   * @param {number} y - Y velocity to add
   * @returns {PhysicsComponent} This component for chaining
   */
  addVelocity(x, y) {
    this.velocityX += x;
    this.velocityY += y;
    return this;
  }
  
  /**
   * Get current velocity
   * @returns {Object} Velocity as {x, y}
   */
  getVelocity() {
    return {
      x: this.velocityX,
      y: this.velocityY
    };
  }
  
  /**
   * Get velocity magnitude (speed)
   * @returns {number} Speed value
   */
  getSpeed() {
    return Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
  }
  
  /**
   * Set angular velocity
   * @param {number} velocity - Angular velocity in radians per second
   * @returns {PhysicsComponent} This component for chaining
   */
  setAngularVelocity(velocity) {
    this.angularVelocity = velocity;
    return this;
  }
  
  /**
   * Apply force
   * @param {number} x - X force
   * @param {number} y - Y force
   * @returns {PhysicsComponent} This component for chaining
   */
  applyForce(x, y) {
    if (this.mass === 0) return this; // Can't apply force to immovable objects
    
    this.forceX += x;
    this.forceY += y;
    return this;
  }
  
  /**
   * Apply force at angle
   * @param {number} force - Force magnitude
   * @param {number} angle - Angle in radians
   * @returns {PhysicsComponent} This component for chaining
   */
  applyForceAtAngle(force, angle) {
    return this.applyForce(
      Math.cos(angle) * force,
      Math.sin(angle) * force
    );
  }
  
  /**
   * Apply impulse (immediate velocity change)
   * @param {number} x - X impulse
   * @param {number} y - Y impulse
   * @returns {PhysicsComponent} This component for chaining
   */
  applyImpulse(x, y) {
    if (this.mass === 0) return this; // Can't apply impulse to immovable objects
    
    this.velocityX += x / this.mass;
    this.velocityY += y / this.mass;
    return this;
  }
  
  /**
   * Apply impulse at angle
   * @param {number} impulse - Impulse magnitude
   * @param {number} angle - Angle in radians
   * @returns {PhysicsComponent} This component for chaining
   */
  applyImpulseAtAngle(impulse, angle) {
    return this.applyImpulse(
      Math.cos(angle) * impulse,
      Math.sin(angle) * impulse
    );
  }
  
  /**
   * Apply torque (rotational force)
   * @param {number} torque - Torque value
   * @returns {PhysicsComponent} This component for chaining
   */
  applyTorque(torque) {
    if (this.mass === 0) return this; // Can't apply torque to immovable objects
    
    this.torque += torque;
    return this;
  }
  
  /**
   * Stop all movement
   * @returns {PhysicsComponent} This component for chaining
   */
  stop() {
    this.velocityX = 0;
    this.velocityY = 0;
    this.angularVelocity = 0;
    this.forceX = 0;
    this.forceY = 0;
    this.torque = 0;
    return this;
  }
  
  /**
   * Update the physics component
   * @param {number} deltaTime - Time elapsed since last update in seconds
   */
  update(deltaTime) {
    if (!this.enabled) return;
    
    const transform = this.entity.getComponent('transform');
    if (!transform) return;
    
    // Note: The main physics updates are handled by the PhysicsSystem
    // This method primarily updates the transform rotation from angular velocity
    
    // Apply angular velocity to rotation
    if (this.angularVelocity !== 0) {
      transform.rotation += this.angularVelocity * deltaTime;
      
      // Normalize rotation to keep it between 0 and 2π
      transform.rotation %= Math.PI * 2;
    }
    
    // Apply torque to angular velocity
    if (this.torque !== 0 && this.mass !== 0) {
      this.angularVelocity += this.torque / this.mass * deltaTime;
      this.torque = 0;
    }
    
    // Apply angular drag
    if (this.drag > 0 && this.angularVelocity !== 0) {
      const dragFactor = Math.pow(1 - this.drag, deltaTime * 60);
      this.angularVelocity *= dragFactor;
      
      // Stop rotation if it's very slow
      if (Math.abs(this.angularVelocity) < 0.001) {
        this.angularVelocity = 0;
      }
    }
  }
}

// Register component with the Entity system
if (Entity?.registerComponent) {
  Entity.registerComponent('physics', PhysicsComponent);
} 