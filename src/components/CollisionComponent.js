/**
 * CollisionComponent.js - Handles collision detection and physics for entities
 * Part of the EcoSEED component system
 */

import Component from '../core/base/Component.js';
import { Entity } from '../core/index.js';

// Collision shapes
const SHAPES = {
  CIRCLE: 'circle',
  RECTANGLE: 'rectangle',
  POINT: 'point'
};

/**
 * CollisionComponent handles collision detection for entities
 */
export default class CollisionComponent extends Component {
  /**
   * Create a collision component
   * @param {Entity} entity - The entity this component belongs to
   * @param {Object} options - Component options
   * @param {string} options.shape - Collision shape type (circle, rectangle, point)
   * @param {number} options.radius - Radius for circle shapes
   * @param {number} options.width - Width for rectangle shapes
   * @param {number} options.height - Height for rectangle shapes
   * @param {boolean} options.isTrigger - If true, detects collisions but doesn't block movement
   * @param {number} options.offsetX - X offset from entity center
   * @param {number} options.offsetY - Y offset from entity center
   * @param {Array<string>} options.collidesWith - Array of tags this component collides with
   * @param {boolean} options.active - Whether collision is active
   */
  constructor(entity, options = {}) {
    super('collision', entity);
    
    // Collision properties
    this.shape = options.shape || SHAPES.CIRCLE;
    this.radius = options.radius || 0;
    this.width = options.width || 0;
    this.height = options.height || 0;
    this.isTrigger = options.isTrigger !== undefined ? options.isTrigger : false;
    
    // Offset from entity center
    this.offsetX = options.offsetX || 0;
    this.offsetY = options.offsetY || 0;
    
    // Tags to collide with
    this.collidesWith = options.collidesWith || [];
    
    // Set appropriate dimensions based on shape
    this.active = options.active !== undefined ? options.active : true;
    
    // Auto-set dimensions from transform if not specified
    if (this.shape === SHAPES.CIRCLE && this.radius === 0) {
      const transform = entity.getComponent('transform');
      if (transform) {
        // Use average of width/height for default radius
        const maxDimension = Math.max(transform.width, transform.height);
        this.radius = maxDimension / 2;
      } else {
        this.radius = 10; // Default radius
      }
    } else if (this.shape === SHAPES.RECTANGLE && (this.width === 0 || this.height === 0)) {
      const transform = entity.getComponent('transform');
      if (transform) {
        this.width = this.width || transform.width;
        this.height = this.height || transform.height;
      } else {
        this.width = this.width || 20;
        this.height = this.height || 20;
      }
    }
    
    // Cached list of current collisions
    this.currentCollisions = new Set();
    
    // Flag for whether entity is currently colliding
    this.isColliding = false;
  }
  
  /**
   * Set collision shape properties
   * @param {Object} options - Shape options
   * @param {string} options.shape - Shape type ('circle', 'rectangle', 'point')
   * @param {number} options.radius - Radius for circle shapes
   * @param {number} options.width - Width for rectangle shapes
   * @param {number} options.height - Height for rectangle shapes
   * @returns {CollisionComponent} This component for chaining
   */
  setShape(options) {
    this.shape = options.shape || this.shape;
    
    if (options.radius !== undefined) {
      this.radius = options.radius;
    }
    
    if (options.width !== undefined) {
      this.width = options.width;
    }
    
    if (options.height !== undefined) {
      this.height = options.height;
    }
    
    return this;
  }
  
  /**
   * Set the collision offset
   * @param {number} x - X offset
   * @param {number} y - Y offset
   * @returns {CollisionComponent} This component for chaining
   */
  setOffset(x, y) {
    this.offsetX = x;
    this.offsetY = y;
    return this;
  }
  
  /**
   * Set whether this is a trigger
   * @param {boolean} isTrigger - Whether this is a trigger
   * @returns {CollisionComponent} This component for chaining
   */
  setTrigger(isTrigger) {
    this.isTrigger = isTrigger;
    return this;
  }
  
  /**
   * Set which tags this component collides with
   * @param {Array<string>} tags - Array of tags to collide with
   * @returns {CollisionComponent} This component for chaining
   */
  setCollidesWith(tags) {
    this.collidesWith = tags;
    return this;
  }
  
  /**
   * Set whether collision is active
   * @param {boolean} active - Whether collision is active
   * @returns {CollisionComponent} This component for chaining
   */
  setActive(active) {
    this.active = active;
    return this;
  }
  
