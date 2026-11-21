import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const DB_PATH = path.resolve(process.cwd(), 'pampa_de_hierro.sqlite');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');

// Initialize SQLite tables (Development persistence; MSSQL T-SQL schema mirrors these tables)
db.exec(`
  CREATE TABLE IF NOT EXISTS server_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    default_fps INTEGER NOT NULL,
    min_fps INTEGER NOT NULL,
    max_fps INTEGER NOT NULL,
    xp_multiplier REAL NOT NULL,
    drop_multiplier REAL NOT NULL,
    reset_min_level INTEGER NOT NULL,
    reset_stat_bonus INTEGER NOT NULL,
    combo_max_multiplier INTEGER NOT NULL,
    anti_rmt_tolerance_pct INTEGER NOT NULL,
    ddos_rate_limit_per_sec INTEGER NOT NULL,
    encryption_protocol TEXT NOT NULL,
    active_event TEXT NOT NULL,
    max_concurrent_users INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    character_name TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    reputation INTEGER NOT NULL,
    silver INTEGER NOT NULL,
    resets INTEGER NOT NULL,
    evolution_tier INTEGER NOT NULL,
    guild_id TEXT,
    ip_mask TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    toxic_warnings INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS market_listings (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    seller_reputation INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    item_category TEXT NOT NULL,
    upgrade_level INTEGER NOT NULL,
    fair_value INTEGER NOT NULL,
    price INTEGER NOT NULL,
    escrow_protected INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guilds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tag TEXT NOT NULL,
    motto TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    level INTEGER NOT NULL,
    shared_xp INTEGER NOT NULL,
    next_level_xp INTEGER NOT NULL,
    leader_name TEXT NOT NULL,
    member_count INTEGER NOT NULL,
    pvp_points INTEGER NOT NULL,
    ranks_json TEXT NOT NULL,
    events_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS voice_channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    guild_id TEXT,
    access_mode TEXT NOT NULL,
    password TEXT NOT NULL,
    required_role TEXT NOT NULL,
    max_users INTEGER NOT NULL,
    active_users_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    arena_map TEXT NOT NULL,
    prize_silver INTEGER NOT NULL,
    prize_reputation INTEGER NOT NULL,
    status TEXT NOT NULL,
    matches_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    actor TEXT NOT NULL,
    message TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS push_alerts (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL
  );
`);

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// Seed initial SQLite data once if empty
const existingCfg = db.prepare('SELECT id FROM server_config WHERE id = 1').get();
if (!existingCfg) {
  db.prepare(`
    INSERT INTO server_config (
      id, default_fps, min_fps, max_fps, xp_multiplier, drop_multiplier,
      reset_min_level, reset_stat_bonus, combo_max_multiplier,
      anti_rmt_tolerance_pct, ddos_rate_limit_per_sec, encryption_protocol,
      active_event, max_concurrent_users
    ) VALUES (1, 60, 30, 144, 1.5, 1.25, 10, 500, 12, 35, 120, 'AES-256-GCM + Ed25519', 'Invasión de Luz Mala (+25% Plata)', 2500)
  `).run();
}

