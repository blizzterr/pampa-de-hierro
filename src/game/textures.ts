import * as THREE from 'three';

export function createGuardaPampaTexture(
  primary: string,
  accent: string,
  dark: string,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Woven wool base
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle woven textile grain
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let y = 0; y < 256; y += 4) {
    ctx.fillRect(0, y, 256, 1);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let x = 0; x < 256; x += 6) {
    ctx.fillRect(x, 0, 2, 256);
  }

  // Horizontal Argentine Guarda Pampa bands (stepped diamond / cruz andina motif)
  const drawBand = (bandY: number) => {
    ctx.fillStyle = dark;
    ctx.fillRect(0, bandY - 14, 256, 28);
    ctx.fillStyle = accent;
    ctx.fillRect(0, bandY - 11, 256, 3);
    ctx.fillRect(0, bandY + 8, 256, 3);

    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = accent;
      ctx.fillRect(x + 12, bandY - 6, 8, 12);
      ctx.fillRect(x + 8, bandY - 3, 16, 6);
      ctx.fillStyle = primary;
      ctx.fillRect(x + 14, bandY - 2, 4, 4);
    }
  };

  drawBand(52);
  drawBand(196);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createTerrainTexture(
  primary: string,
  secondary: string,
  accent: string,
  mode: 'OPEN_WORLD' | 'DUNGEON' | 'PVP_ARENA',
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 512, 512);

  if (mode === 'DUNGEON' || mode === 'PVP_ARENA') {
    // Flagstone paving tiles with mortar grooves
    const tile = 64;
    for (let y = 0; y < 512; y += tile) {
      for (let x = 0; x < 512; x += tile) {
        const offset = (y / tile) % 2 === 0 ? 0 : tile / 2;
        const shade = ((x * 7 + y * 13) % 30) - 15;
        ctx.fillStyle = secondary;
        ctx.globalAlpha = 0.25 + (shade + 15) / 80;
        ctx.fillRect((x + offset) % 512, y, tile - 3, tile - 3);
      }
    }
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 488, 488);
    ctx.globalAlpha = 1;
  } else {
    // Organic pampa earth + dry grass + dirt patches
    for (let i = 0; i < 650; i++) {
      const x = (i * 97) % 512;
      const y = (i * 53 + Math.floor(i / 7) * 19) % 512;
      const r = 6 + (i % 24);
      ctx.fillStyle = i % 3 === 0 ? secondary : primary;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Fine grass blades / pebbles
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = accent;
    for (let i = 0; i < 420; i++) {
      const x = (i * 131 + 17) % 512;
      const y = (i * 71 + 29) % 512;
      ctx.fillRect(x, y, 2, 5);
    }
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.24)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createStoneWallTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#5c5449';
  ctx.fillRect(0, 0, 256, 256);

  for (let row = 0; row < 8; row++) {
    const y = row * 32;
    const offset = row % 2 === 0 ? 0 : 28;
    for (let col = -1; col < 5; col++) {
      const x = col * 64 + offset;
      const v = 78 + ((row * 17 + col * 31) & 23);
      ctx.fillStyle = `rgb(${v + 12}, ${v + 4}, ${v - 6})`;
      ctx.fillRect(x + 2, y + 2, 60, 28);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}
