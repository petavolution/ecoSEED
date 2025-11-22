/**
 * SpriteComponent.js - Renders sprites and animations
 * Part of the EcoSEED component system
 */

import Component from '../core/base/Component.js';
import { Entity } from '../core/index.js';

/**
 * SpriteComponent handles rendering sprites and sprite animations
 */
export default class SpriteComponent extends Component {
  /**
   * Create a sprite component
   * @param {Entity} entity - The entity this component belongs to
   * @param {Object} options - Component options
   * @param {string} options.assetKey - Key for the spritesheet image in AssetManager.
   * @param {number} options.spriteX - X coordinate of the top-left corner of the first frame on the spritesheet.
   * @param {number} options.spriteY - Y coordinate of the top-left corner of the first frame on the spritesheet.
   * @param {number} options.frameWidth - Width of a single frame.
   * @param {number} options.frameHeight - Height of a single frame.
   * @param {number} options.frames - Total number of frames in the animation sequence (defaults to 1).
   * @param {number} options.animationSpeed - Duration of each frame in milliseconds (converted to seconds).
   * @param {boolean} options.loop - Whether animation should loop (defaults to true).
   * @param {Object} options.origin - Origin point {x, y} (0-1, default is center 0.5, 0.5).
   * @param {string} options.tint - CSS color to tint the sprite.
   * @param {boolean} options.flipX - Initial horizontal flip state.
   * @param {boolean} options.flipY - Initial vertical flip state.
   * @param {boolean} options.visible - Initial visibility state.
   * 
   * @param {string} [options.spriteSheet] - DEPRECATED/Alternative: Name of sprite sheet (requires pre-defined sprite data in AssetManager).
   * @param {string} [options.spriteName] - DEPRECATED/Alternative: Name of sprite within sheet.
   * @param {string} [options.imageUrl] - DEPRECATED/Alternative: Direct image URL.
   */
  constructor(entity, options = {}) {
    super('sprite', entity);
    
    // Primary way to define sprite source and animation
    this.assetKey = options.assetKey || null;
    this.spriteSourceX = options.spriteX || 0;
    this.spriteSourceY = options.spriteY || 0;

    // Image and rendering details
    this.image = null; // This will hold the Image object for the assetKey
    this.loaded = false;
    this.visible = options.visible !== undefined ? options.visible : true;
    this.tint = options.tint || null;
    
    // Frame information for animation
    this.frameSize = { 
        width: options.frameWidth || 0,
        height: options.frameHeight || 0 
    };
    this.frameCount = options.frames || 1;
    this.frameDuration = (options.animationSpeed || 100) / 1000; // Convert ms to seconds, default 100ms
    this.frameIndex = options.frameIndex || 0; // Allow setting initial frame
    this.frameTimer = 0;
    this.loop = options.loop !== undefined ? options.loop : true;
    this.playing = this.frameCount > 1;
    this.finished = false;
    
    // Origin point for drawing (0-1, default is center)
    this.origin = options.origin || { x: 0.5, y: 0.5 };
    
    // Source rectangle in the sprite sheet (initialized based on spriteX/Y and frameWidth/Height)
    this.sourceRect = {
      x: this.spriteSourceX,
      y: this.spriteSourceY,
      width: this.frameSize.width,
      height: this.frameSize.height
    };
    
    // Render dimensions (usually same as frame size, scale handled by TransformComponent)
    this.width = this.frameSize.width;
    this.height = this.frameSize.height;
    
    // Flip flags
    this.flipX = options.flipX || false;
    this.flipY = options.flipY || false;

    // --- Deprecated/Alternative Options --- 
    this.spriteSheet = options.spriteSheet || null; 
    this.spriteName = options.spriteName || null;
    this.imageUrl = options.imageUrl || options.image || null;
    // --- End Deprecated --- 

  }
  
  /**
   * Initialize the component
   */
  init() {
    this.loadImage();
  }
  
