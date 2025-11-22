import { System } from '../core/index.js';
import { SEASONS } from './SeasonSystem.js'; // Import SEASONS enum

// Define base environmental parameters per season
const SEASON_PARAMS = {
    [SEASONS.SPRING]: {
        grassGrowthModifier: 1.2,
        temperature: 15, // Arbitrary units
        skyColor: { r: 200, g: 230, b: 255 },
        groundColor: { r: 124, g: 186, b: 57 } // Spring green
    },
    [SEASONS.SUMMER]: {
        grassGrowthModifier: 1.5,
        temperature: 28,
        skyColor: { r: 180, g: 220, b: 255 }, // Brighter blue
        groundColor: { r: 100, g: 160, b: 43 } // Deeper summer green
    },
    [SEASONS.AUTUMN]: {
        grassGrowthModifier: 0.6,
        temperature: 12,
        skyColor: { r: 255, g: 220, b: 180 }, // Warmer sky
        groundColor: { r: 170, g: 178, b: 57 } // Yellowish-brown grass
    },
    [SEASONS.WINTER]: {
        grassGrowthModifier: 0.1, // Very slow growth
        temperature: -2,
        skyColor: { r: 200, g: 220, b: 255 }, // Pale blue/grey
        groundColor: { r: 140, g: 160, b: 137 }, // Dormant/snowy hint
        snowAccumulationRate: 0.1 // Rate snow builds up per second in winter
    }
};

// Helper function to interpolate between two numbers
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Helper function to interpolate between two RGB colors
function interpolateColor(colorA, colorB, t) {
    return {
        r: Math.round(lerp(colorA.r, colorB.r, t)),
        g: Math.round(lerp(colorA.g, colorB.g, t)),
        b: Math.round(lerp(colorA.b, colorB.b, t))
    };
}

class EnvironmentSystem extends System {
    constructor() {
        super();
        this.groundSnowLevel = 0; // 0 to 1

         // TODO: Initialize particle emitters for leaves/snow if using a particle system
    }

    execute(deltaTime) {
        if (!this.world) return;

        // Get current season state from world
        const currentSeason = this.world.getState('season');
        const nextSeason = this.world.getState('nextSeason');
        const isTransitioning = this.world.getState('isTransitioning');
        const transitionProgress = this.world.getState('transitionProgress');

        if (!currentSeason || !nextSeason) {
            console.warn("Season state not yet available in EnvironmentSystem.");
            return; // SeasonSystem might not have run yet
        }

        const currentParams = SEASON_PARAMS[currentSeason];
        const nextParams = SEASON_PARAMS[nextSeason];

        let effectiveGrowthModifier;
        let effectiveTemperature;
        let effectiveSkyColor;
        let effectiveGroundColor;

        if (isTransitioning) {
            // Interpolate values during transition
            effectiveGrowthModifier = lerp(currentParams.grassGrowthModifier, nextParams.grassGrowthModifier, transitionProgress);
            effectiveTemperature = lerp(currentParams.temperature, nextParams.temperature, transitionProgress);
            effectiveSkyColor = interpolateColor(currentParams.skyColor, nextParams.skyColor, transitionProgress);
            effectiveGroundColor = interpolateColor(currentParams.groundColor, nextParams.groundColor, transitionProgress);
        } else {
            // Use current season values directly
            effectiveGrowthModifier = currentParams.grassGrowthModifier;
            effectiveTemperature = currentParams.temperature;
            effectiveSkyColor = currentParams.skyColor;
            effectiveGroundColor = currentParams.groundColor;
        }

        // Update snow level
        if (currentSeason === SEASONS.WINTER) {
             const snowRate = currentParams.snowAccumulationRate || 0;
             // Increase snow during winter, decrease otherwise (or based on temp)
             this.groundSnowLevel = Math.min(1, this.groundSnowLevel + snowRate * deltaTime);
             // TODO: Spawn snowflake particles
        } else {
             // Snow melts outside of winter (or if temp > 0)
             if (effectiveTemperature > 0) {
                 this.groundSnowLevel = Math.max(0, this.groundSnowLevel - 0.2 * deltaTime); // Melting rate
             }
        }

         // Handle Autumn leaves
         if (currentSeason === SEASONS.AUTUMN) {
             // TODO: Spawn leaf particles
         }

        // --- Update World State with Calculated Values ---
        this.world.setState('grassGrowthModifier', effectiveGrowthModifier);
        this.world.setState('temperature', effectiveTemperature);
        this.world.setState('skyColor', effectiveSkyColor);
        this.world.setState('groundColor', effectiveGroundColor);
        this.world.setState('groundSnowLevel', this.groundSnowLevel);

        // --- Update Renderer/Scene (Example - actual implementation depends on renderer) ---
        // This part is conceptual - needs integration with your actual rendering pipeline
        // const renderer = this.world.getRenderer();
        // if (renderer) {
        //     renderer.setBackgroundColor(effectiveSkyColor);
        //     renderer.setGroundOverlay(effectiveGroundColor, this.groundSnowLevel > 0 ? this.groundSnowLevel : 0);
             // renderer.updateParticles(snowParticles, leafParticles); // If managing particles here
        // }
    }

    // --- TODO: Methods for managing particle effects (snow, leaves) ---
    // spawnSnowflake() { ... }
    // updateSnowflakes(deltaTime) { ... }
    // spawnLeafParticle() { ... }
    // updateLeafParticles(deltaTime) { ... }
}

export default EnvironmentSystem; 