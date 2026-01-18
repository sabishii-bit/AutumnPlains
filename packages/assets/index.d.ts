/**
 * Asset path helpers for accessing shared game assets
 */

/**
 * Get the base path for assets
 */
export function getAssetBasePath(): string;

/**
 * Get path to a model file
 */
export function getModelPath(modelName: string): string;

/**
 * Get path to a texture file
 */
export function getTexturePath(textureName: string): string;

/**
 * Get path to a sound file
 */
export function getSoundPath(soundName: string): string;

/**
 * Get path to a UI asset file
 */
export function getUIAssetPath(uiAssetName: string): string;

/**
 * Get path to a library file
 */
export function getLibPath(libName: string): string;
