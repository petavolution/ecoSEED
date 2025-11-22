/**
 * RenderSystem.js - Handles rendering of all entities
 * Optimized for performance and reliability
 */

import { System } from '../core/index.js';

/**
 * RenderSystem - Renders entities with sprite or generated graphics components
 */
export default class RenderSystem extends System {
  /**
   * Create a new render system
   */
  constructor() {
    super({ requiredComponents: ['transform'] }); // Only need transform as requirement
    
    this.enabled = true;
    this.lastRenderTime = 0;
    this.renderCount = 0;
    this.debugMode = false;
    
    // Default placeholder style
    this.placeholderStyle = {
      width: 32,
      height: 32,
      fill: '#666666',
      stroke: '#FFFFFF'
    };
  }

  /**
   * Enable debug mode
   * @param {boolean} enabled - Whether debug mode is enabled
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * Initialize the system with the scene context
   * @param {Scene} scene - The scene this system belongs to
   */
  initialize(scene) {
    this.scene = scene;
    this.ctx = scene.game?.ctx;
    
    if (!this.ctx) {
      console.error('RenderSystem: Could not get canvas context');
      this.enabled = false;
    }
    
    console.log(`RenderSystem initialized for scene: ${scene.name}`);
  }

  /**
   * Get entities sorted by z-index for proper rendering order
   * @returns {Array} Sorted entities
   */
  getSortedEntities() {
    return Array.from(this.entities)
      .filter(entity => entity.active && !entity.markedForDeletion)
      .sort((a, b) => {
        const transformA = a.getComponent('transform');
        const transformB = b.getComponent('transform');
        return (transformA?.zIndex || 0) - (transformB?.zIndex || 0);
      });
  }

  /**
   * Apply camera transformations to context
   * @param {CanvasRenderingContext2D} ctx - Rendering context
   * @param {Object} camera - Camera object
   * @returns {boolean} Success
   */
  applyCamera(ctx, camera) {
    if (!ctx || !camera) return false;
    
    try {
      ctx.save();
      
      // For debugging: draw a cross at the origin before transform
      if (this.debugMode) {
        ctx.fillStyle = 'red';
        ctx.fillRect(-5, -5, 10, 10);
      }
      
      // Transform to camera space
      const centerX = camera.width / 2;
      const centerY = camera.height / 2;
      
      // First translate to center of viewport
      ctx.translate(centerX, centerY);
      
      // Then scale by zoom factor
      ctx.scale(camera.zoom, camera.zoom);
      
      // Then translate for camera position
      ctx.translate(-camera.x, -camera.y);
      
      if (this.debugMode) {
        console.log(`Camera transform: center(${centerX}, ${centerY}), pos(${camera.x}, ${camera.y}), zoom: ${camera.zoom}`);
        
        // Draw coordinate system indicators after transform
        ctx.fillStyle = 'green';
        ctx.fillRect(-5, -5, 10, 10); // Origin
        ctx.fillStyle = 'blue';
        ctx.fillRect(100, 0, 10, 10); // 100 units right
        ctx.fillStyle = 'yellow';
        ctx.fillRect(0, 100, 10, 10); // 100 units down
      }
      
      return true;
    } catch (error) {
      console.error('RenderSystem: Error applying camera transform:', error);
      ctx.restore();
      return false;
    }
  }

  /**
   * Render entity using its sprite component
   * @param {Entity} entity - Entity to render
   * @param {CanvasRenderingContext2D} ctx - Rendering context
   * @returns {boolean} Success
   */
  renderSprite(entity, ctx) {
    const sprite = entity.getComponent('sprite');
    if (!sprite || !sprite.loaded || !sprite.texture) {
      return false;
    }
    
    try {
      sprite.draw(ctx);
      return true;
    } catch (error) {
      console.error(`RenderSystem: Error drawing sprite for ${entity.name || entity.id}:`, error);
      return false;
    }
  }

