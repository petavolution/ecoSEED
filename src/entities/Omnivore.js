/**
 * Omnivore.js - Base class for omnivorous animals
 * Extends Animal with diet-specific behavior for eating both plants and animals
 */

import Animal from './Animal.js';

/**
 * Omnivore - Animals that eat both plants and other animals
 */
export default class Omnivore extends Animal {
  /**
   * Create an omnivore
   * @param {Object} options - Configuration options
   * @param {Array<string>} options.diet - Tags of edible entities
   * @param {Object} options.dietPreference - Preference ratio { plantRatio: 0.5 }
   */
  constructor(options = {}) {
    super(options);

    // Diet configuration
    this.diet = options.diet || ['grass', 'plant', 'insect', 'small_animal'];
    this.dietPreference = options.dietPreference || { plantRatio: 0.5 };

    // Add omnivore tag
    if (!this.hasTag('omnivore')) {
      this.addTag('omnivore');
    }
  }

  /**
   * Find nearest food source based on diet
   * @returns {Object|null} Nearest food or null
   * @protected
   */
  _findNearestFood() {
    const behavior = this.getComponent('behavior');
    const transform = this.getComponent('transform');

    if (!behavior || !transform || !this.scene) return null;

    const perceptionRadius = behavior.getBlackboardValue('perceptionRadius', 150);
    let closestFood = null;
    let closestDistSq = perceptionRadius * perceptionRadius;

    // Search for food matching our diet
    for (const foodTag of this.diet) {
      const foods = this.scene.findEntitiesByTag(foodTag);

      for (const food of foods) {
        if (food === this || food.markedForDeletion) continue;

        const foodTransform = food.getComponent('transform');
        if (!foodTransform) continue;

        const dx = transform.x - foodTransform.x;
        const dy = transform.y - foodTransform.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < closestDistSq) {
          closestFood = food;
          closestDistSq = distSq;
        }
      }
    }

    return closestFood;
  }

  /**
   * Find nearest water source
   * @returns {Object|null} Nearest water or null
   * @protected
   */
  _findNearestWater() {
    const behavior = this.getComponent('behavior');
    const transform = this.getComponent('transform');

    if (!behavior || !transform || !this.scene) return null;

    const perceptionRadius = behavior.getBlackboardValue('perceptionRadius', 150);
    const waterSources = this.scene.findEntitiesByTag('lake') || [];

    let closestWater = null;
    let closestDistSq = perceptionRadius * perceptionRadius;

    for (const water of waterSources) {
      const waterTransform = water.getComponent('transform');
      if (!waterTransform) continue;

      const dx = transform.x - waterTransform.x;
      const dy = transform.y - waterTransform.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < closestDistSq) {
        closestWater = water;
        closestDistSq = distSq;
      }
    }

    return closestWater;
  }
}
