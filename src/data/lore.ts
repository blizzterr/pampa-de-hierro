import type { HeroState, MapId } from '../types/game';

export interface MapDefinition {
  id: MapId;
  name: string;
  region: string;
  subtitle: string;
  recommendedLevel: number;
  mode: 'OPEN_WORLD' | 'DUNGEON' | 'PVP_ARENA';
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  groundPrimary: string;
  groundSecondary: string;
  accentColor: string;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  coords: { x: number; y: number }; // 0..100 for interactive world map
  enemies: string[];
}

export interface EvolutionDefinition {
  tier: number;
  title: string;
  weaponTitle: string;
  ponchoName: string;
  ponchoColors: [string, string, string];
  bladeGlow: number;
  hasWings: boolean;
  questName: string;
  questDescription: string;
  minLevel: number;
  minResets: number;
  requiredKills: number;
  requiredDungeonWaves: number;
  requiredPvpWins: number;
  silverCost: number;
  bonusAttackPct: number;
  bonusDefensePct: number;
}

export interface MilestoneDefinition {
  id: string;
  title: string;
  description: string;
  target: number;
  metric: 'killsTotal' | 'maxComboReached' | 'dungeonWavesCleared' | 'resets' | 'weaponUpgrade' | 'pvpWins';
  rewardSilver: number;
  rewardJewels: number;
  rewardReputation: number;
}

export interface SkillDefinition {
  slot: number;
  keyHint: string;
  name: string;
  muRef: string;
  description: string;
  mpCost: number;
  cooldown: number;
  range: number;
  color: string;
}

export const PRESET_GUILD_LOGOS = [
  {
    id: 'sol_mayo',
    label: 'Sol de Mayo Dorado',
    url: '/src/assets/images/crest_sol_mayo_1795219576213.jpg',
  },
  {
    id: 'condor_bronce',
    label: 'Cóndor de Bronce',
    url: '/src/assets/images/crest_condor_bronce_1795219576065.jpg',
  },
  {
    id: 'gaucho_acero',
    label: 'Lanza y Boleadoras',
    url: '/src/assets/images/crest_gaucho_acero_1795219576451.jpg',
  },
];

export const MAPS: Record<MapId, MapDefinition> = {
  lorencia_sur: {
    id: 'lorencia_sur',
    name: 'Fuerte Lorencia del Sur',
    region: 'Llanura Pampeana',
    subtitle: 'Posta real de adobe y piedra, fogón central y llanura de frontera.',
    recommendedLevel: 1,
    mode: 'OPEN_WORLD',
    skyColor: 0x1d2a3a,
    fogColor: 0x24313d,
    fogDensity: 0.011,
    groundPrimary: '#566440',
    groundSecondary: '#7a6345',
    accentColor: '#d9a441',
    sunColor: 0xffdeb0,
    sunIntensity: 2.3,
    hemiSky: 0x89bce0,
    hemiGround: 0x4e3c29,
    coords: { x: 52, y: 54 },
    enemies: ['Lobizón Salvaje', 'Jabalí de la Posta'],
  },
  esteros_luz_mala: {
    id: 'esteros_luz_mala',
    name: 'Esteros de la Luz Mala',
    region: 'Humedales del Litoral',
    subtitle: 'Pantano crepuscular donde flotan faroles espectrales y acechan manadas.',
    recommendedLevel: 8,
    mode: 'OPEN_WORLD',
    skyColor: 0x0e1d26,
    fogColor: 0x12262e,
    fogDensity: 0.014,
    groundPrimary: '#2f453c',
    groundSecondary: '#203338',
    accentColor: '#38d3c9',
    sunColor: 0x9ce3e6,
    sunIntensity: 1.85,
    hemiSky: 0x4ba9b8,
    hemiGround: 0x1c2824,
    coords: { x: 74, y: 31 },
    enemies: ['Luz Mala Errante', 'Lobizón Alfa'],
  },
  quebrada_condor: {
    id: 'quebrada_condor',
    name: 'Quebrada del Cóndor de Bronce',
    region: 'Cordillera del Norte',
    subtitle: 'Cañón rojizo de vetas de plata y guardianes de basalto andino.',
    recommendedLevel: 15,
    mode: 'OPEN_WORLD',
    skyColor: 0x301f1b,
    fogColor: 0x3b2620,
    fogDensity: 0.011,
    groundPrimary: '#7d4632',
    groundSecondary: '#593326',
    accentColor: '#e88b38',
    sunColor: 0xffc18a,
    sunIntensity: 2.4,
    hemiSky: 0xd99b66,
    hemiGround: 0x3d2219,
    coords: { x: 30, y: 24 },
    enemies: ['Gólem de Basalto', 'Luz Mala Solar'],
  },
  catacumbas_nahuel: {
    id: 'catacumbas_nahuel',
    name: 'Catacumbas del Nahuel',
    region: 'Mazmorra Dinámica Patagónica',
    subtitle: 'Oleadas procedimentales con jefe legendario y alto drop de Joyas de Plata.',
    recommendedLevel: 12,
    mode: 'DUNGEON',
    skyColor: 0x101829,
    fogColor: 0x141d30,
    fogDensity: 0.015,
    groundPrimary: '#2e3847',
    groundSecondary: '#1f2836',
    accentColor: '#56b4f5',
    sunColor: 0xaad4ff,
    sunIntensity: 1.9,
    hemiSky: 0x6ca6e8,
    hemiGround: 0x1d2433,
    coords: { x: 25, y: 76 },
    enemies: ['Guardián del Nahuel (Jefe)', 'Espectro Lacustre', 'Gólem de Hielo'],
  },
  coliseo_mayo: {
    id: 'coliseo_mayo',
    name: 'Coliseo de Mayo',
    region: 'Arena PvP de Clanes',
    subtitle: 'Torneos competitivos entre clanes con estandartes propios y reputación real.',
    recommendedLevel: 5,
    mode: 'PVP_ARENA',
    skyColor: 0x1c2536,
    fogColor: 0x202b3d,
    fogDensity: 0.009,
    groundPrimary: '#6e6556',
    groundSecondary: '#47433e',
    accentColor: '#f2c14e',
    sunColor: 0xffe4ad,
    sunIntensity: 2.5,
    hemiSky: 0x9ac5eb,
    hemiGround: 0x453b2c,
    coords: { x: 64, y: 69 },
    enemies: ['Campeón de Clan Rival (PvP)'],
  },
};

