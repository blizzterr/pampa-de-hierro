import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Coins,
  Gem,
  Map,
  Mic,
  Pause,
  Scale,
  Settings2,
  ShieldAlert,
  Sparkles,
  Swords,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { EVOLUTIONS, MAPS, SKILLS } from '../data/lore';
import type {
  CombatSnapshot,
  FloatingCombatText,
  HeroState,
  MapId,
  PushAlert,
} from '../types/game';

export type ActiveDrawer =
  | null
  | 'map'
  | 'character'
  | 'market'
  | 'guild'
  | 'voice'
  | 'graphics'
  | 'admin';

interface GtaHudProps {
  hero: HeroState;
  combat: CombatSnapshot;
  currentMap: MapId;
  floatingTexts: FloatingCombatText[];
  alerts: PushAlert[];
  muted: boolean;
  micActive: boolean;
  hudCollapsed: boolean;
  activeDrawer: ActiveDrawer;
  onToggleHudCollapsed: () => void;
  onOpenDrawer: (drawer: ActiveDrawer) => void;
  onTriggerSkill: (slot: number) => void;
  onTriggerDash: () => void;
  onTriggerMate: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onDismissAlert: (id: string) => void;
}

export const GtaHud: React.FC<GtaHudProps> = ({
  hero,
  combat,
  currentMap,
  floatingTexts,
  alerts,
  muted,
  micActive,
  hudCollapsed,
  activeDrawer,
  onToggleHudCollapsed,
  onOpenDrawer,
  onTriggerSkill,
  onTriggerDash,
  onTriggerMate,
  onToggleMute,
  onPause,
  onDismissAlert,
}) => {
  const mapDef = MAPS[currentMap];
  const evo = EVOLUTIONS[Math.min(EVOLUTIONS.length - 1, hero.evolutionTier)];
  const hpPct = Math.max(0, Math.min(100, (combat.hp / Math.max(1, combat.maxHp)) * 100));
  const mpPct = Math.max(0, Math.min(100, (combat.mp / Math.max(1, combat.maxMp)) * 100));
  const xpPct = Math.max(0, Math.min(100, (hero.xp / Math.max(1, hero.nextLevelXp)) * 100));

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none overflow-hidden">
      {/* Projected 3D Floating Combat Text */}
      {floatingTexts.map((ft) => (
        <div
          key={ft.id}
          style={{ left: `${ft.x}%`, top: `${ft.y}%` }}
          className={`fixed -translate-x-1/2 -translate-y-1/2 font-display font-extrabold tracking-wide transition-transform duration-300 ${
            ft.kind === 'combo'
              ? 'text-2xl text-[#56c8ff] drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]'
              : ft.kind === 'crit'
              ? 'text-xl text-[#fbbf24] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
              : ft.kind === 'heal'
              ? 'text-base text-[#34d399] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'
              : ft.kind === 'xp'
              ? 'text-sm text-[#e6c15a] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'
              : ft.kind === 'enemy'
              ? 'text-base text-[#f87171] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'
              : 'text-base text-[#f4f1ea] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'
          }`}
        >
          {ft.text}
        </div>
      ))}

      {/* Top-Center: Dynamic Dungeon Wave or PvP Rival Boss Bar (only when relevant) */}
      {(mapDef.mode === 'DUNGEON' || (mapDef.mode === 'PVP_ARENA' && combat.pvpOpponentMaxHp > 0)) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0b0e14]/90 border border-[#d9a441]/40 px-5 py-2 rounded-sm min-w-[280px]">
          {mapDef.mode === 'DUNGEON' ? (
            <div className="flex items-center justify-between gap-6 text-xs">
              <span className="font-display font-bold text-base tracking-wider text-[#78c8f5] uppercase">
                Oleada Dinámica {combat.dungeonWave}
              </span>
              <span className="font-mono-nums text-[#f4f1ea]">
                Enemigos restantes: {combat.dungeonEnemiesLeft}
              </span>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-display font-bold text-sm tracking-wider text-[#f87171] uppercase">
                  {combat.pvpOpponentName}
                </span>
                <span className="font-mono-nums text-[#d5d0c5]">
                  {Math.max(0, Math.round(combat.pvpOpponentHp))} / {combat.pvpOpponentMaxHp}
                </span>
              </div>
              <div className="w-full h-2 bg-[#1c222e] overflow-hidden">
                <div
                  className="h-full bg-[#dc2626] transition-transform duration-150 origin-left"
                  style={{
                    transform: `scaleX(${Math.max(0, combat.pvpOpponentHp / Math.max(1, combat.pvpOpponentMaxHp))})`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top-Left: Minimal Clean Hero & Map Header */}
      <div className="absolute top-4 left-4 flex items-center gap-3 pointer-events-auto">
        <div className="bg-[#0b0e14]/88 border border-white/12 px-3.5 py-2 rounded-sm">
          <div className="flex items-center gap-2.5">
            <span className="font-display font-extrabold text-lg tracking-wide text-[#f7f4ec] leading-none">
              {hero.name}
            </span>
            <span className="text-xs text-[#78c8f5] font-medium">{evo.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-[#aeb7c4] font-mono-nums">
            <span>Nv {hero.level}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#e6c15a]">Resets {hero.resets}</span>
            <span aria-hidden="true">·</span>
            <span>Rep {hero.reputation}</span>
            <span aria-hidden="true">·</span>
            <span>{combat.fps} FPS</span>
          </div>
        </div>
      </div>

      {/* Top-Right: GTA 6–Style Clean Currency, Map Name & Utility Controls */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="bg-[#0b0e14]/88 border border-white/12 px-3.5 py-1.5 rounded-sm flex items-center gap-4 text-xs font-mono-nums">
            <span className="flex items-center gap-1.5 text-[#e6c15a] font-semibold" title="Pesos de Plata">
              <Coins className="w-3.5 h-3.5" />
              {hero.silver.toLocaleString('es-AR')}
            </span>
            <span className="flex items-center gap-1.5 text-[#78c8f5] font-semibold" title="Joyas de la Plata">
              <Gem className="w-3.5 h-3.5" />
              {hero.jewels}
            </span>
            <span className="text-[#d5d0c5] font-sans font-medium hidden sm:inline">{mapDef.name}</span>
          </div>

          <button
            onClick={onToggleMute}
            title={muted ? 'Activar sonido' : 'Silenciar sonido'}
            className="w-9 h-9 bg-[#0b0e14]/88 hover:bg-[#171e2b] border border-white/12 rounded-sm flex items-center justify-center text-[#f4f1ea] cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-[#f87171]" /> : <Volume2 className="w-4 h-4 text-[#78c8f5]" />}
          </button>

          <button
            onClick={onPause}
            title="Pausa (Esc)"
            className="w-9 h-9 bg-[#0b0e14]/88 hover:bg-[#171e2b] border border-white/12 rounded-sm flex items-center justify-center text-[#f4f1ea] cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>

        {/* MU Online Active Combo Multiplier Counter (only visible while chaining!) */}
        {combat.comboCount > 0 && (
          <div className="bg-[#0b0e14]/92 border border-[#56c8ff]/55 px-4 py-2 rounded-sm min-w-[175px]">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold text-[#78c8f5] tracking-wider uppercase">
                Combo Criollo
              </span>
              <span className="font-display font-extrabold text-3xl text-[#fbbf24] leading-none font-mono-nums">
                x{combat.comboMultiplier}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#b5becb] mt-1">
              <span>{combat.comboCount} golpes</span>
              <span>Cadena {combat.comboChainStep}/3</span>
            </div>
            <div className="w-full h-1 bg-[#1e2636] mt-1.5 overflow-hidden">
              <div
                className="h-full bg-[#56c8ff] origin-left"
                style={{ transform: `scaleX(${Math.max(0, combat.comboTimer)})` }}
              />
            </div>
          </div>
        )}

        {/* Real-Time Push Alerts Toast Stack */}
        {alerts.slice(0, 2).map((al) => (
          <div
            key={al.id}
            className={`max-w-xs px-3.5 py-2 rounded-sm border text-xs bg-[#0b0e14]/95 ${
              al.severity === 'CRITICAL'
                ? 'border-[#ef4444]/70 text-[#fecaca]'
                : al.severity === 'WARN'
                ? 'border-[#f59e0b]/70 text-[#fde68a]'
                : 'border-[#38bdf8]/50 text-[#e0f2fe]'
            }`}
          >
            <div className="flex items-center justify-between gap-3 font-semibold">
              <span>{al.title}</span>
              <button
                onClick={() => onDismissAlert(al.id)}
                className="text-[#9ca3af] hover:text-white text-[11px] cursor-pointer"
              >
                Cerrar
              </button>
            </div>
            <p className="text-[11px] text-[#cbd5e1] mt-0.5 leading-snug">{al.body}</p>
          </div>
        ))}
      </div>

      {/* Bottom-Left: GTA 6 Clean Rectangular Minimap + HP/MP/XP Bars */}
      {!hudCollapsed && (
        <div className="absolute bottom-4 left-4 w-[196px] pointer-events-auto">
          <button
            onClick={() => onOpenDrawer(activeDrawer === 'map' ? null : 'map')}
            title="Abrir Mapa Interactivo (M)"
            className="relative w-full h-[116px] bg-[#0b0e14]/90 border border-white/18 rounded-sm overflow-hidden block cursor-pointer group"
          >
            {/* Subtle radar grid */}
            <svg viewBox="-30 -30 60 60" className="w-full h-full">
              <rect x="-30" y="-30" width="60" height="60" fill="#101720" />
              <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
              <circle cx="0" cy="0" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
              <line x1="-30" y1="0" x2="30" y2="0" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
              <line x1="0" y1="-30" x2="0" y2="30" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />

              {/* Radar entities */}
              {combat.radar.map((ent) => (
                <g key={ent.id} transform={`translate(${ent.x}, ${ent.z})`}>
                  {ent.kind === 'portal' && (
                    <rect x="-2.1" y="-2.1" width="4.2" height="4.2" fill="#56c8ff" transform="rotate(45)" />
                  )}
                  {ent.kind === 'ally' && (
                    <>
                      <circle r="2.0" fill="#34d399" />
                      {ent.speaking && (
                        <circle r="3.4" fill="none" stroke="#34d399" strokeWidth="0.6" opacity="0.7" />
                      )}
                    </>
                  )}
                  {ent.kind === 'enemy' && <circle r="1.5" fill="#ef4444" />}
                  {ent.kind === 'boss' && <circle r="2.6" fill="#fbbf24" stroke="#ef4444" strokeWidth="0.8" />}
                </g>
              ))}

              {/* Hero marker */}
              <g transform={`translate(${combat.playerX}, ${combat.playerZ})`}>
                <circle r="2.4" fill="#f7f4ec" stroke="#090c11" strokeWidth="0.8" />
              </g>
            </svg>

            <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[10px] text-[#cbd5e1] bg-[#090c11]/75 px-1.5 py-0.5">
              <span className="truncate">{mapDef.region}</span>
              <span className="text-[#e6c15a] shrink-0 ml-1">Mapa (M)</span>
            </div>
          </button>

          {/* GTA-style tight horizontal vitals stack */}
          <div className="mt-1.5 grid grid-cols-2 gap-1">
            <div className="h-2.5 bg-[#191f2b] border border-white/10 overflow-hidden relative">
              <div
                className="h-full bg-[#dc2626] origin-left transition-transform duration-100"
                style={{ transform: `scaleX(${hpPct / 100})` }}
              />
            </div>
            <div className="h-2.5 bg-[#191f2b] border border-white/10 overflow-hidden relative">
              <div
                className="h-full bg-[#2563eb] origin-left transition-transform duration-100"
                style={{ transform: `scaleX(${mpPct / 100})` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[10px] font-mono-nums text-[#cbd5e1] mt-0.5 px-0.5">
            <span>HP {combat.hp}/{combat.maxHp}</span>
            <span>MP {combat.mp}/{combat.maxMp}</span>
          </div>
          <div className="mt-1 h-1.5 bg-[#191f2b] border border-white/10 overflow-hidden">
            <div
              className="h-full bg-[#d9a441] origin-left transition-transform duration-150"
              style={{ transform: `scaleX(${xpPct / 100})` }}
            />
          </div>
        </div>
      )}

      {/* Bottom-Center: Unified Collapsible Action & Systems Dock */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 bottom-4 flex flex-col items-center pointer-events-auto transition-transform duration-200 ${
          hudCollapsed ? 'translate-y-[84px]' : 'translate-y-0'
        }`}
      >
        <button
          onClick={onToggleHudCollapsed}
          className="mb-1.5 px-3 py-1 bg-[#0b0e14]/88 hover:bg-[#171e2b] border border-white/12 rounded-sm text-[11px] text-[#cbd5e1] flex items-center gap-1.5 cursor-pointer"
        >
          {hudCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{hudCollapsed ? 'Mostrar HUD (H)' : 'Ocultar HUD (H)'}</span>
        </button>

        <div className="bg-[#0b0e14]/92 border border-white/15 rounded-sm px-3 py-2 flex items-center gap-2 max-w-[96vw] overflow-x-auto">
          {/* Skills 1-4 */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-white/12">
            {SKILLS.map((sk, idx) => {
              const cd = combat.skillCooldowns[idx];
              const ready = cd <= 0.01;
              const isComboHighlight =
                (idx === 1 && combat.comboChainStep === 1) ||
                (idx === 2 && combat.comboChainStep === 2);
              return (
                <button
                  key={sk.slot}
                  onClick={() => onTriggerSkill(idx)}
                  title={`${sk.name} (${sk.keyHint}) — ${sk.description}`}
                  className={`relative w-12 h-12 rounded-sm border flex flex-col items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    isComboHighlight
                      ? 'border-[#56c8ff] bg-[#102638]'
                      : ready
                      ? 'border-white/20 bg-[#151b26] hover:bg-[#1f2838]'
                      : 'border-white/10 bg-[#0f131b] opacity-65'
                  }`}
                >
                  <span className="text-[10px] font-mono-nums text-[#aeb7c4] absolute top-0.5 left-1">
                    {idx + 1}
                  </span>
                  <Swords className="w-4 h-4" style={{ color: sk.color }} />
                  <span className="text-[9px] text-[#e5e7eb] truncate max-w-[44px] mt-0.5">
                    {sk.name.split(' ')[0]}
                  </span>
                  {!ready && (
                    <div className="absolute inset-0 bg-[#090c11]/75 flex items-center justify-center font-mono-nums text-xs font-bold text-[#fbbf24]">
                      {cd.toFixed(1)}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Dash & Mate */}
            <button
              onClick={onTriggerDash}
              title="Paso Criollo (Espacio)"
              className="relative w-11 h-12 rounded-sm border border-white/15 bg-[#151b26] hover:bg-[#1f2838] flex flex-col items-center justify-center text-[10px] text-[#e2e8f0] cursor-pointer shrink-0"
            >
              <span className="font-mono-nums text-[9px] text-[#94a3b8]">ESP</span>
              <span className="font-semibold mt-0.5">Dash</span>
              {combat.dashCooldown > 0.05 && (
                <div className="absolute inset-0 bg-[#090c11]/75 flex items-center justify-center font-mono-nums text-[11px] text-[#fbbf24]">
                  {combat.dashCooldown.toFixed(1)}
                </div>
              )}
            </button>

            <button
              onClick={onTriggerMate}
              title="Cebar Mate — Restaura HP y MP (F)"
              className="relative w-11 h-12 rounded-sm border border-[#34d399]/35 bg-[#11241e] hover:bg-[#16332a] flex flex-col items-center justify-center text-[10px] text-[#6ee7b7] cursor-pointer shrink-0"
            >
              <span className="font-mono-nums text-[9px] text-[#a7f3d0]">F</span>
              <span className="font-semibold mt-0.5">Mate</span>
              {combat.mateCooldown > 0.05 && (
                <div className="absolute inset-0 bg-[#090c11]/75 flex items-center justify-center font-mono-nums text-[11px] text-[#6ee7b7]">
                  {combat.mateCooldown.toFixed(1)}
                </div>
              )}
            </button>
          </div>

          {/* System Module Drawers */}
          <div className="flex items-center gap-1">
            {[
              { id: 'character' as const, label: 'Evolución', icon: Sparkles },
              { id: 'map' as const, label: 'Mapas', icon: Map },
              { id: 'market' as const, label: 'Mercado', icon: Scale },
              { id: 'guild' as const, label: 'Clan/PvP', icon: Users },
              { id: 'voice' as const, label: micActive ? 'Voz ON' : 'Voz', icon: Mic },
              { id: 'graphics' as const, label: 'Gráficos', icon: Settings2 },
              { id: 'admin' as const, label: 'Admin', icon: ShieldAlert },
            ].map((item) => {
              const Icon = item.icon;
              const isOpen = activeDrawer === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onOpenDrawer(isOpen ? null : item.id)}
                  className={`px-2.5 h-10 rounded-sm border text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    isOpen
                      ? 'bg-[#d9a441] text-[#090c11] border-[#f8e39b] font-semibold'
                      : 'bg-[#141a24] hover:bg-[#1e2736] text-[#e2e8f0] border-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
