/**
 * Asset path helpers for accessing shared game assets
 * Usage: import { getModelPath, getTexturePath } from '@autumnplains/assets'
 */

/**
 * Get the base path for assets
 * In development, assets are served from this package via Vite's publicDir
 * Files are served from root (e.g., /models/..., /textures/...)
 * In production, they should be copied to the client's public directory
 */
export function getAssetBasePath() {
  // Empty string because Vite's publicDir serves files from root
  return '';
}

/**
 * Get path to a model file
 * @param {string} modelName - Name of the model file (e.g., 'character.glb')
 * @returns {string} Full path to the model
 */
export function getModelPath(modelName) {
  return `${getAssetBasePath()}/models/${modelName}`;
}

/**
 * Get path to a texture file
 * @param {string} textureName - Name of the texture file (e.g., 'grass.jpg')
 * @returns {string} Full path to the texture
 */
export function getTexturePath(textureName) {
  return `${getAssetBasePath()}/textures/${textureName}`;
}

/**
 * Get path to a sound file
 * @param {string} soundName - Name of the sound file (e.g., 'jump.mp3')
 * @returns {string} Full path to the sound
 */
export function getSoundPath(soundName) {
  return `${getAssetBasePath()}/sounds/${soundName}`;
}

/**
 * Get path to a UI asset file
 * @param {string} uiAssetName - Name of the UI asset (e.g., 'button.png')
 * @returns {string} Full path to the UI asset
 */
export function getUIAssetPath(uiAssetName) {
  return `${getAssetBasePath()}/ui/${uiAssetName}`;
}

/**
 * Get path to a library file
 * @param {string} libName - Name of the library file (e.g., 'ammo.js')
 * @returns {string} Full path to the library
 */
export function getLibPath(libName) {
  return `${getAssetBasePath()}/lib/${libName}`;
}
