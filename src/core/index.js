/**
 * index.js - Exports all core classes for the EcoSEED project
 */

// Import from base
import {
  Component,
  Entity,
  Scene,
  System
} from './base/index.js';

// Import Game class
import Game from './Game.js';

// Import EventSystem
import EventSystem, { eventSystem, EventTypes } from '../systems/EventSystem.js';

// Export all core classes
export {
  Component,
  Entity,
  Scene,
  System,
  Game,
  EventSystem,
  eventSystem,
  EventTypes
};

// Default export with all classes
export default {
  Component,
  Entity,
  Scene,
  System,
  Game,
  EventSystem,
  eventSystem,
  EventTypes
}; 