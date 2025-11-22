/**
 * Entity.js - Base entity class for the component-based architecture
 * Consolidated implementation for the EcoSEED project
 */

import Component from './Component.js';

// Registry to store component types by name
const componentRegistry = new Map();

// Counter for unique entity IDs
let nextEntityId = 1;

/**
 * Base Entity class
 * Entities are containers for components
 */
export default class Entity {
  /**
   * Create a new entity
   * @param {Object} options - Entity options
   * @param {string} options.id - Custom entity ID (optional)
   * @param {string} options.name - Entity name (default: "Entity")
   * @param {string} options.tag - Entity tag for grouping (default: "")
   * @param {boolean} options.active - Whether the entity is active (default: true)
   * @param {boolean} options.visible - Whether the entity is visible (default: true)
   */
  constructor(options = {}) {
    /**
     * Unique entity identifier
     * @type {string}
     */
    this.id = options.id || `entity_${nextEntityId++}`;
    
    /**
     * Display name for the entity
     * @type {string}
     */
    this.name = options.name || "Entity";
    
    /**
     * Tag for grouping entities
     * @type {string}
     */
    this.tag = options.tag || "";
    
    /**
     * Array of tags for multi-tag grouping
     * @type {Array<string>}
     */
    this.tags = options.tags || (this.tag ? [this.tag] : []);
    
    /**
     * Whether the entity is active (updated and drawn)
     * @type {boolean}
     */
    this.active = options.active !== undefined ? options.active : true;
    
    /**
     * Whether the entity is visible (drawn)
     * @type {boolean}
     */
    this.visible = options.visible !== undefined ? options.visible : true;
    
    /**
     * Component storage
     * @type {Map<string, Component>}
     */
    this.components = new Map();
    
    /**
     * Hierarchy management
     * @type {Entity|null}
     */
    this.parent = null;
    
    /**
     * Child entities
     * @type {Array<Entity>}
     */
    this.children = [];
    
    /**
     * Scene this entity belongs to
     * @type {Scene|null}
     */
    this.scene = null;
    
    /**
     * Flag for deletion
     * @type {boolean}
     */
    this.markedForDeletion = false;
    
    /**
     * Whether this entity has been initialized
     * @type {boolean}
     */
    this.initialized = false;
    
    // Add any initial tags to the tags array
    if (this.tag && !this.tags.includes(this.tag)) {
      this.tags.push(this.tag);
    }
  }

  /**
   * Add a component to this entity
   * @param {Component|string} componentOrType - Component instance or registered type name
   * @param {Object} options - Options to pass to component constructor if type name is provided
   * @returns {Component} The added component
   */
  addComponent(componentOrType, options = {}) {
    let component;
    
    if (typeof componentOrType === 'string') {
      // Create component from registered type
      const ComponentClass = Entity.getComponentClass(componentOrType);
      if (!ComponentClass) {
        console.error(`Component type '${componentOrType}' not registered`);
        return null;
      }
      component = new ComponentClass(this, options);
    } else {
      // Use existing component instance
      component = componentOrType;
      component.entity = this;
    }
    
    // Add to components map
    this.components.set(component.type, component);
    
    // Initialize component if entity is already initialized
    if (this.initialized) {
      component.init(options);
    }
    
    return component;
  }

  /**
   * Get a component by type
   * @param {string} type - Component type
   * @returns {Component|null} The component or null if not found
   */
  getComponent(type) {
    return this.components.get(type) || null;
  }

  /**
   * Check if entity has a component
   * @param {string} type - Component type
   * @returns {boolean} True if entity has the component
   */
  hasComponent(type) {
    return this.components.has(type);
  }

  /**
   * Remove a component
   * @param {string} type - Component type to remove
   * @returns {boolean} True if component was removed
   */
  removeComponent(type) {
    const component = this.components.get(type);
    if (component) {
      component.destroy();
      this.components.delete(type);
      return true;
    }
    return false;
  }

  /**
   * Get all components
   * @returns {Array<Component>} Array of all components
   */
  getAllComponents() {
    return Array.from(this.components.values());
  }
  
  /**
   * Add a child entity to this entity
   * @param {Entity} entity - Child entity to add
   * @returns {Entity} The added child entity
   */
  addChild(entity) {
    if (entity.parent) {
      entity.parent.removeChild(entity);
    }
    
    entity.parent = this;
    this.children.push(entity);
    
    // If this entity is in a scene, add the child to the scene as well
    if (this.scene && !entity.scene) {
      this.scene.addEntity(entity);
    }
    
    return entity;
  }
  
  /**
   * Remove a child entity
   * @param {Entity} entity - Child entity to remove
   * @returns {boolean} True if child was removed
   */
  removeChild(entity) {
    const index = this.children.indexOf(entity);
    if (index !== -1) {
      entity.parent = null;
      this.children.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Initialize this entity and all its components
   */
  initialize() {
    if (this.initialized) return;
    
    // Initialize all components
    for (const component of this.components.values()) {
      component.init();
    }
    
    // Initialize all children
    for (const child of this.children) {
      if (!child.initialized) {
        child.initialize();
      }
    }
    
    this.initialized = true;
  }
  
  /**
   * Update this entity and all its active components
   * @param {number} deltaTime - Time elapsed since last update in seconds
   */
  update(deltaTime) {
    if (!this.active) return;
    
    // Update components
    for (const component of this.components.values()) {
      if (component.enabled) {
        component.update(deltaTime);
      }
    }
    
    // Update children
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child.markedForDeletion) {
        this.children.splice(i, 1);
        child.parent = null;
      } else {
        child.update(deltaTime);
      }
    }
  }
  
