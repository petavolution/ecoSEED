/**
 * AnimationComponent.js - Handles sprite animations for entities
 * Part of the component-based architecture for EcoSEED
 */

import Component from '../core/base/Component.js';
import { Entity } from '../core/index.js';

/**
 * AnimationComponent - Handles sprite animations
 */
class AnimationComponent extends Component {
  /**
   * Create an animation component
   * @param {Entity} entity - The entity this component belongs to
   * @param {Object} options - Component options
   * @param {Object} options.animations - Map of animation names to animation data
   * @param {string} options.defaultAnimation - Default animation to play
   * @param {boolean} options.autoPlay - Whether to automatically play the default animation
   */
  constructor(entity, options = {}) {
    super('animation', entity);
    
    // Initialize animations map
    this.animations = options.animations || {};
    
    // Animation state
    this.currentAnimation = null;
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.isPlaying = false;
    this.loop = true;
    this.finished = false;
    this.speed = 1.0; // Animation speed multiplier
    
    // Auto-play default animation if specified
    if (options.defaultAnimation && options.autoPlay !== false) {
      this.play(options.defaultAnimation);
    }
  }
  
  /**
   * Add an animation to this component
   * @param {string} name - Name of the animation
   * @param {Object} animation - Animation data
   * @param {number[]} animation.frames - Array of frame indices
   * @param {number} animation.frameRate - Frames per second
   * @param {boolean} animation.loop - Whether the animation should loop
   * @returns {AnimationComponent} This component for chaining
   */
  addAnimation(name, animation) {
    this.animations[name] = animation;
    return this;
  }
  
  /**
   * Play an animation
   * @param {string} name - Name of the animation to play
   * @param {boolean} reset - Whether to reset the animation if it's already playing
   * @returns {AnimationComponent} This component for chaining
   */
  play(name, reset = false) {
    // Check if the animation exists
    if (!this.animations[name]) {
      console.warn(`Animation "${name}" does not exist`);
      return this;
    }
    
    // Check if we're already playing this animation and don't need to reset
    if (this.currentAnimation === name && !reset && this.isPlaying) {
      return this;
    }
    
    // Set the current animation
    this.currentAnimation = name;
    this.isPlaying = true;
    this.finished = false;
    
    // Reset animation state if needed
    if (reset) {
      this.currentFrame = 0;
      this.frameTimer = 0;
    }
    
    // Get animation data
    const animation = this.animations[name];
    this.loop = animation.loop !== undefined ? animation.loop : true;
    
    // Apply animation to sprite component
    this.updateSpriteComponent();
    
    return this;
  }
  
  /**
   * Stop the current animation
   * @returns {AnimationComponent} This component for chaining
   */
  stop() {
    this.isPlaying = false;
    return this;
  }
  
  /**
   * Pause the current animation
   * @returns {AnimationComponent} This component for chaining
   */
  pause() {
    this.isPlaying = false;
    return this;
  }
  
  /**
   * Resume the current animation
   * @returns {AnimationComponent} This component for chaining
   */
  resume() {
    if (this.currentAnimation) {
      this.isPlaying = true;
    }
    return this;
  }
  
  /**
   * Set the animation speed multiplier
   * @param {number} speed - Speed multiplier (1.0 is normal speed)
   * @returns {AnimationComponent} This component for chaining
   */
  setSpeed(speed) {
    this.speed = speed;
    return this;
  }
  
  /**
   * Update the animation
   * @param {number} deltaTime - Time elapsed since last update in milliseconds
   */
  update(deltaTime) {
    if (!this.isPlaying || !this.currentAnimation || this.finished) return;
    
    const animation = this.animations[this.currentAnimation];
    if (!animation) return;
    
    // Calculate frame duration in milliseconds
    const frameDuration = 1000 / (animation.frameRate * this.speed);
    
    // Update frame timer
    this.frameTimer += deltaTime;
    
    // Check if it's time to advance to the next frame
    if (this.frameTimer >= frameDuration) {
      // Reset timer (preserving any remainder for smoother animation)
      this.frameTimer -= frameDuration;
      
      // Advance to next frame
      this.currentFrame++;
      
      // Check for animation end
      if (this.currentFrame >= animation.frames.length) {
        if (this.loop) {
          // Loop back to the beginning
          this.currentFrame = 0;
        } else {
          // Stop at the last frame
          this.currentFrame = animation.frames.length - 1;
          this.finished = true;
          this.isPlaying = false;
        }
      }
      
      // Update the sprite component
      this.updateSpriteComponent();
    }
  }
  
