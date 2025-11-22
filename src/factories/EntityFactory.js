/**
 * EntityFactory.js - Centralized factory for creating entities
 * Provides a simple registration and creation pattern
 */

import { Entity } from '../core/index.js';
import TransformComponent from '../components/TransformComponent.js';
import PhysicsComponent from '../components/PhysicsComponent.js';
import CollisionComponent from '../components/CollisionComponent.js';

/**
 * EntityFactory - Creates entities with appropriate components
 */
class EntityFactory {
  constructor() {
    this.creators = new Map();
    this._registerDefaults();
  }

  /**
   * Register a creator function for an entity type
   * @param {string} type - Entity type name
   * @param {Function} creator - Function(graphicsGenerator, options) => Entity
   */
  register(type, creator) {
    this.creators.set(type, creator);
  }

  /**
   * Create an entity of the specified type
   * @param {string} type - Entity type
   * @param {Object} graphicsGenerator - Graphics generator instance
   * @param {Object} options - Creation options
   * @returns {Entity|null} Created entity or null
   */
  create(type, graphicsGenerator, options = {}) {
    const creator = this.creators.get(type);
    if (!creator) {
      console.warn(`EntityFactory: Unknown entity type '${type}'`);
      return this._createGenericEntity(type, options);
    }

    try {
      return creator(graphicsGenerator, options);
    } catch (error) {
      console.error(`EntityFactory: Error creating '${type}':`, error);
      return this._createGenericEntity(type, options);
    }
  }

  /**
   * Check if a type is registered
   * @param {string} type - Entity type
   * @returns {boolean}
   */
  has(type) {
    return this.creators.has(type);
  }

  /**
   * Create a generic entity as fallback
   * @param {string} type - Entity type
   * @param {Object} options - Options
   * @returns {Entity}
   */
  _createGenericEntity(type, options = {}) {
    const entity = new Entity({
      name: type,
      tag: type
    });

    // Add transform
    entity.addComponent(new TransformComponent(entity, {
      position: options.position || { x: 0, y: 0 },
      scale: { x: 1, y: 1 }
    }));

    return entity;
  }

  /**
   * Register default entity creators
   */
  _registerDefaults() {
    // Simple animal creator
    this.register('animal', (gfx, options) => {
      const entity = new Entity({
        name: options.species || 'animal',
        tag: 'animal'
      });

      entity.addComponent(new TransformComponent(entity, {
        position: options.position || { x: 0, y: 0 }
      }));

      entity.addComponent(new PhysicsComponent(entity, {
        mass: 1,
        drag: 0.1,
        maxSpeed: options.speed || 100
      }));

      entity.addComponent(new CollisionComponent(entity, {
        shape: 'circle',
        radius: options.radius || 15
      }));

      return entity;
    });

    // Simple grass creator
    this.register('grass', (gfx, options) => {
      const entity = new Entity({
        name: 'grass',
        tag: 'grass'
      });

      entity.addComponent(new TransformComponent(entity, {
        position: options.position || { x: 0, y: 0 }
      }));

      return entity;
    });

    // Lake creator
    this.register('lake', (gfx, options) => {
      const entity = new Entity({
        name: 'lake',
        tag: 'lake'
      });

      entity.addComponent(new TransformComponent(entity, {
        position: options.position || { x: 0, y: 0 }
      }));

      entity.addComponent(new CollisionComponent(entity, {
        shape: 'circle',
        radius: options.radius || 50,
        isTrigger: true
      }));

      return entity;
    });

    // Bird creator (simple version)
    this.register('bird', (gfx, options) => {
      const entity = new Entity({
        name: 'bird',
        tag: 'bird'
      });

      entity.addComponent(new TransformComponent(entity, {
        position: options.position || { x: 0, y: 0 },
        zIndex: 10
      }));

      entity.addComponent(new PhysicsComponent(entity, {
        mass: 0.5,
        drag: 0.04,
        maxSpeed: options.speed || 150
      }));

      entity.addComponent(new CollisionComponent(entity, {
        shape: 'circle',
        radius: 10
      }));

      return entity;
    });
  }
}

// Export singleton instance
export default new EntityFactory();