export const EVOLUTIONS: EvolutionDefinition[] = [
  {
    tier: 0,
    title: 'Baqueano de Frontera',
    weaponTitle: 'Facón de Hierro Criollo',
    ponchoName: 'Poncho Pampa Crudo',
    ponchoColors: ['#8c422c', '#e6dac5', '#2a221d'],
    bladeGlow: 0x9ec5e8,
    hasWings: false,
    questName: 'Juramento de la Posta',
    questDescription: 'Rango inicial del Caudillo Errante en Fuerte Lorencia del Sur.',
    minLevel: 1,
    minResets: 0,
    requiredKills: 0,
    requiredDungeonWaves: 0,
    requiredPvpWins: 0,
    silverCost: 0,
    bonusAttackPct: 0,
    bonusDefensePct: 0,
  },
  {
    tier: 1,
    title: 'Lanza de la Pampa',
    weaponTitle: 'Lanza Rúnica del Pampero',
    ponchoName: 'Poncho Punzó con Guardas Doradas',
    ponchoColors: ['#9e1f28', '#e6b84c', '#1c1817'],
    bladeGlow: 0xf0a83a,
    hasWings: false,
    questName: 'Prueba del Ombú Ancestral',
    questDescription: 'Alcanza Nivel 6, derrota 10 enemigos en la frontera y forja la Lanza del Pampero.',
    minLevel: 6,
    minResets: 0,
    requiredKills: 10,
    requiredDungeonWaves: 0,
    requiredPvpWins: 0,
    silverCost: 800,
    bonusAttackPct: 28,
    bonusDefensePct: 18,
  },
  {
    tier: 2,
    title: 'Caudillo de Plata',
    weaponTitle: 'Sable Corvo del Río de la Plata',
    ponchoName: 'Poncho Celeste Real y Plata',
    ponchoColors: ['#2a7fba', '#f4f6f9', '#d8a93e'],
    bladeGlow: 0x5cc8ff,
    hasWings: true,
    questName: 'Juramento del Río de la Plata',
    questDescription: 'Completa 1 Reset, supera 2 oleadas en Catacumbas del Nahuel y demuestra honor.',
    minLevel: 1,
    minResets: 1,
    requiredKills: 22,
    requiredDungeonWaves: 2,
    requiredPvpWins: 0,
    silverCost: 2400,
    bonusAttackPct: 65,
    bonusDefensePct: 45,
  },
  {
    tier: 3,
    title: 'Gran Señor del Sol de Mayo',
    weaponTitle: 'Alabarda Solar del Aconcagua',
    ponchoName: 'Manto Dorado del Sol de Mayo',
    ponchoColors: ['#d49a2a', '#4ea8de', '#ffffff'],
    bladeGlow: 0xffd75e,
    hasWings: true,
    questName: 'Ascensión del Aconcagua',
    questDescription: 'Alcanza 2 Resets, domina 4 oleadas de mazmorra y gana 1 duelo en el Coliseo de Mayo.',
    minLevel: 1,
    minResets: 2,
    requiredKills: 40,
    requiredDungeonWaves: 4,
    requiredPvpWins: 1,
    silverCost: 5500,
    bonusAttackPct: 125,
    bonusDefensePct: 90,
  },
];

