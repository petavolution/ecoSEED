/**
 * GrassPatch.js - Grass patch entity for vegetation
 * Represents edible vegetation that can grow and spread
 */

import { Entity } from '../core/index.js';

/**
 * GrassPatch - A patch of grass vegetation
 */
export default class GrassPatch extends Entity {
  /**
   * Create a grass patch
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'GrassPatch',
      tag: 'grass'
    });

    // Add vegetation tags
    this.addTag('plant');
    this.addTag('edible');

    // Grass properties
    this.nutrition = options.nutrition || 20;
    this.growthRate = options.growthRate || 0.1;
    this.maxNutrition = options.maxNutrition || 100;
    this.spreadChance = options.spreadChance || 0.001;
    this.spreadRadius = options.spreadRadius || 50;

    // Add transform component
    this.addComponent('transform', {
      position: options.position || { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      zIndex: 1
    });
  }

  /**
   * Update grass growth
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    super.update(deltaTime);

    // Grow nutrition over time
    if (this.nutrition < this.maxNutrition) {
      this.nutrition = Math.min(this.maxNutrition, this.nutrition + this.growthRate * deltaTime);
    }

    // Chance to spread if fully grown
    if (this.nutrition >= this.maxNutrition && Math.random() < this.spreadChance * deltaTime) {
      this._trySpread();
    }
  }

  /**
   * Consume some nutrition from this grass
   * @param {number} amount - Amount to consume
   * @returns {number} Actual amount consumed
   */
  consume(amount) {
    const consumed = Math.min(amount, this.nutrition);
    this.nutrition -= consumed;

    // Remove if depleted
    if (this.nutrition <= 0) {
      this.destroy();
    }

    return consumed;
  }

  /**
   * Try to spread to a nearby location
   * @private
   */
  _trySpread() {
    if (!this.scene) return;

    const transform = this.getComponent('transform');
    if (!transform) return;

    // Random position within spread radius
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * this.spreadRadius;
    const newX = transform.x + Math.cos(angle) * distance;
    const newY = transform.y + Math.sin(angle) * distance;

    // Check if there's already grass nearby
    const nearbyGrass = this.scene.findEntitiesByTag('grass');
    for (const grass of nearbyGrass) {
      const grassTransform = grass.getComponent('transform');
      if (!grassTransform) continue;

      const dx = newX - grassTransform.x;
      const dy = newY - grassTransform.y;
      if (dx * dx + dy * dy < 400) { // 20 units minimum distance
        return; // Too close to existing grass
      }
    }

    // Create new grass patch
    const newGrass = new GrassPatch({
      position: { x: newX, y: newY },
      nutrition: 10
    });

    this.scene.addEntity(newGrass);
  }
}
