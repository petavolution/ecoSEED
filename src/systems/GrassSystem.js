import { System } from '../core/index.js';
import GrassPatch from '../entities/GrassPatch.js'; // Still needed to know where grass is
import TransformComponent from '../components/TransformComponent.js'; // Needed to get patch position
// import { Entity } from '../core/index.js'; // No longer needed for getEntityClass

const MAX_GRASS_PATCHES = 100; // Limit total number of patches
const GRASS_TILE_SIZE = { width: 32, height: 32 }; // Standard size of grass tiles
const NUM_RANDOM_GRASS_TILES = 15; // Number of variations to pre-generate

/**
 * GrassSystem - Specialized system for efficiently rendering grass patches
 */
class GrassSystem extends System {
    constructor() {
        super({ requiredComponents: ['transform'] });
        this.entities = new Set();
        this.grassTileCache = new Map(); // Cache for grass tiles {key: HTMLCanvasElement}
        this.randomTileKeys = []; // Keys of pre-generated grass variations
        this.graphicsGenerator = null;
        this.enabled = true;
    }

    /**
     * Initialize the system with the scene
     * @param {Scene} scene - Scene containing this system
     */
    initialize(scene) {
        this.scene = scene;
        this.graphicsGenerator = scene.graphicsGenerator;
        
        if (!this.graphicsGenerator) {
            console.error("GrassSystem: Missing graphics generator");
            this.enabled = false;
        }
    }

    /**
     * Pre-generate grass tile variations for better performance
     */
    preGenerateGrassTiles() {
        if (!this.graphicsGenerator) {
            console.error("GrassSystem: Cannot generate grass tiles without a graphics generator");
            return;
        }

        // Clear any existing cache
        this.grassTileCache.clear();
        this.randomTileKeys = [];
        
        // Grass variants and colors for variety
        const tileTypes = ['sparse', 'medium', 'dense'];
        const colorVariants = [
            '#228B22', // Forest Green
            '#32CD32', // Lime Green
            '#006400', // Dark Green 
            '#556B2F', // Olive Green
            '#2E8B57'  // Sea Green
        ];
        
        try {
            // Create each variation
            for (let i = 0; i < NUM_RANDOM_GRASS_TILES; i++) {
                const tileType = tileTypes[Math.floor(Math.random() * tileTypes.length)];
                const baseColor = colorVariants[Math.floor(Math.random() * colorVariants.length)];
                const tileKey = `grass_${tileType}_${i}`;
                
                // Create canvas for this tile
                const tileCanvas = document.createElement('canvas');
                tileCanvas.width = GRASS_TILE_SIZE.width;
                tileCanvas.height = GRASS_TILE_SIZE.height;
                const ctx = tileCanvas.getContext('2d');
                
                // Draw grass onto the tile
                this.graphicsGenerator._drawGrass(
                    ctx, 
                    GRASS_TILE_SIZE.width, 
                    GRASS_TILE_SIZE.height, 
                    baseColor, 
                    tileType
                );
                
                // Store the tile in cache
                this.grassTileCache.set(tileKey, tileCanvas);
                this.randomTileKeys.push(tileKey);
            }
        } catch (error) {
            console.error("GrassSystem: Error generating grass tiles:", error);
        }
    }

    /**
     * Update the system - not much needed for grass patches
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // No special update logic needed for static grass
    }
    
    /**
     * Render all grass patches
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Scene} scene - Current scene
     */
    render(ctx, scene) {
        if (!this.enabled || !ctx || !scene || this.randomTileKeys.length === 0) {
            return;
        }

        // Get grass patch entities
        const grassPatches = Array.from(this.entities).filter(entity => 
            entity.active && entity.tag === 'grass'
        );
        
        if (grassPatches.length === 0) {
            return;
        }
        
        // Apply camera transform
        ctx.save();
        this.applyCamera(ctx, scene.camera); 

        // Draw each grass patch
        for (const patch of grassPatches) {
            this.renderGrassPatch(ctx, scene, patch);
        }

        ctx.restore();
    }
    
