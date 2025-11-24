# Animal Movement Architecture - File Dependency Map

## Overview

This document maps the inter-relationships between files responsible for complex animal entity movement in the EcoSEED ecosystem simulation. The architecture follows an Entity-Component-System (ECS) pattern where movement emerges from the interaction of multiple components and systems.

---

## Core Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GAME LOOP (Game.js)                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Scene.js                                     │   │
│  │  ┌───────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │   │
│  │  │ PhysicsSystem │  │   RenderSystem   │  │  Other Systems      │  │   │
│  │  └───────┬───────┘  └────────┬─────────┘  └─────────────────────┘  │   │
│  │          │                   │                                      │   │
│  │          ▼                   ▼                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    ENTITIES (Animal, Bird, etc.)             │   │   │
│  │  │  ┌─────────────┐ ┌───────────────┐ ┌────────────────────┐   │   │   │
│  │  │  │  Transform  │ │   Steering    │ │     Behavior       │   │   │   │
│  │  │  │  Component  │ │   Component   │ │     Component      │   │   │   │
│  │  │  └─────────────┘ └───────────────┘ └────────────────────┘   │   │   │
│  │  │  ┌─────────────┐ ┌───────────────┐ ┌────────────────────┐   │   │   │
│  │  │  │   Physics   │ │   Collision   │ │      Sprite        │   │   │   │
│  │  │  │  Component  │ │   Component   │ │     Component      │   │   │   │
│  │  │  └─────────────┘ └───────────────┘ └────────────────────┘   │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Dependency Matrix

### 1. `src/core/base/Entity.js`
**Purpose**: Base container class for all game objects; holds and manages components

**Imports From**:
- `./Component.js` - Base component class reference

**Referenced By**:
- `src/entities/Animal.js` - Extends Entity
- `src/entities/Bird.js` - Extends Animal (→ Entity)
- `src/entities/Lake.js` - Extends Entity
- `src/components/*.js` - All components reference Entity for registration
- `src/core/base/Scene.js` - Manages Entity collections
- `src/systems/PhysicsSystem.js` - Processes entities with physics/collision

**Key Responsibilities**:
- Component storage (`Map<string, Component>`)
- Entity lifecycle (initialize, update, draw, destroy)
- Parent-child hierarchy management
- Tag system for grouping/querying
- Static component registry (`Entity.registerComponent()`)

---

### 2. `src/core/base/Component.js`
**Purpose**: Abstract base class for all components; defines lifecycle interface

**Imports From**: None (base class)

**Referenced By**:
- All component files (`src/components/*.js`)
- `src/core/base/Entity.js` - Type reference

**Key Responsibilities**:
- Lifecycle methods: `init()`, `update()`, `lateUpdate()`, `fixedUpdate()`, `draw()`, `destroy()`
- Entity reference management
- Dependency validation
- Enable/disable state

---

### 3. `src/components/TransformComponent.js`
**Purpose**: Stores and manages position, scale, rotation, and z-index

**Imports From**:
- `../core/base/Component.js` - Base class
- `../core/index.js` - Entity for registration

**Referenced By**:
- `src/entities/Animal.js` - Position/movement target
- `src/components/SteeringComponent.js` - Reads/writes position
- `src/components/PhysicsComponent.js` - Position reference
- `src/components/CollisionComponent.js` - Position for bounds calculation
- `src/components/SpriteComponent.js` - Position for rendering
- `src/systems/PhysicsSystem.js` - Updates position from physics
- `src/systems/RenderSystem.js` - Position for camera transforms

**Key Data**:
```javascript
{
  x, y,                    // Position
  scaleX, scaleY,          // Scale
  rotation,                // Radians
  zIndex,                  // Render order
  velocityX, velocityY     // Calculated from position delta
}
```

---

### 4. `src/components/SteeringComponent.js`
**Purpose**: Implements steering behaviors for autonomous movement (seek, flee, wander, flock)

**Imports From**:
- `../core/base/Component.js` - Base class
- `../core/index.js` - Entity for registration

