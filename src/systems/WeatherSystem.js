import { System } from '../core/index.js';

const WeatherState = {
    CLEAR: 'clear',
    RAINING: 'raining'
};

class WeatherSystem extends System {
    /**
     * Manages weather effects like rainfall.
     * @param {object} options Configuration options.
     * @param {number} [options.changeInterval=60000] Avg time between weather changes (ms).
     * @param {number} [options.rainChance=0.3] Chance of switching to raining state.
     * @param {number} [options.rainDurationMin=10000] Min rain duration (ms).
     * @param {number} [options.rainDurationMax=30000] Max rain duration (ms).
     * @param {number} [options.rainAmount=0.1] Water level increase per lake per second during rain.
     */
    constructor(options = {}) {
        super();
        this.state = WeatherState.CLEAR;
        this.changeInterval = options.changeInterval || 60000; // 1 minute avg
        this.rainChance = options.rainChance || 0.3;
        this.rainDurationMin = options.rainDurationMin || 10000; // 10s
        this.rainDurationMax = options.rainDurationMax || 30000; // 30s
        this.rainAmount = options.rainAmount || 0.1; // Water units per sec

        this.timeToNextChange = this.getRandomInterval();
        this.stateDurationTimer = 0;

        // Visual effects control (can be expanded)
        this.isRainingEffectActive = false;
        this.rainEffectElement = null; // Reference to DOM element for rain visual
    }

    getRandomInterval() {
        // Simple random interval around the average
        return this.changeInterval * (0.5 + Math.random());
    }

    update(deltaTime) {
        if (!this.scene) return;

        const dtMillis = deltaTime * 1000;
        this.timeToNextChange -= dtMillis;
        this.stateDurationTimer -= dtMillis;

        // Time to change weather?
        if (this.timeToNextChange <= 0) {
            this.changeWeather();
            this.timeToNextChange = this.getRandomInterval();
        }

        // Handle current state duration
        if (this.state === WeatherState.RAINING && this.stateDurationTimer <= 0) {
            this.stopRaining();
        }

        // Apply effects of current weather
        if (this.state === WeatherState.RAINING) {
            this.applyRainEffects(deltaTime);
        }
    }

    changeWeather() {
        if (this.state === WeatherState.CLEAR) {
            if (Math.random() < this.rainChance) {
                this.startRaining();
            } else {
                // Stay clear, maybe trigger other weather later (wind, sun)
            }
        } else if (this.state === WeatherState.RAINING) {
            // If timer hasn't run out, do nothing. Stop is handled by timer.
        }
    }

    startRaining() {
        console.log("WeatherSystem: Starting to rain.");
        this.state = WeatherState.RAINING;
        this.stateDurationTimer = this.rainDurationMin + Math.random() * (this.rainDurationMax - this.rainDurationMin);
        this.toggleRainEffect(true); // Activate visual effect
    }

    stopRaining() {
        console.log("WeatherSystem: Stopping rain.");
        this.state = WeatherState.CLEAR;
        this.stateDurationTimer = 0;
        this.toggleRainEffect(false); // Deactivate visual effect
    }

    applyRainEffects(deltaTime) {
        if (!this.scene) return;
        // Find all lake entities and add water
        const lakes = this.scene.getEntitiesByTag('lake');
        if (lakes) {
            lakes.forEach(lake => {
                if (lake.active && typeof lake.addWater === 'function') {
                    lake.addWater(this.rainAmount * deltaTime);
                }
            });
        }
        // TODO: Could also affect plants (increase growth?) or animals
    }

    // Basic visual effect toggle using DOM element (improve later)
    toggleRainEffect(isActive) {
        if (isActive && !this.isRainingEffectActive) {
            this.isRainingEffectActive = true;
            if (!this.rainEffectElement) {
                this.rainEffectElement = document.createElement('div');
                this.rainEffectElement.id = 'rain-overlay';
                this.rainEffectElement.style.position = 'fixed';
                this.rainEffectElement.style.top = '0';
                this.rainEffectElement.style.left = '0';
                this.rainEffectElement.style.width = '100%';
                this.rainEffectElement.style.height = '100%';
                this.rainEffectElement.style.backgroundColor = 'rgba(100, 120, 200, 0.1)'; // Blue tint
                this.rainEffectElement.style.pointerEvents = 'none'; // Allow clicks through
                this.rainEffectElement.style.zIndex = '500'; // Below UI maybe
                // TODO: Add particle effect for raindrops
                document.body.appendChild(this.rainEffectElement);
            }
            this.rainEffectElement.style.display = 'block';
            console.log("Rain effect activated");
        } else if (!isActive && this.isRainingEffectActive) {
            this.isRainingEffectActive = false;
            if (this.rainEffectElement) {
                this.rainEffectElement.style.display = 'none';
            }
            console.log("Rain effect deactivated");
        }
    }

    // Called when system is removed or scene changes
    destroy() {
        if (this.rainEffectElement && this.rainEffectElement.parentNode) {
            this.rainEffectElement.parentNode.removeChild(this.rainEffectElement);
        }
        this.rainEffectElement = null;
    }
}

export default WeatherSystem; 