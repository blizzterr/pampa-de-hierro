import * as THREE from 'three';
import { EVOLUTIONS } from '../data/lore';
import { createContactShadowTexture, createGuardaPampaTexture } from './textures';

let sharedShadowTex: THREE.CanvasTexture | null = null;

function getShadowTex(): THREE.CanvasTexture {
  if (!sharedShadowTex) {
    sharedShadowTex = createContactShadowTexture();
  }
  return sharedShadowTex;
}

export function createContactShadow(radius: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  const mat = new THREE.MeshBasicMaterial({
    map: getShadowTex(),
    transparent: true,
    depthWrite: false,
    opacity: 0.62,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  return mesh;
}

export interface HeroRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  weaponPivot: THREE.Group;
  offhandPivot: THREE.Group;
  ponchoMesh: THREE.Mesh;
  bladeMesh: THREE.Mesh;
  bladeMat: THREE.MeshStandardMaterial;
  wingsGroup: THREE.Group;
  auraRing: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  updateAppearance: (evolutionTier: number, weaponUpgrade: number, armorUpgrade: number) => void;
}

/**
 * Composite 12-part procedural Argentine Medieval Hero (El Caudillo Errante)
 * Grounded bottom-center at y = 0.
 */
export function buildHeroModel(maxAnisotropy = 4): HeroRig {
  const root = new THREE.Group();
  root.add(createContactShadow(1.15));

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const bootMat = new THREE.MeshStandardMaterial({ color: 0x2a1d15, roughness: 0.78, metalness: 0.1 });
  const bombachaMat = new THREE.MeshStandardMaterial({ color: 0x353b45, roughness: 0.85, metalness: 0.05 });
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x7b8794, roughness: 0.32, metalness: 0.85 });
  const silverMat = new THREE.MeshStandardMaterial({ color: 0xdbe3ec, roughness: 0.2, metalness: 0.94 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a684, roughness: 0.65, metalness: 0.05 });
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x26201c, roughness: 0.72, metalness: 0.18 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xe5b344, roughness: 0.24, metalness: 0.92 });

  // 1 & 2. Legs + Potro Boots with steel greaves
  const legGeo = new THREE.CylinderGeometry(0.16, 0.13, 0.88, 10);
  const leftLeg = new THREE.Mesh(legGeo, bombachaMat);
  leftLeg.position.set(-0.22, 0.44, 0);
  leftLeg.castShadow = true;
  const leftBoot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.42, 10), bootMat);
  leftBoot.position.set(0, -0.23, 0.03);
  leftLeg.add(leftBoot);
  bodyGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, bombachaMat);
  rightLeg.position.set(0.22, 0.44, 0);
  rightLeg.castShadow = true;
  const rightBoot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.42, 10), bootMat);
  rightBoot.position.set(0, -0.23, 0.03);
  rightLeg.add(rightBoot);
  bodyGroup.add(rightLeg);

  // 3. Torso Cuirass
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.92, 12), armorMat);
  torso.position.set(0, 1.32, 0);
  torso.castShadow = true;
  bodyGroup.add(torso);

  // 4. Argentine Rastra Belt (Silver coin belt)
  const rastra = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 8, 18), silverMat);
  rastra.rotation.x = Math.PI / 2;
  rastra.position.set(0, 0.96, 0);
  bodyGroup.add(rastra);

  const buckle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 12), goldTrimMat);
  buckle.rotation.x = Math.PI / 2;
  buckle.position.set(0, 0.96, 0.4);
  bodyGroup.add(buckle);

  // 5. Woven Pampa Poncho (Lathe draped cape with Guarda Pampa canvas texture)
  const ponchoPoints = [
    new THREE.Vector2(0.28, 0.62),
    new THREE.Vector2(0.56, 0.48),
    new THREE.Vector2(0.7, 0.18),
    new THREE.Vector2(0.76, -0.15),
  ];
  const ponchoGeo = new THREE.LatheGeometry(ponchoPoints, 20);
  const ponchoMat = new THREE.MeshStandardMaterial({
    map: createGuardaPampaTexture('#8c422c', '#e6dac5', '#2a221d', maxAnisotropy),
    roughness: 0.82,
    metalness: 0.06,
    side: THREE.DoubleSide,
  });
  const ponchoMesh = new THREE.Mesh(ponchoGeo, ponchoMat);
  ponchoMesh.position.set(0, 1.24, 0);
  ponchoMesh.castShadow = true;
  bodyGroup.add(ponchoMesh);

  // 6. Head + Forged Gaucho Chambergo / Helm
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 14), skinMat);
  head.position.set(0, 2.02, 0);
  head.castShadow = true;
  bodyGroup.add(head);

  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.05, 18), hatMat);
  hatBrim.position.set(0, 2.18, 0);
  hatBrim.rotation.x = -0.08;
  hatBrim.castShadow = true;
  bodyGroup.add(hatBrim);

  const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.28, 14), hatMat);
  hatCrown.position.set(0, 2.33, 0);
  bodyGroup.add(hatCrown);

  const hatBand = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.032, 8, 18), goldTrimMat);
  hatBand.rotation.x = Math.PI / 2;
  hatBand.position.set(0, 2.22, 0);
  bodyGroup.add(hatBand);

  // 7. Right Weapon Arm + Facón / Lanza / Sable with MU-Online Upgrade Glow
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0.52, 1.54, 0.08);
  bodyGroup.add(weaponPivot);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.44, 8), goldTrimMat);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, -0.1, 0.22);
  weaponPivot.add(handle);

  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.08), silverMat);
  guard.position.set(0, -0.1, 0.44);
  weaponPivot.add(guard);

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xdbe7f5,
    roughness: 0.16,
    metalness: 0.96,
    emissive: new THREE.Color(0x4ea8de),
    emissiveIntensity: 0.28,
  });
  const bladeGeo = new THREE.BoxGeometry(0.08, 0.14, 1.65);
  const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
  bladeMesh.position.set(0, -0.1, 1.28);
  bladeMesh.castShadow = true;
  weaponPivot.add(bladeMesh);

  // 8. Left Offhand (Runic Boleadoras / Sol de Mayo Shield)
  const offhandPivot = new THREE.Group();
  offhandPivot.position.set(-0.56, 1.42, 0.12);
  bodyGroup.add(offhandPivot);

  const shieldDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 16), silverMat);
  shieldDisc.rotation.z = Math.PI / 2;
  shieldDisc.castShadow = true;
  offhandPivot.add(shieldDisc);

  const shieldSun = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 12), goldTrimMat);
  shieldSun.rotation.z = Math.PI / 2;
  offhandPivot.add(shieldSun);

  // 9. MU Online Evolution Wings (Radiant Sol de Mayo Plumes, visible at Evolution >= 2)
  const wingsGroup = new THREE.Group();
  wingsGroup.position.set(0, 1.62, -0.36);
  wingsGroup.visible = false;
  bodyGroup.add(wingsGroup);

  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(0.95, 0.85, 1.7, 0.55);
  wingShape.quadraticCurveTo(1.25, -0.1, 1.45, -0.45);
  wingShape.quadraticCurveTo(0.65, -0.4, 0, -0.2);
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x62c5ff,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.7,
    transparent: true,
    opacity: 0.88,
  });
  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.rotation.y = -0.32;
  wingsGroup.add(rightWing);

  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.scale.x = -1;
  leftWing.rotation.y = 0.32;
  wingsGroup.add(leftWing);

  // 10. Ground Evolution Aura Ring
  const auraRing = new THREE.Mesh(
    new THREE.RingGeometry(0.92, 1.12, 32),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.05;
  root.add(auraRing);

  const updateAppearance = (evolutionTier: number, weaponUpgrade: number, armorUpgrade: number) => {
    const evo = EVOLUTIONS[Math.min(EVOLUTIONS.length - 1, Math.max(0, evolutionTier))];
    const oldMap = ponchoMat.map;
    ponchoMat.map = createGuardaPampaTexture(
      evo.ponchoColors[0],
      evo.ponchoColors[1],
      evo.ponchoColors[2],
      maxAnisotropy
    );
    ponchoMat.needsUpdate = true;
    oldMap?.dispose();

    // Scale weapon length & emissive MU-Online +0..+15 glow
    const upgradeRatio = Math.min(1, weaponUpgrade / 15);
    bladeMesh.scale.set(1 + evolutionTier * 0.14, 1 + evolutionTier * 0.1, 1 + evolutionTier * 0.22);
    bladeMat.emissive.setHex(weaponUpgrade >= 9 ? 0xffc845 : evo.bladeGlow);
    bladeMat.emissiveIntensity = 0.18 + upgradeRatio * 1.65;

    // Armor luster scales with upgrade
    armorMat.color.setHex(evolutionTier >= 3 ? 0xe6c15a : evolutionTier >= 2 ? 0xb4cde0 : 0x7b8794);
    armorMat.emissive.setHex(armorUpgrade >= 7 ? 0x3878a8 : 0x000000);
    armorMat.emissiveIntensity = armorUpgrade >= 7 ? 0.15 + (armorUpgrade - 6) * 0.06 : 0;

    wingsGroup.visible = evo.hasWings;
    wingMat.color.setHex(evolutionTier >= 3 ? 0xffd15c : 0x62c5ff);
    wingMat.emissive.setHex(evolutionTier >= 3 ? 0xf59e0b : 0x38bdf8);

    const auraMat = auraRing.material as THREE.MeshBasicMaterial;
    auraMat.color.setHex(evo.bladeGlow);
    auraMat.opacity = 0.24 + evolutionTier * 0.14 + upgradeRatio * 0.15;
  };

  return {
    root,
    bodyGroup,
    weaponPivot,
    offhandPivot,
    ponchoMesh,
    bladeMesh,
    bladeMat,
    wingsGroup,
    auraRing,
    leftLeg,
    rightLeg,
    updateAppearance,
  };
}

