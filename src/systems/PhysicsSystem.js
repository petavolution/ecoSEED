/**
 * PhysicsSystem.js - Handles physics simulation and collision detection
 * Part of the EcoSEED component system
 */

import { SHAPES } from '../components/CollisionComponent.js';

/**
 * PhysicsSystem handles physics simulation and collision detection between entities
 */
export default class PhysicsSystem {
  /**
   * Create a new physics system
   * @param {Object} options - System options
   * @param {number} options.gravity - Gravity force (default: 0)
   * @param {boolean} options.debug - Whether to draw collision shapes (default: false)
   */
  constructor(options = {}) {
    // Physics settings
    this.gravity = options.gravity || 0;
    this.debug = options.debug || false;
    
    // Collision pair tracking for continuous collision detection
    this.collisionPairs = new Map();
    
    // Spatial partitioning for optimization
    this.spatialGrid = null;
    this.gridCellSize = options.gridCellSize || 64;
    
    // Reference to active entities
    this.entities = [];
  }
  
  /**
   * Initialize the physics system for a scene
   * @param {Scene} scene - Scene instance
   */
  initialize(scene) {
    this.scene = scene;
    // Use scene camera size or fallback to default world size
    const width = scene.camera?.width || 2000;
    const height = scene.camera?.height || 2000;
    this.createSpatialGrid(this.gridCellSize, width, height);
  }
  
  /**
   * Create a spatial grid for optimizing collision detection
   * @param {number} cellSize - Size of each grid cell
   * @param {number} width - World width
   * @param {number} height - World height
   */
  createSpatialGrid(cellSize, width, height) {
    this.spatialGrid = {
      cellSize,
      width,
      height,
      cols: Math.ceil(width / cellSize),
      rows: Math.ceil(height / cellSize),
      cells: new Map(),
      
      /**
       * Get cell key for a position
       * @param {number} x - X coordinate
       * @param {number} y - Y coordinate
       * @returns {string} Cell key
       */
      getCellKey(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        return `${col},${row}`;
      },
      
      /**
       * Get the cell at a position
       * @param {number} x - X coordinate
       * @param {number} y - Y coordinate
       * @returns {Set} Set of entities in the cell
       */
      getCell(x, y) {
        const key = this.getCellKey(x, y);
        if (!this.cells.has(key)) {
          this.cells.set(key, new Set());
        }
        return this.cells.get(key);
      },
      
      /**
       * Add an entity to appropriate cells
       * @param {Entity} entity - Entity to add
       */
      addEntity(entity) {
        const collision = entity.getComponent('collision');
        if (!collision || !collision.active) return;
        
        const transform = entity.getComponent('transform');
        if (!transform) return;
        
        const bounds = collision.getBounds();
        if (!bounds) return;
        
        // Handle different collision shapes
        if (bounds.type === SHAPES.CIRCLE) {
          // For circle, get cells that the circle overlaps
          const radius = bounds.radius;
          const left = Math.max(0, bounds.x - radius);
          const right = Math.min(this.width, bounds.x + radius);
          const top = Math.max(0, bounds.y - radius);
          const bottom = Math.min(this.height, bounds.y + radius);
          
          const startCol = Math.floor(left / this.cellSize);
          const endCol = Math.floor(right / this.cellSize);
          const startRow = Math.floor(top / this.cellSize);
          const endRow = Math.floor(bottom / this.cellSize);
          
          for (let col = startCol; col <= endCol; col++) {
            for (let row = startRow; row <= endRow; row++) {
              const key = `${col},${row}`;
              if (!this.cells.has(key)) {
                this.cells.set(key, new Set());
              }
              this.cells.get(key).add(entity);
            }
          }
        } else if (bounds.type === SHAPES.RECTANGLE) {
          // For rectangle, get cells that the AABB overlaps
          const left = Math.max(0, bounds.left);
          const right = Math.min(this.width, bounds.right);
          const top = Math.max(0, bounds.top);
          const bottom = Math.min(this.height, bounds.bottom);
          
          const startCol = Math.floor(left / this.cellSize);
          const endCol = Math.floor(right / this.cellSize);
          const startRow = Math.floor(top / this.cellSize);
          const endRow = Math.floor(bottom / this.cellSize);
          
          for (let col = startCol; col <= endCol; col++) {
            for (let row = startRow; row <= endRow; row++) {
              const key = `${col},${row}`;
              if (!this.cells.has(key)) {
                this.cells.set(key, new Set());
              }
              this.cells.get(key).add(entity);
            }
          }
        } else if (bounds.type === SHAPES.POINT) {
          // For point, just add to the single cell it's in
          const cell = this.getCell(bounds.x, bounds.y);
          cell.add(entity);
        }
      },
      
      /**
       * Remove an entity from all cells
       * @param {Entity} entity - Entity to remove
       */
      removeEntity(entity) {
        for (const cell of this.cells.values()) {
          cell.delete(entity);
        }
      },
      
      /**
       * Get all entities near a position
       * @param {number} x - X coordinate
       * @param {number} y - Y coordinate
       * @param {number} radius - Search radius
       * @returns {Set} Set of nearby entities
       */
      getNearbyEntities(x, y, radius = this.cellSize) {
        const result = new Set();
        
        const left = Math.max(0, x - radius);
        const right = Math.min(this.width, x + radius);
        const top = Math.max(0, y - radius);
        const bottom = Math.min(this.height, y + radius);
        
        const startCol = Math.floor(left / this.cellSize);
        const endCol = Math.floor(right / this.cellSize);
        const startRow = Math.floor(top / this.cellSize);
        const endRow = Math.floor(bottom / this.cellSize);
        
        for (let col = startCol; col <= endCol; col++) {
          for (let row = startRow; row <= endRow; row++) {
            const key = `${col},${row}`;
            const cell = this.cells.get(key);
            
            if (cell) {
              for (const entity of cell) {
                result.add(entity);
              }
            }
          }
        }
        
        return result;
      },
      
      /**
       * Clear all cells
       */
      clear() {
        this.cells.clear();
      },
      
      /**
       * Update the spatial grid
       * @param {Array} entities - All entities to include in the grid
       */
      update(entities) {
        // Clear all cells
        this.clear();
        
        // Add all entities to appropriate cells
        for (const entity of entities) {
          this.addEntity(entity);
        }
      }
    };
  }
  