**Referenced By**:
- `src/entities/Animal.js` - Adds steering component, calls steering methods
- `src/components/BehaviorComponent.js` - Modifies steering behaviors based on state
- `src/entities/Bird.js` - Inherits steering through Animal

**Key Relationships**:
- **Reads from**: `TransformComponent` (current position)
- **Writes to**: `TransformComponent` (updates position based on velocity)
- **Interacts with**: `BehaviorComponent` (receives behavior commands)

**Steering Behaviors**:
| Behavior | Description | Parameters |
|----------|-------------|------------|
| `seek` | Move toward target | `target: {x,y}` or Entity |
| `flee` | Move away from target | `target`, `panicDistance` |
| `arrive` | Seek with deceleration | `target`, `slowingDistance` |
| `pursuit` | Intercept moving target | `target` (Entity with steering) |
| `evade` | Flee from moving target | `target`, `panicDistance` |
| `wander` | Random exploration | `wanderJitter` |
| `separation` | Avoid crowding neighbors | `entities`, `radius` |
| `alignment` | Match neighbor heading | `entities`, `radius` |
| `cohesion` | Move toward group center | `entities`, `radius` |

**Update Flow**:
```
1. Reset steeringForce
2. For each active behavior:
   - Calculate behavior force
   - Apply weight
   - Accumulate to steeringForce
3. Apply boundary containment force
4. Limit steeringForce to maxForce
5. Calculate acceleration (F/m)
6. Update velocity (v += a * dt)
7. Limit velocity to maxSpeed
8. Update position (p += v * dt)
9. Update rotation to face movement direction
```

---

### 5. `src/components/BehaviorComponent.js`
**Purpose**: State machine for AI decision-making; manages behavior states and transitions

**Imports From**:
- `../core/base/Component.js` - Base class
- `../core/index.js` - Entity for registration

**Referenced By**:
- `src/entities/Animal.js` - Adds behavior component with states
- `src/entities/Bird.js` - Uses bird-specific behavior templates

**Key Relationships**:
- **Reads from**: `TransformComponent` (position for distance calculations)
- **Commands**: `SteeringComponent` (adds/removes behaviors based on state)
- **Uses**: Blackboard pattern for shared data

**State Machine Structure**:
```javascript
states: Map<string, {
  enter: (behavior, entity, params) => void,
  update: (behavior, entity, deltaTime) => void,
  exit: (behavior, entity) => void,
  transitions: { [condition]: targetState }
}>
```

**Animal States** (from Animal.js):
| State | Behavior | Transitions To |
|-------|----------|----------------|
| `idle` | Stop movement | → wander (timeout), → seek (hungry/thirsty), → flee (danger), → sleep (tired) |
| `wander` | Random exploration | → idle (timeout), → seek (hungry/thirsty), → flee (danger), → mate (mate found) |
| `seek` | Move to food/water | → eat (reached), → wander (lost target), → flee (danger) |
| `flee` | Escape from threat | → idle (safe), → wander (timeout/exhausted) |
| `eat` | Consume food | → idle (finished), → flee (danger) |
| `sleep` | Rest and recover | → idle (rested), → flee (danger) |
| `mate` | Approach mate | → idle (finished), → flee (danger) |
| `dead` | Death animation | (terminal) |

**Bird States** (from BehaviorComponent.Templates.createBirdBehavior):
| State | Behavior | Transitions To |
|-------|----------|----------------|
| `flock` | Separation + alignment + cohesion + wander | → flyToPerch (random chance), → evadeThreats (danger) |
| `flyToPerch` | Arrive at perch location | → perched (reached), → flock (no perch) |
| `perched` | Stop movement, rest on perch | → flock (timeout), → evadeThreats (danger) |
| `evadeThreats` | Evade + wander away from threat | → flock (safe/timeout) |

---

### 6. `src/components/PhysicsComponent.js`
**Purpose**: Stores physics properties (mass, drag, velocity); provides force/impulse API

**Imports From**:
- `../core/base/Component.js` - Base class
- `../core/index.js` - Entity for registration

**Referenced By**:
- `src/entities/Animal.js` - Adds physics component
- `src/entities/Bird.js` - Modifies physics (low drag for flight)
- `src/systems/PhysicsSystem.js` - Reads/writes velocity, applies forces