export type EnemyArchetype = 'lobizon' | 'luz_mala' | 'golem' | 'pvp_rival';

export function buildEnemyModel(archetype: EnemyArchetype, isBoss = false): THREE.Group {
  const group = new THREE.Group();
  const scale = isBoss ? 1.55 : 1.0;
  group.add(createContactShadow(archetype === 'golem' || isBoss ? 1.5 : 0.95));

  const body = new THREE.Group();
  body.scale.setScalar(scale);
  group.add(body);

  if (archetype === 'lobizon') {
    const furMat = new THREE.MeshStandardMaterial({ color: 0x322b29, roughness: 0.92, metalness: 0.05 });
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x1a1514, roughness: 0.95, metalness: 0.04 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff2200, emissiveIntensity: 1.8 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 1.0, 10), furMat);
    torso.rotation.x = Math.PI / 2.6;
    torso.position.set(0, 0.95, 0);
    torso.castShadow = true;
    body.add(torso);

    const mane = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), maneMat);
    mane.position.set(0, 1.24, 0.34);
    mane.castShadow = true;
    body.add(mane);

    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 8), furMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 1.25, 0.72);
    body.add(snout);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), eyeMat);
    eyeL.position.set(-0.14, 1.34, 0.62);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.14;
    body.add(eyeL, eyeR);

    for (const [lx, lz] of [
      [-0.25, 0.32],
      [0.25, 0.32],
      [-0.25, -0.35],
      [0.25, -0.35],
    ]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.75, 8), furMat);
      leg.position.set(lx, 0.38, lz);
      leg.castShadow = true;
      body.add(leg);
    }
  } else if (archetype === 'luz_mala') {
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x26323d, roughness: 0.35, metalness: 0.88 });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x5ffbf1,
      emissive: 0x1be7db,
      emissiveIntensity: 2.0,
      roughness: 0.15,
    });
    const wispMat = new THREE.MeshStandardMaterial({
      color: 0x8ef9f3,
      emissive: 0x38d3c9,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.75,
    });

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 1), coreMat);
    core.position.set(0, 1.45, 0);
    body.add(core);

    const cageTop = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.38, 6), ironMat);
    cageTop.position.set(0, 1.98, 0);
    body.add(cageTop);

    const cageBot = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.42, 6), ironMat);
    cageBot.rotation.x = Math.PI;
    cageBot.position.set(0, 0.94, 0);
    body.add(cageBot);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 8, 22), wispMat);
    ring.rotation.x = Math.PI / 2.4;
    ring.position.set(0, 1.45, 0);
    body.add(ring);
  } else if (archetype === 'golem') {
    const rockMat = new THREE.MeshStandardMaterial({ color: isBoss ? 0x27364f : 0x5d4438, roughness: 0.88, metalness: 0.14 });
    const runeMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0x56c8ff : 0xf59e0b,
      emissive: isBoss ? 0x2b9cf0 : 0xd97706,
      emissiveIntensity: 1.7,
    });

    const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), rockMat);
    torso.position.set(0, 1.48, 0);
    torso.castShadow = true;
    body.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.44), rockMat);
    head.position.set(0, 2.25, 0.08);
    head.castShadow = true;
    body.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.08), runeMat);
    visor.position.set(0, 2.26, 0.3);
    body.add(visor);

    const runeCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), runeMat);
    runeCore.position.set(0, 1.5, 0.64);
    body.add(runeCore);

    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.15, 0.34), rockMat);
      arm.position.set(side * 0.92, 1.28, 0.1);
      arm.castShadow = true;
      body.add(arm);

      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.82, 0.4), rockMat);
      leg.position.set(side * 0.38, 0.41, 0);
      leg.castShadow = true;
      body.add(leg);
    }
  } else {
    // PvP Clan Rival Champion (armored gaucho in crimson/obsidian)
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x3d242a, roughness: 0.36, metalness: 0.82 });
    const capeMat = new THREE.MeshStandardMaterial({ color: 0x9e1b24, roughness: 0.8, metalness: 0.08, side: THREE.DoubleSide });
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffd0d0, emissive: 0xef4444, emissiveIntensity: 1.2, metalness: 0.95, roughness: 0.18 });
    const helmMat = new THREE.MeshStandardMaterial({ color: 0x201d21, roughness: 0.4, metalness: 0.78 });

    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.9, 10), helmMat);
    legs.position.y = 0.45;
    legs.castShadow = true;
    body.add(legs);

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.36, 0.95, 12), armorMat);
    chest.position.y = 1.35;
    chest.castShadow = true;
    body.add(chest);

    const cape = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.05, 14, 1, true), capeMat);
    cape.position.y = 1.48;
    cape.castShadow = true;
    body.add(cape);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), helmMat);
    head.position.y = 2.08;
    body.add(head);

    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 0.06, 16), helmMat);
    brim.position.y = 2.24;
    body.add(brim);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 1.9), bladeMat);
    blade.position.set(0.56, 1.38, 0.95);
    blade.castShadow = true;
    body.add(blade);
  }

  return group;
}