export const MILESTONES: MilestoneDefinition[] = [
  {
    id: 'hito_primeros_lobizones',
    title: 'Centinela de la Frontera',
    description: 'Derrota 8 enemigos en las tierras pampeanas.',
    target: 8,
    metric: 'killsTotal',
    rewardSilver: 950,
    rewardJewels: 3,
    rewardReputation: 25,
  },
  {
    id: 'hito_maestro_combo',
    title: 'Maestro del Combo Criollo',
    description: 'Alcanza un multiplicador de combo x5 encadenando habilidades 1 → 2 → 3.',
    target: 5,
    metric: 'maxComboReached',
    rewardSilver: 1400,
    rewardJewels: 4,
    rewardReputation: 40,
  },
  {
    id: 'hito_catacumbas',
    title: 'Explorador del Nahuel',
    description: 'Limpia 3 oleadas dinámicas en Catacumbas del Nahuel.',
    target: 3,
    metric: 'dungeonWavesCleared',
    rewardSilver: 2200,
    rewardJewels: 6,
    rewardReputation: 55,
  },
  {
    id: 'hito_forja_plata',
    title: 'Herrero de Plata (+7)',
    description: 'Mejora tu arma principal hasta nivel +7 con Joyas de la Plata.',
    target: 7,
    metric: 'weaponUpgrade',
    rewardSilver: 2800,
    rewardJewels: 5,
    rewardReputation: 60,
  },
  {
    id: 'hito_primer_reset',
    title: 'Renacimiento Infinito',
    description: 'Ejecuta tu primer Reset de personaje para desbloquear poder permanente.',
    target: 1,
    metric: 'resets',
    rewardSilver: 3500,
    rewardJewels: 8,
    rewardReputation: 85,
  },
  {
    id: 'hito_campeon_coliseo',
    title: 'Campeón del Coliseo de Mayo',
    description: 'Gana 1 duelo competitivo de torneo entre clanes en la Arena PvP.',
    target: 1,
    metric: 'pvpWins',
    rewardSilver: 4200,
    rewardJewels: 10,
    rewardReputation: 110,
  },
];

export const SKILLS: SkillDefinition[] = [
  {
    slot: 0,
    keyHint: '1',
    name: 'Corte de Facón',
    muRef: 'Paso 1 Combo',
    description: 'Tajo frontal veloz de acero labrado. Inicia la cadena de Combo Criollo.',
    mpCost: 0,
    cooldown: 0.45,
    range: 4.4,
    color: '#e5e7eb',
  },
  {
    slot: 1,
    keyHint: '2 / Q',
    name: 'Boleadoras Giratorias',
    muRef: 'AoE 360° · Paso 2',
    description: 'Torbellino radial estilo Twisting Slash que golpea a todos los enemigos cercanos.',
    mpCost: 14,
    cooldown: 2.1,
    range: 5.4,
    color: '#38bdf8',
  },
  {
    slot: 2,
    keyHint: '3 / E',
    name: 'Lanza del Pampero',
    muRef: 'Onda Perforante · Paso 3',
    description: 'Estocada de viento austral en cono frontal. Detona el Combo Criollo al encadenar.',
    mpCost: 22,
    cooldown: 3.0,
    range: 7.5,
    color: '#f59e0b',
  },
  {
    slot: 3,
    keyHint: '4 / R',
    name: 'Furia del Sol de Mayo',
    muRef: 'Definitiva AoE',
    description: 'Invoca un pilar solar sobre la zona que arrasa enemigos con onda de choque dorada.',
    mpCost: 42,
    cooldown: 7.0,
    range: 8.5,
    color: '#fbbf24',
  },
];

export const INITIAL_HERO: HeroState = {
  name: 'Martín Fierro',
  className: 'El Caudillo Errante',
  level: 1,
  xp: 0,
  nextLevelXp: 140,
  resets: 0,
  evolutionTier: 0,
  hp: 260,
  maxHp: 260,
  mp: 150,
  maxMp: 150,
  stamina: 100,
  maxStamina: 100,
  silver: 1850,
  jewels: 6,
  reputation: 740,
  weaponUpgrade: 3,
  armorUpgrade: 2,
  stats: {
    fuerza: 28,
    agilidad: 24,
    vitalidad: 25,
    energia: 20,
    freePoints: 15,
  },
  killsTotal: 0,
  lobizonKills: 0,
  dungeonWavesCleared: 0,
  pvpWins: 0,
  maxComboReached: 1,
  claimedMilestones: [],
  guildId: 'guild_sol_mayo',
  role: 'ADMIN',
};
