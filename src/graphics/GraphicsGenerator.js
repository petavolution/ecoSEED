/**
 * GraphicsGenerator.js - Generates procedural graphics for entities
 * Provides fallback visuals when sprite assets aren't available
 */

/**
 * GraphicsGenerator - Creates procedural graphics
 */
export default class GraphicsGenerator {
  /**
   * Create a graphics generator
   * @param {AssetManager} assetManager - Asset manager instance
   */
  constructor(assetManager) {
    this.assetManager = assetManager;
    this.cache = new Map();
  }

  /**
   * Generate or retrieve a graphic for an entity type
   * @param {string} type - Entity type (e.g., 'bunny', 'bird', 'grass')
   * @param {Object} options - Generation options
   * @returns {HTMLCanvasElement} Canvas with generated graphic
   */
  generate(type, options = {}) {
    const cacheKey = `${type}_${JSON.stringify(options)}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const canvas = this._createGraphic(type, options);
    this.cache.set(cacheKey, canvas);
    return canvas;
  }

  /**
   * Create a graphic based on type
   * @param {string} type - Entity type
   * @param {Object} options - Options
   * @returns {HTMLCanvasElement}
   */
  _createGraphic(type, options = {}) {
    const size = options.size || 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    switch (type) {
      case 'bunny':
      case 'animal':
        this._drawAnimal(ctx, size, options);
        break;
      case 'bird':
        this._drawBird(ctx, size, options);
        break;
      case 'grass':
        this._drawGrass(ctx, size, options);
        break;
      case 'lake':
      case 'water':
        this._drawLake(ctx, size, options);
        break;
      case 'tree':
        this._drawTree(ctx, size, options);
        break;
      default:
        this._drawDefault(ctx, size, options);
    }

    return canvas;
  }

  /**
   * Draw a simple animal shape
   */
  _drawAnimal(ctx, size, options = {}) {
    const color = options.color || '#8B4513';
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.35;

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.4, cy - r * 0.9, r * 0.2, r * 0.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.4, cy - r * 0.9, r * 0.2, r * 0.5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.1, r * 0.1, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.3, cy - r * 0.1, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw a simple bird shape
   */
  _drawBird(ctx, size, options = {}) {
    const color = options.color || '#4169E1';
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.3;

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = this._darkenColor(color, 0.2);
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.2, cy, r * 0.6, r * 0.3, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(cx + r, cy);
    ctx.lineTo(cx + r * 1.5, cy + r * 0.2);
    ctx.lineTo(cx + r, cy + r * 0.3);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx + r * 0.4, cy - r * 0.1, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw grass
   */
  _drawGrass(ctx, size, options = {}) {
    const color = options.color || '#228B22';

    for (let i = 0; i < 5; i++) {
      const x = size * 0.2 + (i * size * 0.15);
      const height = size * 0.4 + Math.random() * size * 0.4;

      ctx.fillStyle = this._varyColor(color, 0.1);
      ctx.beginPath();
      ctx.moveTo(x, size);
      ctx.quadraticCurveTo(x - 2, size - height * 0.5, x - 3, size - height);
      ctx.quadraticCurveTo(x, size - height * 0.7, x + 3, size - height);
      ctx.quadraticCurveTo(x + 2, size - height * 0.5, x, size);
      ctx.fill();
    }
  }

  /**
   * Draw a lake/water body
   */
  _drawLake(ctx, size, options = {}) {
    const color = options.color || '#4169E1';
    const cx = size / 2;
    const cy = size / 2;

    // Water
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.45, size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = '#ADD8E6';
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(cx - size * 0.1, cy - size * 0.1, size * 0.2, size * 0.1, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  /**
   * Draw a tree
   */
  _drawTree(ctx, size, options = {}) {
    const cx = size / 2;

    // Trunk
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(cx - size * 0.08, size * 0.5, size * 0.16, size * 0.5);

    // Foliage
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.arc(cx, size * 0.35, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw default placeholder
   */
  _drawDefault(ctx, size, options = {}) {
    const color = options.color || '#888';

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * Darken a color
   */
  _darkenColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 255 * amount);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 255 * amount);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 255 * amount);
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Vary a color slightly
   */
  _varyColor(color, variance) {
    const hex = color.replace('#', '');
    const vary = () => (Math.random() - 0.5) * 2 * 255 * variance;
    const r = Math.min(255, Math.max(0, parseInt(hex.substr(0, 2), 16) + vary()));
    const g = Math.min(255, Math.max(0, parseInt(hex.substr(2, 2), 16) + vary()));
    const b = Math.min(255, Math.max(0, parseInt(hex.substr(4, 2), 16) + vary()));
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  /**
   * Clear the graphics cache
   */
  clearCache() {
    this.cache.clear();
  }
}
