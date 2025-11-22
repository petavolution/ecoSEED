/**
 * index.js - Exports all consolidated base classes for the EcoSEED project
 */

import Component from './Component.js';
import Entity from './Entity.js';
import Scene from './Scene.js';
import System from './System.js';

// EntityManager deprecated; core uses Scene and direct entity lists

// Export individual classes
export {
  Component,
  Entity,
  Scene,
  System
};

// Default export with all classes
export default {
  Component,
  Entity,
  Scene,
  System
}; 