  /**
   * Get the bounds of this collision component
   * @returns {Object} Bounds object with different properties based on shape
   */
  getBounds() {
    const transform = this.entity.getComponent('transform');
    if (!transform) return null;
    
    const x = transform.x + this.offsetX;
    const y = transform.y + this.offsetY;
    
    if (this.shape === SHAPES.CIRCLE) {
      // Get world scale to adjust radius
      const worldScale = transform.getWorldScale ? 
        transform.getWorldScale() : 
        { x: transform.scaleX, y: transform.scaleY };
      
      // Use average scale for circle
      const scaleAvg = (worldScale.x + worldScale.y) / 2;
      const scaledRadius = this.radius * scaleAvg;
      
      return {
        x,
        y,
        radius: scaledRadius,
        type: SHAPES.CIRCLE
      };
    } else if (this.shape === SHAPES.RECTANGLE) {
      // Get world scale to adjust dimensions
      const worldScale = transform.getWorldScale ? 
        transform.getWorldScale() : 
        { x: transform.scaleX, y: transform.scaleY };
      
      const scaledWidth = this.width * worldScale.x;
      const scaledHeight = this.height * worldScale.y;
      
      // Get world rotation
      const rotation = transform.getWorldRotation ? 
        transform.getWorldRotation() : 
        transform.rotation;
      
      return {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
        rotation: rotation,
        type: SHAPES.RECTANGLE,
        left: x - scaledWidth / 2,
        right: x + scaledWidth / 2,
        top: y - scaledHeight / 2,
        bottom: y + scaledHeight / 2
      };
    } else if (this.shape === SHAPES.POINT) {
      return {
        x,
        y,
        type: SHAPES.POINT
      };
    }
    
    return null;
  }
  
  /**
   * Check collision with another collision component
   * @param {CollisionComponent} other - The other collision component
   * @returns {Object|null} Collision information or null if no collision
   */
  checkCollision(other) {
    if (!this.active || !other.active) return null;
    
    // Check if we should collide with this entity's tag
    if (this.collidesWith.length > 0 && !this.collidesWith.includes(other.entity.tag)) {
      return null;
    }
    
    const boundsA = this.getBounds();
    const boundsB = other.getBounds();
    
    if (!boundsA || !boundsB) return null;
    
    // Handle different collision shape combinations
    if (boundsA.type === SHAPES.CIRCLE && boundsB.type === SHAPES.CIRCLE) {
      return this.checkCircleCircle(boundsA, boundsB);
    } else if (boundsA.type === SHAPES.RECTANGLE && boundsB.type === SHAPES.RECTANGLE) {
      return this.checkRectRect(boundsA, boundsB);
    } else if (boundsA.type === SHAPES.CIRCLE && boundsB.type === SHAPES.RECTANGLE) {
      return this.checkCircleRect(boundsA, boundsB);
    } else if (boundsA.type === SHAPES.RECTANGLE && boundsB.type === SHAPES.CIRCLE) {
      const result = this.checkCircleRect(boundsB, boundsA);
      if (result) {
        // Flip normal if we found a collision
        result.normal.x *= -1;
        result.normal.y *= -1;
      }
      return result;
    } else if (boundsA.type === SHAPES.POINT) {
      if (boundsB.type === SHAPES.CIRCLE) {
        return this.checkPointCircle(boundsA, boundsB);
      } else if (boundsB.type === SHAPES.RECTANGLE) {
        return this.checkPointRect(boundsA, boundsB);
      }
    } else if (boundsB.type === SHAPES.POINT) {
      if (boundsA.type === SHAPES.CIRCLE) {
        return this.checkPointCircle(boundsB, boundsA);
      } else if (boundsA.type === SHAPES.RECTANGLE) {
        return this.checkPointRect(boundsB, boundsA);
      }
    }
    
    return null;
  }
  
