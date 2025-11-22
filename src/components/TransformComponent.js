/**
 * TransformComponent.js - Handles entity position, scale, rotation and hierarchy
 * Part of the EcoSEED component system
 */

import Component from '../core/base/Component.js';
import { Entity } from '../core/index.js';

/**
 * TransformComponent handles positioning, scaling, and rotation of entities
 */
export default class TransformComponent extends Component {
  /**
   * Create a new transform component
   * @param {Entity} entity - The entity this component belongs to
   * @param {Object} options - Component options
   * @param {Object} options.position - Initial position {x, y}
   * @param {Object} options.scale - Initial scale {x, y}
   * @param {number} options.rotation - Initial rotation in radians
   * @param {number} options.zIndex - Rendering depth/z-index
   */
  constructor(entity, options = {}) {
    super('transform', entity);
    
    // Position
    this.x = options.position?.x || 0;
    this.y = options.position?.y || 0;
    
    // Scale
    this.scaleX = options.scale?.x || 1;
    this.scaleY = options.scale?.y || 1;
    
    // Rotation in radians
    this.rotation = options.rotation || 0;
    
    // Z-index for rendering order
    this.zIndex = options.zIndex || 0;
    
    // Previous position for velocity calculations
    this._prevX = this.x;
    this._prevY = this.y;
    
    // Velocity (calculated during update)
    this.velocityX = 0;
    this.velocityY = 0;
  }

  /**
   * Set the position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {TransformComponent} This component for chaining
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Set the scale
   * @param {number} x - X scale factor
   * @param {number} y - Y scale factor (defaults to x if not provided)
   * @returns {TransformComponent} This component for chaining
   */
  setScale(x, y = null) {
    this.scaleX = x;
    this.scaleY = y === null ? x : y;
    return this;
  }

  /**
   * Set the rotation
   * @param {number} radians - Rotation in radians
   * @returns {TransformComponent} This component for chaining
   */
  setRotation(radians) {
    this.rotation = radians;
    return this;
  }

  /**
   * Set the z-index
   * @param {number} zIndex - Z-index value
   * @returns {TransformComponent} This component for chaining
   */
  setZIndex(zIndex) {
    this.zIndex = zIndex;
    
    // Trigger sort in parent scene if entity is in a scene
    if (this.entity.scene && typeof this.entity.scene.markNeedsSorting === 'function') {
      this.entity.scene.markNeedsSorting();
    }
    
    return this;
  }

  /**
   * Move the entity by a delta amount
   * @param {number} dx - X delta
   * @param {number} dy - Y delta
   * @returns {TransformComponent} This component for chaining
   */
  translate(dx, dy) {
    this.x += dx;
    this.y += dy;
    return this;
  }

  /**
   * Get the distance to another entity or position
   * @param {Entity|Object} entityOrPosition - Entity or position {x, y}
   * @returns {number} Distance
   */
  distanceTo(entityOrPosition) {
    let targetX, targetY;
    
    if (entityOrPosition.getComponent) {
      // It's an entity, get its transform
      const targetTransform = entityOrPosition.getComponent('transform');
      if (!targetTransform) return Infinity;
      
      targetX = targetTransform.x;
      targetY = targetTransform.y;
    } else {
      // It's a position object
      targetX = entityOrPosition.x;
      targetY = entityOrPosition.y;
    }
    
    const dx = this.x - targetX;
    const dy = this.y - targetY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if this transform is within a radius of another entity or position
   * @param {Entity|Object} entityOrPosition - Entity or position {x, y}
   * @param {number} radius - Radius to check within
   * @returns {boolean} True if within radius
   */
  isWithinRadius(entityOrPosition, radius) {
    return this.distanceTo(entityOrPosition) <= radius;
  }

  /**
   * Get direction to another entity or position
   * @param {Entity|Object} entityOrPosition - Entity or position {x, y}
   * @returns {Object} Normalized direction vector {x, y}
   */
  directionTo(entityOrPosition) {
    let targetX, targetY;
    
    if (entityOrPosition.getComponent) {
      // It's an entity, get its transform
      const targetTransform = entityOrPosition.getComponent('transform');
      if (!targetTransform) return { x: 0, y: 0 };
      
      targetX = targetTransform.x;
      targetY = targetTransform.y;
    } else {
      // It's a position object
      targetX = entityOrPosition.x;
      targetY = entityOrPosition.y;
    }
    
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return { x: 0, y: 0 };
    
    return {
      x: dx / distance,
      y: dy / distance
    };
  }

  /**
   * Update the transform component
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Calculate velocity based on position change
    if (deltaTime > 0) {
      this.velocityX = (this.x - this._prevX) / deltaTime;
      this.velocityY = (this.y - this._prevY) / deltaTime;
    }
    
    // Store current position for next velocity calculation
    this._prevX = this.x;
    this._prevY = this.y;
  }

  /**
   * Get the world position (accounting for parent transforms)
   * @returns {Object} World position {x, y}
   */
  getWorldPosition() {
    if (!this.entity.parent) {
      return { x: this.x, y: this.y };
    }
    
    const parentTransform = this.entity.parent.getComponent('transform');
    if (!parentTransform) {
      return { x: this.x, y: this.y };
    }
    
    const parentPos = parentTransform.getWorldPosition();
    
    // Apply parent rotation to position
    const cos = Math.cos(parentTransform.rotation);
    const sin = Math.sin(parentTransform.rotation);
    const xRot = this.x * cos - this.y * sin;
    const yRot = this.x * sin + this.y * cos;
    
    // Apply parent scale and add parent position
    return {
      x: xRot * parentTransform.scaleX + parentPos.x,
      y: yRot * parentTransform.scaleY + parentPos.y
    };
  }

  /**
   * Get the world scale (accounting for parent transforms)
   * @returns {Object} World scale {x, y}
   */
  getWorldScale() {
    if (!this.entity.parent) {
      return { x: this.scaleX, y: this.scaleY };
    }
    
    const parentTransform = this.entity.parent.getComponent('transform');
    if (!parentTransform) {
      return { x: this.scaleX, y: this.scaleY };
    }
    
    const parentScale = parentTransform.getWorldScale();
    
    return {
      x: this.scaleX * parentScale.x,
      y: this.scaleY * parentScale.y
    };
  }

  /**
   * Get the world rotation (accounting for parent transforms)
   * @returns {number} World rotation in radians
   */
  getWorldRotation() {
    if (!this.entity.parent) {
      return this.rotation;
    }
    
    const parentTransform = this.entity.parent.getComponent('transform');
    if (!parentTransform) {
      return this.rotation;
    }
    
    const parentRot = parentTransform.getWorldRotation();
    return this.rotation + parentRot;
  }
}

if (Entity?.registerComponent) {
  Entity.registerComponent('transform', TransformComponent);
} 