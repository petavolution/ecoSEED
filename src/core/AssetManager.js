/**
 * AssetManager.js - Handles loading and retrieving assets
 * Part of the EcoSEED project
 */

export default class AssetManager {
  constructor() {
    this.images = new Map();
    this.audio = new Map();
    this.assets = new Map();
    this.spriteSheetData = new Map(); // Added for sprite sheet definitions
  }

  /**
   * Generic method to add an asset to the cache.
   * Use specific loaders (loadImage, loadAudio) for standard types when loading is needed.
   * Use this for pre-loaded or generated assets.
   * @param {string} key - Unique identifier for the asset.
   * @param {*} asset - The asset object (Image, Audio, Canvas, JSON, etc.).
   * @param {string} [type='data'] - Optional type hint ('image', 'audio', 'generated', 'data').
   */
  add(key, asset, type = 'data') {
    if (this.assets.has(key)) {
      console.warn(`AssetManager: Key "${key}" already exists. Overwriting.`);
    }
    // Store asset along with its type for potential future use
    this.assets.set(key, { asset: asset, type: type });
    // Optionally, also place in specific caches if type matches?
    // if (type === 'image' && asset instanceof HTMLImageElement) this.images.set(key, asset);
    // if (type === 'audio' && asset instanceof HTMLAudioElement) this.audio.set(key, asset);
  }

  /**
   * Generic method to retrieve any cached asset by key.
   * Checks specific caches first for compatibility, then the generic cache.
   * @param {string} key - Identifier for the asset.
   * @returns {*|null} The cached asset object or null if not found.
   */
  get(key) {
    if (this.images.has(key)) return this.images.get(key);
    if (this.audio.has(key)) return this.audio.get(key);
    if (this.assets.has(key)) return this.assets.get(key).asset; // Return the asset itself
    return null;
  }

  /**
   * Load an image asset
   * @param {string} key - Identifier for the image
   * @param {string} src - Source URL/path
   * @returns {Promise<HTMLImageElement>}
   */
  loadImage(key, src) {
    // Check combined cache first
    const existing = this.get(key);
    if (existing && existing instanceof HTMLImageElement) {
      return Promise.resolve(existing);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(key, img); // Keep specific cache for compatibility
        this.add(key, img, 'image'); // Also add to generic cache
        resolve(img);
      };
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }

  /**
   * Get a previously loaded image
   * @param {string} key - Identifier for the image
   * @returns {HTMLImageElement|null}
   */
  getImage(key) {
    return this.images.get(key) || null;
  }

  /**
   * Load an audio asset
   * @param {string} key - Identifier for the audio
   * @param {string} src - Source URL/path
   * @returns {Promise<HTMLAudioElement>}
   */
  loadAudio(key, src) {
    // Check combined cache first
    const existing = this.get(key);
    if (existing && existing instanceof HTMLAudioElement) {
      return Promise.resolve(existing);
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.onloadeddata = () => {
        this.audio.set(key, audio); // Keep specific cache for compatibility
        this.add(key, audio, 'audio'); // Also add to generic cache
        resolve(audio);
      };
      audio.onerror = (err) => reject(err);
      audio.src = src;
    });
  }

  /**
   * Get a previously loaded audio
   * @param {string} key - Identifier for the audio
   * @returns {HTMLAudioElement|null}
   */
  getAudio(key) {
    return this.audio.get(key) || null;
  }

  /**
   * Store arbitrary data (now uses the generic add method)
   * @param {string} key - Identifier for the data
   * @param {*} value - Data value
   */
  setData(key, value) {
    this.add(key, value, 'data');
  }

  /**
   * Retrieve arbitrary data (now uses the generic get method)
   * @param {string} key - Identifier for the data
   * @returns {*}
   */
  getData(key) {
    const entry = this.assets.get(key);
    // Ensure we only return things added via setData or add with type 'data'?
    // Or just return whatever is under the key via get()?
    // Let's use the simpler get() for now.
    return this.get(key);
  }

  /**
   * Load sprite sheet definition data (e.g., from JSON)
   * @param {string} key - Identifier for the sprite sheet data
   * @param {string} src - Source URL/path for the JSON data
   * @returns {Promise<Object>}
   */
  async loadSpriteSheetData(key, src) {
    if (this.spriteSheetData.has(key)) {
      return Promise.resolve(this.spriteSheetData.get(key));
    }

    try {
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.spriteSheetData.set(key, data);
      // Optionally add to generic assets map too?
      // this.add(key, data, 'spriteSheetData'); 
      return data;
    } catch (error) {
      console.error(`AssetManager: Failed to load sprite sheet data "${key}" from ${src}:`, error);
      throw error; // Re-throw error after logging
    }
  }

  /**
   * Get data for a specific sprite within a loaded sprite sheet definition.
   * Assumes sheet data is an object where keys are sprite names.
   * Example JSON structure: { "spriteName1": { x, y, width, height, ... }, ... }
   * Or potentially an array structure depending on the tool used (e.g. TexturePacker)
   * Adjust logic as needed based on actual JSON structure.
   * 
   * @param {string} sheetKey - Identifier for the sprite sheet data.
   * @param {string} spriteName - Name of the specific sprite within the sheet.
   * @returns {Object|null} Sprite data object or null if not found.
   */
  getSpriteData(sheetKey, spriteName) {
    const sheetData = this.spriteSheetData.get(sheetKey);
    if (!sheetData) {
      // console.warn(`AssetManager: Sprite sheet data for "${sheetKey}" not loaded.`);
      return null;
    }

    // Adapt this logic based on the actual structure of your sprite sheet JSON
    // Example 1: Simple object map { spriteName: { data } }
    if (sheetData[spriteName]) {
      return sheetData[spriteName];
    }

    // Example 2: TexturePacker array format { frames: [ { filename: spriteName, frame: {x,y,w,h}, ... } ] }
    if (sheetData.frames && Array.isArray(sheetData.frames)) {
      const frameData = sheetData.frames.find(frame => frame.filename === spriteName);
      if (frameData) {
        // Map TexturePacker structure to expected structure if needed
        return {
          x: frameData.frame.x,
          y: frameData.frame.y,
          width: frameData.frame.w,
          height: frameData.frame.h,
          // Add other relevant properties like frameWidth, frameHeight, frames if available
        };
      }
    }
    
    // Add more checks if other JSON formats are used

    // console.warn(`AssetManager: Sprite "${spriteName}" not found in sheet data "${sheetKey}".`);
    return null;
  }

  /**
   * Clear all loaded assets
   */
  clear() {
    this.images.clear();
    this.audio.clear();
    this.assets.clear(); // Clear the generic cache too
    this.spriteSheetData.clear();
  }

  /**
   * Check if an asset exists in the cache
   * @param {string} key - Identifier for the asset
   * @returns {boolean}
   */
  hasAsset(key) {
    return this.images.has(key) || this.audio.has(key) || this.assets.has(key);
  }

  /**
   * Alias for add, for compatibility
   */
  addAsset(key, asset, type = 'data') {
    this.add(key, asset, type);
  }

  /**
   * Alias for get, for compatibility
   */
  getAsset(key) {
    return this.get(key);
  }
} 