  /**
   * Check circle-circle collision
   * @param {Object} circleA - First circle bounds
   * @param {Object} circleB - Second circle bounds
   * @returns {Object|null} Collision info or null
   * @private
   */
  checkCircleCircle(circleA, circleB) {
    const dx = circleB.x - circleA.x;
    const dy = circleB.y - circleA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const sumRadii = circleA.radius + circleB.radius;
    
    if (distance < sumRadii) {
      // Calculate collision normal and penetration depth
      const overlap = sumRadii - distance;
      
      // Normalize the direction vector
      let normalX = 0;
      let normalY = 0;
      
      // Avoid division by zero
      if (distance > 0) {
        normalX = dx / distance;
        normalY = dy / distance;
      } else {
        // Circles are at the same position, choose arbitrary normal
        normalX = 1;
        normalY = 0;
      }
      
      return {
        colliding: true,
        normal: { x: normalX, y: normalY },
        depth: overlap,
        point: {
          x: circleA.x + normalX * circleA.radius,
          y: circleA.y + normalY * circleA.radius
        }
      };
    }
    
    return null;
  }
  
  /**
   * Check circle-rectangle collision
   * @param {Object} circle - Circle bounds
   * @param {Object} rect - Rectangle bounds
   * @returns {Object|null} Collision info or null
   * @private
   */
  checkCircleRect(circle, rect) {
    // If rectangle is rotated, we need more complex testing
    if (rect.rotation !== 0) {
      return this.checkCircleRotatedRect(circle, rect);
    }
    
    // Find closest point on rectangle to circle center
    const closestX = Math.max(rect.left, Math.min(circle.x, rect.right));
    const closestY = Math.max(rect.top, Math.min(circle.y, rect.bottom));
    
    // Calculate distance from closest point to circle center
    const dx = closestX - circle.x;
    const dy = closestY - circle.y;
    const distanceSquared = dx * dx + dy * dy;
    
    if (distanceSquared < circle.radius * circle.radius) {
      const distance = Math.sqrt(distanceSquared);
      
      // Calculate normal and penetration depth
      let normalX = 0;
      let normalY = 0;
      
      if (distance > 0) {
        normalX = dx / distance;
        normalY = dy / distance;
      } else {
        // Use rectangle center to circle direction as normal
        const toCenterX = circle.x - rect.x;
        const toCenterY = circle.y - rect.y;
        const toCenterLength = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
        
        if (toCenterLength > 0) {
          normalX = toCenterX / toCenterLength;
          normalY = toCenterY / toCenterLength;
        } else {
          normalX = 0;
          normalY = -1; // Default normal if centers are the same
        }
      }
      
      return {
        colliding: true,
        normal: { x: -normalX, y: -normalY }, // Flip normal to point from rect to circle
        depth: circle.radius - distance,
        point: {
          x: closestX,
          y: closestY
        }
      };
    }
    
    return null;
  }
  
  /**
   * Check circle-rotated rectangle collision (more complex)
   * @param {Object} circle - Circle bounds
   * @param {Object} rect - Rectangle bounds
   * @returns {Object|null} Collision info or null
   * @private
   */
  checkCircleRotatedRect(circle, rect) {
    // Transform circle center to rectangle's local space
    const cos = Math.cos(-rect.rotation);
    const sin = Math.sin(-rect.rotation);
    
    const dx = circle.x - rect.x;
    const dy = circle.y - rect.y;
    
    // Rotate point around origin
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    
    // Find closest point on AABB in local space
    const halfWidth = rect.width / 2;
    const halfHeight = rect.height / 2;
    
    const closestX = Math.max(-halfWidth, Math.min(localX, halfWidth));
    const closestY = Math.max(-halfHeight, Math.min(localY, halfHeight));
    
    // Check if closest point is inside circle
    const localDx = localX - closestX;
    const localDy = localY - closestY;
    const distanceSquared = localDx * localDx + localDy * localDy;
    
    if (distanceSquared < circle.radius * circle.radius) {
      // Transform closest point back to world space
      const worldClosestX = closestX * cos + closestY * sin + rect.x;
      const worldClosestY = -closestX * sin + closestY * cos + rect.y;
      
      // Calculate normal and penetration depth
      const worldDx = circle.x - worldClosestX;
      const worldDy = circle.y - worldClosestY;
      const distance = Math.sqrt(worldDx * worldDx + worldDy * worldDy);
      
      let normalX = 0;
      let normalY = 0;
      
      if (distance > 0) {
        normalX = worldDx / distance;
        normalY = worldDy / distance;
      } else {
        // Use default normal
        normalX = 0;
        normalY = -1;
      }
      
      return {
        colliding: true,
        normal: { x: normalX, y: normalY },
        depth: circle.radius - distance,
        point: {
          x: worldClosestX,
          y: worldClosestY
        }
      };
    }
    
    return null;
  }
  