  /**
   * Render entity using its generated graphics component
   * @param {Entity} entity - Entity to render
   * @param {CanvasRenderingContext2D} ctx - Rendering context 
   * @returns {boolean} Success
   */
  renderGeneratedGraphics(entity, ctx) {
    const transform = entity.getComponent('transform');
    if (!transform) return false;
    
    const generatedGfx = entity.getComponent('generatedGraphics');
    if (!generatedGfx || !generatedGfx.assetKey) {
      if (this.debugMode) {
        console.log(`RenderSystem: Entity ${entity.name || entity.id} has no valid graphics component`);
      }
      return false;
    }
    
    const assetManager = this.scene?.game?.assetManager;
    if (!assetManager) {
      console.error('RenderSystem: No assetManager available');
      return false;
    }
    
    const texture = assetManager.getAsset(generatedGfx.assetKey);
    if (!texture || !(texture instanceof HTMLCanvasElement)) {
      if (this.debugMode) {
        console.log(`RenderSystem: No valid texture for ${entity.name || entity.id} with key ${generatedGfx.assetKey}`);
      }
      return false;
    }

    try {
      const width = generatedGfx.width || texture.width || this.placeholderStyle.width;
      const height = generatedGfx.height || texture.height || this.placeholderStyle.height;
      
      const drawX = transform.x - width / 2;
      const drawY = transform.y - height / 2;
      
      if (this.debugMode) {
        // Draw a highlight around the drawing area
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX - 1, drawY - 1, width + 2, height + 2);
      }
      
      ctx.drawImage(texture, drawX, drawY, width, height);
      
      if (this.debugMode) {
        console.log(`RenderSystem: Drew ${entity.name || entity.id} at (${drawX}, ${drawY}), size ${width}x${height}`);
      }
      
      return true;
    } catch (error) {
      console.error(`RenderSystem: Error drawing graphics for ${entity.name || entity.id}:`, error);
      return false;
    }
  }

  /**
   * Render a fallback visuals for an entity with no valid graphics component
   * @param {Entity} entity - Entity to render
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @private
   */
  renderFallback(entity, ctx) {
    try {
      // Get transform component for position
      const transform = entity.getComponent('transform');
      if (!transform) {
        console.error(`Entity ${entity.id} has no transform component for fallback rendering`);
        return;
      }

      const entityTag = entity.tag || 'unknown';
      const color = this.getColorByTag(entityTag);
      
      // Draw at entity position
      const x = transform.x;
      const y = transform.y;
      const width = transform.width || 32;
      const height = transform.height || 32;
      
      ctx.save();
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      
      // Draw different shapes based on entity type
      switch(entityTag) {
        case 'bee':
          // Draw oval for bee body
          ctx.beginPath();
          ctx.ellipse(x + width/2, y + height/2, width/2, height/3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Draw small circles for wings
          ctx.beginPath();
          ctx.arc(x + width/2 - 5, y + height/2 - 8, 6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fill();
          break;
          
        case 'bird':
          // Draw diamond shape for bird
          ctx.beginPath();
          ctx.moveTo(x + width/2, y);
          ctx.lineTo(x + width, y + height/2);
          ctx.lineTo(x + width/2, y + height);
          ctx.lineTo(x, y + height/2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
          
        case 'butterfly':
          // Draw figure-8 for butterfly
          ctx.beginPath();
          ctx.ellipse(x + width/3, y + height/3, width/3, height/3, 0, 0, Math.PI * 2);
          ctx.ellipse(x + 2*width/3, y + 2*height/3, width/3, height/3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
          
        case 'dragonfly':
          // Draw long rectangle for dragonfly
          ctx.fillRect(x + width/4, y + height/3, width/2, height/3);
          ctx.strokeRect(x + width/4, y + height/3, width/2, height/3);
          // Draw lines for wings
          ctx.beginPath();
          ctx.moveTo(x + width/2, y + height/3);
          ctx.lineTo(x + width/2 - 10, y);
          ctx.moveTo(x + width/2, y + 2*height/3);
          ctx.lineTo(x + width/2 - 10, y + height);
          ctx.stroke();
          break;
          
        case 'flower':
          // Draw circle for flower
          ctx.beginPath();
          ctx.arc(x + width/2, y + height/2, width/2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Draw center
          ctx.fillStyle = 'yellow';
          ctx.beginPath();
          ctx.arc(x + width/2, y + height/2, width/4, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'grass':
          // Draw triangle for grass
          ctx.beginPath();
          ctx.moveTo(x + width/2, y);
          ctx.lineTo(x + width, y + height);
          ctx.lineTo(x, y + height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
          
        default:
          // Draw a simple rectangle for unknown entities
          ctx.strokeRect(x, y, width, height);
          ctx.fillRect(x, y, width, height);
      }
      
      // Add debug info if debug mode is on
      if (this.debugMode) {
        ctx.fillStyle = 'white';
        ctx.font = '9px Arial';
        ctx.fillText(entityTag, x, y - 5);
        
        // Draw crosshair at center
        ctx.beginPath();
        ctx.moveTo(x + width/2 - 5, y + height/2);
        ctx.lineTo(x + width/2 + 5, y + height/2);
        ctx.moveTo(x + width/2, y + height/2 - 5);
        ctx.lineTo(x + width/2, y + height/2 + 5);
        ctx.strokeStyle = 'red';
        ctx.stroke();
      }
      
      ctx.restore();
    } catch (error) {
      console.error(`Error in renderFallback for entity ${entity.id}:`, error);
    }
  }
  
  /**
   * Get color based on entity tag
   * @param {string} tag - Entity tag
   * @returns {string} CSS color
   * @private
   */
  getColorByTag(tag) {
    switch(tag) {
      case 'bee': return 'rgba(255, 204, 0, 0.8)'; // Yellow
      case 'bird': return 'rgba(65, 105, 225, 0.8)'; // Royal blue
      case 'butterfly': return 'rgba(255, 105, 180, 0.8)'; // Hot pink
      case 'dragonfly': return 'rgba(0, 191, 255, 0.8)'; // Deep sky blue
      case 'flower': return 'rgba(255, 105, 97, 0.8)'; // Coral
      case 'grass': return 'rgba(50, 205, 50, 0.8)'; // Lime green
      default: return 'rgba(200, 200, 200, 0.8)'; // Light gray
    }
  }

  /**
   * Render all entities in the scene
   * @param {CanvasRenderingContext2D} ctx - Rendering context
   * @param {Scene} scene - Scene being rendered
   */
  render(ctx, scene) {
    if (!this.enabled || !ctx || !scene) return;
    
    const startTime = performance.now();
    let drawnCount = 0;
    
    // Update debug mode from scene
    this.debugMode = scene.game?.state?.debug || false;
    
    try {
      // Get sorted entities for rendering
      const sortedEntities = this.getSortedEntities();
      if (this.debugMode) {
        console.log(`RenderSystem: Rendering ${sortedEntities.length} entities`);
      }
      
      if (sortedEntities.length === 0) {
        if (this.debugMode) {
          console.log('RenderSystem: No entities to render');
        }
        return;
      }
      
      // Apply camera transformations
      if (!this.applyCamera(ctx, scene.camera)) {
        console.error('RenderSystem: Failed to apply camera transform');
        return;
      }
      
      // Draw each entity
      for (const entity of sortedEntities) {
        let drawn = this.renderSprite(entity, ctx) || 
                  this.renderGeneratedGraphics(entity, ctx) ||
                  this.renderFallback(entity, ctx);
        
        if (drawn) {
          drawnCount++;
        }
      }
      
      // Restore context
      ctx.restore();
      
      // Performance tracking
      this.lastRenderTime = performance.now() - startTime;
      this.renderCount = drawnCount;
      
      // Debug info if enabled
      if (this.debugMode) {
        this.logDebugInfo(drawnCount);
      }
    } catch (error) {
      console.error('RenderSystem: Error in render cycle:', error);
      ctx.restore(); // Always restore context in case of error
    }
  }
  
  /**
   * Log debug information about rendering
   * @param {number} drawnCount - Number of drawn entities
   */
  logDebugInfo(drawnCount) {
    const renderTime = this.lastRenderTime.toFixed(2);
    const avgTimePerEntity = drawnCount > 0 ? (this.lastRenderTime / drawnCount).toFixed(2) : 0;
    console.log(`RenderSystem: Drew ${drawnCount} entities in ${renderTime}ms (${avgTimePerEntity}ms per entity)`);
  }
} 