  /**
   * Late update, called after all regular updates
   * @param {number} deltaTime - Time elapsed since last update in seconds
   */
  lateUpdate(deltaTime) {
    if (!this.active) return;
    
    // Late update components
    for (const component of this.components.values()) {
      if (component.enabled && typeof component.lateUpdate === 'function') {
        component.lateUpdate(deltaTime);
      }
    }
    
    // Late update children
    for (const child of this.children) {
      if (child.active && !child.markedForDeletion) {
        child.lateUpdate(deltaTime);
      }
    }
  }
  
  /**
   * Fixed update, called at fixed time intervals independent of frame rate
   * @param {number} fixedDeltaTime - Fixed time step in seconds
   */
  fixedUpdate(fixedDeltaTime) {
    if (!this.active) return;
    
    // Fixed update components
    for (const component of this.components.values()) {
      if (component.enabled && typeof component.fixedUpdate === 'function') {
        component.fixedUpdate(fixedDeltaTime);
      }
    }
    
    // Fixed update children
    for (const child of this.children) {
      if (child.active && !child.markedForDeletion) {
        child.fixedUpdate(fixedDeltaTime);
      }
    }
  }
  
  /**
   * Draw this entity and all its active components
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   * @param {Object} camera - Optional camera object for offset calculations
   */
  draw(ctx, camera = null) {
    if (!this.active || !this.visible) return;
    
    // Sort components by zIndex or depth for proper rendering order
    const drawableComponents = Array.from(this.components.values())
      .filter(c => c.enabled && typeof c.draw === 'function')
      .sort((a, b) => {
        // Components may have different depth/zIndex property names
        const aZ = a.zIndex !== undefined ? a.zIndex : (a.depth !== undefined ? a.depth : 0);
        const bZ = b.zIndex !== undefined ? b.zIndex : (b.depth !== undefined ? b.depth : 0);
        return aZ - bZ;
      });
    
    // Draw components
    for (const component of drawableComponents) {
      component.draw(ctx, camera);
    }
    
    // Draw children
    const sortedChildren = [...this.children]
      .filter(child => child.active && child.visible)
      .sort((a, b) => {
        const aTransform = a.getComponent('transform');
        const bTransform = b.getComponent('transform');
        const aZ = aTransform ? aTransform.zIndex : 0;
        const bZ = bTransform ? bTransform.zIndex : 0;
        return aZ - bZ;
      });
    
    for (const child of sortedChildren) {
      child.draw(ctx, camera);
    }
  }
  
  /**
   * Send an event to this entity and its components
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   */
  sendEvent(eventType, eventData = {}) {
    // Send to components
    for (const component of this.components.values()) {
      if (component.enabled && typeof component.onEvent === 'function') {
        component.onEvent(eventType, eventData);
      }
    }
    
    // Optional override for entity-level event handling
    if (typeof this.onEvent === 'function') {
      this.onEvent(eventType, eventData);
    }
  }
  
  /**
   * Mark this entity for deletion
   */
  destroy() {
    this.markedForDeletion = true;
    
    // Remove from parent if it exists
    if (this.parent) {
      this.parent.removeChild(this);
    }
    
    // Mark all children for deletion
    for (const child of this.children) {
      child.destroy();
    }
    
    // Call destroy on all components
    for (const component of this.components.values()) {
      component.destroy();
    }
    
    // Clear references
    this.components.clear();
    this.children = [];
    this.parent = null;
    this.scene = null;
  }
  
  /**
   * Add a tag to this entity
   * @param {string} tag - Tag to add
   * @returns {Entity} This entity for chaining
   */
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
    return this;
  }
  
  /**
   * Remove a tag from this entity
   * @param {string} tag - Tag to remove
   * @returns {Entity} This entity for chaining
   */
  removeTag(tag) {
    const index = this.tags.indexOf(tag);
    if (index !== -1) {
      this.tags.splice(index, 1);
    }
    return this;
  }
  
  /**
   * Check if entity has a tag
   * @param {string} tag - Tag to check
   * @returns {boolean} True if entity has the tag
   */
  hasTag(tag) {
    return this.tags.includes(tag);
  }
  
  /**
   * Register a component type
   * @param {string} type - Component type name
   * @param {Function} ComponentClass - Component constructor
   */
  static registerComponent(type, ComponentClass) {
    if (componentRegistry.has(type)) {
      // console.warn(`Component type '${type}' is already registered. Skipping.`);
      return; // Don't overwrite if already registered
    }
    componentRegistry.set(type, ComponentClass);
    console.log(`Component type '${type}' registered.`); // Optional: Log successful registration
  }
  
  /**
   * Get a registered component class
   * @param {string} type - Component type name
   * @returns {Function|null} Component constructor or null if not found
   */
  static getComponentClass(type) {
    return componentRegistry.get(type) || null;
  }
  
  /**
   * Check if a component type is registered
   * @param {string} type - Component type name
   * @returns {boolean} True if component type is registered
   */
  static hasComponentClass(type) {
    return componentRegistry.has(type);
  }
  
  /**
   * Generate a unique entity ID
   * @returns {string} Unique entity ID
   */
  static generateId() {
    return `entity_${nextEntityId++}`;
  }
} 