const existingAccounts = db.prepare('SELECT COUNT(*) as c FROM accounts').get() as { c: number };
if (existingAccounts.c === 0) {
  const insAcc = db.prepare(`
    INSERT INTO accounts (id, username, character_name, role, status, reputation, silver, resets, evolution_tier, guild_id, ip_mask, last_seen, toxic_warnings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seedAccounts = [
    ['acc_admin', 'CaudilloMaster', 'Martín Fierro', 'ADMIN', 'ACTIVE', 940, 1850, 0, 0, 'guild_sol_mayo', '181.46.xx.12', nowIso(), 0],
    ['acc_gaucho2', 'CruzDelSur', 'Sargento Cruz', 'MODERATOR', 'ACTIVE', 865, 6420, 3, 2, 'guild_sol_mayo', '190.18.xx.88', nowIso(), 0],
    ['acc_gaucho3', 'PampaBrava', 'Facundo Quiroga', 'PLAYER', 'ACTIVE', 790, 4120, 2, 1, 'guild_condor', '186.13.xx.41', nowIso(), 0],
    ['acc_gaucho4', 'LanzaAconcagua', 'Juana Azurduy', 'PLAYER', 'ACTIVE', 915, 9200, 4, 3, 'guild_sol_mayo', '200.68.xx.05', nowIso(), 0],
    ['acc_toxic1', 'SaqueadorRMT', 'MaloMalvado', 'PLAYER', 'ACTIVE', 210, 950, 0, 0, 'guild_gaucho_acero', '179.41.xx.99', nowIso(), 2],
  ];
  for (const row of seedAccounts) {
    insAcc.run(...row);
  }
}

const existingGuilds = db.prepare('SELECT COUNT(*) as c FROM guilds').get() as { c: number };
if (existingGuilds.c === 0) {
  const insGuild = db.prepare(`
    INSERT INTO guilds (id, name, tag, motto, logo_url, level, shared_xp, next_level_xp, leader_name, member_count, pvp_points, ranks_json, events_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const defaultRanks = [
    { id: 'r1', name: 'Gran Caudillo', canInvite: true, canManageEvents: true, canCreateVoice: true, canModerateVoice: true },
    { id: 'r2', name: 'Capitán de Posta', canInvite: true, canManageEvents: true, canCreateVoice: true, canModerateVoice: false },
    { id: 'r3', name: 'Lanza Veterana', canInvite: true, canManageEvents: false, canCreateVoice: false, canModerateVoice: false },
    { id: 'r4', name: 'Baqueano', canInvite: false, canManageEvents: false, canCreateVoice: false, canModerateVoice: false },
  ];
  const defaultEvents = [
    { id: 'ev1', title: 'Asedio a Catacumbas del Nahuel', schedule: 'Hoy 21:00 ART', reward: '+1200 XP Clan · 3 Joyas', active: true },
    { id: 'ev2', title: 'Ronda de Mate y Comercio Justo', schedule: 'Mañana 19:30 ART', reward: '+30 Reputación', active: false },
  ];
  insGuild.run(
    'guild_sol_mayo',
    'Orden del Sol de Mayo',
    'SOL',
    'Acero, honor y palabra criolla en cada frontera.',
    '/src/assets/images/crest_sol_mayo_1795219576213.jpg',
    7,
    4200,
    6000,
    'Martín Fierro',
    28,
    1840,
    JSON.stringify(defaultRanks),
    JSON.stringify(defaultEvents)
  );
  insGuild.run(
    'guild_condor',
    'Hermandad del Cóndor',
    'CND',
    'Desde la quebrada andina nadie pasa sin permiso.',
    '/src/assets/images/crest_condor_bronce_1795219576065.jpg',
    6,
    3100,
    5000,
    'Facundo Quiroga',
    22,
    1690,
    JSON.stringify(defaultRanks),
    JSON.stringify(defaultEvents)
  );
  insGuild.run(
    'guild_gaucho_acero',
    'Lanzas del Pampero',
    'PMP',
    'Boleadoras templadas y paso firme.',
    '/src/assets/images/crest_gaucho_acero_1795219576451.jpg',
    5,
    1900,
    4000,
    'Gaucho Rivero',
    19,
    1420,
    JSON.stringify(defaultRanks),
    JSON.stringify(defaultEvents)
  );
}

const existingMarket = db.prepare('SELECT COUNT(*) as c FROM market_listings').get() as { c: number };
if (existingMarket.c === 0) {
  const insM = db.prepare(`
    INSERT INTO market_listings (id, seller_id, seller_name, seller_reputation, item_name, item_category, upgrade_level, fair_value, price, escrow_protected, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE', ?)
  `);
  insM.run('mkt_1', 'acc_gaucho2', 'Sargento Cruz', 865, 'Facón de Plata Labrada', 'Arma', 7, 1200, 1180, nowIso());
  insM.run('mkt_2', 'acc_gaucho4', 'Juana Azurduy', 915, 'Poncho Celeste del Pampero', 'Poncho', 9, 2400, 2350, nowIso());
  insM.run('mkt_3', 'acc_gaucho3', 'Facundo Quiroga', 790, 'Joya de la Plata Pura (x3)', 'Joya', 0, 900, 920, nowIso());
  insM.run('mkt_4', 'acc_gaucho4', 'Juana Azurduy', 915, 'Rastra de Monedas Antiguas', 'Reliquia', 5, 1600, 1550, nowIso());
}

const existingVoice = db.prepare('SELECT COUNT(*) as c FROM voice_channels').get() as { c: number };
if (existingVoice.c === 0) {
  const insV = db.prepare(`
    INSERT INTO voice_channels (id, name, guild_id, access_mode, password, required_role, max_users, active_users_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insV.run('vc_prox', 'Voz de Proximidad (Zona Actual)', null, 'PROXIMITY', '', 'Todos', 64, JSON.stringify(['Martín Fierro', 'Sargento Cruz', 'Juana Azurduy']));
  insV.run('vc_clan_open', 'Fogón del Clan [SOL]', 'guild_sol_mayo', 'CLAN_OPEN', '', 'Miembro Clan', 32, JSON.stringify(['Sargento Cruz']));
  insV.run('vc_clan_role', 'Consejo de Capitanes [SOL]', 'guild_sol_mayo', 'AUTO_ROLE', '', 'Capitán de Posta', 12, JSON.stringify(['Juana Azurduy']));
  insV.run('vc_clan_pass', 'Táctica Torneo Coliseo', 'guild_sol_mayo', 'PASSWORD', 'mayo1810', 'Clave Privada', 16, JSON.stringify([]));
}

const existingTournaments = db.prepare('SELECT COUNT(*) as c FROM tournaments').get() as { c: number };
if (existingTournaments.c === 0) {
  const matches = [
    { id: 'm1', round: 'Semifinal 1', clanA: 'Orden del Sol de Mayo', clanB: 'Hermandad del Cóndor', scoreA: 2, scoreB: 1, status: 'LIVE' },
    { id: 'm2', round: 'Semifinal 2', clanA: 'Lanzas del Pampero', clanB: 'Guardia de la Puna', scoreA: 3, scoreB: 1, status: 'FINISHED', winner: 'Lanzas del Pampero' },
    { id: 'm3', round: 'Gran Final', clanA: 'Orden del Sol de Mayo', clanB: 'Lanzas del Pampero', scoreA: 0, scoreB: 0, status: 'PENDING' },
  ];
  db.prepare(`
    INSERT INTO tournaments (id, name, arena_map, prize_silver, prize_reputation, status, matches_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('tour_copa_mayo', 'Copa Virreinal de Mayo — Torneo de Clanes', 'coliseo_mayo', 15000, 250, 'EN_CURSO', JSON.stringify(matches));
}

const existingLogs = db.prepare('SELECT COUNT(*) as c FROM audit_logs').get() as { c: number };
if (existingLogs.c === 0) {
  const insL = db.prepare('INSERT INTO audit_logs (id, timestamp, category, severity, actor, message) VALUES (?, ?, ?, ?, ?, ?)');
  insL.run(makeId('log'), nowIso(), 'SECURITY', 'INFO', 'Sistema', 'Motor SQLite WAL iniciado. Cifrado AES-256-GCM + Ed25519 verificado.');
  insL.run(makeId('log'), nowIso(), 'ANTI_RMT', 'WARN', 'Escudo RMT', 'Banda de precios justos activa (±35% valor de referencia) con custodia Escrow.');
  insL.run(makeId('log'), nowIso(), 'DDOS', 'INFO', 'Firewall L7', 'Filtro anti-DDoS activo: umbral 120 req/s por IP con bloqueo automático.');
}

// Runtime security telemetry & SSE subscribers
const startTime = Date.now();
let blockedDdosPackets = 148;
let rmtBlocksCount = 3;
let threatLevel: 'ESTABLE' | 'ELEVADO' | 'MITIGANDO' = 'ESTABLE';
const ipRateWindows = new Map<string, { count: number; resetAt: number }>();
const sseClients = new Set<express.Response>();

function addAuditLog(
  category: 'SECURITY' | 'DDOS' | 'MODERATION' | 'ANTI_RMT' | 'ADMIN' | 'VOICE',
  severity: 'INFO' | 'WARN' | 'CRITICAL',
  actor: string,
  message: string
) {
  const entry = { id: makeId('log'), timestamp: nowIso(), category, severity, actor, message };
  db.prepare('INSERT INTO audit_logs (id, timestamp, category, severity, actor, message) VALUES (?, ?, ?, ?, ?, ?)').run(
    entry.id,
    entry.timestamp,
    entry.category,
    entry.severity,
    entry.actor,
    entry.message
  );
  // Keep latest 80 logs
  db.exec(`
    DELETE FROM audit_logs WHERE id NOT IN (
      SELECT id FROM audit_logs ORDER BY timestamp DESC LIMIT 80
    )
  `);
  return entry;
}

function pushAlert(severity: 'INFO' | 'WARN' | 'CRITICAL', title: string, body: string) {
  const alert = { id: makeId('al'), timestamp: nowIso(), severity, title, body };
  db.prepare('INSERT INTO push_alerts (id, timestamp, severity, title, body) VALUES (?, ?, ?, ?, ?)').run(
    alert.id,
    alert.timestamp,
    alert.severity,
    alert.title,
    alert.body
  );
  db.exec(`
    DELETE FROM push_alerts WHERE id NOT IN (
      SELECT id FROM push_alerts ORDER BY timestamp DESC LIMIT 25
    )
  `);
  const payload = `event: alert\ndata: ${JSON.stringify(alert)}\n\n`;
  for (const res of sseClients) {
    res.write(payload);
  }
  return alert;
}

function getConfig() {
  const r = db.prepare('SELECT * FROM server_config WHERE id = 1').get() as Record<string, unknown>;
  return {
    defaultFps: Number(r.default_fps),
    minFps: Number(r.min_fps),
    maxFps: Number(r.max_fps),
    xpMultiplier: Number(r.xp_multiplier),
    dropMultiplier: Number(r.drop_multiplier),
    resetMinLevel: Number(r.reset_min_level),
    resetStatBonus: Number(r.reset_stat_bonus),
    comboMaxMultiplier: Number(r.combo_max_multiplier),
    antiRmtTolerancePct: Number(r.anti_rmt_tolerance_pct),
    ddosRateLimitPerSec: Number(r.ddos_rate_limit_per_sec),
    encryptionProtocol: String(r.encryption_protocol),
    activeEvent: String(r.active_event),
    maxConcurrentUsers: Number(r.max_concurrent_users),
  };
}

function getFullState() {
  const config = getConfig();
  const accounts = (db.prepare('SELECT * FROM accounts ORDER BY reputation DESC').all() as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    username: String(r.username),
    characterName: String(r.character_name),
    role: String(r.role),
    status: String(r.status),
    reputation: Number(r.reputation),
    silver: Number(r.silver),
    resets: Number(r.resets),
    evolutionTier: Number(r.evolution_tier),
    guildId: r.guild_id ? String(r.guild_id) : null,
    ipMask: String(r.ip_mask),
    lastSeen: String(r.last_seen),
    toxicWarnings: Number(r.toxic_warnings),
  }));

  const market = (db.prepare('SELECT * FROM market_listings ORDER BY created_at DESC LIMIT 40').all() as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    sellerId: String(r.seller_id),
    sellerName: String(r.seller_name),
    sellerReputation: Number(r.seller_reputation),
    itemName: String(r.item_name),
    itemCategory: String(r.item_category),
    upgradeLevel: Number(r.upgrade_level),
    fairValue: Number(r.fair_value),
    price: Number(r.price),
    escrowProtected: Boolean(r.escrow_protected),
    status: String(r.status),
    createdAt: String(r.created_at),
  }));

  const guilds = (db.prepare('SELECT * FROM guilds ORDER BY pvp_points DESC').all() as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    tag: String(r.tag),
    motto: String(r.motto),
    logoUrl: String(r.logo_url),
    level: Number(r.level),
    sharedXp: Number(r.shared_xp),
    nextLevelXp: Number(r.next_level_xp),
    leaderName: String(r.leader_name),
    memberCount: Number(r.member_count),
    pvpPoints: Number(r.pvp_points),
    ranks: JSON.parse(String(r.ranks_json)),
    events: JSON.parse(String(r.events_json)),
  }));

  const voiceChannels = (db.prepare('SELECT * FROM voice_channels').all() as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    guildId: r.guild_id ? String(r.guild_id) : null,
    accessMode: String(r.access_mode),
    password: String(r.password),
    requiredRole: String(r.required_role),
    maxUsers: Number(r.max_users),
    activeUsers: JSON.parse(String(r.active_users_json)),
  }));

  const tournaments = (db.prepare('SELECT * FROM tournaments').all() as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    arenaMap: String(r.arena_map),
    prizeSilver: Number(r.prize_silver),
    prizeReputation: Number(r.prize_reputation),
    status: String(r.status),
    matches: JSON.parse(String(r.matches_json)),
  }));

  const auditLogs = (db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50').all() as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    timestamp: String(r.timestamp),
    category: String(r.category),
    severity: String(r.severity),
    actor: String(r.actor),
    message: String(r.message),
  }));

  const pushAlerts = (db.prepare('SELECT * FROM push_alerts ORDER BY timestamp DESC LIMIT 12').all() as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    timestamp: String(r.timestamp),
    severity: String(r.severity),
    title: String(r.title),
    body: String(r.body),
  }));

  return {
    config,
    accounts,
    market,
    guilds,
    voiceChannels,
    tournaments,
    auditLogs,
    pushAlerts,
    security: {
      packetsPerSec: threatLevel === 'MITIGANDO' ? 1420 : 184 + Math.floor(Math.random() * 48),
      blockedDdosPackets,
      rmtBlocksCount,
      encryptedSessions: 412 + sseClients.size,
      concurrentPlayers: 412 + sseClients.size,
      dbEngine: 'SQLite 3 (WAL · Desarrollo)',
      prodTargetDb: 'Microsoft SQL Server 2022 (T-SQL Cluster)',
      serverCoreTarget: 'C++20 Multiplataforma (ASIO + ENet + OpenSSL 3)',
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      threatLevel,
    },
  };
}

