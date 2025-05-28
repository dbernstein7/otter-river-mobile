const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://otter-river-adventure.netlify.app';

const ASSETS = {
  models: {
    otter: '/assets/models/otter.glb',
    fish: {
      normal: '/assets/models/fish_normal.glb',
      rainbow: '/assets/models/fish_rainbow.glb',
      golden: '/assets/models/fish_golden.glb',
      emerald: '/assets/models/fish_emerald.glb',
      diamond: '/assets/models/fish_diamond.glb',
    },
    clam: '/assets/models/clam.glb',
    seahorse: '/assets/models/seahorse.glb',
    jellyfish: '/assets/models/jellyfish.glb',
    starfish: '/assets/models/starfish.glb',
    obstacles: {
      rock: '/assets/models/rock.glb',
      log: '/assets/models/log.glb',
    },
  },
  textures: {
    river: '/assets/textures/river.jpg',
    background: '/assets/textures/background.jpg',
    ui: {
      button: '/assets/textures/ui/button.png',
      score: '/assets/textures/ui/score.png',
      lives: '/assets/textures/ui/lives.png',
      level: '/assets/textures/ui/level.png',
    },
  },
  sounds: {
    background: '/assets/sounds/background.mp3',
    collect: '/assets/sounds/collect.mp3',
    gameOver: '/assets/sounds/game_over.mp3',
    levelUp: '/assets/sounds/level_up.mp3',
  },
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(BASE_URL + url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadAssets() {
  // Create directories if they don't exist
  const dirs = [
    'public/assets/models',
    'public/assets/textures',
    'public/assets/textures/ui',
    'public/assets/sounds',
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Download all assets
  for (const [category, items] of Object.entries(ASSETS)) {
    for (const [name, path] of Object.entries(items)) {
      if (typeof path === 'string') {
        const dest = `public${path}`;
        console.log(`Downloading ${name} to ${dest}...`);
        try {
          await downloadFile(path, dest);
          console.log(`Successfully downloaded ${name}`);
        } catch (err) {
          console.error(`Failed to download ${name}:`, err);
        }
      } else {
        for (const [subName, subPath] of Object.entries(path)) {
          const dest = `public${subPath}`;
          console.log(`Downloading ${subName} to ${dest}...`);
          try {
            await downloadFile(subPath, dest);
            console.log(`Successfully downloaded ${subName}`);
          } catch (err) {
            console.error(`Failed to download ${subName}:`, err);
          }
        }
      }
    }
  }
}

downloadAssets().catch(console.error); 