/**
 * Argentine Ombú Tree (composite gnarled trunk + roots + multi-lobe canopy, grounded at y=0)
 */
export function buildOmbuTree(tintHex = 0x3b5c30): THREE.Group {
  const tree = new THREE.Group();
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x574435, roughness: 0.92, metalness: 0.02 });
  const leafMat = new THREE.MeshStandardMaterial({ color: tintHex, roughness: 0.82, metalness: 0.04 });

  // Broad flared Ombú base & trunk
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 1.15, 2.5, 10), barkMat);
  trunk.position.y = 1.25;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  // Exposed surface roots
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + 0.3;
    const rootMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, 1.6, 7), barkMat);
    rootMesh.position.set(Math.cos(ang) * 0.85, 0.25, Math.sin(ang) * 0.85);
    rootMesh.rotation.z = Math.cos(ang) * 1.15;
    rootMesh.rotation.x = -Math.sin(ang) * 1.15;
    tree.add(rootMesh);
  }

  // Wide multi-lobe Ombú umbrella canopy
  const lobes: Array<[number, number, number, number]> = [
    [0, 3.25, 0, 1.95],
    [1.25, 2.85, 0.55, 1.35],
    [-1.2, 2.9, -0.45, 1.4],
    [0.35, 2.95, -1.25, 1.3],
    [-0.55, 2.8, 1.18, 1.25],
  ];
  for (const [x, y, z, r] of lobes) {
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), leafMat);
    crown.scale.y = 0.65;
    crown.position.set(x, y, z);
    crown.castShadow = true;
    crown.receiveShadow = true;
    tree.add(crown);
  }

  return tree;
}