  /**
   * Register an entity with the physics system
   * @param {Entity} entity - Entity to register
   */
  registerEntity(entity) {
    if (!entity) return;
    
    // Only register entities with collision components
    const collision = entity.getComponent('collision');
    if (collision && collision.active) {
      this.entities.push(entity);
      
      // Add to spatial grid
      if (this.spatialGrid) {
        this.spatialGrid.addEntity(entity);
      }
    }
  }
  
  /**
   * Unregister an entity from the physics system
   * @param {Entity} entity - Entity to unregister
   */
  unregisterEntity(entity) {
    const index = this.entities.indexOf(entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
      
      // Remove from spatial grid
      if (this.spatialGrid) {
        this.spatialGrid.removeEntity(entity);
      }
      
      // Remove from collision pairs
      for (const [pairKey, pair] of this.collisionPairs.entries()) {
        if (pair.entityA === entity || pair.entityB === entity) {
          this.collisionPairs.delete(pairKey);
        }
      }
    }
  }
  
  /**
   * Update physics simulation
   * @param {number} deltaTime - Time elapsed since last update in seconds
   */
  update(deltaTime) {
    // Skip if time step is too large (prevents physics explosions)
    if (deltaTime > 0.1) {
      deltaTime = 0.1;
    }
    
    // Update spatial grid
    if (this.spatialGrid) {
      this.spatialGrid.update(this.entities);
    }
    
    // Process physics for each entity
    for (const entity of this.entities) {
      this.updateEntityPhysics(entity, deltaTime);
    }
    
    // Detect and resolve collisions
    this.detectCollisions();
    
    // Track collision exit events
    this.trackCollisionExit();
  }
  
