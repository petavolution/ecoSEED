/**
 * InputManager.js - Centralized input handling for EcoSEED
 * Handles keyboard, mouse, and touch events
 */

export default class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseButtons = new Set();
    this.mousePosition = { x: 0, y: 0 };
    this.touchPositions = new Map();

    // Bind handlers
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);

    this._setupListeners();
  }

  _setupListeners() {
    if (typeof window === 'undefined') return;

    // Keyboard
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // Mouse
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Touch
    this.canvas.addEventListener('touchstart', this._onTouchStart);
    this.canvas.addEventListener('touchmove', this._onTouchMove);
    this.canvas.addEventListener('touchend', this._onTouchEnd);
  }

  destroy() {
    if (typeof window === 'undefined') return;

    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
  }

  _onKeyDown(event) {
    this.keys.add(event.key);
  }

  _onKeyUp(event) {
    this.keys.delete(event.key);
  }

  _onMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition = {
      x: (event.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (event.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  _onMouseDown(event) {
    this.mouseButtons.add(event.button);
  }

  _onMouseUp(event) {
    this.mouseButtons.delete(event.button);
  }

  _onTouchStart(event) {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    for (const touch of event.changedTouches) {
      const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
      this.touchPositions.set(touch.identifier, { x, y });
    }
  }

  _onTouchMove(event) {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    for (const touch of event.changedTouches) {
      const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
      this.touchPositions.set(touch.identifier, { x, y });
    }
  }

  _onTouchEnd(event) {
    event.preventDefault();
    for (const touch of event.changedTouches) {
      this.touchPositions.delete(touch.identifier);
    }
  }

  /**
   * Check if a key is currently pressed
   * @param {string} key 
   * @returns {boolean}
   */
  isKeyPressed(key) {
    return this.keys.has(key);
  }

  /**
   * Check if a mouse button is pressed
   * @param {number} button
   * @returns {boolean}
   */
  isMouseButtonPressed(button) {
    return this.mouseButtons.has(button);
  }

  /**
   * Get current mouse position
   * @returns {{x: number, y: number}}
   */
  getMousePosition() {
    return { ...this.mousePosition };
  }

  /**
   * Get current touch positions
   * @returns {Array<{id:number, x:number, y:number}>}
   */
  getTouchPositions() {
    const positions = [];
    for (const [id, pos] of this.touchPositions) {
      positions.push({ id, x: pos.x, y: pos.y });
    }
    return positions;
  }
} 