import * as THREE from "three";

export function deterministicNoise(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function createRadialGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.38)");
  grad.addColorStop(0.65, "rgba(255,255,255,0.08)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export function createGlowSprite(
  glowTexture: THREE.Texture,
  color: number,
  scale: number,
  opacity = 0.85
): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture,
    color,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    opacity,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

export function createLabelSprite(
  text: string,
  hexColor: string,
  size: number,
  subtitle?: string
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 560;
  canvas.height = subtitle ? 136 : 96;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
  ctx.shadowBlur = 14;

  ctx.font = '600 40px "Inter", system-ui, -apple-system, sans-serif';
  ctx.fillStyle = hexColor;
  ctx.fillText(text, canvas.width / 2, subtitle ? 44 : 48, 520);

  if (subtitle) {
    ctx.font = '500 22px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = "rgba(210, 224, 244, 0.88)";
    ctx.fillText(subtitle, canvas.width / 2, 98, 520);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  const ratio = canvas.width / canvas.height;
  const adjustedSize = subtitle ? size * 1.25 : size;
  sprite.scale.set(adjustedSize * ratio, adjustedSize, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export function createWindowTexture(color: number, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, 64, 128);

  const hex = "#" + new THREE.Color(color).getHexString();
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 6; c++) {
      const v = deterministicNoise(seed * 31 + r * 7 + c * 13);
      if (v > 0.38) {
        ctx.globalAlpha = 0.35 + 0.65 * deterministicNoise(v * 99);
        ctx.fillStyle = v > 0.93 ? "#fff3cf" : hex;
        ctx.fillRect(4 + c * 10, 3 + r * 8, 6, 4);
      }
    }
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createFacadeMaterial(
  color: number,
  height: number,
  seed: number,
  emissiveIntensity = 0.9
): THREE.MeshStandardMaterial {
  const tex = createWindowTexture(color, seed);
  tex.repeat.set(1, Math.max(1, height / 2));
  return new THREE.MeshStandardMaterial({
    color: 0x0a1226,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity,
    metalness: 0.48,
    roughness: 0.34,
    transparent: true,
  });
}

export function createStandardMaterial(
  color: number,
  emissive: number,
  emissiveIntensity: number
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    metalness: 0.35,
    roughness: 0.42,
    transparent: true,
    flatShading: true,
  });
}

export function createEdgesMesh(
  geometry: THREE.BufferGeometry,
  color: number,
  opacity: number
): THREE.LineSegments {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
    })
  );
}