  /**
   * Update physics for a single entity
   * @param {Entity} entity - Entity to update
   * @param {number} deltaTime - Time elapsed since last update in seconds
   */
  updateEntityPhysics(entity, deltaTime) {
    const transform = entity.getComponent('transform');
    const physics = entity.getComponent('physics');
    
    if (!transform) return;
    
    if (physics && physics.enabled) {
      // Apply gravity
      if (this.gravity !== 0 && physics.useGravity) {
        physics.velocityY += this.gravity * deltaTime;
      }
      
      // Apply forces
      physics.velocityX += physics.forceX * deltaTime;
      physics.velocityY += physics.forceY * deltaTime;
      
      // Apply drag
      if (physics.drag > 0) {
        const dragFactor = Math.pow(1 - physics.drag, deltaTime * 60);
        physics.velocityX *= dragFactor;
        physics.velocityY *= dragFactor;
      }
      
      // Apply velocity constraints
      if (physics.maxSpeed > 0) {
        const speedSq = physics.velocityX * physics.velocityX + physics.velocityY * physics.velocityY;
        if (speedSq > physics.maxSpeed * physics.maxSpeed) {
          const speed = Math.sqrt(speedSq);
          const scaleFactor = physics.maxSpeed / speed;
          physics.velocityX *= scaleFactor;
          physics.velocityY *= scaleFactor;
        }
      }
      
      // Update position
      transform.x += physics.velocityX * deltaTime;
      transform.y += physics.velocityY * deltaTime;
      
      // Reset forces after applying
      physics.forceX = 0;
      physics.forceY = 0;
    }
  }
  
  /**
   * Detect collisions between entities
   */
  detectCollisions() {
    // Reset all previous collisions
    this.collisionPairs.clear();
    
    // Use spatial partitioning to optimize collision detection
    if (this.spatialGrid) {
      // Check collisions by spatial grid cell
      for (const cell of this.spatialGrid.cells.values()) {
        const entities = Array.from(cell);
        this.checkCollisionsInGroup(entities);
      }
    } else {
      // Fallback to checking all entities against each other
      this.checkCollisionsInGroup(this.entities);
    }
    
    // Resolve collisions
    this.resolveCollisions();
  }
  
  /**
   * Check for collisions within a group of entities
   * @param {Array} entities - Entities to check
   */
  checkCollisionsInGroup(entities) {
    const count = entities.length;
    
    // Check each entity against others (skip self and already checked pairs)
    for (let i = 0; i < count; i++) {
      const entityA = entities[i];
      const collisionA = entityA.getComponent('collision');
      
      if (!collisionA || !collisionA.active) continue;
      
      for (let j = i + 1; j < count; j++) {
        const entityB = entities[j];
        const collisionB = entityB.getComponent('collision');
        
        if (!collisionB || !collisionB.active) continue;
        
        // Skip if both are triggers (trigger-trigger doesn't need resolution)
        if (collisionA.isTrigger && collisionB.isTrigger) continue;
        
        // Create a unique key for this entity pair
        const pairKey = entityA.id < entityB.id 
          ? `${entityA.id}-${entityB.id}` 
          : `${entityB.id}-${entityA.id}`;
        
        // Skip if already checked this pair
        if (this.collisionPairs.has(pairKey)) continue;
        
        // Check for collision
        const collisionInfo = collisionA.checkCollision(collisionB);
        
        if (collisionInfo) {
          // Add to collision pairs
          this.collisionPairs.set(pairKey, {
            entityA,
            entityB,
            collisionA,
            collisionB,
            info: collisionInfo,
            resolved: false
          });
          
          // Maintain current collisions for exit events
          collisionA.currentCollisions.add(entityB);
          collisionB.currentCollisions.add(entityA);
          
          // Raise collision event
          if (this.scene && this.scene.eventSystem) {
            this.scene.eventSystem.emit('collision', {
              entityA,
              entityB,
              collisionInfo
            });
          }
        }
      }
    }
  }
  
