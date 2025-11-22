/**
 * System.js - Base class for all ECS systems
 * Consolidated implementation for the EcoSEED project
 */

/**
 * Base System class that all systems should extend
 */
export default class System {
  /**
   * Create a system
   * @param {Object} options - System options
   * @param {boolean} options.enabled - Whether the system is initially enabled
   * @param {number} options.priority - Processing priority (higher = earlier)
   * @param {Array<string>} options.requiredComponents - Components required for entities to be processed
   */
  constructor(options = {}) {
    /**
     * Whether the system is enabled
     * @type {boolean}
     */
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    
    /**
     * Processing priority - systems with higher priority run first
     * @type {number}
     */
    this.priority = options.priority || 0;
    
    /**
     * Components required for entities to be processed by this system
     * @type {Array<string>}
     */
    this.requiredComponents = options.requiredComponents || [];
    
    /**
     * Entities tracked by this system
     * @type {Set<Entity>}
     */
    this.entities = new Set();
    
    /**
     * Scene this system belongs to
     * @type {Scene|null}
     */
    this.scene = null;
    
    /**
     * Entity manager reference
     * @type {EntityManager|null}
     */
    this.entityManager = null;
  }
  
  /**
   * Check if an entity has all required components
   * @param {Entity} entity - Entity to check
   * @returns {boolean} True if entity has all required components
   */
  canProcessEntity(entity) {
    return this.requiredComponents.every(type => entity.hasComponent(type));
  }
  
  /**
   * Register an entity with this system
   * @param {Entity} entity - Entity to register
   * @returns {boolean} True if entity was registered
   */
  registerEntity(entity) {
    if (!entity || !this.canProcessEntity(entity)) {
      return false;
    }
    
    this.entities.add(entity);
    this.onEntityAdded(entity);
    return true;
  }
  
  /**
   * Unregister an entity from this system
   * @param {Entity} entity - Entity to unregister
   * @returns {boolean} True if entity was unregistered
   */
  unregisterEntity(entity) {
    if (!entity || !this.entities.has(entity)) {
      return false;
    }
    
    this.entities.delete(entity);
    this.onEntityRemoved(entity);
    return true;
  }
  
  /**
   * Initialize the system - called when scene initializes
   * @param {Scene} scene - Scene the system belongs to
   */
  initialize(scene) {
    this.scene = scene;
    this.onInitialize();
  }
  
  /**
   * Activate the system - called when scene activates
   * @param {Scene} scene - Scene the system belongs to
   */
  activate(scene) {
    this.onActivate();
  }
  
  /**
   * Deactivate the system - called when scene deactivates
   * @param {Scene} scene - Scene the system belongs to
   */
  deactivate(scene) {
    this.onDeactivate();
  }
  
  /**
   * Update the system
   * @param {number} deltaTime - Time elapsed since last update in seconds
   * @param {Scene} scene - Scene the system belongs to
   */
  update(deltaTime, scene) {
    if (!this.enabled) return;
    
    this.onBeforeUpdate(deltaTime);
    
    // Process all entities
    for (const entity of this.entities) {
      if (entity.active && !entity.markedForDeletion) {
        this.processEntity(entity, deltaTime);
      }
    }
    
    this.onAfterUpdate(deltaTime);
  }
  
  /**
   * Process a single entity
   * @param {Entity} entity - Entity to process
   * @param {number} deltaTime - Time elapsed since last update in seconds
   */
  processEntity(entity, deltaTime) {
    // Override in subclasses
  }
  
  /**
   * Fixed update - called at fixed time intervals
   * @param {number} fixedDeltaTime - Fixed time step in seconds
   * @param {Scene} scene - Scene the system belongs to
   */
  fixedUpdate(fixedDeltaTime, scene) {
    if (!this.enabled) return;
    
    // Process all entities with fixed timestep
    for (const entity of this.entities) {
      if (entity.active && !entity.markedForDeletion) {
        this.processEntityFixed(entity, fixedDeltaTime);
      }
    }
  }
  
  /**
   * Process a single entity with fixed timestep
   * @param {Entity} entity - Entity to process
   * @param {number} fixedDeltaTime - Fixed time step in seconds
   */
  processEntityFixed(entity, fixedDeltaTime) {
    // Override in subclasses
  }
  
  /**
   * Enable the system
   * @returns {System} This system for chaining
   */
  enable() {
    this.enabled = true;
    return this;
  }
  
  /**
   * Disable the system
   * @returns {System} This system for chaining
   */
  disable() {
    this.enabled = false;
    return this;
  }
  
  /**
   * Get all entities matching a specific criteria
   * @param {Function} predicate - Filter function
   * @returns {Array<Entity>} Matching entities
   */
  getMatchingEntities(predicate) {
    return Array.from(this.entities).filter(predicate);
  }
  
  /**
   * Find entities by tag
   * @param {string} tag - Tag to search for
   * @returns {Array<Entity>} Entities with matching tag
   */
  findEntitiesByTag(tag) {
    return Array.from(this.entities).filter(entity => entity.hasTag(tag));
  }
  
  /**
   * Find entities with component
   * @param {string} componentType - Component type to search for
   * @returns {Array<Entity>} Entities with matching component
   */
  findEntitiesWithComponent(componentType) {
    return Array.from(this.entities).filter(entity => entity.hasComponent(componentType));
  }
  
  /**
   * Clear all tracked entities
   */
  clearEntities() {
    this.entities.clear();
  }
  
  /**
   * Clean up system resources
   */
  destroy() {
    this.clearEntities();
    this.scene = null;
    this.entityManager = null;
    this.onDestroy();
  }
  
  // ----------------------
  // LIFECYCLE HOOK METHODS
  // These methods can be overridden by subclasses
  
  /**
   * Called when the system is initialized
   * Override in subclasses
   */
  onInitialize() {}
  
  /**
   * Called when the system is activated
   * Override in subclasses
   */
  onActivate() {}
  
  /**
   * Called when the system is deactivated
   * Override in subclasses
   */
  onDeactivate() {}
  
  /**
   * Called when an entity is added to the system
   * Override in subclasses
   * @param {Entity} entity - Added entity
   */
  onEntityAdded(entity) {}
  
  /**
   * Called when an entity is removed from the system
   * Override in subclasses
   * @param {Entity} entity - Removed entity
   */
  onEntityRemoved(entity) {}
  
  /**
   * Called before updating entities
   * Override in subclasses
   * @param {number} deltaTime - Time elapsed since last update
   */
  onBeforeUpdate(deltaTime) {}
  
  /**
   * Called after updating entities
   * Override in subclasses
   * @param {number} deltaTime - Time elapsed since last update
   */
  onAfterUpdate(deltaTime) {}
  
  /**
   * Called when the system is destroyed
   * Override in subclasses
   */
  onDestroy() {}

  /**
   * Public method to handle entity additions (called by Scene)
   * @param {Entity} entity
   */
  handleEntityAdd(entity) {
    if (this.canProcessEntity(entity)) {
        this.registerEntity(entity);
    }
  }

  /**
   * Public method to handle entity removals (called by Scene)
   * @param {Entity} entity
   */
  handleEntityRemove(entity) {
    // No need to check canProcessEntity here, just unregister if it exists
    this.unregisterEntity(entity);
  }
} 