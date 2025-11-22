/**
 * index.js - Export all systems for easy import
 * 
 * This allows importing multiple systems using a single import statement.
 */

import PhysicsSystem from './PhysicsSystem.js';
import RenderSystem from './RenderSystem.js';
import EventSystem, { eventSystem, EventTypes } from './EventSystem.js';

// Export all systems
export {
    PhysicsSystem,
    RenderSystem,
    EventSystem,
    eventSystem,
    EventTypes
};

// Default export with all systems
export default {
    PhysicsSystem,
    RenderSystem,
    EventSystem,
    eventSystem
}; 