# @autumnplains/assets

Shared game assets package for AutumnPlains.

## Directory Structure

```
packages/assets/
├── public/
│   ├── models/       # 3D models (.glb, .gltf, .obj, etc.)
│   │   ├── japanese_restaurant/
│   │   └── outskirt_stand/
│   ├── textures/     # Texture files (.jpg, .png, etc.)
│   │   ├── clouds/
│   │   ├── groundTestTexture.jpg
│   │   ├── skyboxTest.jpg
│   │   └── skyboxTest.png
│   ├── sounds/       # Audio files (.mp3, .wav, etc.)
│   ├── ui/           # UI assets (icons, sprites, etc.)
│   └── lib/          # Third-party libraries (ammo.js, etc.)
│       └── ammo.js
├── index.js          # Asset path helpers
├── package.json
└── README.md
```

## Usage

### 1. Install in your client package

```bash
pnpm add @autumnplains/assets --workspace
```

### 2. Import asset path helpers

```javascript
import { getModelPath, getTexturePath, getSoundPath } from '@autumnplains/assets';

// Get paths to assets
const characterModel = getModelPath('character.glb');
const grassTexture = getTexturePath('grass.jpg');
const jumpSound = getSoundPath('jump.mp3');
```

### 3. Set up asset serving in your client

For **client-babylon** (Vite):

Add to `vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, '../assets/public')
    }
  },
  publicDir: '../assets/public' // Serve assets from the shared package
});
```

Or copy assets to your public directory during build.

## Adding New Assets

1. Place assets in the appropriate directory under `public/`
2. Use the helper functions to reference them in code
3. Assets are automatically available to all client packages

## Asset Organization

- **models/** - 3D models for characters, objects, terrain (japanese_restaurant, outskirt_stand)
- **textures/** - Texture maps, skyboxes, etc. (groundTestTexture.jpg, skyboxTest.jpg/png, clouds/)
- **sounds/** - Sound effects and music
- **ui/** - Icons, buttons, HUD elements
- **lib/** - Third-party libraries (ammo.js physics engine)

## Examples

```javascript
// Load a character model
const modelPath = getModelPath('player-character.glb');
SceneLoader.ImportMesh('', '', modelPath, scene);

// Load a texture
const texturePath = getTexturePath('stone-wall.jpg');
const texture = new Texture(texturePath, scene);

// Load a sound
const soundPath = getSoundPath('footstep.mp3');
const sound = new Sound('footstep', soundPath, scene);
```
