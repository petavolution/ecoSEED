/**
 * Scene.js - Base class for managing a collection of entities and systems
 * Consolidated implementation for the EcoSEED project
 */

import Entity from './Entity.js';

// Simple hash function for color generation (optional, for visual distinction)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Scene class for managing entities and systems
 */
export default class Scene {
  /**
   * Static asset manifest for the scene
   * Override in subclasses to specify assets to preload
   * Example:
   * static assets = {
   *   images: [ { key: 'player', src: 'assets/images/player.png' } ],
   *   audio: [ { key: 'bgm', src: 'assets/audio/background.mp3' } ]
   * };
   */
  static assets = {
    images: [],
    audio: [],
    spriteSheetData: [] // Added for sprite sheet definitions
  };
  
  /**
   * Static systems manifest
   * Override in subclasses to specify systems to add
   * Example: static systems = [PhysicsSystem, RenderSystem];
   */
  static systems = [];
  
  /**
   * Create a new scene
   * @param {string} name - Scene name
   * @param {Object} options - Scene options
   */
  constructor(name = 'Untitled Scene', options = {}) {
    /**
     * Scene name
     * @type {string}
     */
    this.name = name;
    
    /**
     * List of entities in the scene
     * @type {Array<Entity>}
     */
    this.entities = [];
    
    /**
     * Map of entity IDs to entities
     * @type {Map<string, Entity>}
     */
    this.entityMap = new Map();
    
    /**
     * Map of entity tags to entity lists
     * @type {Map<string, Array<Entity>>}
     */
    this.entityTags = new Map();
    
    /**
     * Systems running in this scene
     * @type {Array<Object>}
     */
    this.systems = [];
    
    /**
     * Graphics generator instance provided by the Game
     * @type {GraphicsGenerator | null}
     */
    this.graphicsGenerator = null;
    
    /**
     * Scene state
     * @type {Object}
     */
    this.state = {
      active: false,
      initialized: false,
      paused: false
    };
    
    /**
     * Entities pending addition
     * @type {Array<Entity>}
     */
    this.entitiesToAdd = [];
    
    /**
     * Entities pending removal
     * @type {Array<Entity>}
     */
    this.entitiesToRemove = [];
    
    /**
     * Scene timing
     * @type {Object}
     */
    this.timing = {
      elapsedTime: 0,
      deltaTime: 0,
      fixedTimeStep: options.fixedTimeStep || 1/60,
      timeScale: options.timeScale || 1.0,
      fixedTimeAccumulator: 0
    };
    
    /**
     * Entity sorting flag
     * @type {boolean}
     */
    this.needsEntitySorting = false;
    
    /**
     * Camera settings
     * @type {Object}
     */
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1.0,
      width: options.width || 800,
      height: options.height || 600,
      target: null
    };
    
    /**
     * Reference to the Game instance
     * @type {Game | null}
     */
    this.game = null;
    