  /**
   * Set the sprite sheet and sprite name
   * @param {string} spriteSheet - Sprite sheet name
   * @param {string} spriteName - Sprite name
   * @returns {SpriteComponent} This component for chaining
   */
  setSprite(spriteSheet, spriteName) {
    this.spriteSheet = spriteSheet;
    this.spriteName = spriteName;
    this.loadImage();
    return this;
  }
  
  /**
   * Set direct image URL
   * @param {string} url - Image URL
   * @returns {SpriteComponent} This component for chaining
   */
  setImageUrl(url) {
    this.imageUrl = url;
    this.spriteSheet = null;
    this.spriteName = null;
    this.loadImage();
    return this;
  }
  
  /**
   * Load the image based on current settings
   * @private
   */
  async loadImage() {
    this.loaded = false;
    this.image = null;
    let imageSourceKey = null;
    let isSpriteSheetDefinition = false; // Flag if using spriteSheet/spriteName lookup

    // --- Determine Image Source --- 

    // Priority 1: Use assetKey if provided (New method)
    if (this.assetKey) {
        imageSourceKey = this.assetKey;
        // Ensure frameSize is set if using assetKey
        if (!this.frameSize.width || !this.frameSize.height) {
            console.warn(`SpriteComponent for ${this.entity.id} using assetKey '${this.assetKey}' but missing frameWidth/frameHeight in options.`);
            // Attempt to use image dimensions later if possible, but animation might break.
        }
    }
    // Priority 2: Use deprecated spriteSheet/spriteName (Requires AssetManager setup)
    else if (this.spriteSheet && this.spriteName && this.entity.scene?.game?.assetManager) {
      const assetManager = this.entity.scene.game.assetManager;
      const spriteData = assetManager.getSpriteData(this.spriteSheet, this.spriteName);
      if (spriteData) {
        imageSourceKey = this.spriteSheet;
        isSpriteSheetDefinition = true;
        // Use data from AssetManager definition
        this.spriteSourceX = spriteData.x || 0;
        this.spriteSourceY = spriteData.y || 0;
        this.frameSize = { 
            width: spriteData.frameWidth || spriteData.width || 0,
            height: spriteData.frameHeight || spriteData.height || 0
        };
        this.frameCount = spriteData.frames || 1;
        this.sourceRect = { x: this.spriteSourceX, y: this.spriteSourceY, width: this.frameSize.width, height: this.frameSize.height };
        this.width = this.frameSize.width;
        this.height = this.frameSize.height;
      } else {
        console.warn(`Sprite '${this.spriteName}' not found in sheet '${this.spriteSheet}' definition.`);
        return; // Cannot proceed
      }
    }
    // Priority 3: Use deprecated imageUrl (Direct loading)
    else if (this.imageUrl) {
      imageSourceKey = this.imageUrl;
      // Frame size must be set manually or defaults to image size
    }
    
    // --- Load Image --- 

    if (!imageSourceKey) {
        console.warn(`SpriteComponent for ${this.entity.id} has no image source specified (assetKey, spriteSheet/Name, or imageUrl).`);
        return;
    }

    // Try loading via AssetManager first (if available)
    if (this.entity.scene?.game?.assetManager) {
        const assetManager = this.entity.scene.game.assetManager;
        try {
            let loadedImage = assetManager.getImage(imageSourceKey);
            if (!loadedImage) {
                console.log(`SpriteComponent attempting to load image via AssetManager: ${imageSourceKey}`);
                loadedImage = await assetManager.loadImage(imageSourceKey, imageSourceKey);
            }
            this.image = loadedImage;
            this.loaded = true;

            // If frame size wasn't set and not using sprite sheet definition, use image size
            if (!isSpriteSheetDefinition && (!this.frameSize.width || !this.frameSize.height)) {
                 console.log(`SpriteComponent using full image dimensions for ${this.entity.id} (${this.image.width}x${this.image.height}) as frame size was not specified.`);
                 this.frameSize.width = this.image.width;
                 this.frameSize.height = this.image.height;
                 // Update sourceRect and dimensions if they were based on zero frame size
                 if (!this.sourceRect.width) this.sourceRect.width = this.frameSize.width;
                 if (!this.sourceRect.height) this.sourceRect.height = this.frameSize.height;
                 if (!this.width) this.width = this.frameSize.width;
                 if (!this.height) this.height = this.frameSize.height;
            }

            // Finalize sourceRect and dimensions based on loaded data
            this.sourceRect.x = this.spriteSourceX;
            this.sourceRect.y = this.spriteSourceY;
            this.sourceRect.width = this.frameSize.width;
            this.sourceRect.height = this.frameSize.height;
            this.width = this.frameSize.width;
            this.height = this.frameSize.height;

        } catch (error) {
            console.error(`SpriteComponent (via AssetManager) failed to load image '${imageSourceKey}':`, error);
            this.image = null;
            this.loaded = false;
        }
    }
    // Fallback: Direct image loading if no AssetManager (e.g., for testing or simple cases)
    else if (this.imageUrl && imageSourceKey === this.imageUrl) { 
        try {
            this.image = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = (err) => reject(new Error(`Failed to load image directly: ${this.imageUrl}`));
                img.src = this.imageUrl;
            });
            this.loaded = true;
            // Use full image dimensions if frame size not set
            if (!this.frameSize.width || !this.frameSize.height) {
                 this.frameSize.width = this.image.width;
                 this.frameSize.height = this.image.height;
            }
            // Set sourceRect and dimensions
            this.sourceRect = { x: 0, y: 0, width: this.frameSize.width, height: this.frameSize.height };
            this.width = this.frameSize.width;
            this.height = this.frameSize.height;
        } catch (error) {
            console.error(error.message);
            this.loaded = false;
        }
    }
  }
  
  /**
   * Set animation parameters
   * @param {Object} options - Animation options
   * @param {number} options.frameIndex - Starting frame index
   * @param {number} options.frameCount - Total number of frames
   * @param {number} options.frameDuration - Duration of each frame in seconds
   * @param {boolean} options.loop - Whether animation should loop
   * @returns {SpriteComponent} This component for chaining
   */
  setAnimation(options) {
    this.frameIndex = options.frameIndex !== undefined ? options.frameIndex : this.frameIndex;
    this.frameCount = options.frameCount !== undefined ? options.frameCount : this.frameCount;
    this.frameDuration = options.frameDuration !== undefined ? options.frameDuration : this.frameDuration;
    this.loop = options.loop !== undefined ? options.loop : this.loop;
    this.playing = true;
    this.finished = false;
    this.frameTimer = 0;
    return this;
  }
  
  /**
   * Play the animation
   * @returns {SpriteComponent} This component for chaining
   */
  play() {
    this.playing = true;
    return this;
  }
  
  /**
   * Pause the animation
   * @returns {SpriteComponent} This component for chaining
   */
  pause() {
    this.playing = false;
    return this;
  }
  
  /**
   * Stop the animation and reset to first frame
   * @returns {SpriteComponent} This component for chaining
   */
  stop() {
    this.playing = false;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.finished = false;
    return this;
  }
  
  /**
   * Set the frame index
   * @param {number} index - Frame index
   * @returns {SpriteComponent} This component for chaining
   */
  setFrame(index) {
    this.frameIndex = Math.max(0, Math.min(this.frameCount - 1, index));
    return this;
  }
  
  /**
   * Set sprite flipping
   * @param {boolean} flipX - Flip horizontally
   * @param {boolean} flipY - Flip vertically
   * @returns {SpriteComponent} This component for chaining
   */
  setFlip(flipX, flipY) {
    this.flipX = flipX;
    this.flipY = flipY;
    return this;
  }
  
  /**
   * Set the origin point for rotation and scaling
   * @param {number} x - X origin (0-1)
   * @param {number} y - Y origin (0-1)
   * @returns {SpriteComponent} This component for chaining
   */
  setOrigin(x, y) {
    this.origin.x = x;
    this.origin.y = y;
    return this;
  }
  
  /**
   * Set the tint color
   * @param {string} color - CSS color string
   * @returns {SpriteComponent} This component for chaining
   */
  setTint(color) {
    this.tint = color;
    return this;
  }
  
  /**
   * Update the sprite animation
   * @param {number} deltaTime - Time elapsed since last update in seconds
   */
  update(deltaTime) {
    if (!this.enabled || !this.loaded || !this.playing || this.finished) return;
    
    // Update animation
    this.frameTimer += deltaTime;
    
    if (this.frameTimer >= this.frameDuration) {
      // Advance frame
      this.frameIndex++;
      
      // Reset timer
      this.frameTimer = 0;
      
      // Handle end of animation
      if (this.frameIndex >= this.frameCount) {
        if (this.loop) {
          this.frameIndex = 0;
        } else {
          this.frameIndex = this.frameCount - 1;
          this.playing = false;
          this.finished = true;
          
          // Emit animation complete event if possible
          if (this.entity.scene && this.entity.scene.game && this.entity.scene.game.eventSystem) {
            this.entity.scene.game.eventSystem.emit('animation_complete', {
              entity: this.entity,
              component: this
            });
          }
        }
      }
    }
  }
  
  /**
   * Draw the sprite
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * Note: Context should already be transformed by RenderSystem/Scene
   */
  draw(ctx) {
    if (!this.visible || !this.loaded || !this.image) return;
    
    // Get transform component
    const transform = this.entity.getComponent('transform');
    if (!transform) return;
    
    ctx.save();
    
    // --- Camera transformation is now handled by RenderSystem/Scene --- 
    // Apply entity's local transform relative to the already transformed context
    ctx.translate(transform.x, transform.y);
    // Incorporate component scale, then transform scale, then flip
    ctx.scale(
      (this.scale || 1) * transform.scaleX * (this.flipX ? -1 : 1), 
      (this.scale || 1) * transform.scaleY * (this.flipY ? -1 : 1)
    );
    ctx.rotate(transform.rotation);
    
    // Calculate the source rectangle based on animation frame
    const frameWidth = this.frameSize.width || this.sourceRect.width;
    const frameHeight = this.frameSize.height || this.sourceRect.height;
    
    const sourceX = this.sourceRect.x + (this.frameIndex * frameWidth);
    const sourceY = this.sourceRect.y;
    
    // Calculate drawing offsets based on origin
    const offsetX = -this.width * this.origin.x;
    const offsetY = -this.height * this.origin.y;
    
    // Apply tint if specified
    if (this.tint) {
      // Create a temporary canvas for tinting
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = frameWidth;
      tempCanvas.height = frameHeight;
      
      // Draw the sprite to the temporary canvas
      tempCtx.drawImage(
        this.image,
        sourceX, sourceY,
        this.frameSize.width, this.frameSize.height,
        0, 0,
        this.width, this.height
      );
      
      // Apply tint
      tempCtx.globalCompositeOperation = 'source-atop';
      tempCtx.fillStyle = this.tint;
      tempCtx.fillRect(0, 0, frameWidth, frameHeight);
      
      // Draw the tinted sprite from temp canvas
      ctx.drawImage(
        tempCanvas,
        0, 0,
        this.width, this.height,
        offsetX, offsetY,
        this.width, this.height
      );
    } else {
      // Draw normally
      ctx.drawImage(
        this.image,
        sourceX, sourceY,
        this.frameSize.width, this.frameSize.height,
        offsetX, offsetY,
        this.width, this.height
      );
    }
    
    ctx.restore();
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    // Remove references
    this.image = null;
  }
}

// Register component with the Entity system
if (Entity?.registerComponent) {
  Entity.registerComponent('sprite', SpriteComponent);
} 