/**
 * Central Argentine Fogón (Stone hearth ring + logs + glowing embers + iron pava kettle)
 */
export function buildFogonHearth(): { group: THREE.Group; flame: THREE.Mesh; light: THREE.PointLight } {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x625a52, roughness: 0.9, metalness: 0.08 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.92 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.38, metalness: 0.85 });

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), stoneMat);
    rock.scale.y = 0.65;
    rock.position.set(Math.cos(a) * 1.15, 0.2, Math.sin(a) * 1.15);
    rock.castShadow = true;
    group.add(rock);
  }

  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.25, 7), woodMat);
    log.rotation.z = Math.PI / 2.2;
    log.rotation.y = (i / 4) * Math.PI;
    log.position.y = 0.26;
    group.add(log);
  }

  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xffb732,
    emissive: 0xff6200,
    emissiveIntensity: 2.4,
    roughness: 0.2,
  });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.05, 8), flameMat);
  flame.position.y = 0.65;
  group.add(flame);

  // Iron kettle (Pava para el mate) beside the fire
  const pava = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.32, 10), ironMat);
  pava.position.set(0.65, 0.22, 0.38);
  group.add(pava);

  const light = new THREE.PointLight(0xff8a2b, 4.5, 16, 1.8);
  light.position.set(0, 1.6, 0);
  group.add(light);

  return { group, flame, light };
}