**Key Relationships**:
- **Reads from**: `TransformComponent` (for rotation updates)
- **Written by**: `PhysicsSystem` (applies forces, updates velocity)
- **Used by**: `CollisionComponent` (mass for collision resolution)

**Key Data**:
```javascript
{
  mass,                    // 0 = immovable
  drag,                    // Air/fluid resistance (0-1)
  friction,                // Surface friction (0-1)
  restitution,             // Bounciness (0-1)
  useGravity,              // Whether gravity affects this entity
  maxSpeed,                // Velocity limit
  velocityX, velocityY,    // Current velocity
  forceX, forceY,          // Accumulated forces (reset each frame)
  angularVelocity, torque  // Rotational physics
}
```

---

### 7. `src/components/CollisionComponent.js`
**Purpose**: Defines collision shapes and handles collision detection

**Imports From**:
- `../core/base/Component.js` - Base class
- `../core/index.js` - Entity for registration

**Referenced By**:
- `src/entities/Animal.js` - Adds collision component
- `src/systems/PhysicsSystem.js` - Uses for collision detection

**Key Relationships**:
- **Reads from**: `TransformComponent` (position for bounds)
- **Used by**: `PhysicsSystem` (collision detection and resolution)

**Collision Shapes**:
| Shape | Properties | Use Case |
|-------|------------|----------|
| `circle` | `radius` | Most animals, round objects |
| `rectangle` | `width`, `height`, `rotation` | Buildings, terrain features |
| `point` | (none) | Projectiles, small particles |

**Collision Detection Methods**:
- `checkCircleCircle()` - Circle vs circle
- `checkCircleRect()` / `checkCircleRotatedRect()` - Circle vs rectangle
- `checkRectRect()` / `checkRotatedRectRect()` - Rectangle vs rectangle
- `checkPointCircle()` / `checkPointRect()` - Point vs shape

---

### 8. `src/systems/PhysicsSystem.js`
**Purpose**: System that processes physics and collision for all registered entities

**Imports From**:
- `../components/CollisionComponent.js` - SHAPES constant

**Referenced By**:
- `src/core/base/Scene.js` - Scene adds and updates systems
- `src/systems/index.js` - Exported from systems

**Key Relationships**:
- **Processes entities with**: `transform`, `physics`, `collision` components
- **Spatial partitioning**: Grid-based optimization for collision detection

**Update Flow**:
```
1. Clamp deltaTime to prevent physics explosion
2. Update spatial grid with all entities
3. For each entity:
   a. Apply gravity (if useGravity)
   b. Apply accumulated forces
   c. Apply drag
   d. Clamp to maxSpeed
   e. Update position from velocity
   f. Reset forces
4. Detect collisions (spatial grid optimization)
5. Resolve collisions:
   a. Position correction (separate overlapping entities)
   b. Impulse resolution (bounce/friction)
6. Track collision enter/exit events
```

**Spatial Grid**:
- Divides world into cells of `gridCellSize` (default: 64px)
- Entities added to cells based on their collision bounds
- Collision checks only within same/adjacent cells
- `getNearbyEntities(x, y, radius)` for efficient queries

---

### 9. `src/entities/Animal.js`
**Purpose**: Base class for all animal entities; integrates components for living creatures

**Imports From**:
- `../core/index.js` - Entity base class

**Referenced By**:
- `src/entities/Bird.js` - Extends Animal (via Omnivore)
- Other animal subclasses (Bunny, Fox, Bear, etc.)

**Key Relationships**:
- **Adds components**: `transform`, `sprite`, `physics`, `collision`, `behavior`, `steering`
- **Uses**: Genetics system for procedural variation

**Component Configuration**:
```javascript
// Transform
{ position, scale, rotation, zIndex }

// Physics
{ mass, drag, friction, restitution, maxSpeed, useGravity: false }

// Collision
{ shape: 'circle', radius, isTrigger: false, collidesWith: ['animal', 'plant', 'terrain'] }

// Behavior
{ states, initialState: 'idle', transitions, data: { hunger, thirst, health, energy, ... } }

// Steering
{ maxSpeed, maxForce, enabled: true, avoidance: { enabled: true, radius } }
```

