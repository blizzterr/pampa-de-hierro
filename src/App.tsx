import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminSecurityModal } from './components/AdminSecurityModal';
import { CharacterModal } from './components/CharacterModal';
import { FairMarketModal } from './components/FairMarketModal';
import { GraphicsSettingsModal } from './components/GraphicsSettingsModal';
import { GtaHud, type ActiveDrawer } from './components/GtaHud';
import { GuildTournamentModal } from './components/GuildTournamentModal';
import { TitleScreen } from './components/TitleScreen';
import { VoiceChatModal } from './components/VoiceChatModal';
import { WorldMapModal } from './components/WorldMapModal';
import { EVOLUTIONS, INITIAL_HERO, MAPS, MILESTONES } from './data/lore';
import { audioEngine } from './game/audio';
import { PampaGameEngine } from './game/GameEngine';
import { buildAutoGraphicsSettings, detectHardwareProfile } from './game/hardware';
import type {
  AccountRole,
  CombatSnapshot,
  FloatingCombatText,
  GraphicsSettings,
  GuildRank,
  HardwareProfile,
  HeroState,
  MapId,
  MarketListing,
  PushAlert,
  ServerConfig,
  ServerStateSnapshot,
  VoiceAccessMode,
  VoiceChannel,
} from './types/game';

const DEFAULT_SERVER_CONFIG: ServerConfig = {
  defaultFps: 60,
  minFps: 30,
  maxFps: 144,
  xpMultiplier: 1.5,
  dropMultiplier: 1.25,
  resetMinLevel: 10,
  resetStatBonus: 500,
  comboMaxMultiplier: 12,
  antiRmtTolerancePct: 35,
  ddosRateLimitPerSec: 120,
  encryptionProtocol: 'AES-256-GCM + Ed25519',
  activeEvent: 'Invasión de Luz Mala (+25% Plata)',
  maxConcurrentUsers: 2500,
};

