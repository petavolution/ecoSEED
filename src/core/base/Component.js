/**
 * Component.js - Base component class for the entity-component architecture
 */

/**
 * Base class for all components
 */
export default class Component {
  /**
   * Create a new component
   * @param {Entity} entity - Entity this component belongs to
   * @param {Object} options - Component options
   */
  constructor(entity, options = {}) {
    /**
     * Component type (to be set by derived classes)
     * @type {string}
     */
    this.type = this.constructor.name.toLowerCase().replace(/component$/, '');
    
    /**
     * Entity this component belongs to
     * @type {Entity}
     */
    this.entity = entity;
    
    /**
     * Whether this component is enabled
     * @type {boolean}
     */
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    
    /**
     * Whether this component has been initialized
     * @type {boolean}
     */
    this.initialized = false;
    
    /**
     * Component options (stored for reference)
     * @type {Object}
     */
    this.options = { ...options };
    
    /**
     * Component dependencies
     * @type {Array<string>}
     */
    this.dependencies = this.constructor.dependencies || [];
    
    // Validate dependencies if we have an entity
    if (entity && this.dependencies.length > 0) {
      this._validateDependencies();
    }
  }
  
  /**
   * Initialize component
   * Can be overridden by derived classes
   * @param {Object} options - Additional initialization options
   */
  init(options = {}) {
    if (this.initialized) {
      console.warn(`Component ${this.type} has already been initialized`);
      return;
    }
    
    // Merge options
    this.options = { ...this.options, ...options };
    
    // Apply options to component properties
    this._applyOptions(this.options);
    
    // Mark as initialized
    this.initialized = true;
  }
  
  /**
   * Update component
   * To be overridden by derived classes
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // Override in derived classes
  }
  
  /**
   * Late update (called after main update)
   * To be overridden by derived classes
   * @param {number} deltaTime - Time since last update in seconds
   */
  lateUpdate(deltaTime) {
    // Override in derived classes
  }
  
  /**
   * Fixed update (called at fixed intervals)
   * To be overridden by derived classes
   * @param {number} fixedDeltaTime - Fixed time step in seconds
   */
  fixedUpdate(fixedDeltaTime) {
    // Override in derived classes
  }
  
  /**
   * Draw component
   * To be overridden by derived classes
   * @param {CanvasRenderingContext2D} ctx - Rendering context
   */
  draw(ctx) {
    // Override in derived classes
  }
  
  /**
   * Enable component
   */
  enable() {
    this.enabled = true;
  }
  
  /**
   * Disable component
   */
  disable() {
    this.enabled = false;
  }
  
  /**
   * Toggle component enabled/disabled state
   */
  toggle() {
    this.enabled = !this.enabled;
  }
  
  /**
   * Destroy component
   * Handles cleanup operations
   * Can be extended by derived classes
   */
  destroy() {
    // Notify entity
    if (this.entity) {
      // Remove from entity's components map in a safe way
      const entityComponents = this.entity.components;
      if (entityComponents && entityComponents instanceof Map && entityComponents.has(this.type)) {
        entityComponents.delete(this.type);
      }
    }
    
    // Clear entity reference
    this.entity = null;
    this.enabled = false;
    this.initialized = false;
    
    // Optional: Nullify properties to help GC
    this.options = null;
  }
  
  /**
   * Apply provided options to component properties
   * @param {Object} options - Options to apply
   * @private
   */
  _applyOptions(options) {
    // Base implementation - derived classes should override or extend
    // Apply standard options like 'enabled'
    if (options.enabled !== undefined) {
      this.enabled = options.enabled;
    }
  }
  
  /**
   * Validate component dependencies
   * @private
   */
  _validateDependencies() {
    for (const dependency of this.dependencies) {
      if (!this.entity.hasComponent(dependency)) {
        console.warn(`Component ${this.type} depends on ${dependency}, but it's not present on entity ${this.entity.id}`);
      }
    }
  }
  
  /**
   * Get a sibling component from the entity
   * @param {string} type - Component type to get
   * @returns {Component} Component instance or null
   */
  getComponent(type) {
    return this.entity ? this.entity.getComponent(type) : null;
  }
  
  /**
   * Check if a component exists on the entity
   * @param {string} type - Component type to check for
   * @returns {boolean} Whether the component exists
   */
  hasComponent(type) {
    return this.entity ? this.entity.hasComponent(type) : false;
  }
  
  /**
   * Send a message to this component
   * @param {string} message - Message name
   * @param {*} data - Message data
   * @returns {*} Response from the message handler
   */
  sendMessage(message, data) {
    const handlerName = `on${message.charAt(0).toUpperCase() + message.slice(1)}`;
    if (typeof this[handlerName] === 'function') {
      return this[handlerName](data);
    }
    return null;
  }
  
  /**
   * Convert to string representation
   * @returns {string} String representation
   */
  toString() {
    return `[Component:${this.type}]`;
  }
} 