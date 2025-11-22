/**
 * GeneratedGraphicsComponent.js
 * Component for storing generated graphics information
 */

import Component from '../core/base/Component.js';

/**
 * Component for generated graphics that are created from the GraphicsGenerator
 * @class GeneratedGraphicsComponent
 */
class GeneratedGraphicsComponent {
    /**
     * Create a new generated graphics component
     * @param {Entity|Object} entityOrOptions - Entity to attach to or options object
     * @param {Object} [options] - Configuration options if first parameter is an entity
     */
    constructor(entityOrOptions, options = {}) {
        this.type = 'graphics'; // Component type for retrieval
        this.entity = null;    // Reference to parent entity
        this.graphicsType = ''; // Type of graphics to generate
        this.isReady = false;  // Flag to track if graphics are ready
        this.texture = null;   // Cached texture/canvas
        this.debugMode = false; // Debug flag for development
        this.width = 32;       // Default width
        this.height = 32;      // Default height
        this.color = null;     // Optional override color
        this.scale = 1;        // Scale factor
        this.opacity = 1;      // Opacity value
        this.rotation = 0;     // Rotation in radians
        this.flipX = false;    // Horizontal flip
        this.flipY = false;    // Vertical flip
        this.offsetX = 0;      // X offset from entity position
        this.offsetY = 0;      // Y offset from entity position
        this.zIndex = 0;       // z-index for draw order
        this.cacheKey = '';    // Key for texture caching
        this.generator = null; // Reference to graphics generator
        
        try {
            // Handle different constructor patterns
            if (entityOrOptions && entityOrOptions.constructor && entityOrOptions.constructor.name === 'Entity') {
                // Pattern: (entity, options)
                this.entity = entityOrOptions;
                options = options || {};
                
                // If entity has a graphicsType in its config, use that
                if (this.entity.config && this.entity.config.graphicsType) {
                    this.graphicsType = this.entity.config.graphicsType;
                } else if (this.entity.tag) {
                    // Otherwise use entity tag as graphicsType
                    this.graphicsType = this.entity.tag;
                }
                
                console.log(`GeneratedGraphicsComponent: Created for entity ${this.entity.id} with type ${this.graphicsType}`);
            } else {
                // Pattern: (options)
                options = entityOrOptions || {};
                console.log(`GeneratedGraphicsComponent: Created with options`, options);
            }
            
            // Apply options
            Object.assign(this, options);
            
            // Create cache key for texture
            this.cacheKey = this._generateCacheKey();
            
            // Attempt to initialize immediately if entity is present
            if (this.entity) {
                this.initialize(this.entity);
            }
        } catch (error) {
            console.error('Error creating GeneratedGraphicsComponent:', error);
            // Ensure at least minimal initialization on error
            this.width = this.width || 32;
            this.height = this.height || 32;
            this.graphicsType = this.graphicsType || 'unknown';
        }
    }
    
    /**
     * Name of this component type
     * @returns {string} Component type name
     */
    get componentName() {
        return 'graphics';
    }
    
    /**
     * Initialize the component with options - required by Entity.addComponent
     * @param {Object} options - Component options
     */
    init(options = {}) {
        // Apply any additional options
        if (options) {
            Object.assign(this, options);
        }
        
        // Call the existing initialize method if we have an entity
        if (this.entity) {
            this.initialize(this.entity);
        }
    }
    
    /**
     * Initialize the component with a reference to the parent entity
     * @param {Entity} entity - Parent entity
     */
    initialize(entity) {
        if (!entity) {
            console.error('GeneratedGraphicsComponent: Cannot initialize with null entity');
            return;
        }
        
        try {
            this.entity = entity;
            
            // If graphicsType isn't set, try to get it from entity
            if (!this.graphicsType && entity.tag) {
                this.graphicsType = entity.tag;
                console.log(`GeneratedGraphicsComponent: Using entity tag '${entity.tag}' as graphics type`);
            }
            
            // Size from transform if available
            const transform = entity.getComponent('transform');
            if (transform) {
                this.width = this.width || transform.width || 32;
                this.height = this.height || transform.height || 32;
            }
            
            // Generate the graphics
            this._generateTexture();
            
            console.log(`GeneratedGraphicsComponent initialized for entity ${entity.id} with type ${this.graphicsType}`);
        } catch (error) {
            console.error(`Error initializing GeneratedGraphicsComponent for entity ${entity.id}:`, error);
        }
    }
    