  /**
   * Resolve all detected collisions
   */
  resolveCollisions() {
    // For more complex physics, we would iterate multiple times for stability
    const iterations = 1;
    
    for (let i = 0; i < iterations; i++) {
      // Process each collision pair
      for (const pair of this.collisionPairs.values()) {
        if (pair.resolved) continue;
        
        const { entityA, entityB, collisionA, collisionB, info } = pair;
        
        // Only resolve if neither is a trigger
        if (!collisionA.isTrigger && !collisionB.isTrigger) {
          this.resolveCollision(entityA, entityB, info);
        }
        
        // Mark as resolved
        pair.resolved = true;
      }
    }
  }
  
  /**
   * Resolve collision between two entities
   * @param {Entity} entityA - First entity
   * @param {Entity} entityB - Second entity
   * @param {Object} collisionInfo - Collision information
   */
  resolveCollision(entityA, entityB, collisionInfo) {
    const transformA = entityA.getComponent('transform');
    const transformB = entityB.getComponent('transform');
    const physicsA = entityA.getComponent('physics');
    const physicsB = entityB.getComponent('physics');
    
    if (!transformA || !transformB) return;
    
    // Calculate how much each entity should move based on their mass/movability
    let weightA = 0.5;
    let weightB = 0.5;
    
    if (physicsA && physicsB) {
      if (physicsA.mass === 0 && physicsB.mass === 0) {
        // Both immovable, do nothing
        return;
      } else if (physicsA.mass === 0) {
        // A is immovable
        weightA = 0;
        weightB = 1;
      } else if (physicsB.mass === 0) {
        // B is immovable
        weightA = 1;
        weightB = 0;
      } else if (physicsA.mass !== physicsB.mass) {
        // Different masses, distribute proportionally
        const totalMass = physicsA.mass + physicsB.mass;
        weightA = physicsB.mass / totalMass;
        weightB = physicsA.mass / totalMass;
      }
    } else if (physicsA && physicsA.mass === 0) {
      // A is immovable
      weightA = 0;
      weightB = 1;
    } else if (physicsB && physicsB.mass === 0) {
      // B is immovable
      weightA = 1;
      weightB = 0;
    }
    
    // Apply position correction
    const { normal, depth } = collisionInfo;
    
    // Positional correction
    const correction = Math.max(depth - 0.01, 0) * 0.8; // 80% correction with slop
    const correctionX = normal.x * correction;
    const correctionY = normal.y * correction;
    
    // Apply correction
    transformA.x -= correctionX * weightA;
    transformA.y -= correctionY * weightA;
    transformB.x += correctionX * weightB;
    transformB.y += correctionY * weightB;
    
    // Apply impulse resolution if both have physics components
    if (physicsA && physicsB) {
      // Calculate relative velocity
      const relVelX = physicsB.velocityX - physicsA.velocityX;
      const relVelY = physicsB.velocityY - physicsA.velocityY;
      
      // Calculate velocity along normal
      const relVelDotNormal = relVelX * normal.x + relVelY * normal.y;
      
      // Only resolve if objects are moving toward each other
      if (relVelDotNormal < 0) {
        // Calculate restitution (bounciness)
        const restitution = Math.min(physicsA.restitution, physicsB.restitution);
        
        // Calculate impulse scalar
        let impulseScalar = -(1 + restitution) * relVelDotNormal;
        
        if (physicsA.mass !== 0 && physicsB.mass !== 0) {
          impulseScalar /= 1/physicsA.mass + 1/physicsB.mass;
        } else if (physicsA.mass === 0) {
          impulseScalar /= 1/physicsB.mass;
        } else if (physicsB.mass === 0) {
          impulseScalar /= 1/physicsA.mass;
        }
        
        // Apply impulse
        const impulseX = normal.x * impulseScalar;
        const impulseY = normal.y * impulseScalar;
        
        if (physicsA.mass !== 0) {
          physicsA.velocityX -= impulseX / physicsA.mass;
          physicsA.velocityY -= impulseY / physicsA.mass;
        }
        
        if (physicsB.mass !== 0) {
          physicsB.velocityX += impulseX / physicsB.mass;
          physicsB.velocityY += impulseY / physicsB.mass;
        }
        
        // Apply friction
        const friction = (physicsA.friction + physicsB.friction) * 0.5;
        
        if (friction > 0) {
          // Calculate tangent vector (perpendicular to normal)
          let tangentX = -normal.y;
          let tangentY = normal.x;
          
          // Calculate relative velocity along tangent
          const relVelDotTangent = relVelX * tangentX + relVelY * tangentY;
          
          // Calculate friction impulse
          let frictionImpulse = -relVelDotTangent * friction;
          
          if (physicsA.mass !== 0 && physicsB.mass !== 0) {
            frictionImpulse /= 1/physicsA.mass + 1/physicsB.mass;
          } else if (physicsA.mass === 0) {
            frictionImpulse /= 1/physicsB.mass;
          } else if (physicsB.mass === 0) {
            frictionImpulse /= 1/physicsA.mass;
          }
          
          // Apply friction impulse
          const frictionImpulseX = tangentX * frictionImpulse;
          const frictionImpulseY = tangentY * frictionImpulse;
          
          if (physicsA.mass !== 0) {
            physicsA.velocityX -= frictionImpulseX / physicsA.mass;
            physicsA.velocityY -= frictionImpulseY / physicsA.mass;
          }
          
          if (physicsB.mass !== 0) {
            physicsB.velocityX += frictionImpulseX / physicsB.mass;
            physicsB.velocityY += frictionImpulseY / physicsB.mass;
          }
        }
      }
    }
  }
  
