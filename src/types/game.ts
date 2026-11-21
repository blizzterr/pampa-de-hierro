export type MapId =
  | 'lorencia_sur'
  | 'esteros_luz_mala'
  | 'quebrada_condor'
  | 'catacumbas_nahuel'
  | 'coliseo_mayo';

export type AccountRole = 'ADMIN' | 'MODERATOR' | 'PLAYER';
export type AccountStatus = 'ACTIVE' | 'MUTED' | 'VOICE_SUSPENDED' | 'BANNED';
export type HardwareTier = 'BAJO' | 'MEDIO' | 'ALTO';

export interface ServerConfig {
  defaultFps: number;
  minFps: number;
  maxFps: number;
  xpMultiplier: number;
  dropMultiplier: number;
  resetMinLevel: number;
  resetStatBonus: number;
  comboMaxMultiplier: number;
  antiRmtTolerancePct: number;
  ddosRateLimitPerSec: number;
  encryptionProtocol: 'AES-256-GCM + Ed25519' | 'ChaCha20-Poly1305 + X25519' | 'TLS 1.3 Mutual + DTLS-SRTP';
  activeEvent: string;
  maxConcurrentUsers: number;
}

export interface AccountRecord {
  id: string;
  username: string;
  characterName: string;
  role: AccountRole;
  status: AccountStatus;
  reputation: number; // 0 - 1000
  silver: number;
  resets: number;
  evolutionTier: number;
  guildId: string | null;
  ipMask: string;
  lastSeen: string;
  toxicWarnings: number;
}

export interface MarketListing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerReputation: number;
  itemName: string;
  itemCategory: 'Arma' | 'Poncho' | 'Joya' | 'Reliquia';
  upgradeLevel: number;
  fairValue: number;
  price: number;
  escrowProtected: boolean;
  status: 'ACTIVE' | 'SOLD' | 'BLOCKED_RMT';
  createdAt: string;
}

export interface GuildRank {
  id: string;
  name: string;
  canInvite: boolean;
  canManageEvents: boolean;
  canCreateVoice: boolean;
  canModerateVoice: boolean;
}

export interface GuildEventItem {
  id: string;
  title: string;
  schedule: string;
  reward: string;
  active: boolean;
}

export interface GuildRecord {
  id: string;
  name: string;
  tag: string;
  motto: string;
  logoUrl: string;
  level: number;
  sharedXp: number;
  nextLevelXp: number;
  leaderName: string;
  memberCount: number;
  pvpPoints: number;
  ranks: GuildRank[];
  events: GuildEventItem[];
}

export type VoiceAccessMode = 'PROXIMITY' | 'PASSWORD' | 'AUTO_ROLE' | 'CLAN_OPEN';

export interface VoiceChannel {
  id: string;
  name: string;
  guildId: string | null;
  accessMode: VoiceAccessMode;
  password: string;
  requiredRole: string;
  maxUsers: number;
  activeUsers: string[];
}

export interface TournamentMatch {
  id: string;
  round: string;
  clanA: string;
  clanB: string;
  scoreA: number;
  scoreB: number;
  status: 'PENDING' | 'LIVE' | 'FINISHED';
  winner?: string;
}

export interface TournamentRecord {
  id: string;
  name: string;
  arenaMap: MapId;
  prizeSilver: number;
  prizeReputation: number;
  status: 'INSCRIPCION' | 'EN_CURSO' | 'FINALIZADO';
  matches: TournamentMatch[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  category: 'SECURITY' | 'DDOS' | 'MODERATION' | 'ANTI_RMT' | 'ADMIN' | 'VOICE';
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  actor: string;
  message: string;
}

export interface PushAlert {
  id: string;
  timestamp: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  title: string;
  body: string;
}

export interface SecurityTelemetry {
  packetsPerSec: number;
  blockedDdosPackets: number;
  rmtBlocksCount: number;
  encryptedSessions: number;
  concurrentPlayers: number;
  dbEngine: string;
  prodTargetDb: string;
  serverCoreTarget: string;
  uptimeSeconds: number;
  threatLevel: 'ESTABLE' | 'ELEVADO' | 'MITIGANDO';
}

export interface ServerStateSnapshot {
  config: ServerConfig;
  accounts: AccountRecord[];
  market: MarketListing[];
  guilds: GuildRecord[];
  voiceChannels: VoiceChannel[];
  tournaments: TournamentRecord[];
  auditLogs: AuditLogEntry[];
  pushAlerts: PushAlert[];
  security: SecurityTelemetry;
}

export interface HeroStats {
  fuerza: number;
  agilidad: number;
  vitalidad: number;
  energia: number;
  freePoints: number;
}

export interface HeroState {
  name: string;
  className: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  resets: number;
  evolutionTier: number; // 0..3
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stamina: number;
  maxStamina: number;
  silver: number;
  jewels: number;
  reputation: number;
  weaponUpgrade: number; // 0..15
  armorUpgrade: number; // 0..15
  stats: HeroStats;
  killsTotal: number;
  lobizonKills: number;
  dungeonWavesCleared: number;
  pvpWins: number;
  maxComboReached: number;
  claimedMilestones: string[];
  guildId: string;
  role: AccountRole;
}

export interface HardwareProfile {
  gpuRenderer: string;
  cpuCores: number;
  memoryGb: number;
  devicePixelRatio: number;
  isSoftwareGl: boolean;
  detectedTier: HardwareTier;
}

export interface GraphicsSettings {
  tier: HardwareTier;
  targetFps: number;
  pixelRatio: number;
  shadowsEnabled: boolean;
  particleDensity: number; // 0.35 - 1.0
  antialiasing: boolean;
  autoDetected: boolean;
}

export interface FloatingCombatText {
  id: number;
  text: string;
  x: number; // screen %
  y: number; // screen %
  kind: 'normal' | 'crit' | 'combo' | 'heal' | 'xp' | 'enemy';
}

export interface RadarEntity {
  id: string;
  name: string;
  x: number;
  z: number;
  kind: 'player' | 'enemy' | 'boss' | 'ally' | 'portal';
  distance?: number;
  speaking?: boolean;
  role?: AccountRole;
  guildTag?: string;
}

export interface CombatSnapshot {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stamina: number;
  maxStamina: number;
  comboCount: number;
  comboMultiplier: number;
  comboTimer: number; // 0..1
  comboChainStep: number; // 0..3
  skillCooldowns: [number, number, number, number];
  dashCooldown: number;
  mateCooldown: number;
  fps: number;
  dungeonWave: number;
  dungeonEnemiesLeft: number;
  pvpOpponentHp: number;
  pvpOpponentMaxHp: number;
  pvpOpponentName: string;
  radar: RadarEntity[];
  playerX: number;
  playerZ: number;
}
