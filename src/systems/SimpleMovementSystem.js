/**
 * SimpleMovementSystem.js
 * Updates entity position based on SimpleWanderComponent data.
 */

import System from '../core/base/System.js';

export default class SimpleMovementSystem extends System {
    constructor() {
        // Process entities with Transform and SimpleWander components
        super({ requiredComponents: ['transform', 'simpleWander'] });
    }

    /**
     * Update method called by the Scene update loop.
     * @param {number} deltaTime - Time elapsed since last update in seconds.
     */
    update(deltaTime) {
        // Note: Systems have this.entities populated by the Scene
        const dtMillis = deltaTime * 1000;

        for (const entity of this.entities) {
            if (!entity.active || entity.markedForDeletion) continue;

            const transform = entity.getComponent('transform');
            const wander = entity.getComponent('simpleWander');

            // Update time to next target change
            wander.timeToNextTarget -= dtMillis;
            if (wander.timeToNextTarget <= 0) {
                wander._pickNewVelocity();
            }

            // Update position based on current velocity
            transform.x += wander.velocity.x * deltaTime * 50; // Scale velocity for visible speed
            transform.y += wander.velocity.y * deltaTime * 50;

            // Boundary checks (simple wrap around)
            const bounds = wander.bounds;
            if (transform.x < bounds.minX) transform.x = bounds.maxX;
            if (transform.x > bounds.maxX) transform.x = bounds.minX;
            if (transform.y < bounds.minY) transform.y = bounds.maxY;
            if (transform.y > bounds.maxY) transform.y = bounds.minY;
        }
    }

    // No fixedUpdate needed for this simple system
    // processEntity(entity, deltaTime) could be used instead of iterating in update,
    // but the current approach is fine for a simple system.
} 