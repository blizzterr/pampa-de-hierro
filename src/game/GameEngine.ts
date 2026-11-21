import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EVOLUTIONS, MAPS, SKILLS } from '../data/lore';
import type {
  CombatSnapshot,
  FloatingCombatText,
  GraphicsSettings,
  HeroState,
  MapId,
  RadarEntity,
  ServerConfig,
} from '../types/game';
import { audioEngine } from './audio';
import {
  buildEnemyModel,
  buildFogonHearth,
  buildFortTower,
  buildHeroModel,
  buildOmbuTree,
  buildPortalArch,
  type EnemyArchetype,
  type HeroRig,
} from './models';
import { createStoneWallTexture, createTerrainTexture } from './textures';

export interface EngineCallbacks {
  onSnapshot: (snap: CombatSnapshot) => void;
  onFloatingText: (item: FloatingCombatText) => void;
  onEnemyKilled: (info: {
    xp: number;
    silver: number;
    jewelDrop: boolean;
    isLobizon: boolean;
    comboMultiplier: number;
  }) => void;
  onDungeonWaveCleared: (wave: number) => void;
  onPvpVictory: (opponentName: string) => void;
  onHeroDefeated: () => void;
  onPortalInteract: () => void;
}

interface ActiveEnemy {
  id: string;
  name: string;
  archetype: EnemyArchetype;
  isBoss: boolean;
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  windupTimer: number;
  isWindingUp: boolean;
  hitFlashTimer: number;
  telegraphRing: THREE.Mesh;
  homePos: THREE.Vector3;
}

interface ActiveAlly {
  id: string;
  name: string;
  guildTag: string;
  mesh: THREE.Group;
  voiceRing: THREE.Mesh;
  speakPhase: number;
}

interface ActiveVfx {
  mesh: THREE.Object3D;
  age: number;
  maxAge: number;
  onUpdate: (t: number, dt: number) => void;
}

interface PooledParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  active: boolean;
}

// Reusable module-scope math objects (zero GC in loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3Proj = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();
const _colorTmp = new THREE.Color();