  /**
   * Check rectangle-rectangle collision
   * @param {Object} rectA - First rectangle bounds
   * @param {Object} rectB - Second rectangle bounds
   * @returns {Object|null} Collision info or null
   * @private
   */
  checkRectRect(rectA, rectB) {
    // If either rectangle is rotated, use more complex testing
    if (rectA.rotation !== 0 || rectB.rotation !== 0) {
      return this.checkRotatedRectRect(rectA, rectB);
    }
    
    // Simple AABB check
    if (rectA.left > rectB.right || rectA.right < rectB.left ||
        rectA.top > rectB.bottom || rectA.bottom < rectB.top) {
      return null;
    }
    
    // Calculate penetration on each axis
    const overlapX = Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left);
    const overlapY = Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top);
    
    // Use minimum penetration axis
    if (overlapX < overlapY) {
      // X-axis collision
      const normalX = rectA.x < rectB.x ? -1 : 1;
      return {
        colliding: true,
        normal: { x: normalX, y: 0 },
        depth: overlapX,
        point: {
          x: normalX > 0 ? rectA.right : rectA.left,
          y: rectA.y
        }
      };
    } else {
      // Y-axis collision
      const normalY = rectA.y < rectB.y ? -1 : 1;
      return {
        colliding: true,
        normal: { x: 0, y: normalY },
        depth: overlapY,
        point: {
          x: rectA.x,
          y: normalY > 0 ? rectA.bottom : rectA.top
        }
      };
    }
  }
  
  /**
   * Check rotated rectangle-rectangle collision (using SAT)
   * @param {Object} rectA - First rectangle bounds
   * @param {Object} rectB - Second rectangle bounds
   * @returns {Object|null} Collision info or null
   * @private
   */
  checkRotatedRectRect(rectA, rectB) {
    // Implement Separating Axis Theorem (SAT)
    // This is complex and would require more detailed code
    // For now, return a simplistic approximation
    
    // Convert to circles for a rough approximation
    const circleA = {
      x: rectA.x,
      y: rectA.y,
      radius: Math.sqrt(rectA.width * rectA.width + rectA.height * rectA.height) / 2
    };
    
    const circleB = {
      x: rectB.x,
      y: rectB.y,
      radius: Math.sqrt(rectB.width * rectB.width + rectB.height * rectB.height) / 2
    };
    
    return this.checkCircleCircle(circleA, circleB);
  }
  
  /**
   * Check point-circle collision
   * @param {Object} point - Point bounds
   * @param {Object} circle - Circle bounds
   * @returns {Object|null} Collision info or null
   * @private
   */
  checkPointCircle(point, circle) {
    const dx = point.x - circle.x;
    const dy = point.y - circle.y;
    const distanceSquared = dx * dx + dy * dy;
    
    if (distanceSquared <= circle.radius * circle.radius) {
      const distance = Math.sqrt(distanceSquared);
      
      return {
        colliding: true,
        normal: {
          x: distance > 0 ? dx / distance : 1,
          y: distance > 0 ? dy / distance : 0
        },
        depth: circle.radius - distance,
        point: { x: point.x, y: point.y }
      };
    }
    
    return null;
  }
  
  /**
   * Check point-rectangle collision
   * @param {Object} point - Point bounds
   * @param {Object} rect - Rectangle bounds
   * @returns {Object|null} Collision info or null
   * @private
   */
  checkPointRect(point, rect) {
    // If rectangle is rotated, transform point to local space
    if (rect.rotation !== 0) {
      const cos = Math.cos(-rect.rotation);
      const sin = Math.sin(-rect.rotation);
      
      const dx = point.x - rect.x;
      const dy = point.y - rect.y;
      
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;
      
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;
      
      if (localX >= -halfWidth && localX <= halfWidth &&
          localY >= -halfHeight && localY <= halfHeight) {
        // Calculate normal based on which edge is closest
        const distToRight = halfWidth - localX;
        const distToLeft = localX + halfWidth;
        const distToBottom = halfHeight - localY;
        const distToTop = localY + halfHeight;
        
        let normalX = 0;
        let normalY = 0;
        let minDist = Infinity;
        
        if (distToRight < minDist) {
          minDist = distToRight;
          normalX = 1;
          normalY = 0;
        }
        
        if (distToLeft < minDist) {
          minDist = distToLeft;
          normalX = -1;
          normalY = 0;
        }
        
        if (distToBottom < minDist) {
          minDist = distToBottom;
          normalX = 0;
          normalY = 1;
        }
        
        if (distToTop < minDist) {
          minDist = distToTop;
          normalX = 0;
          normalY = -1;
        }
        
        // Transform normal back to world space
        const worldNormalX = normalX * cos - normalY * sin;
        const worldNormalY = normalX * sin + normalY * cos;
        
        return {
          colliding: true,
          normal: { x: worldNormalX, y: worldNormalY },
          depth: minDist,
          point: { x: point.x, y: point.y }
        };
      }
    } else {
      // Simple AABB check for unrotated rectangle
      if (point.x >= rect.left && point.x <= rect.right &&
          point.y >= rect.top && point.y <= rect.bottom) {
        // Calculate normal based on which edge is closest
        const distToRight = rect.right - point.x;
        const distToLeft = point.x - rect.left;
        const distToBottom = rect.bottom - point.y;
        const distToTop = point.y - rect.top;
        
        let normalX = 0;
        let normalY = 0;
        let minDist = Infinity;
        
        if (distToRight < minDist) {
          minDist = distToRight;
          normalX = 1;
          normalY = 0;
        }
        
        if (distToLeft < minDist) {
          minDist = distToLeft;
          normalX = -1;
          normalY = 0;
        }
        
        if (distToBottom < minDist) {
          minDist = distToBottom;
          normalX = 0;
          normalY = 1;
        }
        
        if (distToTop < minDist) {
          minDist = distToTop;
          normalX = 0;
          normalY = -1;
        }
        
        return {
          colliding: true,
          normal: { x: normalX, y: normalY },
          depth: minDist,
          point: { x: point.x, y: point.y }
        };
      }
    }
    
    return null;
  }
  
  /**
   * Draw a debug visualization of this collision shape
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} camera - Optional camera for offset calculation
   */
  drawDebug(ctx, camera = null) {
    const bounds = this.getBounds();
    if (!bounds) return;
    
    ctx.save();
    
    // Adjust for camera
    let x = bounds.x;
    let y = bounds.y;
    
    if (camera) {
      x -= camera.x;
      y -= camera.y;
    }
    
    // Set style based on collision state and type
    if (this.isColliding) {
      ctx.strokeStyle = this.isTrigger ? 'rgba(255, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
    } else {
      ctx.strokeStyle = this.isTrigger ? 'rgba(0, 255, 255, 0.8)' : 'rgba(0, 255, 0, 0.8)';
    }
    
    ctx.lineWidth = 2;
    
    // Draw shape
    if (bounds.type === SHAPES.CIRCLE) {
      ctx.beginPath();
      ctx.arc(x, y, bounds.radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw center
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (bounds.type === SHAPES.RECTANGLE) {
      if (bounds.rotation === 0) {
        // Unrotated rectangle
        const halfWidth = bounds.width / 2;
        const halfHeight = bounds.height / 2;
        ctx.strokeRect(x - halfWidth, y - halfHeight, bounds.width, bounds.height);
        
        // Draw center
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Rotated rectangle
        ctx.translate(x, y);
        ctx.rotate(bounds.rotation);
        
        const halfWidth = bounds.width / 2;
        const halfHeight = bounds.height / 2;
        ctx.strokeRect(-halfWidth, -halfHeight, bounds.width, bounds.height);
        
        // Draw center
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (bounds.type === SHAPES.POINT) {
      // Draw point
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  /**
   * Update the collision component
   * @param {number} deltaTime - Time elapsed since last update in seconds
   */
  update(deltaTime) {
    // Reset collision flag on update
    this.isColliding = false;
    
    // Process collision events in a Physics System instead of here
    // This is just to maintain collision state
    this.currentCollisions.forEach(entity => {
      // Check if still colliding
      const otherCollision = entity.getComponent('collision');
      if (otherCollision && this.checkCollision(otherCollision)) {
        this.isColliding = true;
      } else {
        // No longer colliding
        this.currentCollisions.delete(entity);
        
        // Emit exit event if entity has scene and event system
        if (this.entity.scene && this.entity.scene.game && this.entity.scene.game.eventSystem) {
          this.entity.scene.game.eventSystem.emit('collision_exit', {
            entity: this.entity,
            otherEntity: entity
          });
        }
      }
    });
  }
}

// Export collision shapes
export { SHAPES };

// Register component with the Entity system
if (Entity?.registerComponent) {
  Entity.registerComponent('collision', CollisionComponent);
} 