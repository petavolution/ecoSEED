# System Class Guide

The System class is a core component of the Entity Component System (ECS) architecture in the EcoSEED engine. This guide explains the enhanced System class and provides best practices for creating and working with systems.

## Overview

In the ECS architecture, systems are responsible for processing entities with specific component combinations each frame. Systems contain the game logic that operates on components, while entities simply aggregate components.

The enhanced System class provides:

- Lifecycle hooks for initialization, updates, and cleanup
- Entity filtering based on components and tags
- Performance monitoring and optimization
- Debugging features

## Class Structure

```javascript
class System {
    constructor() {
        // Core properties
        this.world = null;  // Reference to the world this system belongs to
        this.priority = 0;  // Priority (higher runs first)
        this.enabled = true;  // Whether this system is active
        
        // Entity filtering
        this.requiredComponents = [];  // Components required for processing
        this.optionalComponents = [];  // Optional components that may affect processing
        this.requiredTags = [];  // Tags entities must have to be processed
        this.excludedTags = [];  // Tags that prevent entities from being processed
        this.entities = [];  // Currently processed entities
        
        // Performance optimization
        this.useCache = true;  // Whether to cache entity queries
        this._cachedEntities = null;  // Cached entities
        this._cacheValid = false;  // Whether cache is valid
        
        // Performance monitoring
        this.performanceMetrics = { ... };  // Track performance stats
        this.debugMode = false;  // Enable verbose logging
    }
    
    // ... methods
}
```

## Lifecycle Methods

The System class provides several lifecycle hooks that you can override in your custom systems:

| Method | Description |
|--------|-------------|
| `init()` | Called when the system is added to the world |
| `onInit()` | Custom initialization logic |
| `reset()` | Resets the system to its initial state |
| `onReset()` | Custom reset logic |
| `update(deltaTime)` | Main update method called each frame |
| `onBeforeUpdate(deltaTime)` | Called before processing entities |
| `onAfterUpdate(deltaTime, entities)` | Called after processing entities |
| `process(entities, deltaTime)` | Processes all relevant entities |
| `processEntity(entity, deltaTime)` | Processes a single entity |
| `onEnable()` | Called when the system is enabled |
| `onDisable()` | Called when the system is disabled |

## Entity Filtering

Systems can filter entities by components and tags:

```javascript
// In your constructor
this.requiredComponents = ['Position', 'Velocity'];  // Required components
this.optionalComponents = ['Mass'];  // Optional components
this.requiredTags = ['movable'];  // Required tags
this.excludedTags = ['static'];  // Excluded tags
```

The system will only process entities that have ALL required components, ALL required tags, and NONE of the excluded tags.

## Performance Optimization

The enhanced System class includes several features for optimizing performance:

1. **Entity Caching**: By default, entity queries are cached to avoid redundant filtering.
2. **Performance Metrics**: The system tracks metrics like update time and entities processed.
3. **Selective Processing**: Only active entities are processed by default.

To invalidate the cache (e.g., when entities or components change):

```javascript
this.invalidateCache();
```

## Creating a Custom System

Here's a template for creating a custom system:

```javascript
class MySystem extends System {
    constructor() {
        super();
        
        // Define required components
        this.requiredComponents = ['ComponentA', 'ComponentB'];
        
        // Set priority
        this.priority = 100;  // Higher priority systems run first
    }
    
    onInit() {
        // Initialize system-specific properties
        console.log('MySystem initialized');
    }
    
    processEntity(entity, deltaTime) {
        // Get required components
        const componentA = entity.getComponent('ComponentA');
        const componentB = entity.getComponent('ComponentB');
        
        // Implement system logic
        // ...
    }
    
    onReset() {
        // Reset system-specific properties
    }
}
```

## Best Practices

1. **Single Responsibility**: Each system should focus on a single aspect of game logic.
2. **Minimal Component Dependencies**: Limit required components to what's absolutely necessary.
3. **Use Lifecycle Hooks**: Override the appropriate lifecycle hooks rather than the core methods.
4. **Optimize Entity Filtering**: Use tags and component requirements to efficiently filter entities.
5. **Debug Performance**: Enable debugMode during development to monitor system performance.

## Example: Movement System

The MovementSystem is a practical example that demonstrates many features of the System class:

```javascript
class MovementSystem extends System {
    constructor() {
        super();
        this.requiredComponents = ['Position', 'Velocity'];
        this.optionalComponents = ['Mass', 'Collider'];
        this.priority = 100;
    }
    
    onInit() {
        this.friction = 0.98;
        this.gravity = { x: 0, y: 9.8 };
        this.addExcludedTag('noGravity');
    }
    
    processEntity(entity, deltaTime) {
        const position = entity.getComponent('Position');
        const velocity = entity.getComponent('Velocity');
        
        // Apply physics
        position.x += velocity.x * deltaTime;
        position.y += velocity.y * deltaTime;
        
        // ... more physics logic
    }
}
```

## Advanced Features

### Dynamic Entity Requirements

You can dynamically change component requirements during runtime:

```javascript
// Add a required component
this.addRequiredComponent('NewComponent');

// Set required tags
this.setRequiredTags(['tag1', 'tag2']);

// Add an excluded tag
this.addExcludedTag('excluded');
```

### Performance Monitoring

To get detailed performance metrics:

```javascript
// Enable debug mode
this.debugMode = true;

// Get detailed debug info
const debugInfo = this.getDebugInfo();
console.log(debugInfo);
```

### Event Handling

While the System class doesn't directly implement an event system, you can use the lifecycle hooks to integrate with an event system:

```javascript
onInit() {
    // Subscribe to events
    eventBus.subscribe('eventType', this.handleEvent.bind(this));
}

onReset() {
    // Unsubscribe from events
    eventBus.unsubscribe('eventType', this.handleEvent.bind(this));
}
```

## Integration with World

To add a system to the world:

```javascript
// Create the system
const movementSystem = new MovementSystem();

// Add to world with priority
world.addSystem(movementSystem, 100);
```

## Conclusion

The enhanced System class provides a robust foundation for implementing game logic in an ECS architecture. By leveraging its features, you can create efficient, maintainable systems that process entities effectively.

Remember that systems should focus on behavior, while components hold data. This separation of concerns is key to the benefits of the ECS architecture. 