**Genetics System**:
```javascript
genetics: {
  intelligence,  // Affects perception radius
  speed,         // Affects maxSpeed
  strength,      // Affects combat
  dexterity,     // Affects steering force
  size,          // Affects visual scale, health, hunger rate
  fertility,     // Affects breeding success
  lifespan,      // Affects maxAge
  aggression,    // Affects fight/flight threshold
  metabolism     // Affects hunger/thirst rates
}
```

**Update Flow** (Animal.update):
```
1. Call super.update() (Entity updates all components)
2. Get behavior component
3. Update survival stats (hunger, thirst, energy, age)
4. Check death conditions (hunger=0, thirst=0, health=0, age>=maxAge)
5. Handle pregnancy progression
6. Update breeding cooldown
```

---

### 10. `src/entities/Bird.js`
**Purpose**: Specialized bird entity with flight physics and flocking behavior

**Imports From**:
- `./Omnivore.js` - Diet base class (extends Animal)
- `../factories/EntityFactory.js` - Factory registration
- `../components/TransformComponent.js`
- `../components/PhysicsComponent.js`
- `../components/BehaviorComponent.js`
- `../behaviors/BirdFlockingBehavior.js`

**Referenced By**:
- Scene/game code that spawns birds
- EntityFactory when creating birds

**Key Customizations**:
```javascript
// Physics adjustments for flight
physics.drag = 0.04;           // Low drag
physics.mass = size * 0.5;     // Light weight

// Diet (omnivore)
diet: ['bee', 'butterfly', 'dragonfly', 'insect', 'grass', 'plant', 'seeds']

// Speed
speed: 5.0                     // Fast flight
perceptionRadius: 200          // Good vision
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ANIMAL ENTITY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────┐      ┌───────────────────┐                          │
│  │  BehaviorComponent │──────│  SteeringComponent │                          │
│  │                    │      │                    │                          │
│  │  • State machine   │ ───► │  • Weighted        │                          │
│  │  • Decisions       │      │    behaviors       │                          │
│  │  • Blackboard      │      │  • Velocity        │                          │
│  └────────┬───────────┘      └─────────┬──────────┘                          │
│           │                            │                                     │
│           │ reads threat,              │ updates                             │
│           │ food, mate                 │ position                            │
│           ▼                            ▼                                     │
│  ┌───────────────────┐      ┌───────────────────┐                          │
│  │ TransformComponent │◄─────│  PhysicsComponent  │                          │
│  │                    │      │                    │                          │
│  │  • Position (x,y)  │      │  • Velocity        │                          │
│  │  • Scale           │      │  • Forces          │                          │
│  │  • Rotation        │      │  • Mass, Drag      │                          │
│  └─────────┬──────────┘      └────────────────────┘                          │
│            │                                                                 │
│            │ position for bounds                                             │
│            ▼                                                                 │
│  ┌───────────────────┐                                                      │
│  │CollisionComponent │                                                      │
│  │                    │                                                      │
│  │  • Shape/Bounds    │                                                      │
│  │  • Collision tags  │                                                      │
│  └────────────────────┘                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ PhysicsSystem processes
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             PHYSICS SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Update spatial grid                                                     │
│  2. Apply forces & update velocities                                        │
│  3. Update positions                                                        │
│  4. Detect collisions (spatial grid optimization)                           │
│  5. Resolve collisions (position correction + impulse)                      │
│  6. Emit collision events                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Single Frame Update

```
Frame Start
    │
    ▼
┌─────────────────────────────────────────┐
│ Scene.update(deltaTime)                 │
│   └─► For each system: system.update()  │
│   └─► For each entity: entity.update()  │
└───────────────────┬─────────────────────┘
                    │
    ┌───────────────┴───────────────┐
    │                               │
    ▼                               ▼