  /**
   * Track collision exit events
   */
  trackCollisionExit() {
    // Note: Actual exit detection is handled in the CollisionComponent.update method
    // This is just here as a placeholder for future expansion
  }
  
  /**
   * Draw debug visualizations
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} camera - Camera for offset calculation
   */
  drawDebug(ctx, camera = null) {
    if (!this.debug) return;
    
    // Draw collision shapes
    for (const entity of this.entities) {
      const collision = entity.getComponent('collision');
      if (collision && collision.active) {
        collision.drawDebug(ctx, camera);
      }
    }
    
    // Draw spatial grid
    if (this.spatialGrid && this.debug) {
      ctx.save();
      
      // Adjust for camera
      let offsetX = 0;
      let offsetY = 0;
      
      if (camera) {
        offsetX = -camera.x;
        offsetY = -camera.y;
      }
      
      // Draw grid cells
      ctx.strokeStyle = 'rgba(100, 100, 255, 0.3)';
      ctx.lineWidth = 1;
      
      for (let col = 0; col < this.spatialGrid.cols; col++) {
        for (let row = 0; row < this.spatialGrid.rows; row++) {
          const x = col * this.spatialGrid.cellSize + offsetX;
          const y = row * this.spatialGrid.cellSize + offsetY;
          
          const key = `${col},${row}`;
          const cell = this.spatialGrid.cells.get(key);
          
          // Only draw cells that have entities
          if (cell && cell.size > 0) {
            ctx.fillStyle = `rgba(0, 0, 255, ${Math.min(0.1 + cell.size * 0.05, 0.5)})`;
            ctx.fillRect(x, y, this.spatialGrid.cellSize, this.spatialGrid.cellSize);
            
            // Add cell contents count
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '10px Arial';
            ctx.fillText(cell.size.toString(), x + 5, y + 15);
          }
          
          ctx.strokeRect(x, y, this.spatialGrid.cellSize, this.spatialGrid.cellSize);
        }
      }
      
      ctx.restore();
    }
  }
  
  /**
   * Set debug mode
   * @param {boolean} enabled - Whether debug mode is enabled
   */
  setDebug(enabled) {
    this.debug = enabled;
  }
} 