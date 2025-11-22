import { System } from '../core/index.js';

// Define Seasons Enum/Object
export const SEASONS = Object.freeze({
    SPRING: 'spring',
    SUMMER: 'summer',
    AUTUMN: 'autumn', // Using Autumn instead of Fall for consistency
    WINTER: 'winter'
});

const SEASON_ORDER = [SEASONS.SPRING, SEASONS.SUMMER, SEASONS.AUTUMN, SEASONS.WINTER];

const DEFAULT_SEASON_LENGTH = 60; // Default length of each season in seconds
const DEFAULT_TRANSITION_TIME = 5; // Default time to transition between seasons in seconds

class SeasonSystem extends System {
    /**
     * Manages the progression of seasons and related global state.
     * @param {object} [options] Configuration options.
     * @param {number} [options.seasonLength=DEFAULT_SEASON_LENGTH] Length of each season in seconds.
     * @param {number} [options.transitionTime=DEFAULT_TRANSITION_TIME] Duration of transition between seasons in seconds.
     * @param {string} [options.initialSeason=SEASONS.SPRING] The starting season.
     */
    constructor(options = {}) {
        super();
        this.seasonLength = (options.seasonLength || DEFAULT_SEASON_LENGTH) * 1000; // Store in ms
        this.transitionTime = (options.transitionTime || DEFAULT_TRANSITION_TIME) * 1000; // Store in ms
        this.seasonCycleLength = this.seasonLength + this.transitionTime;

        this.currentSeasonIndex = SEASON_ORDER.indexOf(options.initialSeason || SEASONS.SPRING);
        if (this.currentSeasonIndex === -1) this.currentSeasonIndex = 0; // Default to Spring if invalid

        this.currentSeason = SEASON_ORDER[this.currentSeasonIndex];
        this.seasonTimer = 0; // Time elapsed within the current season + transition cycle (ms)
        this.isTransitioning = false;
        this.transitionProgress = 0; // 0 to 1

        // Initialize world state
        this.updateWorldState();
        console.log(`SeasonSystem initialized. Starting season: ${this.currentSeason}`);
    }

    execute(deltaTime) {
        const dtMillis = deltaTime * 1000;
        this.seasonTimer += dtMillis;

        let needsStateUpdate = false;

        // Check if currently in the main part of the season
        if (this.seasonTimer < this.seasonLength) {
            this.isTransitioning = false;
            this.transitionProgress = 0;
        }
        // Check if entering the transition phase
        else if (this.seasonTimer < this.seasonCycleLength) {
            if (!this.isTransitioning) {
                this.isTransitioning = true;
                needsStateUpdate = true; // State changed: entered transition
                 console.log(`Season transition starting: ${this.currentSeason} -> ${this.getNextSeason()}`);
            }
            this.transitionProgress = (this.seasonTimer - this.seasonLength) / this.transitionTime;
        }
        // Check if season cycle completed
        else {
            this.currentSeasonIndex = (this.currentSeasonIndex + 1) % SEASON_ORDER.length;
            const oldSeason = this.currentSeason;
            this.currentSeason = SEASON_ORDER[this.currentSeasonIndex];
            this.seasonTimer = this.seasonTimer - this.seasonCycleLength; // Carry over excess time
            this.isTransitioning = false;
            this.transitionProgress = 0;
            needsStateUpdate = true; // State changed: new season
            console.log(`Season changed to: ${this.currentSeason}`);

             // Emit event for major season change
            this.world?.emit('season_changed', { from: oldSeason, to: this.currentSeason });
        }

        // Update world state if necessary (or always, for progress)
        // Always update progress, only update season/transition status if changed
        this.updateWorldState(needsStateUpdate);
    }

    /**
     * Updates the global world state with current season information.
     * @param {boolean} [forceUpdate=true] Whether to force update even if only progress changed.
     */
    updateWorldState(forceUpdate = true) {
        if (!this.world) return;

        const currentState = {
            season: this.currentSeason,
            nextSeason: this.getNextSeason(),
            isTransitioning: this.isTransitioning,
            seasonProgress: this.seasonTimer / this.seasonCycleLength, // Overall progress in cycle (0-1)
            transitionProgress: this.transitionProgress // Progress within transition phase (0-1)
        };

        // Check if core state changed or if forced update
        const previousSeason = this.world.getState('season');
        const previousTransition = this.world.getState('isTransitioning');
        if (forceUpdate || previousSeason !== currentState.season || previousTransition !== currentState.isTransitioning) {
             this.world.setState('season', currentState.season);
             this.world.setState('nextSeason', currentState.nextSeason);
             this.world.setState('isTransitioning', currentState.isTransitioning);
        }
        // Always update progress values
         this.world.setState('seasonProgress', currentState.seasonProgress);
         this.world.setState('transitionProgress', currentState.transitionProgress);
    }

    /**
     * Gets the next season in the cycle.
     * @returns {string} The name of the next season.
     */
    getNextSeason() {
        const nextIndex = (this.currentSeasonIndex + 1) % SEASON_ORDER.length;
        return SEASON_ORDER[nextIndex];
    }
}

export default SeasonSystem; 