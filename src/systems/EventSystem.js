/**
 * EventSystem.js - Central event management for the EcoSEED engine
 * 
 * This system provides a central place for game objects to subscribe to
 * and publish events, eliminating direct dependencies between components.
 */

/**
 * Event types used throughout the system
 */
export const EventTypes = {
    // Entity lifecycle events
    ENTITY_CREATED: 'entity:created',
    ENTITY_DESTROYED: 'entity:destroyed',
    
    // Animal lifecycle events
    ANIMAL_BORN: 'animal:born',
    ANIMAL_DIED: 'animal:died',
    ANIMAL_GROW: 'animal:grow',
    
    // Bunny specific events
    BUNNY_BORN: 'bunny:born',
    BUNNY_DIED: 'bunny:died',
    BUNNY_EAT: 'bunny:eat',
    BUNNY_BREED: 'bunny:breed',
    
    // Interaction events
    FOOD_CONSUMED: 'food:consumed',
    
    // Scene events
    SCENE_CHANGED: 'scene:changed',
    SCENE_INITIALIZED: 'scene:initialized',
    
    // Game state events
    GAME_PAUSED: 'game:paused',
    GAME_RESUMED: 'game:resumed'
};

/**
 * Central event management system
 */
export default class EventSystem {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
        
        // Bind methods
        this.emit = this.emit.bind(this);
        this.on = this.on.bind(this);
        this.once = this.once.bind(this);
        this.off = this.off.bind(this);
    }
    
    /**
     * Subscribe to an event
     * @param {string} event - Event type to listen for
     * @param {Function} callback - Function to call when event occurs
     * @param {Object} context - Optional context to bind the callback to
     * @returns {Function} Unsubscribe function
     */
    on(event, callback, context = null) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        const eventListeners = this.listeners.get(event);
        const listener = { callback, context };
        eventListeners.push(listener);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }
    
    /**
     * Subscribe to an event once
     * @param {string} event - Event type to listen for
     * @param {Function} callback - Function to call when event occurs
     * @param {Object} context - Optional context to bind the callback to
     * @returns {Function} Unsubscribe function
     */
    once(event, callback, context = null) {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, []);
        }
        
        const eventListeners = this.onceListeners.get(event);
        const listener = { callback, context };
        eventListeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            if (this.onceListeners.has(event)) {
                const listeners = this.onceListeners.get(event);
                const index = listeners.findIndex(l => 
                    l.callback === callback && l.context === context);
                
                if (index !== -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} event - Event type to unsubscribe from
     * @param {Function} callback - Callback to remove
     * @param {Object} context - Context used when subscribing
     */
    off(event, callback, context = null) {
        // Regular listeners
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            const index = listeners.findIndex(l => 
                l.callback === callback && l.context === context);
            
            if (index !== -1) {
                listeners.splice(index, 1);
            }
            
            // Clean up empty arrays
            if (listeners.length === 0) {
                this.listeners.delete(event);
            }
        }
        
        // Once listeners
        if (this.onceListeners.has(event)) {
            const listeners = this.onceListeners.get(event);
            const index = listeners.findIndex(l => 
                l.callback === callback && l.context === context);
            
            if (index !== -1) {
                listeners.splice(index, 1);
            }
            
            // Clean up empty arrays
            if (listeners.length === 0) {
                this.onceListeners.delete(event);
            }
        }
    }
    
    /**
     * Emit an event
     * @param {string} event - Event type to emit
     * @param {Object} data - Data to pass to listeners
     */
    emit(event, data = {}) {
        // Call regular listeners
        if (this.listeners.has(event)) {
            const listeners = this.listeners.get(event);
            for (const listener of listeners) {
                if (listener.context) {
                    listener.callback.call(listener.context, data);
                } else {
                    listener.callback(data);
                }
            }
        }
        
        // Call once listeners
        if (this.onceListeners.has(event)) {
            const listeners = this.onceListeners.get(event);
            // Create a copy of the array since we'll be removing items
            const listenersCopy = [...listeners];
            // Clear the original array
            this.onceListeners.delete(event);
            
            // Call each once listener
            for (const listener of listenersCopy) {
                if (listener.context) {
                    listener.callback.call(listener.context, data);
                } else {
                    listener.callback(data);
                }
            }
        }
    }
    
    /**
     * Create a singleton instance 
     */
    static getInstance() {
        if (!EventSystem.instance) {
            EventSystem.instance = new EventSystem();
        }
        return EventSystem.instance;
    }
}

// Create and export singleton instance
export const eventSystem = EventSystem.getInstance(); 