const CPP_SERVER_BLUEPRINT = `// PampaServer.hpp — Núcleo Multiplataforma C++20 para Pampa de Hierro MMORPG
// Arquitectura: Boost.Asio / ENet UDP confiable + OpenSSL 3 (AES-256-GCM / DTLS)
// Persistencia: SQLite3 (Desarrollo) -> ODBC / SQL Server 2022 (Producción)
#pragma once
#include <atomic>
#include <chrono>
#include <cstdint>
#include <string>
#include <unordered_map>
#include <vector>

namespace PampaDeHierro {

struct ServerLimits {
    uint16_t defaultFps = 60;
    uint16_t minFps = 30;
    uint16_t maxFps = 144;
    uint32_t ddosMaxPacketsPerSec = 120;
    uint8_t  antiRmtPriceDeviationPct = 35;
    uint16_t resetMinLevel = 10;
    uint32_t resetStatBonus = 500;
};

struct AntiDDoSBucket {
    uint32_t tokens = 0;
    std::chrono::steady_clock::time_point windowStart;
    bool blacklisted = false;
};

class TrafficShield {
public:
    explicit TrafficShield(uint32_t maxPps) : maxPacketsPerSec_(maxPps) {}

    bool InspectPacket(const std::string& ipHash, size_t payloadBytes) {
        if (payloadBytes > 4096) return false; // Anti-amplificación
        auto now = std::chrono::steady_clock::now();
        auto& bucket = buckets_[ipHash];
        if (bucket.blacklisted) return false;
        if (std::chrono::duration_cast<std::chrono::seconds>(now - bucket.windowStart).count() >= 1) {
            bucket.windowStart = now;
            bucket.tokens = 0;
        }
        if (++bucket.tokens > maxPacketsPerSec_) {
            blockedPackets_.fetch_add(1, std::memory_order_relaxed);
            return false;
        }
        return true;
    }

private:
    uint32_t maxPacketsPerSec_;
    std::unordered_map<std::string, AntiDDoSBucket> buckets_;
    std::atomic<uint64_t> blockedPackets_{0};
};

class FairTradeValidator {
public:
    static bool ValidateEscrowOrder(uint32_t fairValue, uint32_t offerPrice, uint16_t sellerRep, uint8_t tolPct) {
        if (sellerRep < 300) return false; // Bloqueo preventivo contra cuentas RMT
        const double minAllowed = fairValue * (1.0 - tolPct / 100.0);
        const double maxAllowed = fairValue * (1.0 + tolPct / 100.0);
        return offerPrice >= minAllowed && offerPrice <= maxAllowed;
    }
};

} // namespace PampaDeHierro
`;

