/**
 * SimpleWanderComponent.js
 * Component holding data for simple random wandering behavior.
 */

import Component from '../core/base/Component.js';
import { randomFloat, randomInt } from '../core/utils/MathUtils.js'; // Assuming math utils exist

export default class SimpleWanderComponent extends Component {
    /**
     * Creates a SimpleWanderComponent.
     * @param {object} options - Configuration options.
     * @param {object} [options.bounds={minX:0, minY:0, maxX:800, maxY:600}] - Movement boundaries.
     * @param {number} [options.speed=2] - Max movement speed.
     * @param {number} [options.changeTargetInterval=3000] - How often (ms) to pick a new direction.
     */
    constructor(options = {}) {
        super();
        this.bounds = options.bounds || { minX: 0, minY: 0, maxX: 800, maxY: 600 };
        this.speed = options.speed || 2;
        this.changeTargetInterval = options.changeTargetInterval || 3000; // ms
        
        // Internal state
        this.velocity = { x: 0, y: 0 };
        this.timeToNextTarget = 0; // ms
        this._pickNewVelocity(); // Initial velocity
    }

    // Helper to pick a random velocity
    _pickNewVelocity() {
        const angle = randomFloat(0, Math.PI * 2);
        const currentSpeed = randomFloat(this.speed * 0.5, this.speed); // Vary speed slightly
        this.velocity.x = Math.cos(angle) * currentSpeed;
        this.velocity.y = Math.sin(angle) * currentSpeed;
        this.timeToNextTarget = this.changeTargetInterval * randomFloat(0.7, 1.3); // Vary interval slightly
    }
    
    static get componentName() {
        return 'simpleWander';
    }
}

// Need to register this component in EcoSEED.js 