    /**
     * Render a single grass patch
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Scene} scene - Current scene
     * @param {Entity} patch - Grass patch entity
     */
    renderGrassPatch(ctx, scene, patch) {
        const transform = patch.getComponent('transform');
        if (!transform) return;

        const radius = patch.radius || 50; 
        const patchX = transform.x;
        const patchY = transform.y;
        
        // Skip if patch is not visible
        if (!this.isPatchVisible(patchX, patchY, radius, scene.camera)) {
            return;
        }

        const tileW = GRASS_TILE_SIZE.width;
        const tileH = GRASS_TILE_SIZE.height;
        
        // Calculate visible tile range for optimization
        const visibleArea = this.getVisibleTileRange(patchX, patchY, radius, scene.camera);
        const startX = patchX - radius;
        const startY = patchY - radius;
        
        // Draw only tiles in visible area and within patch radius
        for (let i = visibleArea.minTileX; i < visibleArea.maxTileX; i++) {
            for (let j = visibleArea.minTileY; j < visibleArea.maxTileY; j++) {
                const drawX = startX + i * tileW;
                const drawY = startY + j * tileH;
                
                // Check if tile is within patch radius
                const tileCenterX = drawX + tileW / 2;
                const tileCenterY = drawY + tileH / 2;
                const dx = tileCenterX - patchX;
                const dy = tileCenterY - patchY;
                
                if (dx * dx + dy * dy < radius * radius) {
                    // Deterministic random selection based on position
                    const tileIndex = Math.abs(
                        Math.floor(
                            Math.sin(tileCenterX * 0.1) * 
                            Math.cos(tileCenterY * 0.1) * 
                            this.randomTileKeys.length
                        )
                    ) % this.randomTileKeys.length;
                    
                    const randomTileKey = this.randomTileKeys[tileIndex];
                    const grassTile = this.grassTileCache.get(randomTileKey);
                    
                    if (grassTile) {
                        ctx.drawImage(grassTile, drawX, drawY, tileW, tileH);
                    }
                }
            }
        }
    }
    
    /**
     * Calculate the range of tiles that need to be drawn for a patch
     * @param {number} patchX - Patch center X
     * @param {number} patchY - Patch center Y
     * @param {number} radius - Patch radius
     * @param {Object} camera - Scene camera
     * @returns {Object} Visible tile range
     */
    getVisibleTileRange(patchX, patchY, radius, camera) {
        const tileW = GRASS_TILE_SIZE.width;
        const tileH = GRASS_TILE_SIZE.height;
        
        // Screen bounds in world coordinates
        const screenLeft = camera.x - camera.width / (2 * camera.zoom);
        const screenRight = camera.x + camera.width / (2 * camera.zoom);
        const screenTop = camera.y - camera.height / (2 * camera.zoom);
        const screenBottom = camera.y + camera.height / (2 * camera.zoom);
        
        // Convert to tile coordinates
        return {
            minTileX: Math.floor((Math.max(screenLeft, patchX - radius) - patchX + radius) / tileW),
            maxTileX: Math.ceil((Math.min(screenRight, patchX + radius) - patchX + radius) / tileW),
            minTileY: Math.floor((Math.max(screenTop, patchY - radius) - patchY + radius) / tileH),
            maxTileY: Math.ceil((Math.min(screenBottom, patchY + radius) - patchY + radius) / tileH)
        };
    }
    
    /**
     * Apply camera transform to context
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Scene camera
     */
    applyCamera(ctx, camera) {
        if (!camera) return;
        
        const centerX = camera.width / 2;
        const centerY = camera.height / 2;
        
        ctx.translate(centerX, centerY);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);
    }
    
    /**
     * Check if a patch is visible in the camera
     * @param {number} x - Patch center X
     * @param {number} y - Patch center Y
     * @param {number} radius - Patch radius
     * @param {Object} camera - Scene camera
     * @returns {boolean} True if visible
     */
    isPatchVisible(x, y, radius, camera) {
        const screenLeft = camera.x - camera.width / (2 * camera.zoom);
        const screenRight = camera.x + camera.width / (2 * camera.zoom);
        const screenTop = camera.y - camera.height / (2 * camera.zoom);
        const screenBottom = camera.y + camera.height / (2 * camera.zoom);
        
        return (
            x + radius > screenLeft &&
            x - radius < screenRight &&
            y + radius > screenTop &&
            y - radius < screenBottom
        );
    }

    // Optional spreading logic for future enhancement
    attemptSpreadFrom(parentPatch) {
       // Simplified version - can be implemented later if needed
       console.log("Grass spreading not implemented in simplified version");
    }
}

export default GrassSystem;