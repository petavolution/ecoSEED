import { Entity } from '../core/index.js';
import TransformComponent from '../components/TransformComponent.js';
import CollisionComponent from '../components/CollisionComponent.js';
import SpriteComponent from '../components/SpriteComponent.js'; // Or a custom RenderComponent
import EntityFactory from '../factories/EntityFactory.js';

class Lake extends Entity {
    /**
     * Creates a Lake entity.
     * @param {object} options Configuration options.
     * @param {number} options.x Initial x position.
     * @param {number} options.y Initial y position.
     * @param {number} [options.width=100] Width of the lake area.
     * @param {number} [options.height=80] Height of the lake area.
     * @param {number} [options.initialWaterLevel=0.5] Initial water level (0-1).
     * @param {number} [options.maxWaterLevel=1.0] Maximum water level.
     * @param {number} [options.evaporationRate=0.01] Water level decrease per second.
     */
    constructor(options = {}) {
        super({ name: 'Lake', tag: 'lake', active: true });

        this.width = options.width || 100;
        this.height = options.height || 80;

        // --- Lake Properties ---
        this.waterLevel = options.initialWaterLevel !== undefined ? options.initialWaterLevel : 0.5;
        this.maxWaterLevel = options.maxWaterLevel || 1.0;
        this.evaporationRate = options.evaporationRate || 0.01; // Units per second
        this.lastEvaporationUpdateTime = this.scene ? this.scene.time.now : performance.now();

        // --- Initialize Components ---
        this.initComponents(options);
    }

    initComponents(options) {
        // Transform (position represents center? or top-left?)
        this.addComponent(new TransformComponent({
            x: options.x || 0,
            y: options.y || 0,
            // Scale might represent water level or just be 1
        }));

        // Collision (for animals to detect it as water source)
        this.addComponent(new CollisionComponent({
            type: 'rectangle', // Or circle if lake is round
            width: this.width,
            height: this.height,
            isTrigger: true, // Animals don't collide physically, just detect
            layer: 'water', // Specific layer for water sources
            collidesWith: [] // Lakes don't need to check collisions themselves
        }));

        // Sprite or Custom Renderer
        // Option 1: Simple Sprite that changes frame/color based on waterLevel
        const spriteOptions = options.spriteOptions || {};
        this.addComponent(new SpriteComponent({
            spriteSheet: spriteOptions.spriteSheet || 'lakes', // Assume spritesheet
            // Animations could represent different water levels (e.g., 'empty', 'low', 'medium', 'full')
            animations: spriteOptions.animations || {
                level0: { frames: [0] }, // Dry
                level1: { frames: [1] }, // Low
                level2: { frames: [2] }, // Medium
                level3: { frames: [3] }  // Full
            },
            currentAnimation: this.getAnimationForWaterLevel(),
            zIndex: 1, // Render below almost everything
            // Static image, size determined by component width/height?
            // Need to check how SpriteComponent handles sizing/scaling vs frame size.
            // Might need manual size setting or a custom render component.
            width: this.width,
            height: this.height,
            ...spriteOptions,
        }));

        // Option 2: A custom RenderComponent that draws a rect/shape with color based on waterLevel
    }

    update(deltaTime) {
        if (!this.active) return;

        const now = this.scene ? this.scene.time.now : performance.now();
        const evapDeltaTime = (now - this.lastEvaporationUpdateTime) / 1000;

        this.updateEvaporation(evapDeltaTime);
        this.updateVisuals();

        this.lastEvaporationUpdateTime = now;
        super.update(deltaTime);
    }

    updateEvaporation(deltaTime) {
        // Evaporate water over time, but not below zero
        if (this.waterLevel > 0) {
            this.waterLevel = Math.max(0, this.waterLevel - this.evaporationRate * deltaTime);
        }
    }

    updateVisuals() {
        // Update sprite animation based on current water level
        const sprite = this.getComponent('sprite');
        if (sprite) {
            const newAnimation = this.getAnimationForWaterLevel();
            if (sprite.currentAnimation !== newAnimation) {
                sprite.setAnimation(newAnimation);
            }
            // Option B: If using color tinting instead of animations:
            // const blueIntensity = Math.floor(200 * this.waterLevel) + 55;
            // sprite.setTint(0x888800 | blueIntensity); // Example blue tint
        }
    }

    getAnimationForWaterLevel() {
        if (this.waterLevel <= 0.05) return 'level0';
        if (this.waterLevel < 0.4) return 'level1';
        if (this.waterLevel < 0.8) return 'level2';
        return 'level3';
    }

    /**
     * Adds water to the lake, called by WeatherSystem during rain.
     * @param {number} amount Amount of water to add.
     */
    addWater(amount) {
        this.waterLevel = Math.min(this.maxWaterLevel, this.waterLevel + amount);
        // console.log(`Lake ${this.id} water level increased to ${this.waterLevel.toFixed(2)}`);
    }

    /**
     * Called by entities drinking from the lake.
     * @param {number} amount Amount of water requested.
     * @returns {number} Actual amount of water taken.
     */
    takeWater(amount) {
        const available = this.waterLevel * 100; // Arbitrary conversion factor? Define capacity?
        const takenAmount = Math.min(available, amount);
        const takenLevel = takenAmount / 100; // Convert back to level reduction

        if (takenLevel > 0) {
            this.waterLevel = Math.max(0, this.waterLevel - takenLevel);
            // console.log(`Lake ${this.id} water taken: ${takenAmount.toFixed(2)}, level now: ${this.waterLevel.toFixed(2)}`);
            return takenAmount;
        } else {
            return 0;
        }
    }
}

// Register Lake with the factory
EntityFactory.register('lake', (graphicsGenerator, options) => new Lake(options));

export default Lake; 