import { Component } from '../core/index.js';

class AudioComponent extends Component {
    /**
     * Stores sound configurations for an entity, mapping events or states to sounds.
     * @param {object} options Configuration options.
     * @param {object} options.sounds Maps event/state names to sound configs.
     *                                Example: { walk: { key: 'sound_key', volume: 1.0, loop: true, randomPitch: false }, ... }
     */
    constructor(options = {}) {
        super();
        // Map of event/state names to sound configurations
        // key: string - The key for the loaded sound asset (e.g., 'animal_move')
        // volume: number (0-1) - Playback volume
        // loop: boolean - Whether the sound should loop (managed by AudioSystem based on state)
        // randomPitch: boolean - Apply slight random pitch variation
        this.sounds = options.sounds || {};

        // Internal state managed by AudioSystem to track playing looping sounds
        // Map<string, any> where string is the event/state key (e.g., 'walk')
        // and value is the playback instance returned by the audio player.
        this._currentLoopingSounds = new Map();
    }
}

export default AudioComponent; 