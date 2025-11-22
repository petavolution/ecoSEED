import { System } from '../core/index.js';

// Windstorm States
const WindState = {
    CALM: 'calm',
    WARNING: 'warning',
    ACTIVE: 'active'
};

// Configuration
const MIN_COOLDOWN = 120; // Min seconds between storms
const MAX_COOLDOWN = 240; // Max seconds between storms
const WARNING_DURATION = 10; // Seconds
const MIN_STORM_DURATION = 20; // Seconds
const MAX_STORM_DURATION_SCALE = 0.2; // Extra seconds per intensity point (0-1)
const MAX_INTENSITY = 1.0; // Normalized intensity

class WindSystem extends System {
    constructor(options = {}) {
        super();
        this.state = WindState.CALM;
        this.intensity = 0; // Current effective intensity (0-1)
        this.direction = 0; // Radians
        this.stateTimer = 0; // Time elapsed in current state (seconds)
        this.cooldownTimer = MIN_COOLDOWN + Math.random() * (MAX_COOLDOWN - MIN_COOLDOWN);
        this.warningDuration = (options.warningDuration || WARNING_DURATION);
        this.stormDuration = 0; // Calculated when storm starts
        this.targetIntensity = 0; // The peak intensity for the upcoming/current storm

        // Initialize world state
        this.updateWorldState();
        console.log("WindSystem initialized. State: CALM");
    }

    execute(deltaTime) {
        this.stateTimer += deltaTime;

        switch (this.state) {
            case WindState.CALM:
                this.intensity = 0;
                this.cooldownTimer -= deltaTime;
                if (this.cooldownTimer <= 0) {
                    this.startWarning();
                }
                break;

            case WindState.WARNING:
                // Intensity might slightly increase during warning?
                this.intensity = lerp(0, this.targetIntensity * 0.1, this.stateTimer / this.warningDuration);
                if (this.stateTimer >= this.warningDuration) {
                    this.startStorm();
                }
                break;

            case WindState.ACTIVE:
                this.updateActiveStorm(deltaTime);
                if (this.stateTimer >= this.stormDuration) {
                    this.endStorm();
                }
                break;
        }

        // Update the world state with current wind conditions
        this.updateWorldState();
    }

    startWarning() {
        this.state = WindState.WARNING;
        this.stateTimer = 0;
        this.direction = Math.random() * Math.PI * 2;
        this.targetIntensity = 0.3 + Math.random() * 0.7; // Random intensity for next storm (0.3 to 1.0)
        this.intensity = 0;
        console.log(`Wind Warning Started! Direction: ${this.direction.toFixed(2)}rad, Target Intensity: ${this.targetIntensity.toFixed(2)}`);
        this.world?.emit('windstorm_warning_started', { direction: this.direction, targetIntensity: this.targetIntensity });
    }

    startStorm() {
        this.state = WindState.ACTIVE;
        this.stateTimer = 0;
        this.stormDuration = MIN_STORM_DURATION + this.targetIntensity * MAX_STORM_DURATION_SCALE * 60; // Scale duration by intensity
        console.log(`Windstorm Started! Duration: ${this.stormDuration.toFixed(1)}s`);
        this.world?.emit('windstorm_started', { direction: this.direction, intensity: this.targetIntensity, duration: this.stormDuration });
    }

    updateActiveStorm(deltaTime) {
        const progress = this.stateTimer / this.stormDuration;
        let currentIntensityFactor;

        // Ramp up (first 20%), peak (middle 60%), ramp down (last 20%)
        if (progress < 0.2) {
            currentIntensityFactor = progress / 0.2;
        } else if (progress < 0.8) {
            currentIntensityFactor = 1.0;
        } else {
            currentIntensityFactor = (1.0 - progress) / 0.2;
        }

        this.intensity = this.targetIntensity * currentIntensityFactor;

        // Slight random direction shift (gusts)
        if (Math.random() < 0.1) {
            this.direction += (Math.random() - 0.5) * 0.3; // Adjust magnitude as needed
            // Normalize direction if needed (optional)
            // this.direction = (this.direction + Math.PI * 2) % (Math.PI * 2);
        }
    }

    endStorm() {
        this.state = WindState.CALM;
        this.stateTimer = 0;
        this.intensity = 0;
        this.targetIntensity = 0;
        this.cooldownTimer = MIN_COOLDOWN + Math.random() * (MAX_COOLDOWN - MIN_COOLDOWN);
        console.log("Windstorm Ended.");
        this.world?.emit('windstorm_ended');
    }

    updateWorldState() {
        if (!this.world) return;

        const windVector = {
            x: Math.cos(this.direction) * this.intensity,
            y: Math.sin(this.direction) * this.intensity
        };

        this.world.setState('windState', this.state);
        this.world.setState('windIntensity', this.intensity); // Normalized 0-1
        this.world.setState('windDirection', this.direction);
        this.world.setState('windVector', windVector);
    }
}

// Helper function (duplicate from EnvironmentSystem, consider moving to a util file)
function lerp(a, b, t) {
    return a + (b - a) * Math.max(0, Math.min(1, t)); // Clamp t between 0 and 1
}

export default WindSystem;
export { WindState }; 