┌─────────────────────┐   ┌─────────────────────┐
│ Animal.update()     │   │ PhysicsSystem       │
│                     │   │   .update()         │
│ 1. Entity.update()  │   │                     │
│    └─► Component    │   │ 1. Spatial grid     │
│        updates      │   │    rebuild          │
│                     │   │                     │
│ 2. Update stats     │   │ 2. Apply physics    │
│    (hunger, etc.)   │   │    to entities      │
│                     │   │                     │
│ 3. Check death      │   │ 3. Collision        │
│                     │   │    detection        │
│ 4. Pregnancy logic  │   │                     │
│                     │   │ 4. Collision        │
└─────────────────────┘   │    resolution       │
                          └─────────────────────┘
    │
    ├─── BehaviorComponent.update() ───┐
    │    • Update cooldowns            │
    │    • Check global transitions    │
    │    • Execute state update        │
    │    • Run active behaviors        │
    │                                  │
    │                                  ▼
    │    ┌─────────────────────────────────────┐
    │    │ State Handler (e.g., _handleWander) │
    │    │   • steering.addBehavior('wander')  │
    │    │   • _updatePerception()             │
    │    │   • Check transition conditions     │
    │    └─────────────────────────────────────┘
    │
    └─── SteeringComponent.update() ───┐
         • Reset steering force        │
         • Calculate each behavior     │
         • Accumulate weighted forces  │
         • Apply boundary force        │
         • Limit force to maxForce     │
         • acceleration = force / mass │
         • velocity += accel * dt      │
         • Limit velocity to maxSpeed  │
         • position += velocity * dt   │
         • Update rotation             │
         │
         ▼
    TransformComponent.update()
         • Calculate velocity from position delta
         • Store previous position
```

---

## File Size Analysis (Movement-Related)

| File | Size | LOC (approx) | Complexity |
|------|------|--------------|------------|
| `SteeringComponent.js` | 25KB | ~700 | High - 9 steering algorithms |
| `BehaviorComponent.js` | 32KB | ~790 | High - State machine + templates |
| `Animal.js` | 31KB | ~976 | High - Full entity with genetics |
| `CollisionComponent.js` | 24KB | ~780 | High - Multiple shape algorithms |
| `PhysicsSystem.js` | 21KB | ~660 | High - Physics + spatial grid |
| `PhysicsComponent.js` | 7.5KB | ~265 | Medium - Property storage |
| `TransformComponent.js` | 7.3KB | ~267 | Low - Position/hierarchy |
| `Entity.js` | 12KB | ~468 | Medium - Component container |
| `Component.js` | 5.4KB | ~223 | Low - Base class |
| `Bird.js` | 4KB | ~97 | Low - Extends Animal |

---

## Optimization Considerations

### Current Optimizations
1. **Spatial Partitioning**: Grid-based collision detection
2. **Behavior Weights**: Weighted steering allows priority blending
3. **Periodic Perception**: Animals don't scan every frame
4. **Component Caching**: Components cached on entity

### Potential Improvements
1. **Object Pooling**: Reuse entity/component objects
2. **LOD for Distant Entities**: Reduce update frequency
3. **Quadtree**: Better spatial partitioning for varied densities
4. **SIMD/Web Workers**: Parallel physics processing
5. **Dirty Flags**: Skip unchanged entity updates

---

## Key Architectural Decisions

### 1. Dual Movement Systems
- **SteeringComponent**: Handles autonomous AI movement (seek, flee, flock)
- **PhysicsSystem**: Handles physics simulation (forces, collisions)
- These can conflict; steering directly modifies position, physics applies forces

### 2. Behavior-Steering Coupling
- BehaviorComponent controls which steering behaviors are active
- State changes add/remove steering behaviors
- Tight coupling but clear responsibility separation

### 3. Genetics Integration
- Genetics affect component parameters at construction time
- No runtime genetic changes (except breeding)
- Provides natural variation without complex systems

### 4. Blackboard Pattern
- BehaviorComponent uses blackboard for shared state
- Allows decoupled communication between state handlers
- Stores targets, timers, perception data

---

*Document Version: 1.0*
*Last Updated: 2025-11-22*
*Based on codebase audit of EcoSEED project*