export class PampaGameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private worldGroup: THREE.Group;
  private vfxGroup: THREE.Group;
  private heroRig: HeroRig;
  private clickMarker: THREE.Mesh;
  private groundPlane: THREE.Mesh | null = null;
  private fogonFlame: THREE.Mesh | null = null;
  private fogonLight: THREE.PointLight | null = null;
  private portalRing: THREE.Mesh | null = null;
  private portalPos = new THREE.Vector3(0, 0, -24);

  private enemies: ActiveEnemy[] = [];
  private allies: ActiveAlly[] = [];
  private vfxList: ActiveVfx[] = [];
  private particles: PooledParticle[] = [];

  private callbacks: EngineCallbacks;
  private heroState: HeroState;
  private serverConfig: ServerConfig;
  private graphics: GraphicsSettings;
  private currentMap: MapId = 'lorencia_sur';

  private isTitleMode = true;
  private isPaused = false;
  private isDisposed = false;
  private frameId = 0;
  private lastFrameTs = 0;
  private lastRenderTs = 0;
  private fpsSamples: number[] = [];
  private reportedFps = 60;
  private snapshotAccum = 0;
  private elapsed = 0;
  private nextFloatId = 1;

  // Player kinematic & combat state
  private playerPos = new THREE.Vector3(0, 0, 5);
  private playerYaw = Math.PI;
  private moveTarget: THREE.Vector3 | null = null;
  private heldKeys = new Set<string>();
  private hp = 260;
  private maxHp = 260;
  private mp = 150;
  private maxMp = 150;
  private stamina = 100;
  private maxStamina = 100;
  private dashTimer = 0;
  private dashDir = new THREE.Vector3();
  private dashCooldown = 0;
  private mateCooldown = 0;
  private skillCooldowns: [number, number, number, number] = [0, 0, 0, 0];
  private swingAnimTimer = 0;
  private spinAnimTimer = 0;
  private hitstopTimer = 0;
  private shakeIntensity = 0;
  private cameraZoom = 1.0;

  // MU Online Combo state
  private comboCount = 0;
  private comboMultiplier = 1;
  private comboTimer = 0;
  private readonly comboWindow = 3.2;
  private comboChainStep = 0; // 1 = Facon, 2 = Boleadoras, 3 = Lanza -> DETONATE!

  // Dungeon & PvP state
  private dungeonWave = 1;
  private respawnTimer = 0;
  private voiceCueTimer = 0;

  // Raycaster for click-to-move
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();

  constructor(
    container: HTMLElement,
    initialHero: HeroState,
    serverConfig: ServerConfig,
    graphics: GraphicsSettings,
    isSoftwareGl: boolean,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.heroState = initialHero;
    this.serverConfig = serverConfig;
    this.graphics = graphics;
    this.isSoftwareGl = isSoftwareGl;
    this.callbacks = callbacks;

    this.recalcVitals(true);

    // 1. Renderer setup following Three.js studio PBR & Software-WebGL guard
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && graphics.antialiasing,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(graphics.pixelRatio, 2));
    this.renderer.shadowMap.enabled = !isSoftwareGl && graphics.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

    // 2. Scene & Mandatory Studio RoomEnvironment IBL
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 3. Isometric-style narrow FOV PerspectiveCamera
    const aspect = (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(34, aspect, 0.5, 220);
    this.camera.position.set(19, 23, 19);
    this.camera.lookAt(0, 1, 0);

    // 4. Warm/Cool 3-Point Rig
    this.hemiLight = new THREE.HemisphereLight(0x89bce0, 0x4e3c29, 0.85);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffdeb0, 2.3);
    this.keyLight.position.set(22, 34, 18);
    this.keyLight.castShadow = !isSoftwareGl && graphics.shadowsEnabled;
    this.keyLight.shadow.mapSize.set(isSoftwareGl ? 512 : 1024, isSoftwareGl ? 512 : 1024);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 90;
    const d = 28;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    const rimLight = new THREE.DirectionalLight(0x7cc8ff, 0.65);
    rimLight.position.set(-20, 14, -18);
    this.scene.add(rimLight);

    // 5. World, VFX & Particle Pools
    this.worldGroup = new THREE.Group();
    this.vfxGroup = new THREE.Group();
    this.scene.add(this.worldGroup);
    this.scene.add(this.vfxGroup);

    // 6. Hero Rig
    this.heroRig = buildHeroModel(this.maxAnisotropy);
    this.heroRig.updateAppearance(initialHero.evolutionTier, initialHero.weaponUpgrade, initialHero.armorUpgrade);
    this.heroRig.root.position.copy(this.playerPos);
    this.scene.add(this.heroRig.root);

    // 7. Click-to-move ground marker
    this.clickMarker = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.68, 24),
      new THREE.MeshBasicMaterial({ color: 0xf5c542, side: THREE.DoubleSide, transparent: true, opacity: 0.0, depthWrite: false })
    );
    this.clickMarker.rotation.x = -Math.PI / 2;
    this.clickMarker.position.y = 0.06;
    this.scene.add(this.clickMarker);

    // 8. Pre-allocate particle pool (no runtime GC)
    const pGeo = new THREE.OctahedronGeometry(0.16, 0);
    for (let i = 0; i < 90; i++) {
      const pMat = new THREE.MeshBasicMaterial({ color: 0xffc845, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 0.5,
        active: false,
      });
    }

    // Build initial Argentine medieval region
    this.loadMap('lorencia_sur');

    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind events
    this.bindEvents();

    // Start loop
    this.lastFrameTs = performance.now();
    this.lastRenderTs = this.lastFrameTs;
    this.scheduleNextFrame();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: true });
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
  }

  private onContextLost = (e: Event) => {
    e.preventDefault();
  };

  private onResize = () => {
    if (this.isDisposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onBlur = () => {
    this.heldKeys.clear();
  };

  private onWheel = (e: WheelEvent) => {
    if (this.isTitleMode || this.isPaused) return;
    this.cameraZoom = THREE.MathUtils.clamp(this.cameraZoom + e.deltaY * 0.0007, 0.72, 1.38);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.isTitleMode || this.isPaused) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
      return;
    }

    const code = e.code;
    this.heldKeys.add(code);

    if (e.repeat) return;
    if (code === 'Digit1') this.triggerSkill(0);
    else if (code === 'Digit2' || code === 'KeyQ') this.triggerSkill(1);
    else if (code === 'Digit3' || code === 'KeyE') this.triggerSkill(2);
    else if (code === 'Digit4' || code === 'KeyR') this.triggerSkill(3);
    else if (code === 'Space') {
      e.preventDefault();
      this.triggerDash();
    } else if (code === 'KeyF') {
      this.triggerMateHeal();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.isTitleMode || this.isPaused || e.button !== 0 || !this.groundPlane) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    // Check if clicked near an enemy -> face and cast basic slash immediately
    const hits = this.raycaster.intersectObject(this.groundPlane);
    if (hits.length > 0) {
      const pt = hits[0].point;
      // Check portal click
      if (pt.distanceTo(this.portalPos) < 2.8) {
        this.callbacks.onPortalInteract();
        return;
      }

      // Check enemy click
      let clickedEnemy: ActiveEnemy | null = null;
      let bestDist = 2.6;
      for (const en of this.enemies) {
        const d = en.mesh.position.distanceTo(pt);
        if (d < bestDist) {
          bestDist = d;
          clickedEnemy = en;
        }
      }

      if (clickedEnemy) {
        this.facePoint(clickedEnemy.mesh.position);
        if (this.playerPos.distanceTo(clickedEnemy.mesh.position) <= SKILLS[0].range + 0.8) {
          this.triggerSkill(0);
          this.moveTarget = null;
          return;
        }
      }

      const clampedX = THREE.MathUtils.clamp(pt.x, -30, 30);
      const clampedZ = THREE.MathUtils.clamp(pt.z, -30, 30);
      this.moveTarget = new THREE.Vector3(clampedX, 0, clampedZ);
      this.clickMarker.position.set(clampedX, 0.06, clampedZ);
      (this.clickMarker.material as THREE.MeshBasicMaterial).opacity = 0.85;
      this.clickMarker.scale.setScalar(1.0);
    }
  };

  public setTitleMode(val: boolean): void {
    this.isTitleMode = val;
    if (!val) {
      this.heldKeys.clear();
    }
  }

  public setPaused(val: boolean): void {
    this.isPaused = val;
    if (val) {
      this.heldKeys.clear();
    }
  }

  public syncHeroState(hero: HeroState): void {
    const prevTier = this.heroState.evolutionTier;
    const prevWep = this.heroState.weaponUpgrade;
    const prevArm = this.heroState.armorUpgrade;
    this.heroState = hero;
    this.recalcVitals(false);
    if (prevTier !== hero.evolutionTier || prevWep !== hero.weaponUpgrade || prevArm !== hero.armorUpgrade) {
      this.heroRig.updateAppearance(hero.evolutionTier, hero.weaponUpgrade, hero.armorUpgrade);
      this.spawnBurst(this.playerPos, 0xffd75e, 18, 5.5);
    }
  }

  public syncServerConfig(cfg: ServerConfig): void {
    this.serverConfig = cfg;
  }

  public applyGraphics(settings: GraphicsSettings): void {
    this.graphics = settings;
    const pr = this.isSoftwareGl ? 1 : Math.min(settings.pixelRatio, 2);
    this.renderer.setPixelRatio(pr);
    const shadows = !this.isSoftwareGl && settings.shadowsEnabled;
    this.renderer.shadowMap.enabled = shadows;
    this.keyLight.castShadow = shadows;
  }

  private recalcVitals(fill: boolean): void {
    const evo = EVOLUTIONS[Math.min(EVOLUTIONS.length - 1, this.heroState.evolutionTier)];
    this.maxHp = Math.round(
      (210 + this.heroState.stats.vitalidad * 6 + this.heroState.level * 14 + this.heroState.resets * 80) *
        (1 + evo.bonusDefensePct / 220)
    );
    this.maxMp = Math.round(120 + this.heroState.stats.energia * 5 + this.heroState.level * 7);
    if (fill) {
      this.hp = this.maxHp;
      this.mp = this.maxMp;
      this.stamina = this.maxStamina;
    } else {
      this.hp = Math.min(this.maxHp, this.hp);
      this.mp = Math.min(this.maxMp, this.mp);
    }
  }

  private clearWorld(): void {
    // Clear dynamic enemies & allies & props
    for (const en of this.enemies) {
      this.scene.remove(en.mesh);
      this.scene.remove(en.telegraphRing);
    }
    this.enemies = [];

    for (const ally of this.allies) {
      this.scene.remove(ally.mesh);
    }
    this.allies = [];

    while (this.worldGroup.children.length > 0) {
      const child = this.worldGroup.children[0];
      this.worldGroup.remove(child);
    }
    this.fogonFlame = null;
    this.fogonLight = null;
    this.portalRing = null;
  }

  public loadMap(mapId: MapId): void {
    this.currentMap = mapId;
    const def = MAPS[mapId];
    this.clearWorld();

    // Update sky, horizon-matched fog, and lighting
    this.scene.background = new THREE.Color(def.skyColor);
    this.scene.fog = new THREE.FogExp2(def.fogColor, def.fogDensity);
    this.keyLight.color.setHex(def.sunColor);
    this.keyLight.intensity = def.sunIntensity;
    this.hemiLight.color.setHex(def.hemiSky);
    this.hemiLight.groundColor.setHex(def.hemiGround);

    // Extended outdoor terrain (150x150) so no rectangular wall floats in an empty void
    const terrainTex = createTerrainTexture(
      def.groundPrimary,
      def.groundSecondary,
      def.accentColor,
      def.mode,
      this.maxAnisotropy
    );
    const groundGeo = new THREE.PlaneGeometry(150, 150);
    const groundMat = new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.92,
      metalness: 0.04,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.groundPlane = ground;
    this.worldGroup.add(ground);

    // Subtle Arena / Plaza stone medallion ring in center (offset y=0.02 to prevent Z-fighting)
    const plazaRing = new THREE.Mesh(
      new THREE.RingGeometry(def.mode === 'PVP_ARENA' ? 14 : 6.2, def.mode === 'PVP_ARENA' ? 15.6 : 7.0, 48),
      new THREE.MeshStandardMaterial({
        color: def.accentColor,
        roughness: 0.55,
        metalness: 0.35,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    plazaRing.rotation.x = -Math.PI / 2;
    plazaRing.position.y = 0.025;
    this.worldGroup.add(plazaRing);

    // Central Argentine Fogón hearth (in Open World maps)
    if (def.mode === 'OPEN_WORLD') {
      const fogon = buildFogonHearth();
      fogon.group.position.set(0, 0, 0);
      this.worldGroup.add(fogon.group);
      this.fogonFlame = fogon.flame;
      this.fogonLight = fogon.light;
    }

    // Portal archway at North edge
    this.portalPos.set(0, 0, -22);
    const portal = buildPortalArch(def.accentColor);
    portal.group.position.copy(this.portalPos);
    this.worldGroup.add(portal.group);
    this.portalRing = portal.ring;

    // Landmarks & natural perimeter barriers (Ombú groves, Fort towers, Andean outcrops)
    const stoneTex = createStoneWallTexture(this.maxAnisotropy);
    if (mapId === 'lorencia_sur') {
      const towerL = buildFortTower(stoneTex);
      towerL.position.set(-14, 0, -14);
      const towerR = buildFortTower(stoneTex);
      towerR.position.set(14, 0, -14);
      this.worldGroup.add(towerL, towerR);
    }

    if (def.mode === 'PVP_ARENA') {
      // Ceremonial stone pillars around Coliseo de Mayo
      const pillarMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.78, metalness: 0.15 });
      const bannerMat = new THREE.MeshStandardMaterial({ color: 0x3b96d4, roughness: 0.6, side: THREE.DoubleSide });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r = 17.5;
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 5.2, 10), pillarMat);
        pillar.position.set(Math.cos(a) * r, 2.6, Math.sin(a) * r);
        pillar.castShadow = true;
        this.worldGroup.add(pillar);

        if (i % 2 === 0) {
          const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.5), bannerMat);
          banner.position.set(Math.cos(a) * (r - 0.8), 3.1, Math.sin(a) * (r - 0.8));
          banner.lookAt(0, 3.1, 0);
          this.worldGroup.add(banner);
        }
      }
    }

    // Perimeter Ombú trees & natural rock ring (outer boundary fades into horizon fog)
    const treeTint =
      mapId === 'esteros_luz_mala' ? 0x264d45 : mapId === 'quebrada_condor' ? 0x5c5b32 : 0x3a5f2f;
    const treeCount = def.mode === 'OPEN_WORLD' ? 18 : 8;
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2 + (i % 3) * 0.14;
      const radius = 26 + (i % 4) * 5.5;
      if (Math.abs(Math.cos(angle)) < 0.2 && Math.sin(angle) < -0.5) continue; // Keep portal lane open
      const ombu = buildOmbuTree(treeTint);
      ombu.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      const sc = 0.88 + (i % 5) * 0.1;
      ombu.scale.setScalar(sc);
      ombu.rotation.y = i * 1.7;
      this.worldGroup.add(ombu);
    }

    // Instanced scattered pampa rocks & terrain outcrops (single draw call!)
    const rockCount = 54;
    const rockGeo = new THREE.DodecahedronGeometry(0.85, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.08 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    for (let i = 0; i < rockCount; i++) {
      const ang = (i / rockCount) * Math.PI * 2 * 2.3;
      const dist = 19 + (i % 7) * 4.2;
      _dummyObj.position.set(Math.cos(ang) * dist, 0.35, Math.sin(ang) * dist);
      const s = 0.65 + (i % 4) * 0.35;
      _dummyObj.scale.set(s * 1.2, s * 0.72, s);
      _dummyObj.rotation.set((i % 3) * 0.3, i * 0.8, 0);
      _dummyObj.updateMatrix();
      rocks.setMatrixAt(i, _dummyObj.matrix);
      _colorTmp.set(def.groundSecondary).offsetHSL(0, 0, ((i % 5) - 2) * 0.035);
      rocks.setColorAt(i, _colorTmp);
    }
    rocks.instanceMatrix.needsUpdate = true;
    if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
    rocks.computeBoundingSphere();
    this.worldGroup.add(rocks);

    // Reset player position smoothly
    this.playerPos.set(0, 0, def.mode === 'PVP_ARENA' ? 9 : 6);
    this.heroRig.root.position.copy(this.playerPos);
    this.moveTarget = null;
    this.recalcVitals(true);

    // Spawn nearby clanmates (for proximity voice chat & living MMORPG world)
    if (def.mode !== 'PVP_ARENA') {
      this.spawnAllies();
    }

    // Spawn map-specific enemies
    this.dungeonWave = 1;
    this.spawnEnemiesForMap();
  }

  private spawnAllies(): void {
    const allySpecs = [
      { id: 'ally_cruz', name: 'Sargento Cruz', tag: 'SOL', pos: new THREE.Vector3(-4.2, 0, -2.5), tier: 2 },
      { id: 'ally_juana', name: 'Juana Azurduy', tag: 'SOL', pos: new THREE.Vector3(4.6, 0, -3.2), tier: 3 },
    ];
    for (const spec of allySpecs) {
      const rig = buildHeroModel(this.maxAnisotropy);
      rig.updateAppearance(spec.tier, 8, 6);
      rig.root.position.copy(spec.pos);
      rig.root.rotation.y = Math.atan2(-spec.pos.x, 2 - spec.pos.z);

      // Floating proximity voice indicator ring around feet
      const voiceRing = new THREE.Mesh(
        new THREE.RingGeometry(1.18, 1.32, 24),
        new THREE.MeshBasicMaterial({
          color: 0x34d399,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        })
      );
      voiceRing.rotation.x = -Math.PI / 2;
      voiceRing.position.y = 0.07;
      rig.root.add(voiceRing);

      this.scene.add(rig.root);
      this.allies.push({
        id: spec.id,
        name: spec.name,
        guildTag: spec.tag,
        mesh: rig.root,
        voiceRing,
        speakPhase: Math.random() * 10,
      });
    }
  }

  private spawnEnemiesForMap(): void {
    const def = MAPS[this.currentMap];
    if (def.mode === 'PVP_ARENA') {
      this.spawnEnemy('pvp_rival', 'Campeón de la Hermandad [CND]', new THREE.Vector3(0, 0, -9), true);
      return;
    }

    if (def.mode === 'DUNGEON') {
      const isBossWave = this.dungeonWave % 3 === 0;
      const count = isBossWave ? 3 : 4 + this.dungeonWave;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const r = 12 + (i % 2) * 4;
        const arch: EnemyArchetype = i % 2 === 0 ? 'golem' : 'luz_mala';
        this.spawnEnemy(arch, arch === 'golem' ? 'Gólem de Hielo' : 'Espectro Lacustre', new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), false);
      }
      if (isBossWave) {
        this.spawnEnemy('golem', 'Guardián del Nahuel (JEFE)', new THREE.Vector3(0, 0, -13), true);
      }
      return;
    }

    // Open world packs around the perimeter
    const packArch: EnemyArchetype =
      this.currentMap === 'esteros_luz_mala'
        ? 'luz_mala'
        : this.currentMap === 'quebrada_condor'
        ? 'golem'
        : 'lobizon';
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.45;
      const radius = 14 + (i % 2) * 4.5;
      const name =
        packArch === 'lobizon'
          ? 'Lobizón Salvaje'
          : packArch === 'luz_mala'
          ? 'Luz Mala Errante'
          : 'Gólem de Basalto';
      this.spawnEnemy(packArch, name, new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius), false);
    }
  }

  private spawnEnemy(archetype: EnemyArchetype, name: string, pos: THREE.Vector3, isBoss: boolean): void {
    const mesh = buildEnemyModel(archetype, isBoss);
    mesh.position.copy(pos);
    this.scene.add(mesh);

    const mapLvl = MAPS[this.currentMap].recommendedLevel;
    const waveScale = this.currentMap === 'catacumbas_nahuel' ? 1 + (this.dungeonWave - 1) * 0.25 : 1;
    const baseHp = archetype === 'golem' ? 210 : archetype === 'pvp_rival' ? 420 : archetype === 'luz_mala' ? 125 : 140;
    const maxHp = Math.round(baseHp * (1 + mapLvl * 0.14) * waveScale * (isBoss ? 2.4 : 1));

    const telegraphRing = new THREE.Mesh(
      new THREE.RingGeometry(0.4, isBoss ? 3.5 : 2.1, 28),
      new THREE.MeshBasicMaterial({
        color: 0xef4444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    telegraphRing.rotation.x = -Math.PI / 2;
    telegraphRing.position.set(pos.x, 0.05, pos.z);
    this.scene.add(telegraphRing);

    this.enemies.push({
      id: `en_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      archetype,
      isBoss,
      mesh,
      hp: maxHp,
      maxHp,
      speed: archetype === 'lobizon' ? 5.6 : archetype === 'pvp_rival' ? 6.2 : archetype === 'luz_mala' ? 4.4 : 3.2,
      damage: Math.round((14 + mapLvl * 2.2) * (isBoss ? 1.85 : 1)),
      attackRange: archetype === 'luz_mala' ? 5.6 : isBoss ? 3.4 : 2.3,
      attackCooldown: 1.2 + Math.random() * 0.6,
      windupTimer: 0,
      isWindingUp: false,
      hitFlashTimer: 0,
      telegraphRing,
      homePos: pos.clone(),
    });
  }

  private facePoint(target: THREE.Vector3): void {
    const dx = target.x - this.playerPos.x;
    const dz = target.z - this.playerPos.z;
    if (dx * dx + dz * dz > 0.001) {
      this.playerYaw = Math.atan2(dx, dz);
    }
  }

  private getBaseAttackDamage(): number {
    const evo = EVOLUTIONS[Math.min(EVOLUTIONS.length - 1, this.heroState.evolutionTier)];
    const raw =
      26 +
      this.heroState.stats.fuerza * 1.4 +
      this.heroState.weaponUpgrade * 7.5 +
      this.heroState.resets * 24;
    return raw * (1 + evo.bonusAttackPct / 100);
  }

  public triggerSkill(slot: number): void {
    if (this.isTitleMode || this.isPaused) return;
    if (slot < 0 || slot > 3) return;
    const skill = SKILLS[slot];
    if (this.skillCooldowns[slot] > 0) return;
    if (this.mp < skill.mpCost) {
      this.emitFloatText('Sin Maná', this.playerPos, 'enemy');
      return;
    }

    this.mp -= skill.mpCost;
    this.skillCooldowns[slot] = skill.cooldown;

    // Auto-face nearest enemy in range if not actively moving
    let nearest: ActiveEnemy | null = null;
    let bestD = skill.range + 4;
    for (const en of this.enemies) {
      const d = en.mesh.position.distanceTo(this.playerPos);
      if (d < bestD) {
        bestD = d;
        nearest = en;
      }
    }
    if (nearest) {
      this.facePoint(nearest.mesh.position);
    }

    // Advance MU Online Combo chain (1 -> 2 -> 3 triggers Combo Detonation!)
    let comboExplosion = false;
    if (slot === 0) {
      this.comboChainStep = 1;
      this.swingAnimTimer = 0.28;
      audioEngine.playFaconSlash();
      this.spawnSlashVfx(0xe5e7eb, 3.6);
    } else if (slot === 1) {
      this.comboChainStep = this.comboChainStep === 1 ? 2 : 1;
      this.spinAnimTimer = 0.48;
      audioEngine.playBoleadorasSpin();
      this.spawnWhirlwindVfx();
    } else if (slot === 2) {
      if (this.comboChainStep >= 2 && this.comboTimer > 0) {
        comboExplosion = true;
        this.comboChainStep = 0;
      } else {
        this.comboChainStep = 2;
      }
      this.swingAnimTimer = 0.34;
      audioEngine.playWindLance();
      this.spawnLanceWaveVfx();
    } else if (slot === 3) {
      comboExplosion = this.comboCount >= 2;
      this.swingAnimTimer = 0.45;
      audioEngine.playSolarUltimate();
      this.spawnSolarUltimateVfx();
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.7);
      this.hitstopTimer = 0.06;
    }

    // Apply damage
    const baseDmg = this.getBaseAttackDamage();
    const skillMult = slot === 0 ? 1.0 : slot === 1 ? 1.35 : slot === 2 ? 1.65 : 2.9;
    let hitsLanded = 0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i];
      const dist = en.mesh.position.distanceTo(this.playerPos);
      let inHitZone = false;

      if (slot === 1 || slot === 3 || comboExplosion) {
        inHitZone = dist <= skill.range + (comboExplosion ? 1.8 : 0);
      } else {
        if (dist <= skill.range) {
          _vec3A.subVectors(en.mesh.position, this.playerPos).normalize();
          _vec3B.set(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw));
          if (_vec3A.dot(_vec3B) > 0.15 || dist < 1.8) {
            inHitZone = true;
          }
        }
      }

      if (inHitZone) {
        hitsLanded++;
        const isCrit = Math.random() < 0.22 + this.heroState.stats.agilidad * 0.002;
        const comboBonus = 1 + (this.comboMultiplier - 1) * 0.18 + (comboExplosion ? 0.85 : 0);
        const dmg = Math.round(baseDmg * skillMult * comboBonus * (isCrit ? 1.45 : 1) * (0.92 + Math.random() * 0.16));

        this.damageEnemy(en, dmg, comboExplosion ? 'combo' : isCrit ? 'crit' : 'normal');
      }
    }

    if (hitsLanded > 0) {
      this.comboCount += hitsLanded;
      this.comboTimer = this.comboWindow;
      const cap = this.serverConfig.comboMaxMultiplier || 12;
      this.comboMultiplier = Math.min(cap, 1 + Math.floor(this.comboCount / 2));

      if (comboExplosion) {
        audioEngine.playComboExplosion(this.comboMultiplier);
        this.spawnComboRingVfx();
        this.emitFloatText(`¡COMBO CRIOLLO x${this.comboMultiplier}!`, this.playerPos, 'combo');
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.55);
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.05);
      } else {
        audioEngine.playHitImpact(slot >= 2);
        this.shakeIntensity = Math.max(this.shakeIntensity, slot >= 2 ? 0.3 : 0.14);
      }
    }
  }

  public triggerDash(): void {
    if (this.isTitleMode || this.isPaused) return;
    if (this.dashCooldown > 0 || this.stamina < 25) return;
    this.stamina -= 25;
    this.dashCooldown = 1.15;
    this.dashTimer = 0.2;
    this.dashDir.set(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw)).normalize();
    this.moveTarget = null;
    audioEngine.playDash();
    this.spawnBurst(this.playerPos, 0xd8c8a8, 10, 3.4);
  }

  public triggerMateHeal(): void {
    if (this.isTitleMode || this.isPaused) return;
    if (this.mateCooldown > 0) return;
    this.mateCooldown = 3.5;
    const healHp = Math.round(this.maxHp * 0.42);
    const healMp = Math.round(this.maxMp * 0.48);
    this.hp = Math.min(this.maxHp, this.hp + healHp);
    this.mp = Math.min(this.maxMp, this.mp + healMp);
    audioEngine.playMateHeal();
    this.emitFloatText(`+${healHp} HP · Mate`, this.playerPos, 'heal');
    this.spawnBurst(this.playerPos, 0x34d399, 14, 3.8);
  }

  private damageEnemy(en: ActiveEnemy, dmg: number, kind: 'normal' | 'crit' | 'combo'): void {
    en.hp -= dmg;
    en.hitFlashTimer = 0.12;
    // Slight knockback
    _vec3A.subVectors(en.mesh.position, this.playerPos).setY(0).normalize();
    en.mesh.position.addScaledVector(_vec3A, en.isBoss ? 0.25 : 0.65);

    this.emitFloatText(kind === 'crit' ? `${dmg}!` : `${dmg}`, en.mesh.position, kind);
    this.spawnBurst(en.mesh.position, kind === 'combo' ? 0x38bdf8 : kind === 'crit' ? 0xfbbf24 : 0xf4f1ea, 7, 4.2);

    if (en.hp <= 0) {
      const idx = this.enemies.indexOf(en);
      if (idx !== -1) this.enemies.splice(idx, 1);
      this.scene.remove(en.mesh);
      this.scene.remove(en.telegraphRing);

      this.spawnBurst(en.mesh.position, 0xfbbf24, 18, 6.2);

      const mapLvl = MAPS[this.currentMap].recommendedLevel;
      const xpGain = Math.round((34 + mapLvl * 11) * (en.isBoss ? 3.5 : 1) * this.serverConfig.xpMultiplier * (1 + (this.comboMultiplier - 1) * 0.12));
      const silverGain = Math.round((48 + mapLvl * 14) * (en.isBoss ? 4.0 : 1) * this.serverConfig.dropMultiplier * (1 + (this.comboMultiplier - 1) * 0.1));
      const jewelDrop = en.isBoss || Math.random() < 0.24 * this.serverConfig.dropMultiplier;

      this.emitFloatText(`+${xpGain} XP · +${silverGain} Plata`, en.mesh.position, 'xp');
      this.callbacks.onEnemyKilled({
        xp: xpGain,
        silver: silverGain,
        jewelDrop,
        isLobizon: en.archetype === 'lobizon',
        comboMultiplier: this.comboMultiplier,
      });

      if (this.currentMap === 'coliseo_mayo' && en.archetype === 'pvp_rival') {
        this.callbacks.onPvpVictory(en.name);
        this.respawnTimer = 4.0;
      } else if (this.currentMap === 'catacumbas_nahuel' && this.enemies.length === 0) {
        this.callbacks.onDungeonWaveCleared(this.dungeonWave);
        this.dungeonWave += 1;
        this.respawnTimer = 2.4;
      }
    }
  }

  private emitFloatText(text: string, worldPos: THREE.Vector3, kind: FloatingCombatText['kind']): void {
    _vec3Proj.copy(worldPos);
    _vec3Proj.y += 2.3;
    _vec3Proj.project(this.camera);
    const x = (_vec3Proj.x * 0.5 + 0.5) * 100;
    const y = (-_vec3Proj.y * 0.5 + 0.5) * 100;
    if (x < 2 || x > 98 || y < 2 || y > 96) return;
    this.callbacks.onFloatingText({
      id: this.nextFloatId++,
      text,
      x: x + (Math.random() - 0.5) * 3,
      y,
      kind,
    });
  }

  private spawnBurst(origin: THREE.Vector3, colorHex: number, count: number, speed: number): void {
    const budget = Math.max(2, Math.round(count * this.graphics.particleDensity));
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.age = 0;
      p.maxAge = 0.32 + Math.random() * 0.28;
      p.mesh.visible = true;
      p.mesh.position.set(origin.x, origin.y + 1.1, origin.z);
      p.mesh.scale.setScalar(1.0);
      (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
      const a = Math.random() * Math.PI * 2;
      const spd = speed * (0.4 + Math.random() * 0.7);
      p.vel.set(Math.cos(a) * spd, 2.2 + Math.random() * 3.8, Math.sin(a) * spd);
      spawned++;
      if (spawned >= budget) break;
    }
  }

  private spawnSlashVfx(colorHex: number, radius: number): void {
    const geo = new THREE.RingGeometry(radius * 0.45, radius, 18, 1, -Math.PI * 0.45, Math.PI * 0.9);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = this.playerYaw - Math.PI / 2;
    mesh.position.set(this.playerPos.x, 1.15, this.playerPos.z);
    this.vfxGroup.add(mesh);

    this.vfxList.push({
      mesh,
      age: 0,
      maxAge: 0.22,
      onUpdate: (t) => {
        mesh.scale.setScalar(0.85 + t * 0.4);
        mat.opacity = 0.85 * (1 - t);
      },
    });
  }

  private spawnWhirlwindVfx(): void {
    const grp = new THREE.Group();
    grp.position.set(this.playerPos.x, 1.1, this.playerPos.z);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 5.2, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;
    grp.add(ring);

    const orbMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), orbMat);
      orb.position.set(Math.cos(a) * 4.2, 0.15, Math.sin(a) * 4.2);
      grp.add(orb);
    }
    this.vfxGroup.add(grp);

    this.vfxList.push({
      mesh: grp,
      age: 0,
      maxAge: 0.42,
      onUpdate: (t, dt) => {
        grp.position.set(this.playerPos.x, 1.1, this.playerPos.z);
        grp.rotation.y += dt * 16;
        ringMat.opacity = 0.82 * (1 - t);
      },
    });
  }

  private spawnLanceWaveVfx(): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.75, 6.2, 12, 1, true), mat);
    cone.rotation.x = Math.PI / 2;
    const holder = new THREE.Group();
    holder.position.set(this.playerPos.x, 1.2, this.playerPos.z);
    holder.rotation.y = this.playerYaw;
    cone.position.z = 3.4;
    holder.add(cone);
    this.vfxGroup.add(holder);

    this.vfxList.push({
      mesh: holder,
      age: 0,
      maxAge: 0.34,
      onUpdate: (t) => {
        cone.position.z = 3.4 + t * 2.4;
        cone.scale.set(1 + t * 0.4, 1, 1 + t * 0.4);
        mat.opacity = 0.9 * (1 - t);
      },
    });
  }

  private spawnSolarUltimateVfx(): void {
    const grp = new THREE.Group();
    grp.position.set(this.playerPos.x, 0.1, this.playerPos.z);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffd75e,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.2, 18, 24, 1, true), beamMat);
    beam.position.y = 9;
    grp.add(beam);

    const shockMat = new THREE.MeshBasicMaterial({
      color: 0x56c8ff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const shock = new THREE.Mesh(new THREE.RingGeometry(1.0, 2.2, 36), shockMat);
    shock.rotation.x = -Math.PI / 2;
    shock.position.y = 0.12;
    grp.add(shock);

    this.vfxGroup.add(grp);
    this.vfxList.push({
      mesh: grp,
      age: 0,
      maxAge: 0.72,
      onUpdate: (t) => {
        beam.scale.set(1 - t * 0.45, 1, 1 - t * 0.45);
        beamMat.opacity = 0.78 * (1 - t);
        shock.scale.setScalar(1 + t * 4.2);
        shockMat.opacity = 0.9 * (1 - t);
      },
    });
  }

  private spawnComboRingVfx(): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.4, 36), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(this.playerPos.x, 0.25, this.playerPos.z);
    this.vfxGroup.add(ring);

    this.vfxList.push({
      mesh: ring,
      age: 0,
      maxAge: 0.45,
      onUpdate: (t) => {
        ring.scale.setScalar(1 + t * 3.8);
        mat.opacity = 0.95 * (1 - t);
      },
    });
  }

  private updateSimulation(dt: number): void {
    this.elapsed += dt;

    // Flicker Fogón fire & rotate Portal rune
    if (this.fogonFlame && this.fogonLight) {
      const f = 1 + Math.sin(this.elapsed * 14) * 0.14 + Math.cos(this.elapsed * 23) * 0.08;
      this.fogonFlame.scale.set(1, f, 1);
      this.fogonLight.intensity = 4.2 * f;
    }
    if (this.portalRing) {
      this.portalRing.rotation.z += dt * 1.4;
    }

    // Animate nearby clanmates & proximity voice cues
    this.voiceCueTimer -= dt;
    for (const ally of this.allies) {
      ally.speakPhase += dt * 2.4;
      const speaking = Math.sin(ally.speakPhase) > 0.45;
      const mat = ally.voiceRing.material as THREE.MeshBasicMaterial;
      mat.opacity = speaking ? 0.65 : 0.14;
      ally.voiceRing.scale.setScalar(speaking ? 1.0 + Math.sin(this.elapsed * 10) * 0.08 : 0.95);
    }

    // Hitstop freeze frame for heavy impact feel
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // Title screen cinematic slow orbit camera over Fuerte Lorencia del Sur
    if (this.isTitleMode) {
      const a = this.elapsed * 0.16;
      const camX = Math.cos(a) * 23;
      const camZ = Math.sin(a) * 23;
      this.camera.position.set(camX, 17.5, camZ);
      this.camera.lookAt(0, 1.8, 0);
      this.heroRig.auraRing.rotation.z += dt * 0.6;
      return;
    }

    if (this.isPaused) return;

    // Cooldowns & natural regen
    for (let i = 0; i < 4; i++) {
      if (this.skillCooldowns[i] > 0) this.skillCooldowns[i] = Math.max(0, this.skillCooldowns[i] - dt);
    }
    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.mateCooldown > 0) this.mateCooldown = Math.max(0, this.mateCooldown - dt);

    this.mp = Math.min(this.maxMp, this.mp + (8 + this.heroState.stats.energia * 0.25) * dt);
    this.stamina = Math.min(this.maxStamina, this.stamina + 20 * dt);
    if (this.currentMap === 'lorencia_sur' && this.playerPos.length() < 7.5) {
      this.hp = Math.min(this.maxHp, this.hp + 22 * dt); // Warmth of the Fogón restores health
    }

    // Combo decay timer
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer === 0) {
        this.comboCount = 0;
        this.comboMultiplier = 1;
        this.comboChainStep = 0;
      }
    }

    // Player movement (WASD isometric screen-aligned + Dash + Click-to-Move)
    let moveX = 0;
    let moveZ = 0;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) {
      moveX -= 1;
      moveZ -= 1;
    }
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) {
      moveX += 1;
      moveZ += 1;
    }
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) {
      moveX -= 1;
      moveZ += 1;
    }
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) {
      moveX += 1;
      moveZ -= 1;
    }

    const moveSpeed = 7.4 + Math.min(2.6, this.heroState.stats.agilidad * 0.03);
    let isMoving = false;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.playerPos.addScaledVector(this.dashDir, moveSpeed * 2.4 * dt);
      isMoving = true;
    } else if (moveX !== 0 || moveZ !== 0) {
      this.moveTarget = null;
      _vec3A.set(moveX, 0, moveZ).normalize();
      this.playerPos.addScaledVector(_vec3A, moveSpeed * dt);
      this.playerYaw = Math.atan2(_vec3A.x, _vec3A.z);
      isMoving = true;
    } else if (this.moveTarget) {
      _vec3A.subVectors(this.moveTarget, this.playerPos).setY(0);
      const dist = _vec3A.length();
      if (dist > 0.35) {
        _vec3A.normalize();
        this.playerPos.addScaledVector(_vec3A, Math.min(dist, moveSpeed * dt));
        this.playerYaw = Math.atan2(_vec3A.x, _vec3A.z);
        isMoving = true;
      } else {
        this.moveTarget = null;
      }
    }

    // Clamp to playable arena radius
    const maxBound = this.currentMap === 'coliseo_mayo' ? 15.8 : 27.5;
    const radialDist = Math.hypot(this.playerPos.x, this.playerPos.z);
    if (radialDist > maxBound) {
      this.playerPos.x = (this.playerPos.x / radialDist) * maxBound;
      this.playerPos.z = (this.playerPos.z / radialDist) * maxBound;
    }

    // Update Hero mesh kinematics
    this.heroRig.root.position.copy(this.playerPos);
    const yawDiff = Math.atan2(Math.sin(this.playerYaw - this.heroRig.root.rotation.y), Math.cos(this.playerYaw - this.heroRig.root.rotation.y));
    this.heroRig.root.rotation.y += yawDiff * Math.min(1, dt * 16);

    if (isMoving) {
      const stride = Math.sin(this.elapsed * 14);
      this.heroRig.leftLeg.rotation.x = stride * 0.45;
      this.heroRig.rightLeg.rotation.x = -stride * 0.45;
      this.heroRig.bodyGroup.position.y = Math.abs(stride) * 0.08;
    } else {
      this.heroRig.leftLeg.rotation.x = THREE.MathUtils.damp(this.heroRig.leftLeg.rotation.x, 0, 10, dt);
      this.heroRig.rightLeg.rotation.x = THREE.MathUtils.damp(this.heroRig.rightLeg.rotation.x, 0, 10, dt);
      this.heroRig.bodyGroup.position.y = Math.sin(this.elapsed * 2.5) * 0.03;
    }

    if (this.spinAnimTimer > 0) {
      this.spinAnimTimer -= dt;
      this.heroRig.bodyGroup.rotation.y += dt * 22;
    } else {
      this.heroRig.bodyGroup.rotation.y = THREE.MathUtils.damp(this.heroRig.bodyGroup.rotation.y, 0, 14, dt);
    }

    if (this.swingAnimTimer > 0) {
      this.swingAnimTimer -= dt;
      this.heroRig.weaponPivot.rotation.y = Math.sin(this.swingAnimTimer * 22) * 1.45;
      this.heroRig.weaponPivot.rotation.x = -0.35;
    } else {
      this.heroRig.weaponPivot.rotation.y = THREE.MathUtils.damp(this.heroRig.weaponPivot.rotation.y, 0, 12, dt);
      this.heroRig.weaponPivot.rotation.x = THREE.MathUtils.damp(this.heroRig.weaponPivot.rotation.x, 0, 12, dt);
    }

    this.heroRig.auraRing.rotation.z += dt * 0.8;

    // Fade click marker
    const cmMat = this.clickMarker.material as THREE.MeshBasicMaterial;
    if (cmMat.opacity > 0) {
      cmMat.opacity = Math.max(0, cmMat.opacity - dt * 1.5);
      this.clickMarker.scale.addScalar(dt * 0.9);
    }

    // Update enemies AI & windup telegraphs
    this.updateEnemies(dt);

    // Respawn open-world or dungeon waves
    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.spawnEnemiesForMap();
      }
    } else if (MAPS[this.currentMap].mode === 'OPEN_WORLD' && this.enemies.length < 4) {
      this.respawnTimer = 2.8;
    }

    // Update VFX & particles
    for (let i = this.vfxList.length - 1; i >= 0; i--) {
      const v = this.vfxList[i];
      v.age += dt;
      if (v.age >= v.maxAge) {
        this.vfxGroup.remove(v.mesh);
        this.vfxList.splice(i, 1);
      } else {
        v.onUpdate(v.age / v.maxAge, dt);
      }
    }

    for (const p of this.particles) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        p.mesh.visible = false;
      } else {
        p.vel.y -= 11.5 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.setScalar(1 - p.age / p.maxAge);
      }
    }

    // Smooth isometric camera follow + decaying shake + shadow frustum tracking
    const targetCamX = this.playerPos.x + 17.5 * this.cameraZoom;
    const targetCamY = 21.5 * this.cameraZoom;
    const targetCamZ = this.playerPos.z + 17.5 * this.cameraZoom;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 6.5, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 6.5, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 6.5, dt);

    if (this.shakeIntensity > 0.005) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.6;
      this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 10, dt);
    }

    this.camera.lookAt(this.playerPos.x, 1.2, this.playerPos.z);

    // Keep keyLight shadows centered on hero
    this.keyLight.position.set(this.playerPos.x + 22, 34, this.playerPos.z + 18);
    this.keyLight.target.position.copy(this.playerPos);
    this.keyLight.target.updateMatrixWorld();
  }

  private updateEnemies(dt: number): void {
    const safeZone = this.currentMap === 'lorencia_sur' && this.playerPos.length() < 6.4;

    for (const en of this.enemies) {
      if (en.hitFlashTimer > 0) {
        en.hitFlashTimer -= dt;
        en.mesh.scale.setScalar(en.hitFlashTimer > 0 ? 1.07 : 1.0);
      }

      // Floating animation for Luz Mala
      if (en.archetype === 'luz_mala') {
        en.mesh.position.y = Math.sin(this.elapsed * 3.8 + en.homePos.x) * 0.25;
      }

      const distToPlayer = en.mesh.position.distanceTo(this.playerPos);
      const aggroRadius = MAPS[this.currentMap].mode === 'OPEN_WORLD' ? 14.5 : 32;

      if (en.isWindingUp) {
        en.windupTimer -= dt;
        const tMat = en.telegraphRing.material as THREE.MeshBasicMaterial;
        tMat.opacity = 0.55 + Math.sin(this.elapsed * 24) * 0.2;
        en.telegraphRing.position.set(en.mesh.position.x, 0.05, en.mesh.position.z);

        if (en.windupTimer <= 0) {
          en.isWindingUp = false;
          tMat.opacity = 0;
          en.attackCooldown = en.isBoss ? 1.85 : 1.55;
          if (distToPlayer <= en.attackRange + 1.1 && this.dashTimer <= 0 && !safeZone) {
            const armorMit = Math.min(0.6, this.heroState.armorUpgrade * 0.025 + this.heroState.evolutionTier * 0.08);
            const taken = Math.max(4, Math.round(en.damage * (1 - armorMit)));
            this.hp = Math.max(0, this.hp - taken);
            this.shakeIntensity = Math.max(this.shakeIntensity, 0.28);
            audioEngine.playHitImpact(false);
            this.emitFloatText(`-${taken}`, this.playerPos, 'enemy');

            if (this.hp <= 0) {
              this.hp = this.maxHp;
              this.mp = this.maxMp;
              this.playerPos.set(0, 0, 5);
              this.callbacks.onHeroDefeated();
            }
          }
        }
        continue;
      }

      if (en.attackCooldown > 0) en.attackCooldown -= dt;

      if (!safeZone && distToPlayer < aggroRadius) {
        _vec3A.subVectors(this.playerPos, en.mesh.position).setY(0);
        en.mesh.rotation.y = Math.atan2(_vec3A.x, _vec3A.z);

        if (distToPlayer <= en.attackRange) {
          if (en.attackCooldown <= 0) {
            en.isWindingUp = true;
            en.windupTimer = en.isBoss ? 0.72 : 0.48;
          }
        } else {
          _vec3A.normalize();
          en.mesh.position.addScaledVector(_vec3A, en.speed * dt);
        }
      } else {
        // Patrol slowly around home
        _vec3A.subVectors(en.homePos, en.mesh.position).setY(0);
        if (_vec3A.length() > 1.5) {
          _vec3A.normalize();
          en.mesh.position.addScaledVector(_vec3A, en.speed * 0.45 * dt);
          en.mesh.rotation.y = Math.atan2(_vec3A.x, _vec3A.z);
        }
      }
    }
  }

  private emitSnapshot(): void {
    const radar: RadarEntity[] = [];
    radar.push({
      id: 'portal',
      name: 'Portal Regional',
      x: this.portalPos.x,
      z: this.portalPos.z,
      kind: 'portal',
    });

    for (const ally of this.allies) {
      const dist = ally.mesh.position.distanceTo(this.playerPos);
      radar.push({
        id: ally.id,
        name: ally.name,
        x: ally.mesh.position.x,
        z: ally.mesh.position.z,
        kind: 'ally',
        distance: Math.round(dist * 10) / 10,
        speaking: Math.sin(ally.speakPhase) > 0.45,
        guildTag: ally.guildTag,
      });
    }

    let pvpHp = 0;
    let pvpMaxHp = 0;
    let pvpName = '';
    for (const en of this.enemies) {
      radar.push({
        id: en.id,
        name: en.name,
        x: en.mesh.position.x,
        z: en.mesh.position.z,
        kind: en.isBoss ? 'boss' : 'enemy',
      });
      if (en.archetype === 'pvp_rival') {
        pvpHp = en.hp;
        pvpMaxHp = en.maxHp;
        pvpName = en.name;
      }
    }

    this.callbacks.onSnapshot({
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      mp: Math.round(this.mp),
      maxMp: this.maxMp,
      stamina: Math.round(this.stamina),
      maxStamina: this.maxStamina,
      comboCount: this.comboCount,
      comboMultiplier: this.comboMultiplier,
      comboTimer: this.comboTimer / this.comboWindow,
      comboChainStep: this.comboChainStep,
      skillCooldowns: [...this.skillCooldowns] as [number, number, number, number],
      dashCooldown: this.dashCooldown,
      mateCooldown: this.mateCooldown,
      fps: this.reportedFps,
      dungeonWave: this.dungeonWave,
      dungeonEnemiesLeft: this.enemies.length,
      pvpOpponentHp: pvpHp,
      pvpOpponentMaxHp: pvpMaxHp,
      pvpOpponentName: pvpName,
      radar,
      playerX: this.playerPos.x,
      playerZ: this.playerPos.z,
    });
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDisposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private scheduleNextFrame(): void {
    if (this.isDisposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private tick = () => {
    if (this.isDisposed) return;
    const now = performance.now();

    // Respect Server Min/Max FPS target cap on hardware GPUs
    if (!this.isSoftwareGl) {
      const targetInterval = 1000 / Math.max(20, this.graphics.targetFps);
      if (now - this.lastRenderTs < targetInterval - 1.5) {
        this.frameId = requestAnimationFrame(this.tick);
        return;
      }
      this.lastRenderTs = now;
    }

    const rawDt = (now - this.lastFrameTs) / 1000;
    this.lastFrameTs = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    // Measure smoothed FPS
    if (rawDt > 0.001) {
      this.fpsSamples.push(1 / rawDt);
      if (this.fpsSamples.length > 20) this.fpsSamples.shift();
      const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
      this.reportedFps = Math.min(this.graphics.targetFps, Math.round(avg));
    }

    this.updateSimulation(dt);
    this.renderer.render(this.scene, this.camera);

    // Throttled HUD snapshot (~15Hz) so React never stalls 60fps loop
    this.snapshotAccum += dt;
    if (this.snapshotAccum >= 0.068) {
      this.snapshotAccum = 0;
      this.emitSnapshot();
    }

    this.scheduleNextFrame();
  };

  public dispose(): void {
    this.isDisposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