/**
 * Glowing Stone Portal Archway to travel between Argentine regions
 */
export function buildPortalArch(accentHex: string): { group: THREE.Group; ring: THREE.Mesh } {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4f5561, roughness: 0.85, metalness: 0.16 });
  const runicMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });

  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.8, 0.65), stoneMat);
  leftPillar.position.set(-1.5, 1.9, 0);
  leftPillar.castShadow = true;
  const rightPillar = leftPillar.clone();
  rightPillar.position.x = 1.5;

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.7, 0.85), stoneMat);
  lintel.position.set(0, 4.0, 0);
  lintel.castShadow = true;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.12, 10, 28), runicMat);
  ring.position.set(0, 2.05, 0);

  const vortex = new THREE.Mesh(
    new THREE.CircleGeometry(1.05, 24),
    new THREE.MeshBasicMaterial({ color: accentHex, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
  );
  vortex.position.set(0, 2.05, 0);

  group.add(leftPillar, rightPillar, lintel, ring, vortex);
  return { group, ring };
}

/**
 * Medieval Argentine Pulpería / Stone Watchtower landmark (grounded at y=0)
 */
export function buildFortTower(stoneTex: THREE.CanvasTexture): THREE.Group {
  const tower = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.86, metalness: 0.08 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x7c3424, roughness: 0.78, metalness: 0.06 });
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0x3b96d4, roughness: 0.7, side: THREE.DoubleSide });

  const base = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.6, 4.4), wallMat);
  base.position.y = 1.8;
  base.castShadow = true;
  base.receiveShadow = true;
  tower.add(base);

  const parapet = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.55, 4.9), wallMat);
  parapet.position.y = 3.85;
  parapet.castShadow = true;
  tower.add(parapet);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.45, 2.2, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 5.2;
  roof.castShadow = true;
  tower.add(roof);

  // Argentine Celeste Banner hanging down front
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.1), bannerMat);
  banner.position.set(0, 2.2, 2.24);
  tower.add(banner);

  return tower;
}
