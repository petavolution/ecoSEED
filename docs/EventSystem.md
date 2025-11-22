# Event System Documentation

The EcoSEED engine uses an event-driven architecture to facilitate communication between different parts of the system. This approach helps reduce tight coupling between components and makes the codebase more maintainable.

## Overview

The event system follows the publisher-subscriber pattern (also known as pub/sub):

1. Components and systems can **subscribe** to specific event types
2. When an event occurs, the event system **publishes** the event to all subscribers
3. Each subscriber receives the event data and can react accordingly

## Using the Event System

### Importing

```javascript
import { eventSystem, EventTypes } from '../systems/EventSystem.js';
// or from the main entry point
import { eventSystem, EventTypes } from '../EcoSEED.js';
```

### Subscribing to Events

```javascript
// Simple subscription
eventSystem.on(EventTypes.BUNNY_BORN, (data) => {
  console.log(`A new bunny was born at ${data.position.x}, ${data.position.y}!`);
});

// Subscribe with context
class MyClass {
  constructor() {
    this.count = 0;
    eventSystem.on(EventTypes.BUNNY_BORN, this.handleBunnyBorn, this);
  }
  
  handleBunnyBorn(data) {
    this.count++;
    console.log(`Bunny #${this.count} was born!`);
  }
}

// One-time subscription
eventSystem.once(EventTypes.GAME_PAUSED, () => {
  console.log('Game paused for the first time');
});
```

### Unsubscribing from Events

```javascript
// Store the unsubscribe function
const unsubscribe = eventSystem.on(EventTypes.BUNNY_BORN, callback);

// Later, when you want to stop listening
unsubscribe();

// Alternative method
eventSystem.off(EventTypes.BUNNY_BORN, callback, context);
```

### Publishing Events

```javascript
// Emit an event with data
eventSystem.emit(EventTypes.BUNNY_BORN, {
  entity: bunnyEntity,
  position: { x: 100, y: 200 },
  age: 'baby'
});
```

## Standard Event Types

The `EventTypes` object contains all standard event types used in the engine. Here are the main categories:

### Entity Lifecycle Events

- `ENTITY_CREATED`: Fired when a new entity is created
- `ENTITY_DESTROYED`: Fired when an entity is destroyed

### Animal Events

- `ANIMAL_BORN`: Fired when a new animal is born
- `ANIMAL_DIED`: Fired when an animal dies
- `ANIMAL_GROW`: Fired when an animal grows to a new age stage

### Bunny-specific Events

- `BUNNY_BORN`: Fired when a new bunny is born
- `BUNNY_DIED`: Fired when a bunny dies
- `BUNNY_EAT`: Fired when a bunny eats food
- `BUNNY_BREED`: Fired when a bunny breeds

### Interaction Events

- `FOOD_CONSUMED`: Fired when food is consumed

### Scene Events

- `SCENE_CHANGED`: Fired when the active scene changes
- `SCENE_INITIALIZED`: Fired when a scene is initialized

### Game State Events

- `GAME_PAUSED`: Fired when the game is paused
- `GAME_RESUMED`: Fired when the game is resumed

## Custom Events

You can also create and emit custom events:

```javascript
// Define a custom event type
const MY_CUSTOM_EVENT = 'my:custom:event';

// Subscribe to it
eventSystem.on(MY_CUSTOM_EVENT, (data) => {
  console.log('Custom event triggered!', data);
});

// Emit the event
eventSystem.emit(MY_CUSTOM_EVENT, { customData: 'something' });
```

## Best Practices

1. **Use standard event types** when possible to maintain consistency
2. **Be specific with event data** to make it easier for subscribers to use
3. **Unsubscribe when components are destroyed** to prevent memory leaks
4. **Prefer events over direct references** to reduce coupling
5. **Document custom events** to help other developers understand their purpose

## Implementation Details

The event system is implemented as a singleton, meaning there's only one instance throughout the application. This ensures that all parts of the code can access the same event system.

```javascript
// Get the singleton instance
const eventSystem = EventSystem.getInstance();
```

Events with the same name are completely separated from each other - publishing to one doesn't affect subscribers of the other. 