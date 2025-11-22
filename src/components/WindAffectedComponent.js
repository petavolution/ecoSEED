import { Component } from '../core/index.js';

class WindAffectedComponent extends Component {
    /**
     * Indicates an entity is affected by wind and defines its resistance.
     * @param {object} [options]
     * @param {number} [options.resistanceFactor=0.5] How much the entity resists wind (0 = no resistance, 1 = full resistance).
     *                                                Lower values mean wind has more effect.
     * @param {number} [options.surfaceAreaFactor=1.0] A multiplier representing how much surface area the entity presents to the wind.
     *                                                 Larger values mean wind has more effect.
     */
    constructor(options = {}) {
        super();
        this.resistanceFactor = options.resistanceFactor !== undefined ? Math.max(0, Math.min(1, options.resistanceFactor)) : 0.5;
        this.surfaceAreaFactor = options.surfaceAreaFactor !== undefined ? options.surfaceAreaFactor : 1.0;
    }
}

export default WindAffectedComponent; 