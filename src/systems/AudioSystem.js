import { System } from '../core/index.js';
import AudioComponent from '../components/AudioComponent.js';
import TransformComponent from '../components/TransformComponent.js';

// --- Conceptual Audio Player Interface ---
// In a real scenario, this would wrap Web Audio API, Howler.js, etc.
const audioPlayer = {
    sounds: new Map(), // Map<string, AudioBuffer or Howl object>
    listenerPosition: { x: 0, y: 0 }, // For spatial audio

    // Load sounds from a map like { key: [path1, path2], ... }
    load: (soundMap) => {
        console.log("AudioPlayer: Loading sounds...");
        for (const [key, paths] of Object.entries(soundMap)) {
            // Simulate loading - in reality, use AudioContext.decodeAudioData or Howler
            console.log(` - Loading ${key} from ${paths[0]}`);
            audioPlayer.sounds.set(key, { name: key, path: paths[0] }); // Store mock sound info
        }
        console.log("AudioPlayer: Loading complete.");
    },

    // Play a sound once
    playOneShot: (key, volume = 1.0, randomPitch = false, position = null) => {
        if (!audioPlayer.sounds.has(key)) {
            console.warn(`AudioPlayer: Sound key "${key}" not found.`);
            return;
        }
        const soundInfo = audioPlayer.sounds.get(key);
        const pitchText = randomPitch ? ' with random pitch' : '';
        const posText = position ? ` at (${position.x.toFixed(0)}, ${position.y.toFixed(0)})` : '';
        console.log(`SOUND: Play OneShot "${soundInfo.name}" (vol: ${volume.toFixed(2)}${pitchText}${posText})`);
        // Real implementation: Create buffer source/Howl, set gain/panning/playbackRate, play()
    },

    // Start a looping sound, returns an identifier for the playing instance
    playLoop: (key, volume = 1.0, position = null) => {
        if (!audioPlayer.sounds.has(key)) {
            console.warn(`AudioPlayer: Sound key "${key}" not found.`);
            return null;
        }
        const soundInfo = audioPlayer.sounds.get(key);
        const instanceId = `${key}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const posText = position ? ` at (${position.x.toFixed(0)}, ${position.y.toFixed(0)})` : '';
        console.log(`SOUND: Start Loop "${soundInfo.name}" (vol: ${volume.toFixed(2)}${posText}) - Instance: ${instanceId}`);
        // Real implementation: Create looping source/Howl, set gain/panning, play(), return instance
        return { id: instanceId, key: key, stop: () => audioPlayer.stopLoop({ id: instanceId, key: key }) };
    },

    // Stop a specific looping sound instance
    stopLoop: (instance) => {
        if (!instance || !instance.id) return;
        console.log(`SOUND: Stop Loop "${instance.key}" - Instance: ${instance.id}`);
        // Real implementation: Find the specific source/Howl instance and stop it.
    },

    // Update spatial listener position (e.g., follow camera)
    updateListener: (position) => {
        audioPlayer.listenerPosition = position;
        // Real implementation: Update AudioListener position
    }
};
// --- End Conceptual Audio Player ---

class AudioSystem extends System {
    constructor() {
        super();
        this.query = this.world.createQuery({ include: [AudioComponent, TransformComponent] });

        // Assume sounds are loaded elsewhere, perhaps on game init
        // audioPlayer.load(this.getSoundAssetMap());

        // --- Event Listeners ---
        this.world.on('entity_spawned', this.handleSpawn.bind(this));
        this.world.on('entity_died', this.handleDeath.bind(this));
        this.world.on('entity_ate', this.handleEat.bind(this));
        this.world.on('entity_state_changed', this.handleStateChange.bind(this));
        // Add more listeners as needed (e.g., 'attacked', 'jumped', 'landed')
    }

    // Example: Load sound manifest (adapt paths as needed)
    getSoundAssetMap() {
         return {
            animal_move: ['assets/sounds/animal_move.wav'],
            animal_spawn: ['assets/sounds/animal_spawn.wav'],
            bee: ['assets/sounds/bee.wav'],
            bee2: ['assets/sounds/bee2.wav'],
            bee3: ['assets/sounds/bee3.wav'],
            fish_splash: ['assets/sounds/fish_splash.wav'],
            harvest: ['assets/sounds/harvest.wav'],
            harvest2: ['assets/sounds/harvest2.wav'],
            // music: ['assets/sounds/music.wav'], // Music handled separately?
            plant_seed: ['assets/sounds/plant_seed.wav'],
            plant_seed2: ['assets/sounds/plant_seed2.wav'],
            shop: ['assets/sounds/shop.wav'],
            tree_grow: ['assets/sounds/tree_grow.wav'],
            upgrade: ['assets/sounds/upgrade.wav'],
            wings: ['assets/sounds/wings.wav']
        };
    }

    execute(deltaTime) {
        // Can be used for continuous updates, like spatial audio or fading loops
        // Example: Update listener position based on camera
        // const cameraPos = this.world.getCameraPosition();
        // audioPlayer.updateListener(cameraPos);

        // State-based loop management (alternative/complement to events)
        /*
        this.query.entities.forEach(entity => {
            const audio = entity.getComponent(AudioComponent);
            const state = entity.getState(); // Assume getState() method exists
            this.manageLoopingSounds(entity, audio, state);
        });
        */
    }

    // --- Event Handlers ---

    handleSpawn(event) {
        const entity = event.entity;
        if (!entity?.hasComponent(AudioComponent)) return;
        this.playSound(entity, 'spawn');
    }

    handleDeath(event) {
        const entity = event.entity;
        if (!entity?.hasComponent(AudioComponent)) return;
         this.stopAllLoopsForEntity(entity); // Stop looping sounds on death
        this.playSound(entity, 'die');
    }

    handleEat(event) {
        const entity = event.entity;
        if (!entity?.hasComponent(AudioComponent)) return;
        this.playSound(entity, 'eat');
    }

     handleStateChange(event) {
        const entity = event.entity;
        if (!entity?.hasComponent(AudioComponent)) return;

        const { newState, oldState } = event;
         const audio = entity.getComponent(AudioComponent);

        // Stop looping sounds associated with the old state
        if (oldState) {
             const oldSoundConfig = audio.sounds[oldState.toLowerCase()];
             if (oldSoundConfig?.loop) {
                 this.stopLoop(entity, audio, oldState.toLowerCase());
             }
        }

         // Start looping sounds associated with the new state
         if (newState) {
             const newSoundConfig = audio.sounds[newState.toLowerCase()];
             if (newSoundConfig?.loop) {
                 this.startLoop(entity, audio, newState.toLowerCase());
             }
              // Play one-shot sound if configured for entering the state
             else if (newSoundConfig) {
                 this.playSound(entity, newState.toLowerCase());
             }
         }
    }

    // --- Sound Playback Helpers ---

    /** Plays a configured sound for an entity, if found. */
    playSound(entity, soundName) {
        const audio = entity.getComponent(AudioComponent);
        const transform = entity.getComponent(TransformComponent);
        const soundConfig = audio?.sounds[soundName];

        if (soundConfig && !soundConfig.loop) { // Only play one-shots here
            audioPlayer.playOneShot(
                soundConfig.key,
                soundConfig.volume,
                soundConfig.randomPitch,
                transform ? { x: transform.x, y: transform.y } : null
            );
        }
    }

    /** Starts a looping sound if not already playing. */
    startLoop(entity, audio, soundName) {
        if (audio._currentLoopingSounds.has(soundName)) return; // Already playing

        const soundConfig = audio.sounds[soundName];
        if (!soundConfig?.loop) return;

        const transform = entity.getComponent(TransformComponent);
        const instance = audioPlayer.playLoop(
            soundConfig.key,
            soundConfig.volume,
            transform ? { x: transform.x, y: transform.y } : null
        );

        if (instance) {
            audio._currentLoopingSounds.set(soundName, instance);
        }
    }

    /** Stops a specific looping sound if it's playing. */
    stopLoop(entity, audio, soundName) {
        if (audio._currentLoopingSounds.has(soundName)) {
            const instance = audio._currentLoopingSounds.get(soundName);
            audioPlayer.stopLoop(instance);
            audio._currentLoopingSounds.delete(soundName);
        }
    }

    /** Stops all looping sounds for a specific entity. */
    stopAllLoopsForEntity(entity) {
         const audio = entity.getComponent(AudioComponent);
         if (!audio) return;
         for (const [soundName, instance] of audio._currentLoopingSounds.entries()) {
             audioPlayer.stopLoop(instance);
         }
         audio._currentLoopingSounds.clear();
    }
}

// Make the conceptual player globally accessible for easy setup/initialization
// In a real app, this might be managed by the main game class or world.
// window.gameAudioPlayer = audioPlayer; // Removed global exposure

export default AudioSystem; 