  /**
   * Update the associated sprite component with the current animation frame
   * @private
   */
  updateSpriteComponent() {
    if (!this.currentAnimation) return;
    
    const animation = this.animations[this.currentAnimation];
    if (!animation) return;
    
    // Get the sprite component
    const sprite = this.entity.getComponent('sprite');
    if (!sprite) return;
    
    // Get the current frame data
    const frameIndex = animation.frames[this.currentFrame];
    
    // If the animation defines frameMap for mapping frame indices to sprite sheet coordinates
    if (animation.frameMap && animation.frameMap[frameIndex]) {
      const frame = animation.frameMap[frameIndex];
      sprite.setSourceRect(frame.x, frame.y, frame.width, frame.height);
    } 
    // If using a sprite sheet with regular grid layout
    else if (animation.spriteSheet) {
      const sheet = animation.spriteSheet;
      const frameX = frameIndex % sheet.columns;
      const frameY = Math.floor(frameIndex / sheet.columns);
      
      sprite.setSourceRect(
        frameX * sheet.frameWidth,
        frameY * sheet.frameHeight,
        sheet.frameWidth,
        sheet.frameHeight
      );
    }
    
    // Apply direction if the animation includes it
    if (animation.directions && animation.currentDirection !== undefined) {
      const direction = animation.directions[animation.currentDirection];
      if (direction) {
        // Apply direction-specific properties (e.g., flipping)
        if (direction.flipX !== undefined) sprite.setFlipX(direction.flipX);
        if (direction.flipY !== undefined) sprite.setFlipY(direction.flipY);
      }
    }
  }
  
  /**
   * Set the direction of the current animation
   * @param {string|number} direction - Direction name or index
   * @returns {AnimationComponent} This component for chaining
   */
  setDirection(direction) {
    if (!this.currentAnimation) return this;
    
    const animation = this.animations[this.currentAnimation];
    if (!animation || !animation.directions) return this;
    
    // Handle direction by name or index
    if (typeof direction === 'string') {
      for (let i = 0; i < animation.directions.length; i++) {
        if (animation.directions[i].name === direction) {
          animation.currentDirection = i;
          break;
        }
      }
    } else if (typeof direction === 'number') {
      if (direction >= 0 && direction < animation.directions.length) {
        animation.currentDirection = direction;
      }
    }
    
    // Update sprite with new direction
    this.updateSpriteComponent();
    
    return this;
  }
  
  /**
   * Set the animation direction based on movement
   * @param {number} dx - Movement in the x direction
   * @param {number} dy - Movement in the y direction
   * @returns {AnimationComponent} This component for chaining
   */
  setDirectionFromMovement(dx, dy) {
    if (!this.currentAnimation) return this;
    
    const animation = this.animations[this.currentAnimation];
    if (!animation || !animation.directions) return this;
    
    // Default directional indices (common convention for 4-direction animations)
    // 0: up, 1: right, 2: down, 3: left
    let directionIndex = animation.currentDirection || 0;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Moving horizontally
      directionIndex = dx > 0 ? 1 : 3; // right or left
    } else if (Math.abs(dy) > 0.1) {
      // Moving vertically
      directionIndex = dy > 0 ? 2 : 0; // down or up
    }
    
    // Set the direction
    animation.currentDirection = directionIndex;
    
    // Update sprite with new direction
    this.updateSpriteComponent();
    
    return this;
  }
  
  /**
   * Check if an animation has finished playing
   * @returns {boolean} True if the animation has finished
   */
  hasFinished() {
    return this.finished;
  }
  
  /**
   * Get the name of the current animation
   * @returns {string|null} The current animation name, or null if no animation is playing
   */
  getCurrentAnimation() {
    return this.currentAnimation;
  }
}

// Register the component
if (Entity?.registerComponent) {
  Entity.registerComponent('animation', AnimationComponent);
}

export default AnimationComponent; 