    /**
     * Generate a unique cache key for this texture
     * @returns {string} Cache key for texture lookup
     * @private
     */
    _generateCacheKey() {
        const entity = this.entity || {};
        const id = entity.id || 'noentity';
        const type = this.graphicsType || 'unknown';
        const size = `${this.width}x${this.height}`;
        const color = this.color || 'default';
        
        return `${type}_${id}_${size}_${color}_${this.scale}`;
    }
    
    /**
     * Generate or retrieve cached texture for this component
     * @private
     */
    _generateTexture() {
        try {
            if (!this.graphicsType) {
                console.error('GeneratedGraphicsComponent: No graphics type specified');
                return;
            }
            
            // Get or create GraphicsGenerator instance
            if (!this.generator) {
                // Get the global instance or create one
                this.generator = window.graphicsGenerator || new GraphicsGenerator();
            }
            
            // Generate texture with the given parameters
            this.texture = this.generator.generate(
                this.graphicsType,
                this.width,
                this.height,
                this.color
            );
            
            if (this.texture) {
                this.isReady = true;
                console.log(`Generated texture for ${this.graphicsType} (${this.width}x${this.height})`);
            } else {
                console.error(`Failed to generate texture for ${this.graphicsType}`);
            }
        } catch (error) {
            console.error(`Error generating texture for ${this.graphicsType}:`, error);
            this.isReady = false;
        }
    }
    
    /**
     * Draw the component to the given context
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    draw(ctx) {
        if (!this.entity || !this.isReady || !this.texture) {
            return false;
        }
        
        try {
            const transform = this.entity.getComponent('transform');
            if (!transform) {
                console.error(`Entity ${this.entity.id} has no transform component`);
                return false;
            }
            
            // Calculate draw position
            const x = transform.x + this.offsetX;
            const y = transform.y + this.offsetY;
            
            ctx.save();
            
            // Apply entity transformation
            ctx.translate(x, y);
            ctx.rotate(this.rotation);
            ctx.scale(this.scale * (this.flipX ? -1 : 1), this.scale * (this.flipY ? -1 : 1));
            ctx.globalAlpha = this.opacity;
            
            // Draw the texture centered on entity position
            ctx.drawImage(
                this.texture,
                -this.width / 2,
                -this.height / 2,
                this.width,
                this.height
            );
            
            // Debug visualization
            if (this.debugMode) {
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 1;
                ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
                
                // Draw origin crosshair
                ctx.beginPath();
                ctx.moveTo(-5, 0);
                ctx.lineTo(5, 0);
                ctx.moveTo(0, -5);
                ctx.lineTo(0, 5);
                ctx.stroke();
            }
            
            ctx.restore();
            return true;
        } catch (error) {
            console.error(`Error drawing GeneratedGraphicsComponent for entity ${this.entity.id}:`, error);
            return false;
        }
    }
    
    /**
     * Update the component
     * @param {number} dt - Time delta since last update
     */
    update(dt) {
        // Regenerate texture if needed (when properties change)
        if (!this.isReady && this.graphicsType) {
            this._generateTexture();
        }
    }
    
    /**
     * Handle component removal and cleanup
     */
    onRemove() {
        // Release references
        this.entity = null;
        this.texture = null;
        this.generator = null;
        this.isReady = false;
    }
}

// Auto-register the component
if (typeof Entity !== 'undefined') {
    Entity.registerComponent('generatedGraphics', GeneratedGraphicsComponent);
}

export default GeneratedGraphicsComponent; 