const INITIAL_COMBAT: CombatSnapshot = {
  hp: 260,
  maxHp: 260,
  mp: 150,
  maxMp: 150,
  stamina: 100,
  maxStamina: 100,
  comboCount: 0,
  comboMultiplier: 1,
  comboTimer: 0,
  comboChainStep: 0,
  skillCooldowns: [0, 0, 0, 0],
  dashCooldown: 0,
  mateCooldown: 0,
  fps: 60,
  dungeonWave: 1,
  dungeonEnemiesLeft: 0,
  pvpOpponentHp: 0,
  pvpOpponentMaxHp: 0,
  pvpOpponentName: '',
  radar: [],
  playerX: 0,
  playerZ: 6,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<PampaGameEngine | null>(null);

  const [hardware] = useState<HardwareProfile>(() => detectHardwareProfile());
  const [graphics, setGraphics] = useState<GraphicsSettings>(() =>
    buildAutoGraphicsSettings(detectHardwareProfile(), DEFAULT_SERVER_CONFIG)
  );
  const [hero, setHero] = useState<HeroState>(INITIAL_HERO);
  const [combat, setCombat] = useState<CombatSnapshot>(INITIAL_COMBAT);
  const [currentMap, setCurrentMap] = useState<MapId>('lorencia_sur');
  const [screenMode, setScreenMode] = useState<'title' | 'playing' | 'paused'>('title');
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingCombatText[]>([]);

  // Voice chat state
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState('vc_prox');
  const [personalMutedNames, setPersonalMutedNames] = useState<string[]>([]);

  // Server persisted state (SQLite) & real-time SSE Push Alerts
  const [serverState, setServerState] = useState<ServerStateSnapshot | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<PushAlert[]>([]);

  const heroRef = useRef(hero);
  heroRef.current = hero;
  const serverStateRef = useRef(serverState);
  serverStateRef.current = serverState;

  const pushLocalToast = useCallback((severity: PushAlert['severity'], title: string, body: string) => {
    const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    setLiveAlerts((prev) => [{ id, timestamp: new Date().toISOString(), severity, title, body }, ...prev].slice(0, 4));
    audioEngine.playAlertPing(severity === 'CRITICAL');
  }, []);

  // Load persisted SQLite state + SSE real-time push alerts
  useEffect(() => {
    let active = true;
    fetch('/api/state')
      .then((r) => r.json())
      .then((data: ServerStateSnapshot) => {
        if (!active) return;
        setServerState(data);
        setGraphics((prev) => ({
          ...prev,
          targetFps: Math.max(data.config.minFps, Math.min(data.config.maxFps, prev.targetFps)),
        }));
      })
      .catch(() => {});

    const es = new EventSource('/api/events');
    es.addEventListener('alert', (evt) => {
      try {
        const alert = JSON.parse((evt as MessageEvent).data) as PushAlert;
        setLiveAlerts((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)].slice(0, 4));
        audioEngine.playAlertPing(alert.severity === 'CRITICAL');
        // Refresh full state snapshot when a critical event occurs
        fetch('/api/state')
          .then((r) => r.json())
          .then((d: ServerStateSnapshot) => setServerState(d))
          .catch(() => {});
      } catch {
        // ignore parse issues
      }
    });

    return () => {
      active = false;
      es.close();
    };
  }, []);

  // Mount isolated 3D Three.js engine once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new PampaGameEngine(
      canvasMountRef.current,
      heroRef.current,
      serverStateRef.current?.config || DEFAULT_SERVER_CONFIG,
      graphics,
      hardware.isSoftwareGl,
      {
        onSnapshot: (snap) => {
          setCombat(snap);
        },
        onFloatingText: (item) => {
          setFloatingTexts((prev) => [...prev.slice(-14), item]);
          window.setTimeout(() => {
            setFloatingTexts((prev) => prev.filter((f) => f.id !== item.id));
          }, 820);
        },
        onEnemyKilled: ({ xp, silver, jewelDrop, isLobizon, comboMultiplier }) => {
          setHero((prev) => {
            let nextXp = prev.xp + xp;
            let nextLevel = prev.level;
            let nextReq = prev.nextLevelXp;
            let freePoints = prev.stats.freePoints;
            let leveledUp = false;

            while (nextXp >= nextReq) {
              nextXp -= nextReq;
              nextLevel += 1;
              nextReq = Math.round(nextReq * 1.28);
              freePoints += 10;
              leveledUp = true;
            }

            if (leveledUp) {
              audioEngine.playUpgradeSuccess();
            }

            return {
              ...prev,
              level: nextLevel,
              xp: nextXp,
              nextLevelXp: nextReq,
              silver: prev.silver + silver,
              jewels: prev.jewels + (jewelDrop ? 1 : 0),
              killsTotal: prev.killsTotal + 1,
              lobizonKills: prev.lobizonKills + (isLobizon ? 1 : 0),
              maxComboReached: Math.max(prev.maxComboReached, comboMultiplier),
              stats: { ...prev.stats, freePoints },
            };
          });
        },
        onDungeonWaveCleared: (wave) => {
          audioEngine.playUpgradeSuccess();
          setHero((prev) => ({
            ...prev,
            dungeonWavesCleared: prev.dungeonWavesCleared + 1,
            silver: prev.silver + 450 * wave,
            jewels: prev.jewels + 2,
            reputation: Math.min(1000, prev.reputation + 15),
          }));
          pushLocalToast(
            'INFO',
            `Oleada ${wave} Superada`,
            `Catacumbas del Nahuel recompensó +${450 * wave} Plata y +2 Joyas.`
          );
        },
        onPvpVictory: (opponentName) => {
          audioEngine.playResetAscension();
          setHero((prev) => ({
            ...prev,
            pvpWins: prev.pvpWins + 1,
            silver: prev.silver + 1200,
            jewels: prev.jewels + 3,
            reputation: Math.min(1000, prev.reputation + 40),
          }));
          const myGuild = serverStateRef.current?.guilds.find((g) => g.id === heroRef.current.guildId);
          fetch('/api/tournaments/tour_copa_mayo/record-win', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ winnerClan: myGuild?.name || 'Orden del Sol de Mayo' }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.state) setServerState(d.state);
            })
            .catch(() => {});
          pushLocalToast(
            'INFO',
            'Victoria en Coliseo de Mayo',
            `Venciste a ${opponentName}. +1200 Plata, +3 Joyas y puntos para tu clan.`
          );
        },
        onHeroDefeated: () => {
          pushLocalToast('WARN', 'Has Caído en Combate', 'Fuiste reanimado junto al Fogón con energía renovada.');
        },
        onPortalInteract: () => {
          setActiveDrawer('map');
        },
      }
    );

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync hero, serverConfig, graphics, and pause/title state to engine without recreating canvas
  useEffect(() => {
    engineRef.current?.syncHeroState(hero);
  }, [hero]);

  useEffect(() => {
    if (serverState?.config) {
      engineRef.current?.syncServerConfig(serverState.config);
      setGraphics((prev) => {
        const clamped = Math.max(
          serverState.config.minFps,
          Math.min(serverState.config.maxFps, prev.targetFps)
        );
        return clamped === prev.targetFps ? prev : { ...prev, targetFps: clamped };
      });
    }
  }, [serverState?.config]);

  useEffect(() => {
    engineRef.current?.applyGraphics(graphics);
  }, [graphics]);

  useEffect(() => {
    engineRef.current?.setTitleMode(screenMode === 'title');
    engineRef.current?.setPaused(screenMode === 'paused' || activeDrawer !== null);
  }, [screenMode, activeDrawer]);

  // Global keyboard shortcuts (Esc Pause/Close, H Collapse HUD, M World Map)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screenMode === 'title') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        if (e.code === 'Escape') setActiveDrawer(null);
        return;
      }

      if (e.code === 'Escape') {
        if (activeDrawer !== null) {
          setActiveDrawer(null);
        } else {
          setScreenMode((prev) => (prev === 'paused' ? 'playing' : 'paused'));
        }
      } else if (e.code === 'KeyH' && activeDrawer === null) {
        setHudCollapsed((v) => !v);
      } else if (e.code === 'KeyM') {
        setActiveDrawer((prev) => (prev === 'map' ? null : 'map'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screenMode, activeDrawer]);

  const activeServerConfig = serverState?.config || DEFAULT_SERVER_CONFIG;

  // Game actions
  const handleStartGame = () => {
    audioEngine.playUpgradeSuccess();
    setScreenMode('playing');
  };

  const handleSelectMap = (mapId: MapId) => {
    audioEngine.playUiClick();
    setCurrentMap(mapId);
    engineRef.current?.loadMap(mapId);
    setActiveDrawer(null);
    pushLocalToast('INFO', `Viaje a ${MAPS[mapId].name}`, MAPS[mapId].subtitle);
  };

  const handleAllocateStat = (stat: 'fuerza' | 'agilidad' | 'vitalidad' | 'energia') => {
    audioEngine.playUiClick();
    setHero((prev) => {
      if (prev.stats.freePoints <= 0) return prev;
      const spend = Math.min(5, prev.stats.freePoints);
      return {
        ...prev,
        stats: {
          ...prev.stats,
          [stat]: prev.stats[stat] + spend,
          freePoints: prev.stats.freePoints - spend,
        },
      };
    });
  };

  const handleUpgradeItem = (slot: 'weapon' | 'armor') => {
    setHero((prev) => {
      const currentLvl = slot === 'weapon' ? prev.weaponUpgrade : prev.armorUpgrade;
      const cost = (slot === 'weapon' ? 220 : 180) + currentLvl * (slot === 'weapon' ? 140 : 120);
      if (currentLvl >= 15 || prev.silver < cost || prev.jewels < 1) return prev;
      audioEngine.playUpgradeSuccess();
      return {
        ...prev,
        silver: prev.silver - cost,
        jewels: prev.jewels - 1,
        weaponUpgrade: slot === 'weapon' ? prev.weaponUpgrade + 1 : prev.weaponUpgrade,
        armorUpgrade: slot === 'armor' ? prev.armorUpgrade + 1 : prev.armorUpgrade,
      };
    });
  };

  const handleExecuteReset = () => {
    if (hero.level < activeServerConfig.resetMinLevel) return;
    audioEngine.playResetAscension();
    setHero((prev) => ({
      ...prev,
      level: 1,
      xp: 0,
      nextLevelXp: 140,
      resets: prev.resets + 1,
      reputation: Math.min(1000, prev.reputation + 35),
      stats: {
        ...prev.stats,
        freePoints: prev.stats.freePoints + activeServerConfig.resetStatBonus,
      },
    }));
    pushLocalToast(
      'INFO',
      `¡Reset #${hero.resets + 1} Completado!`,
      `Recibiste +${activeServerConfig.resetStatBonus} puntos permanentes para progresión infinita.`
    );
  };

  const handleEvolve = (nextTier: number) => {
    const evo = EVOLUTIONS[nextTier];
    if (!evo || hero.silver < evo.silverCost) return;
    audioEngine.playResetAscension();
    setHero((prev) => ({
      ...prev,
      evolutionTier: nextTier,
      silver: prev.silver - evo.silverCost,
      reputation: Math.min(1000, prev.reputation + 60),
    }));
    pushLocalToast('INFO', `Evolución Desbloqueada: ${evo.title}`, `Equipaste ${evo.ponchoName} y ${evo.weaponTitle}.`);
  };

  const handleClaimMilestone = (milestoneId: string) => {
    const ms = MILESTONES.find((m) => m.id === milestoneId);
    if (!ms || hero.claimedMilestones.includes(milestoneId)) return;
    audioEngine.playUpgradeSuccess();
    setHero((prev) => ({
      ...prev,
      silver: prev.silver + ms.rewardSilver,
      jewels: prev.jewels + ms.rewardJewels,
      reputation: Math.min(1000, prev.reputation + ms.rewardReputation),
      claimedMilestones: [...prev.claimedMilestones, milestoneId],
    }));
  };

  // Market handlers
  const handleBuyListing = async (listing: MarketListing) => {
    if (hero.silver < listing.price) return;
    const res = await fetch(`/api/market/buy/${listing.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerName: hero.name }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      audioEngine.playUpgradeSuccess();
      setServerState(data.state);
      setHero((prev) => ({
        ...prev,
        silver: prev.silver - listing.price,
        jewels: listing.itemCategory === 'Joya' ? prev.jewels + 3 : prev.jewels,
        reputation: Math.min(1000, prev.reputation + 10),
      }));
      pushLocalToast('INFO', 'Compra Escrow Completada', `Adquiriste ${listing.itemName} (+10 Reputación).`);
    }
  };

  const handleCreateListing = async (payload: {
    itemName: string;
    itemCategory: 'Arma' | 'Poncho' | 'Joya' | 'Reliquia';
    upgradeLevel: number;
    fairValue: number;
    price: number;
  }) => {
    const res = await fetch('/api/market/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        sellerName: hero.name,
        sellerReputation: hero.reputation,
      }),
    });
    const data = await res.json();
    if (data.state) setServerState(data.state);
    if (!res.ok) {
      return { ok: false, error: data.error };
    }
    audioEngine.playUpgradeSuccess();
    return { ok: true };
  };

  // Guild handlers
  const handleSaveGuild = async (payload: {
    id?: string;
    name: string;
    tag: string;
    motto: string;
    logoUrl: string;
    ranks: GuildRank[];
  }) => {
    const res = await fetch('/api/guilds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, leaderName: hero.name }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      audioEngine.playUpgradeSuccess();
      setServerState(data.state);
      if (data.guildId) setHero((prev) => ({ ...prev, guildId: data.guildId }));
    }
  };

  const handleDonateGuildXp = async (guildId: string) => {
    if (hero.silver < 300) return;
    const res = await fetch(`/api/guilds/${guildId}/xp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 350 }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      audioEngine.playUpgradeSuccess();
      setServerState(data.state);
      setHero((prev) => ({ ...prev, silver: prev.silver - 300, reputation: Math.min(1000, prev.reputation + 12) }));
    }
  };

  const handleCreateGuildEvent = async (guildId: string, title: string, schedule: string, reward: string) => {
    const res = await fetch(`/api/guilds/${guildId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, schedule, reward }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      audioEngine.playUiClick();
      setServerState(data.state);
    }
  };

  // Voice handlers
  const handleToggleMic = async () => {
    const res = await audioEngine.toggleMicrophone();
    setMicActive(res.active);
    setMicError(res.error || null);
  };

  const handleSelectVoiceChannel = (ch: VoiceChannel, passwordAttempt?: string): string | null => {
    if (ch.accessMode === 'PASSWORD' && passwordAttempt !== ch.password) {
      return 'Clave incorrecta para esta sala privada del clan.';
    }
    audioEngine.playUiClick();
    setActiveVoiceChannelId(ch.id);
    return null;
  };

  const handleTogglePersonalMute = (name: string) => {
    audioEngine.playUiClick();
    setPersonalMutedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleCreateVoiceChannel = async (payload: {
    name: string;
    accessMode: VoiceAccessMode;
    password: string;
    requiredRole: string;
  }) => {
    const res = await fetch('/api/voice/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        guildId: hero.guildId,
        creatorName: hero.name,
      }),
    });
    const data = await res.json();
    if (res.ok && data.state) {
      audioEngine.playUpgradeSuccess();
      setServerState(data.state);
      if (data.channelId) setActiveVoiceChannelId(data.channelId);
    }
  };

  // Admin & Security handlers
  const handleUpdateServerConfig = async (next: Partial<ServerConfig>) => {
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    const data = await res.json();
    if (res.ok) {
      audioEngine.playUiClick();
      setServerState(data);
    }
  };

  const handleAccountAction = async (
    accountId: string,
    action: string,
    extra?: { role?: AccountRole; reputationDelta?: number }
  ) => {
    const res = await fetch(`/api/admin/accounts/${accountId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra, actor: hero.name }),
    });
    const data = await res.json();
    if (res.ok) {
      audioEngine.playUiClick();
      setServerState(data);
    }
  };

  const handleSimulateDdos = async () => {
    const res = await fetch('/api/security/simulate-ddos', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setServerState(data);
    }
  };

  const nearbyAllies = combat.radar.filter((r) => r.kind === 'ally');

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090c11]">
      {/* Isolated 3D WebGL Canvas Mount */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* Title Screen */}
      {screenMode === 'title' && (
        <TitleScreen
          hardware={hardware}
          graphics={graphics}
          activeEvent={activeServerConfig.activeEvent}
          onStart={handleStartGame}
        />
      )}

      {/* Clean GTA 6–Style Modern HUD */}
      {screenMode !== 'title' && (
        <GtaHud
          hero={hero}
          combat={combat}
          currentMap={currentMap}
          floatingTexts={floatingTexts}
          alerts={liveAlerts}
          muted={muted}
          micActive={micActive}
          hudCollapsed={hudCollapsed}
          activeDrawer={activeDrawer}
          onToggleHudCollapsed={() => setHudCollapsed((v) => !v)}
          onOpenDrawer={(d) => {
            audioEngine.playUiClick();
            setActiveDrawer(d);
          }}
          onTriggerSkill={(slot) => engineRef.current?.triggerSkill(slot)}
          onTriggerDash={() => engineRef.current?.triggerDash()}
          onTriggerMate={() => engineRef.current?.triggerMateHeal()}
          onToggleMute={() => setMuted(audioEngine.toggleMute())}
          onPause={() => setScreenMode('paused')}
          onDismissAlert={(id) => setLiveAlerts((prev) => prev.filter((a) => a.id !== id))}
        />
      )}

      {/* Pause Modal */}
      {screenMode === 'paused' && activeDrawer === null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#070a0f]/75 p-4">
          <div className="w-full max-w-sm bg-[#0e131c] border border-[#d9a441]/40 rounded-sm p-6 text-center space-y-4">
            <h2 className="font-display font-extrabold text-3xl tracking-wider text-[#f7f4ec]">
              PAUSA
            </h2>
            <p className="text-xs text-[#9aa5b4]">
              {hero.name} · {MAPS[currentMap].name} · Nivel {hero.level} (Resets {hero.resets})
            </p>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => setScreenMode('playing')}
                className="w-full py-2.5 bg-[#d9a441] hover:bg-[#e8b856] text-[#090c11] font-bold text-sm rounded-sm cursor-pointer"
              >
                Reanudar Partida
              </button>
              <button
                onClick={() => {
                  setScreenMode('playing');
                  setActiveDrawer('graphics');
                }}
                className="w-full py-2.5 bg-[#17202e] hover:bg-[#222f42] text-[#e2e8f0] text-xs font-semibold rounded-sm cursor-pointer"
              >
                Configuración de Gráficos y FPS
              </button>
              <button
                onClick={() => {
                  setScreenMode('playing');
                  setActiveDrawer('admin');
                }}
                className="w-full py-2.5 bg-[#17202e] hover:bg-[#222f42] text-[#e2e8f0] text-xs font-semibold rounded-sm cursor-pointer"
              >
                Consola Web de Servidor y Seguridad
              </button>
              <button
                onClick={() => setScreenMode('title')}
                className="w-full py-2 bg-transparent hover:bg-white/5 text-[#94a3b8] text-xs rounded-sm cursor-pointer"
              >
                Volver a la Portada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Feature Modals */}
      {activeDrawer === 'map' && (
        <WorldMapModal
          currentMap={currentMap}
          heroLevel={hero.level}
          onSelectMap={handleSelectMap}
          onClose={() => setActiveDrawer(null)}
        />
      )}

      {activeDrawer === 'character' && (
        <CharacterModal
          hero={hero}
          serverConfig={activeServerConfig}
          onAllocateStat={handleAllocateStat}
          onUpgradeItem={handleUpgradeItem}
          onExecuteReset={handleExecuteReset}
          onEvolve={handleEvolve}
          onClaimMilestone={handleClaimMilestone}
          onClose={() => setActiveDrawer(null)}
        />
      )}

      {activeDrawer === 'market' && serverState && (
        <FairMarketModal
          hero={hero}
          listings={serverState.market}
          serverConfig={serverState.config}
          onBuyListing={handleBuyListing}
          onCreateListing={handleCreateListing}
          onClose={() => setActiveDrawer(null)}
        />
      )}

      {activeDrawer === 'guild' && serverState && (
        <GuildTournamentModal
          hero={hero}
          guilds={serverState.guilds}
          tournaments={serverState.tournaments}
          onSaveGuild={handleSaveGuild}
          onDonateGuildXp={handleDonateGuildXp}
          onCreateGuildEvent={handleCreateGuildEvent}
          onEnterPvpArena={() => handleSelectMap('coliseo_mayo')}
          onClose={() => setActiveDrawer(null)}
        />
      )}

      {activeDrawer === 'voice' && serverState && (
        <VoiceChatModal
          hero={hero}
          channels={serverState.voiceChannels}
          accounts={serverState.accounts}
          nearbyAllies={nearbyAllies}
          activeChannelId={activeVoiceChannelId}
          micActive={micActive}
          micError={micError}
          personalMutedNames={personalMutedNames}
          onToggleMic={handleToggleMic}
          onSelectChannel={handleSelectVoiceChannel}
          onTogglePersonalMute={handleTogglePersonalMute}
          onAdminSuspendToxic={(accId) => handleAccountAction(accId, 'SUSPEND_VOICE')}
          onCreateChannel={handleCreateVoiceChannel}
          onTestSpatialCue={(relX, dist) => audioEngine.playProximityVoiceCue(relX - combat.playerX, dist)}
          onClose={() => setActiveDrawer(null)}
        />
      )}

      {activeDrawer === 'graphics' && (
        <GraphicsSettingsModal
          hardware={hardware}
          graphics={graphics}
          serverConfig={activeServerConfig}
          currentFps={combat.fps}
          onUpdateGraphics={(next) => {
            audioEngine.playUiClick();
            setGraphics(next);
          }}
          onAutoCalibrate={() => {
            audioEngine.playUpgradeSuccess();
            setGraphics(buildAutoGraphicsSettings(hardware, activeServerConfig));
          }}
          onClose={() => setActiveDrawer(null)}
        />
      )}

      {activeDrawer === 'admin' && serverState && (
        <AdminSecurityModal
          serverState={serverState}
          onUpdateConfig={handleUpdateServerConfig}
          onAccountAction={handleAccountAction}
          onSimulateDdos={handleSimulateDdos}
          onClose={() => setActiveDrawer(null)}
        />
      )}
    </div>
  );
}