    // Make static reference to current scene if it's the first one
    if (Scene.current === null) {
      Scene.current = this;
    }
  }
  
  /**
   * Initialize the scene
   * @param {GraphicsGenerator} graphicsGenerator - Instance for generating fallback graphics.
   * @returns {Promise<void>} Resolves when initialization (including asset preload) is complete
   */
  async initialize(graphicsGenerator) {
    if (this.state.initialized) return;
    
    console.log(`Initializing scene: ${this.name}`);
    this.state.initialized = true;
    this.graphicsGenerator = graphicsGenerator;
    
    // Assign game reference if not already set (e.g., during construction)
    // this.game should ideally be set by the Game instance when registering/setting the scene
    if (!this.game && Scene.current?.game) { // Attempt to get from global if possible
        this.game = Scene.current.game; 
    } else if (!this.game && window.ecoseedGame) { // Fallback to global (less ideal)
        this.game = window.ecoseedGame;
    }
    
    // Assign global event system to scene
    if (this.game && this.game.eventSystem) {
      this.eventSystem = this.game.eventSystem;
    }
    
    // --- Preload Assets --- 
    if (this.game && this.game.assetManager) {
        const assetManager = this.game.assetManager;
        const assetPromises = [];
        const assetsToLoad = this.constructor.assets; // Access static property

        // Load Images
        if (assetsToLoad.images && Array.isArray(assetsToLoad.images)) {
            assetsToLoad.images.forEach(img => {
                if (img && typeof img.key === 'string' && typeof img.src === 'string') {
                    console.log(` -> Loading image: ${img.key} from ${img.src}`);
                    assetPromises.push(assetManager.loadImage(img.key, img.src));
                } else {
                    console.warn(`Scene ${this.name}: Invalid image asset definition:`, img);
                }
            });
        }

        // Load Audio
        if (assetsToLoad.audio && Array.isArray(assetsToLoad.audio)) {
            assetsToLoad.audio.forEach(aud => {
                if (aud && typeof aud.key === 'string' && typeof aud.src === 'string') {
                    console.log(` -> Loading audio: ${aud.key} from ${aud.src}`);
                    assetPromises.push(assetManager.loadAudio(aud.key, aud.src));
                } else {
                    console.warn(`Scene ${this.name}: Invalid audio asset definition:`, aud);
                }
            });
        }

        // Load Sprite Sheet Data
        if (assetsToLoad.spriteSheetData && Array.isArray(assetsToLoad.spriteSheetData)) {
            assetsToLoad.spriteSheetData.forEach(sheetData => {
                if (sheetData && typeof sheetData.key === 'string' && typeof sheetData.src === 'string') {
                    console.log(` -> Loading sprite sheet data: ${sheetData.key} from ${sheetData.src}`);
                    assetPromises.push(assetManager.loadSpriteSheetData(sheetData.key, sheetData.src));
                } else {
                    console.warn(`Scene ${this.name}: Invalid sprite sheet data definition:`, sheetData);
                }
            });
        }
        
        try {
            console.log(`Scene ${this.name}: Waiting for ${assetPromises.length} assets to load...`);
            await Promise.all(assetPromises);
            console.log(`Scene ${this.name}: All assets loaded successfully.`);
        } catch (error) {
            console.error(`Scene ${this.name}: Failed to load one or more assets:`, error);
            // Decide how to handle critical asset loading failure. 
            // Maybe prevent activation? Or rely on fallbacks?
            // For now, we just log the error and continue initialization.
        }
    } else {
        console.warn(`Scene ${this.name}: AssetManager not available, skipping asset preloading.`);
    }
    // --- End Asset Preloading --- 

    // Initialize all existing entities (should be empty if scene just created)
    for (const entity of this.entities) {
      entity.scene = this; // Ensure scene reference is set
      if (!entity.initialized) {
        entity.initialize();
      }
    }
    
    // Call scene-specific initialization
    this.onInitialize();

    console.log(`Scene ${this.name} initialization complete.`);
  }
  
  /**
   * Activate the scene
   */
  activate() {
    if (!this.state.initialized) {
      this.initialize();
    }
    
    this.state.active = true;
    console.log(`Activating scene: ${this.name}`);
    
    // Activate all systems
    for (const system of this.systems) {
      if (typeof system.activate === 'function') {
        system.activate(this);
      }
    }
    
    // Make this the current scene
    Scene.current = this;
    
    // Call scene-specific activation
    this.onActivate();
  }
  
  /**
   * Deactivate the scene
   */
  deactivate() {
    this.state.active = false;
    console.log(`Deactivating scene: ${this.name}`);
    
    // Deactivate all systems
    for (const system of this.systems) {
      if (typeof system.deactivate === 'function') {
        system.deactivate(this);
      }
    }
    
    // Call scene-specific deactivation
    this.onDeactivate();
    
    // If this is the current scene, clear the reference
    if (Scene.current === this) {
      Scene.current = null;
    }
  }
  
  /**
   * Pause the scene
   */
  pause() {
    if (!this.state.paused) {
      this.state.paused = true;
      console.log(`Pausing scene: ${this.name}`);
      
      // Pause all systems
      for (const system of this.systems) {
        if (typeof system.pause === 'function') {
          system.pause(this);
        }
      }
      
      // Call scene-specific pause
      this.onPause();
    }
  }
  
  /**
   * Resume the scene
   */
  resume() {
    if (this.state.paused) {
      this.state.paused = false;
      console.log(`Resuming scene: ${this.name}`);
      
      // Resume all systems
      for (const system of this.systems) {
        if (typeof system.resume === 'function') {
          system.resume(this);
        }
      }
      
      // Call scene-specific resume
      this.onResume();
    }
  }
  
  /**
   * Update the scene and all entities
   * @param {number} deltaTime - Delta time in seconds
   */
  update(deltaTime) {
    if (!this.state.active || this.state.paused) return;
    
    // Scale delta time
    const dt = deltaTime * this.timing.timeScale;
    this.timing.deltaTime = dt;
    
    // Update scene timing
    this.timing.elapsedTime += dt;
    
    // Process entity additions
    if (this.entitiesToAdd.length > 0) {
      for (const entity of this.entitiesToAdd) {
        this._addEntityNow(entity);
      }
      this.entitiesToAdd = [];
      this.needsEntitySorting = true;
    }
    
    // Update all systems
    for (const system of this.systems) {
      if (typeof system.update === 'function') {
        system.update(dt, this);
      }
    }
    
    // Update all entities
    for (const entity of this.entities) {
      if (entity.active && !entity.markedForDeletion) {
        entity.update(dt);
      }
    }
    
    // Process entity removals
    if (this.entitiesToRemove.length > 0) {
      for (const entity of this.entitiesToRemove) {
        this._removeEntityNow(entity);
      }
      this.entitiesToRemove = [];
    }
    
    // Fixed timestep updates
    this.timing.fixedTimeAccumulator += dt;
    while (this.timing.fixedTimeAccumulator >= this.timing.fixedTimeStep) {
      this._updateFixed(this.timing.fixedTimeStep);
      this.timing.fixedTimeAccumulator -= this.timing.fixedTimeStep;
    }
    
    // Late updates
    for (const entity of this.entities) {
      if (entity.active && !entity.markedForDeletion) {
        entity.lateUpdate(dt);
      }
    }
    
    // Update camera if it has a target
    if (this.camera.target) {
      this._updateCamera();
    }
    
    // Call scene-specific update
    this.onUpdate(dt);
  }
  
  /**
   * Fixed update with constant time step
   * @param {number} fixedDeltaTime - Fixed time step
   * @private
   */
  _updateFixed(fixedDeltaTime) {
    // Update systems with fixed timestep
    for (const system of this.systems) {
      if (typeof system.fixedUpdate === 'function') {
        system.fixedUpdate(fixedDeltaTime, this);
      }
    }
    
    // Update entities with fixed timestep
    for (const entity of this.entities) {
      if (entity.active && !entity.markedForDeletion) {
        entity.fixedUpdate(fixedDeltaTime);
      }
    }
  }
  
  /**
   * Update camera to follow target
   * @private
   */
  _updateCamera() {
    if (!this.camera.target) return;
    
    let targetX, targetY;
    
    if (this.camera.target instanceof Entity) {
      const transform = this.camera.target.getComponent('transform');
      if (transform) {
        targetX = transform.x;
        targetY = transform.y;
      } else {
        return;
      }
    } else {
      targetX = this.camera.target.x || 0;
      targetY = this.camera.target.y || 0;
    }
    
    // Smooth camera movement
    const lerp = 0.1;
    this.camera.x += (targetX - this.camera.x) * lerp;
    this.camera.y += (targetY - this.camera.y) * lerp;
  }
  
  /**
   * Draw the scene and all entities
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  draw(ctx) {
    if (!this.state.active) return;
    
    // Call pre-draw hook
    this.onPreDraw(ctx);
    
    // Call render on systems that have it (e.g., RenderSystem)
    for (const system of this.systems) {
      if (typeof system.render === 'function') {
        system.render(ctx, this);
      }
    }
    
    // Call post-draw hook
    this.onPostDraw(ctx);
  }
  
  /**
   * Add an entity to the scene
   * @param {Entity} entity - Entity to add
   * @returns {Entity} The added entity
   */
  addEntity(entity) {
    if (!entity) return null;
    
    // Check if entity is already in the scene
    if (this.entityMap.has(entity.id) || this.entitiesToAdd.includes(entity)) {
      return entity;
    }
    
    // Queue entity for addition next update
    this.entitiesToAdd.push(entity);
    
    return entity;
  }
  
  /**
   * Add an entity immediately (not recommended during update loop)
   * @param {Entity} entity - Entity to add
   * @returns {Entity} The added entity
   * @private
   */
  _addEntityNow(entity) {
    if (this.entityMap.has(entity.id)) {
      console.warn(`Scene ${this.name}: Entity with ID ${entity.id} already exists.`);
      return; // Prevent duplicates
    }

    entity.scene = this;
    this.entities.push(entity);
    this.entityMap.set(entity.id, entity);

    // Add to tag map
    for (const tag of entity.tags) {
      if (!this.entityTags.has(tag)) {
        this.entityTags.set(tag, []);
      }
      this.entityTags.get(tag).push(entity);
    }

    // Initialize entity if not already done
    if (!entity.initialized) {
      entity.initialize();
    }

    // Register with relevant systems
    for (const system of this.systems) {
      if (typeof system.registerEntity === 'function') {
        system.registerEntity(entity);
      }
    }

    this.markNeedsSorting(); // Mark for sorting when adding entities
  }
  
  /**
   * Remove an entity from the scene
   * @param {Entity} entity - Entity to remove
   */
  removeEntity(entity) {
    if (!entity) return;
    
    // Check if entity is already queued for removal
    if (this.entitiesToRemove.includes(entity)) {
      return;
    }
    
    // Queue entity for removal next update
    this.entitiesToRemove.push(entity);
  }
  
  /**
   * Remove an entity immediately (not recommended during update loop)
   * @param {Entity} entity - Entity to remove
   * @private
   */
  _removeEntityNow(entity) {
    if (!this.entityMap.has(entity.id)) return; // Not in scene

    // Unregister from systems first
    for (const system of this.systems) {
      if (typeof system.unregisterEntity === 'function') {
        system.unregisterEntity(entity);
      }
    }

    // Remove from main list and map
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.entities.splice(index, 1);
    }
    this.entityMap.delete(entity.id);

    // Remove from tag map
    for (const tag of entity.tags) {
      if (this.entityTags.has(tag)) {
        const taggedEntities = this.entityTags.get(tag);
        const tagIndex = taggedEntities.indexOf(entity);
        if (tagIndex > -1) {
          taggedEntities.splice(tagIndex, 1);
        }
        // Clean up empty tag lists
        if (taggedEntities.length === 0) {
          this.entityTags.delete(tag);
        }
      }
    }

    // Clean up entity itself
    entity.scene = null;
    if (typeof entity.destroy === 'function' && !entity.markedForDeletion) {
        // Avoid double destroy if called via entity.destroy() -> scene.removeEntity()
        // Let the entity handle its own component destruction
    }
  }
  
  /**
   * Find entities by tag
   * @param {string} tag - Tag to search for
   * @returns {Array<Entity>} Array of matching entities
   */
  findEntitiesByTag(tag) {
    return this.entityTags.get(tag) || [];
  }
  
  /**
   * Find entity by ID
   * @param {string} id - Entity ID
   * @returns {Entity|null} Matching entity or null
   */
  findEntityById(id) {
    return this.entityMap.get(id) || null;
  }
  
  /**
   * Find entity by name
   * @param {string} name - Name to search for
   * @returns {Entity|null} Matching entity or null
   */
  findEntityByName(name) {
    return this.entities.find(entity => entity.name === name) || null;
  }

  /**
   * Get the total number of entities in the scene
   * @returns {number} Entity count
   */
  getEntityCount() {
    return this.entities.length;
  }

  /**
   * Sort entities by z-index for proper drawing order
   */
  sortEntitiesByZIndex() {
    this.entities.sort((a, b) => {
      const transformA = a.getComponent('transform');
      const transformB = b.getComponent('transform');
      
      const zIndexA = transformA ? transformA.zIndex : 0;
      const zIndexB = transformB ? transformB.zIndex : 0;
      
      return zIndexA - zIndexB;
    });
  }
  
  /**
   * Flag that entity sorting is needed before next draw
   */
  markNeedsSorting() {
    this.needsEntitySorting = true;
  }
  
  /**
   * Add a system to the scene
   * @param {Object} system - System to add
   * @returns {Object} The added system
   */
  addSystem(system) {
    this.systems.push(system);
    
    // Initialize the system if scene is already initialized
    if (this.state.initialized && typeof system.initialize === 'function') {
      system.initialize(this);
    }
    
    // Activate the system if scene is already active
    if (this.state.active && typeof system.activate === 'function') {
      system.activate(this);
    }
    
    return system;
  }
  
  /**
   * Remove a system from the scene
   * @param {Object} system - System to remove
   * @returns {boolean} True if system was removed
   */
  removeSystem(system) {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      // Deactivate the system if scene is active
      if (this.state.active && typeof system.deactivate === 'function') {
        system.deactivate(this);
      }
      
      this.systems.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Clear all entities from the scene
   */
  clearEntities() {
    // Destroy all entities
    for (const entity of this.entities) {
      entity.destroy();
    }
    
    this.entities = [];
    this.entityMap.clear();
    this.entityTags.clear();
    this.entitiesToAdd = [];
    this.entitiesToRemove = [];
  }
  
  /**
   * Destroy the scene and clean up resources
   */
  destroy() {
    console.log(`Destroying scene: ${this.name}`);

    // Deactivate first
    if (this.state.active) {
      this.deactivate();
    }

    // Remove all entities (and their placeholders)
    this.clearEntities(); // Calls _removeEntityNow which handles placeholder cleanup

    // Destroy systems
    for (const system of this.systems) {
      if (typeof system.destroy === 'function') {
        system.destroy();
      }
    }
    this.systems = [];

    // Call scene-specific destruction
    this.onDestroy();

    // Clear references
    this.game = null; // Break cycle if game holds reference
    if (Scene.current === this) {
      Scene.current = null;
    }
  }
  
  // ----------------------
  // LIFECYCLE HOOK METHODS
  // These methods can be overridden by subclasses
  
  /**
   * Called when the scene is initialized
   * Override in subclasses
   */
  onInitialize() {}
  
  /**
   * Called when the scene is activated
   * Override in subclasses
   */
  onActivate() {}
  
  /**
   * Called when the scene is deactivated
   * Override in subclasses
   */
  onDeactivate() {}
  
  /**
   * Called when the scene is paused
   * Override in subclasses
   */
  onPause() {}
  
  /**
   * Called when the scene is resumed
   * Override in subclasses
   */
  onResume() {}
  
  /**
   * Called every frame to update the scene
   * Override in subclasses
   * @param {number} deltaTime - Time elapsed since last update
   */
  onUpdate(deltaTime) {}
  
  /**
   * Called every frame before entities are drawn
   * Override in subclasses
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  onPreDraw(ctx) {}
  
  /**
   * Called every frame after entities are drawn
   * Override in subclasses
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  onPostDraw(ctx) {}
  
  /**
   * Called when the scene is destroyed
   * Override in subclasses
   */
  onDestroy() {}
}

/**
 * Reference to the current active scene
 * @static
 */
Scene.current = null; 