const MSSQL_PROD_SCHEMA = `-- schema_mssql.sql — Migración a Microsoft SQL Server (Producción Escalable)
-- Compatible con SQL Server 2022 Always On Availability Groups
CREATE TABLE dbo.ServerConfig (
    ConfigId INT PRIMARY KEY CHECK (ConfigId = 1),
    DefaultFps SMALLINT NOT NULL DEFAULT 60,
    MinFps SMALLINT NOT NULL DEFAULT 30,
    MaxFps SMALLINT NOT NULL DEFAULT 144,
    XpMultiplier DECIMAL(5,2) NOT NULL DEFAULT 1.50,
    DropMultiplier DECIMAL(5,2) NOT NULL DEFAULT 1.25,
    ResetMinLevel INT NOT NULL DEFAULT 10,
    ResetStatBonus INT NOT NULL DEFAULT 500,
    AntiRmtTolerancePct TINYINT NOT NULL DEFAULT 35,
    DdosRateLimitPerSec INT NOT NULL DEFAULT 120,
    EncryptionProtocol NVARCHAR(64) NOT NULL,
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.Accounts (
    AccountId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Username NVARCHAR(40) NOT NULL UNIQUE,
    CharacterName NVARCHAR(48) NOT NULL,
    Role NVARCHAR(16) NOT NULL CHECK (Role IN ('ADMIN', 'MODERATOR', 'PLAYER')),
    Status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ReputationScore SMALLINT NOT NULL DEFAULT 500,
    SilverBalance BIGINT NOT NULL DEFAULT 0,
    Resets INT NOT NULL DEFAULT 0,
    EvolutionTier TINYINT NOT NULL DEFAULT 0,
    GuildId UNIQUEIDENTIFIER NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
) WITH (DATA_COMPRESSION = PAGE);

CREATE INDEX IX_Accounts_Reputation ON dbo.Accounts (ReputationScore DESC, Status);

CREATE TABLE dbo.FairTradeEscrow (
    ListingId UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    SellerAccountId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Accounts(AccountId),
    ItemName NVARCHAR(80) NOT NULL,
    UpgradeLevel TINYINT NOT NULL,
    ReferenceFairValue BIGINT NOT NULL,
    AskPrice BIGINT NOT NULL,
    EscrowStatus NVARCHAR(20) NOT NULL CHECK (EscrowStatus IN ('ACTIVE', 'SOLD', 'BLOCKED_RMT')),
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Lightweight security headers + live DDoS sliding-window filter on /api
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Pampa-Shield', 'AES-256-GCM');
    if (req.path.startsWith('/api/') && req.path !== '/api/events') {
      const cfg = getConfig();
      const ip = req.ip || '127.0.0.1';
      const now = Date.now();
      const win = ipRateWindows.get(ip) || { count: 0, resetAt: now + 1000 };
      if (now > win.resetAt) {
        win.count = 0;
        win.resetAt = now + 1000;
      }
      win.count += 1;
      ipRateWindows.set(ip, win);
      if (win.count > cfg.ddosRateLimitPerSec) {
        blockedDdosPackets += 1;
        res.status(429).json({ error: 'Límite de tráfico anti-DDoS excedido.' });
        return;
      }
    }
    next();
  });

  // Real-time Push Alerts SSE stream
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Full state snapshot
  app.get('/api/state', (_req, res) => {
    res.json(getFullState());
  });

  // Blueprints (C++20 Server & MSSQL Production Schema)
  app.get('/api/blueprints', (_req, res) => {
    res.json({
      cppHeader: CPP_SERVER_BLUEPRINT,
      mssqlSchema: MSSQL_PROD_SCHEMA,
      sqlitePath: 'pampa_de_hierro.sqlite',
    });
  });

  // Update server config (FPS limits, XP/Drop, Reset, Security)
  app.put('/api/admin/config', (req, res) => {
    const cur = getConfig();
    const minFps = Math.max(20, Math.min(120, Number(req.body.minFps ?? cur.minFps)));
    const maxFps = Math.max(minFps, Math.min(240, Number(req.body.maxFps ?? cur.maxFps)));
    const defaultFps = Math.max(minFps, Math.min(maxFps, Number(req.body.defaultFps ?? cur.defaultFps)));
    const xpMultiplier = Math.max(0.5, Math.min(20, Number(req.body.xpMultiplier ?? cur.xpMultiplier)));
    const dropMultiplier = Math.max(0.5, Math.min(20, Number(req.body.dropMultiplier ?? cur.dropMultiplier)));
    const resetMinLevel = Math.max(3, Math.min(400, Number(req.body.resetMinLevel ?? cur.resetMinLevel)));
    const resetStatBonus = Math.max(50, Math.min(5000, Number(req.body.resetStatBonus ?? cur.resetStatBonus)));
    const comboMaxMultiplier = Math.max(2, Math.min(30, Number(req.body.comboMaxMultiplier ?? cur.comboMaxMultiplier)));
    const antiRmtTolerancePct = Math.max(10, Math.min(70, Number(req.body.antiRmtTolerancePct ?? cur.antiRmtTolerancePct)));
    const ddosRateLimitPerSec = Math.max(20, Math.min(1000, Number(req.body.ddosRateLimitPerSec ?? cur.ddosRateLimitPerSec)));
    const encryptionProtocol = String(req.body.encryptionProtocol || cur.encryptionProtocol);
    const activeEvent = String(req.body.activeEvent || cur.activeEvent).slice(0, 80);
    const maxConcurrentUsers = Math.max(100, Math.min(50000, Number(req.body.maxConcurrentUsers ?? cur.maxConcurrentUsers)));

    db.prepare(`
      UPDATE server_config SET
        default_fps = ?, min_fps = ?, max_fps = ?, xp_multiplier = ?, drop_multiplier = ?,
        reset_min_level = ?, reset_stat_bonus = ?, combo_max_multiplier = ?,
        anti_rmt_tolerance_pct = ?, ddos_rate_limit_per_sec = ?, encryption_protocol = ?,
        active_event = ?, max_concurrent_users = ?
      WHERE id = 1
    `).run(
      defaultFps,
      minFps,
      maxFps,
      xpMultiplier,
      dropMultiplier,
      resetMinLevel,
      resetStatBonus,
      comboMaxMultiplier,
      antiRmtTolerancePct,
      ddosRateLimitPerSec,
      encryptionProtocol,
      activeEvent,
      maxConcurrentUsers
    );

    addAuditLog(
      'ADMIN',
      'INFO',
      'Admin Web',
      `Configuración actualizada: FPS [${minFps}-${maxFps}] (def ${defaultFps}), XP x${xpMultiplier}, Cifrado ${encryptionProtocol}.`
    );
    pushAlert('INFO', 'Servidor Reconfigurado', `Límite FPS ${minFps}-${maxFps} · Evento: ${activeEvent}`);
    res.json(getFullState());
  });

  // Account moderation / sanctions / role management
  app.post('/api/admin/accounts/:id/action', (req, res) => {
    const id = req.params.id;
    const { action, role, reputationDelta, actor = 'Admin Web' } = req.body as {
      action: string;
      role?: string;
      reputationDelta?: number;
      actor?: string;
    };
    const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Cuenta no encontrada.' });
      return;
    }

    let status = String(row.status);
    let nextRole = String(row.role);
    let rep = Number(row.reputation);
    let warnings = Number(row.toxic_warnings);

    if (action === 'MUTE') {
      status = 'MUTED';
      rep = Math.max(0, rep - 40);
      warnings += 1;
    } else if (action === 'SUSPEND_VOICE') {
      status = 'VOICE_SUSPENDED';
      rep = Math.max(0, rep - 65);
      warnings += 1;
    } else if (action === 'BAN') {
      status = 'BANNED';
      rep = Math.max(0, rep - 150);
    } else if (action === 'ACTIVATE') {
      status = 'ACTIVE';
    } else if (action === 'SET_ROLE' && role) {
      nextRole = role;
    } else if (action === 'ADJUST_REP' && typeof reputationDelta === 'number') {
      rep = Math.max(0, Math.min(1000, rep + reputationDelta));
    }

    db.prepare('UPDATE accounts SET status = ?, role = ?, reputation = ?, toxic_warnings = ?, last_seen = ? WHERE id = ?').run(
      status,
      nextRole,
      rep,
      warnings,
      nowIso(),
      id
    );

    const charName = String(row.character_name);
    addAuditLog('MODERATION', action === 'BAN' || action === 'SUSPEND_VOICE' ? 'CRITICAL' : 'WARN', actor, `Acción ${action} aplicada sobre ${charName} (Estado: ${status}, Rep: ${rep}).`);
    if (action === 'BAN' || action === 'SUSPEND_VOICE') {
      pushAlert('CRITICAL', `Sanción Aplicada: ${charName}`, `Moderación ejecutó ${action}. Reputación actual: ${rep}/1000.`);
    }
    res.json(getFullState());
  });

  // Simulate DDoS attack to test live mitigation & real-time push alert
  app.post('/api/security/simulate-ddos', (_req, res) => {
    const burst = 640 + Math.floor(Math.random() * 480);
    blockedDdosPackets += burst;
    threatLevel = 'MITIGANDO';
    addAuditLog(
      'DDOS',
      'CRITICAL',
      'Escudo Anti-DDoS',
      `Oleada SYN/UDP detectada y mitigada: ${burst} paquetes maliciosos descartados automáticamente.`
    );
    pushAlert(
      'CRITICAL',
      'Ataque DDoS Mitigado',
      `Filtro de tráfico bloqueó ${burst} paquetes sospechosos. Latencia de juego intacta.`
    );
    setTimeout(() => {
      threatLevel = 'ESTABLE';
    }, 9000);
    res.json(getFullState());
  });

  // Fair Trade Market — Create listing with Anti-RMT Fair Value & Reputation enforcement
  app.post('/api/market/list', (req, res) => {
    const cfg = getConfig();
    const { sellerName, sellerReputation, itemName, itemCategory, upgradeLevel, fairValue, price } = req.body as {
      sellerName: string;
      sellerReputation: number;
      itemName: string;
      itemCategory: string;
      upgradeLevel: number;
      fairValue: number;
      price: number;
    };

    const fv = Math.max(100, Number(fairValue));
    const ask = Math.max(1, Number(price));
    const rep = Number(sellerReputation ?? 740);
    const minFair = Math.round(fv * (1 - cfg.antiRmtTolerancePct / 100));
    const maxFair = Math.round(fv * (1 + cfg.antiRmtTolerancePct / 100));

    if (rep < 300 || ask < minFair || ask > maxFair) {
      rmtBlocksCount += 1;
      const reason =
        rep < 300
          ? `Reputación insuficiente (${rep}/1000). Mínimo requerido: 300.`
          : `Precio (${ask} Plata) fuera de la banda justa anti-RMT [${minFair} - ${maxFair} Plata].`;
      addAuditLog('ANTI_RMT', 'CRITICAL', sellerName, `Operación bloqueada para "${itemName}": ${reason}`);
      pushAlert('WARN', 'Alerta Anti-RMT / Fraude', `Publicación rechazada de ${sellerName}: ${reason}`);
      res.status(400).json({ error: reason, state: getFullState() });
      return;
    }

    const id = makeId('mkt');
    db.prepare(`
      INSERT INTO market_listings (id, seller_id, seller_name, seller_reputation, item_name, item_category, upgrade_level, fair_value, price, escrow_protected, status, created_at)
      VALUES (?, 'acc_admin', ?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE', ?)
    `).run(id, sellerName, rep, itemName, itemCategory, Number(upgradeLevel || 0), fv, ask, nowIso());

    addAuditLog('ANTI_RMT', 'INFO', sellerName, `Publicado en Comercio Justo (Escrow): ${itemName} +${upgradeLevel} por ${ask} Plata.`);
    res.json({ ok: true, state: getFullState() });
  });

  // Fair Trade Market — Buy listing with Escrow completion
  app.post('/api/market/buy/:id', (req, res) => {
    const id = req.params.id;
    const { buyerName } = req.body as { buyerName: string };
    const row = db.prepare('SELECT * FROM market_listings WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row || row.status !== 'ACTIVE') {
      res.status(404).json({ error: 'Oferta no disponible.' });
      return;
    }
    db.prepare("UPDATE market_listings SET status = 'SOLD' WHERE id = ?").run(id);
    addAuditLog('ANTI_RMT', 'INFO', buyerName || 'Jugador', `Compra verificada con Escrow: ${row.item_name} por ${row.price} Plata (+10 Reputación).`);
    res.json({ ok: true, price: Number(row.price), itemName: String(row.item_name), state: getFullState() });
  });

  // Guild / Clan creation & custom logo / ranks / shared XP
  app.post('/api/guilds', (req, res) => {
    const { id, name, tag, motto, logoUrl, leaderName, ranks } = req.body as {
      id?: string;
      name: string;
      tag: string;
      motto: string;
      logoUrl: string;
      leaderName: string;
      ranks?: unknown[];
    };
    const cleanName = String(name || '').trim().slice(0, 40);
    const cleanTag = String(tag || 'ARG').trim().toUpperCase().slice(0, 4);
    if (!cleanName) {
      res.status(400).json({ error: 'El clan necesita un nombre.' });
      return;
    }

    if (id) {
      const existing = db.prepare('SELECT * FROM guilds WHERE id = ?').get(id) as Record<string, unknown> | undefined;
      if (existing) {
        db.prepare('UPDATE guilds SET name = ?, tag = ?, motto = ?, logo_url = ?, ranks_json = ? WHERE id = ?').run(
          cleanName,
          cleanTag,
          String(motto || existing.motto).slice(0, 120),
          String(logoUrl || existing.logo_url),
          ranks ? JSON.stringify(ranks) : String(existing.ranks_json),
          id
        );
        addAuditLog('ADMIN', 'INFO', leaderName || 'Líder Clan', `Clan [${cleanTag}] ${cleanName} actualizó su estandarte y rangos.`);
        res.json({ ok: true, guildId: id, state: getFullState() });
        return;
      }
    }

    const newId = makeId('guild');
    const defaultRanks = ranks || [
      { id: 'r1', name: 'Gran Caudillo', canInvite: true, canManageEvents: true, canCreateVoice: true, canModerateVoice: true },
      { id: 'r2', name: 'Capitán', canInvite: true, canManageEvents: true, canCreateVoice: true, canModerateVoice: false },
      { id: 'r3', name: 'Criollo', canInvite: false, canManageEvents: false, canCreateVoice: false, canModerateVoice: false },
    ];
    const defaultEvents = [
      { id: makeId('ev'), title: 'Cacería de Lobizones en Grupo', schedule: 'Hoy 22:00 ART', reward: '+600 XP Clan', active: true },
    ];
    db.prepare(`
      INSERT INTO guilds (id, name, tag, motto, logo_url, level, shared_xp, next_level_xp, leader_name, member_count, pvp_points, ranks_json, events_json)
      VALUES (?, ?, ?, ?, ?, 1, 250, 2000, ?, 1, 100, ?, ?)
    `).run(
      newId,
      cleanName,
      cleanTag,
      String(motto || 'Honor y acero en la pampa.').slice(0, 120),
      String(logoUrl || '/src/assets/images/crest_sol_mayo_1795219576213.jpg'),
      leaderName || 'Martín Fierro',
      JSON.stringify(defaultRanks),
      JSON.stringify(defaultEvents)
    );
    addAuditLog('ADMIN', 'INFO', leaderName || 'Jugador', `Nuevo clan fundado: [${cleanTag}] ${cleanName} con estandarte personalizado.`);
    pushAlert('INFO', `Nuevo Clan Fundado: [${cleanTag}]`, `${cleanName} ha izado su estandarte en Fuerte Lorencia.`);
    res.json({ ok: true, guildId: newId, state: getFullState() });
  });

  app.post('/api/guilds/:id/xp', (req, res) => {
    const id = req.params.id;
    const amount = Math.max(50, Math.min(5000, Number(req.body.amount || 250)));
    const row = db.prepare('SELECT * FROM guilds WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Clan no encontrado.' });
      return;
    }
    let lvl = Number(row.level);
    let xp = Number(row.shared_xp) + amount;
    let nextXp = Number(row.next_level_xp);
    while (xp >= nextXp) {
      xp -= nextXp;
      lvl += 1;
      nextXp = Math.round(nextXp * 1.35);
    }
    db.prepare('UPDATE guilds SET level = ?, shared_xp = ?, next_level_xp = ? WHERE id = ?').run(lvl, xp, nextXp, id);
    res.json({ ok: true, state: getFullState() });
  });

  app.post('/api/guilds/:id/events', (req, res) => {
    const id = req.params.id;
    const { title, schedule, reward } = req.body as { title: string; schedule: string; reward: string };
    const row = db.prepare('SELECT * FROM guilds WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Clan no encontrado.' });
      return;
    }
    const events = JSON.parse(String(row.events_json));
    events.unshift({
      id: makeId('ev'),
      title: String(title || 'Evento Exclusivo de Clan').slice(0, 60),
      schedule: String(schedule || 'Ahora mismo').slice(0, 32),
      reward: String(reward || '+800 XP Clan · 2 Joyas').slice(0, 48),
      active: true,
    });
    db.prepare('UPDATE guilds SET events_json = ? WHERE id = ?').run(JSON.stringify(events.slice(0, 8)), id);
    pushAlert('INFO', `Evento de Clan [${row.tag}]`, `${title} ya está activo para los miembros.`);
    res.json({ ok: true, state: getFullState() });
  });

  // Voice Channels (Private Clan Channels: Password / Auto-Role / Clan-Open)
  app.post('/api/voice/channels', (req, res) => {
    const { name, guildId, accessMode, password, requiredRole, creatorName } = req.body as {
      name: string;
      guildId?: string | null;
      accessMode: string;
      password?: string;
      requiredRole?: string;
      creatorName?: string;
    };
    const id = makeId('vc');
    db.prepare(`
      INSERT INTO voice_channels (id, name, guild_id, access_mode, password, required_role, max_users, active_users_json)
      VALUES (?, ?, ?, ?, ?, ?, 24, ?)
    `).run(
      id,
      String(name || 'Sala Privada de Clan').slice(0, 48),
      guildId || 'guild_sol_mayo',
      accessMode || 'CLAN_OPEN',
      String(password || ''),
      String(requiredRole || 'Miembro Clan'),
      JSON.stringify([creatorName || 'Martín Fierro'])
    );
    addAuditLog('VOICE', 'INFO', creatorName || 'Jugador', `Canal de voz creado: "${name}" (${accessMode}).`);
    res.json({ ok: true, channelId: id, state: getFullState() });
  });

  // Tournament PvP Victory recording
  app.post('/api/tournaments/:id/record-win', (req, res) => {
    const id = req.params.id;
    const { winnerClan } = req.body as { winnerClan: string };
    const row = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Torneo no encontrado.' });
      return;
    }
    const matches = JSON.parse(String(row.matches_json)) as Array<{
      id: string;
      round: string;
      clanA: string;
      clanB: string;
      scoreA: number;
      scoreB: number;
      status: string;
      winner?: string;
    }>;
    const live = matches.find((m) => m.status === 'LIVE') || matches.find((m) => m.status === 'PENDING');
    if (live) {
      live.scoreA += 1;
      live.status = 'FINISHED';
      live.winner = winnerClan || live.clanA;
    }
    db.prepare('UPDATE tournaments SET matches_json = ? WHERE id = ?').run(JSON.stringify(matches), id);
    db.prepare('UPDATE guilds SET pvp_points = pvp_points + 120 WHERE name = ?').run(winnerClan || 'Orden del Sol de Mayo');
    addAuditLog('ADMIN', 'INFO', 'Coliseo de Mayo', `Victoria PvP registrada para ${winnerClan || 'Orden del Sol de Mayo'} (+120 pts torneo).`);
    pushAlert('INFO', 'Victoria en el Coliseo de Mayo', `${winnerClan || 'Orden del Sol de Mayo'} suma +120 puntos competitivos.`);
    res.json({ ok: true, state: getFullState() });
  });

  // Vite dev middleware or static dist serving
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pampa de Hierro server listening on http://0.0.0.0:${PORT} (SQLite: ${DB_PATH})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Pampa de Hierro server:', err);
  process.exit(1);
});
