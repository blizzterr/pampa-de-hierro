import React, { useState } from 'react';
import { Award, Flame, Hammer, RefreshCw, Sparkles, X } from 'lucide-react';
import { EVOLUTIONS, MILESTONES } from '../data/lore';
import type { HeroState, ServerConfig } from '../types/game';

interface CharacterModalProps {
  hero: HeroState;
  serverConfig: ServerConfig;
  onAllocateStat: (stat: 'fuerza' | 'agilidad' | 'vitalidad' | 'energia') => void;
  onUpgradeItem: (slot: 'weapon' | 'armor') => void;
  onExecuteReset: () => void;
  onEvolve: (nextTier: number) => void;
  onClaimMilestone: (milestoneId: string) => void;
  onClose: () => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  hero,
  serverConfig,
  onAllocateStat,
  onUpgradeItem,
  onExecuteReset,
  onEvolve,
  onClaimMilestone,
  onClose,
}) => {
  const [tab, setTab] = useState<'forja' | 'evolucion' | 'hitos'>('forja');
  const currentEvo = EVOLUTIONS[hero.evolutionTier];
  const nextEvo = EVOLUTIONS[hero.evolutionTier + 1];

  const weaponSilverCost = 220 + hero.weaponUpgrade * 140;
  const armorSilverCost = 180 + hero.armorUpgrade * 120;
  const canReset = hero.level >= serverConfig.resetMinLevel;

  const canEvolve =
    nextEvo &&
    hero.level >= nextEvo.minLevel &&
    hero.resets >= nextEvo.minResets &&
    hero.killsTotal >= nextEvo.requiredKills &&
    hero.dungeonWavesCleared >= nextEvo.requiredDungeonWaves &&
    hero.pvpWins >= nextEvo.requiredPvpWins &&
    hero.silver >= nextEvo.silverCost;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/75 p-4">
      <div className="w-full max-w-4xl bg-[#0e131c] border border-[#d9a441]/35 rounded-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display font-bold text-2xl tracking-wide text-[#f7f4ec]">
              {hero.name} — {currentEvo.title}
            </h2>
            <div className="text-xs text-[#9aa5b4] font-mono-nums mt-0.5">
              Clase: {hero.className} · Nivel {hero.level} · Resets {hero.resets} · Plata {hero.silver.toLocaleString('es-AR')} · Joyas {hero.jewels}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-sm bg-[#18202e] hover:bg-[#232f42] flex items-center justify-center text-[#cbd5e1] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-white/10 bg-[#0a0e16]">
          {[
            { id: 'forja' as const, label: 'Forja (+15), Atributos y Reset', icon: Hammer },
            { id: 'evolucion' as const, label: 'Evoluciones y Misiones', icon: Sparkles },
            { id: 'hitos' as const, label: 'Hitos y Recompensas', icon: Award },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                  tab === t.id
                    ? 'border-[#d9a441] text-[#f8e39b]'
                    : 'border-transparent text-[#94a3b8] hover:text-[#e2e8f0]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-6 max-h-[500px] overflow-y-auto pampa-scroll">
          {tab === 'forja' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Attributes */}
              <div className="md:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-lg text-[#f7f4ec]">Atributos del Caudillo</h3>
                  <span className="text-xs font-mono-nums text-[#fbbf24] font-semibold">
                    Puntos libres: {hero.stats.freePoints}
                  </span>
                </div>
                {(
                  [
                    { key: 'fuerza', label: 'Fuerza', desc: 'Daño de Facón y Lanza' },
                    { key: 'agilidad', label: 'Agilidad', desc: 'Velocidad y Crítico' },
                    { key: 'vitalidad', label: 'Vitalidad', desc: 'Vida Máxima (HP)' },
                    { key: 'energia', label: 'Energía', desc: 'Maná y Poder de Combo' },
                  ] as const
                ).map((st) => (
                  <div
                    key={st.key}
                    className="flex items-center justify-between p-3 bg-[#131a26] border border-white/10 rounded-sm"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#f4f1ea]">{st.label}</div>
                      <div className="text-[11px] text-[#94a3b8]">{st.desc}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono-nums text-base font-bold text-[#78c8f5]">
                        {hero.stats[st.key]}
                      </span>
                      <button
                        onClick={() => onAllocateStat(st.key)}
                        disabled={hero.stats.freePoints <= 0}
                        className="px-2.5 py-1 rounded-sm text-xs font-bold bg-[#d9a441] disabled:bg-[#232c3b] disabled:text-[#64748b] text-[#090c11] cursor-pointer"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Equipment Upgrade (+0..+15) & Reset System */}
              <div className="md:col-span-7 space-y-4">
                <h3 className="font-display font-bold text-lg text-[#f7f4ec]">
                  Forja Criolla (Mejoras +0 a +15)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-[#131a26] border border-white/12 rounded-sm">
                    <div className="text-xs text-[#78c8f5]">Arma Equipada</div>
                    <div className="font-display font-bold text-xl text-[#f7f4ec] mt-0.5">
                      {currentEvo.weaponTitle} <span className="text-[#fbbf24]">+{hero.weaponUpgrade}</span>
                    </div>
                    <div className="text-[11px] text-[#94a3b8] mt-1">
                      Brillo dorado estilo MU desde +9. Costo: {weaponSilverCost} Plata + 1 Joya.
                    </div>
                    <button
                      onClick={() => onUpgradeItem('weapon')}
                      disabled={hero.weaponUpgrade >= 15 || hero.silver < weaponSilverCost || hero.jewels < 1}
                      className="mt-3 w-full py-2 rounded-sm text-xs font-bold bg-[#d9a441] hover:bg-[#e8b856] disabled:bg-[#232c3b] disabled:text-[#64748b] text-[#090c11] cursor-pointer"
                    >
                      {hero.weaponUpgrade >= 15 ? 'Nivel Máximo (+15)' : `Mejorar a +${hero.weaponUpgrade + 1}`}
                    </button>
                  </div>

                  <div className="p-4 bg-[#131a26] border border-white/12 rounded-sm">
                    <div className="text-xs text-[#78c8f5]">Indumentaria y Poncho</div>
                    <div className="font-display font-bold text-xl text-[#f7f4ec] mt-0.5">
                      {currentEvo.ponchoName} <span className="text-[#fbbf24]">+{hero.armorUpgrade}</span>
                    </div>
                    <div className="text-[11px] text-[#94a3b8] mt-1">
                      Mitigación de daño +{Math.round(hero.armorUpgrade * 2.5)}%. Costo: {armorSilverCost} Plata + 1 Joya.
                    </div>
                    <button
                      onClick={() => onUpgradeItem('armor')}
                      disabled={hero.armorUpgrade >= 15 || hero.silver < armorSilverCost || hero.jewels < 1}
                      className="mt-3 w-full py-2 rounded-sm text-xs font-bold bg-[#2f85c4] hover:bg-[#3e97d6] disabled:bg-[#232c3b] disabled:text-[#64748b] text-white cursor-pointer"
                    >
                      {hero.armorUpgrade >= 15 ? 'Nivel Máximo (+15)' : `Templar a +${hero.armorUpgrade + 1}`}
                    </button>
                  </div>
                </div>

                {/* MU Online Infinite Reset System */}
                <div className="p-4 bg-[#161c29] border border-[#d9a441]/45 rounded-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-[#fbbf24] font-display font-bold text-xl">
                        <RefreshCw className="w-4 h-4" />
                        <span>Sistema de Reset (Progresión Infinita)</span>
                      </div>
                      <p className="text-xs text-[#cbd5e1] mt-1">
                        Reinicia tu personaje a Nivel 1 conservando tus mejoras, poncho, evoluciones e inventario, y recibe{' '}
                        <span className="text-[#fbbf24] font-semibold">+{serverConfig.resetStatBonus} puntos de atributo</span> permanentes.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                    <span className="text-xs font-mono-nums text-[#94a3b8]">
                      Nivel requerido (Servidor): {hero.level} / {serverConfig.resetMinLevel}
                    </span>
                    <button
                      onClick={onExecuteReset}
                      disabled={!canReset}
                      className="px-4 py-2 rounded-sm text-xs font-bold bg-[#fbbf24] hover:bg-[#fcd34d] disabled:bg-[#232c3b] disabled:text-[#64748b] text-[#090c11] cursor-pointer"
                    >
                      {canReset ? `Ejecutar Reset #${hero.resets + 1}` : `Requiere Nivel ${serverConfig.resetMinLevel}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'evolucion' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {EVOLUTIONS.map((ev) => {
                  const unlocked = hero.evolutionTier >= ev.tier;
                  const isNext = hero.evolutionTier + 1 === ev.tier;
                  return (
                    <div
                      key={ev.tier}
                      className={`p-4 rounded-sm border ${
                        unlocked
                          ? 'bg-[#13202d] border-[#56c8ff]/50'
                          : isNext
                          ? 'bg-[#191d28] border-[#d9a441]/55'
                          : 'bg-[#10151f] border-white/10 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono-nums text-[#94a3b8]">Grado {ev.tier + 1}</span>
                        <span className="text-xs font-semibold text-[#fbbf24]">
                          {unlocked ? 'Completada' : isNext ? 'Misión Activa' : 'Bloqueada'}
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-xl text-[#f7f4ec] mt-1">{ev.title}</h4>
                      <div className="text-xs text-[#78c8f5] mt-0.5">
                        {ev.ponchoName} · {ev.weaponTitle}
                      </div>
                      <p className="text-xs text-[#cbd5e1] mt-2 leading-relaxed">
                        <strong>Misión — {ev.questName}:</strong> {ev.questDescription}
                      </p>

                      <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono-nums text-[#94a3b8]">
                        <span>Nv {hero.level}/{ev.minLevel}</span>
                        <span>Resets {hero.resets}/{ev.minResets}</span>
                        <span>Bajas {hero.killsTotal}/{ev.requiredKills}</span>
                        {ev.requiredDungeonWaves > 0 && (
                          <span>Oleadas {hero.dungeonWavesCleared}/{ev.requiredDungeonWaves}</span>
                        )}
                        {ev.requiredPvpWins > 0 && (
                          <span>PvP {hero.pvpWins}/{ev.requiredPvpWins}</span>
                        )}
                        <span>Plata {ev.silverCost}</span>
                      </div>

                      {isNext && (
                        <button
                          onClick={() => onEvolve(ev.tier)}
                          disabled={!canEvolve}
                          className="mt-3 w-full py-2 rounded-sm text-xs font-bold bg-[#d9a441] hover:bg-[#e8b856] disabled:bg-[#232c3b] disabled:text-[#64748b] text-[#090c11] cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>{canEvolve ? `Ascender a ${ev.title}` : 'Completa los requisitos de misión'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'hitos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {MILESTONES.map((ms) => {
                const current = hero[ms.metric];
                const claimed = hero.claimedMilestones.includes(ms.id);
                const ready = current >= ms.target && !claimed;
                const pct = Math.min(100, Math.round((current / ms.target) * 100));
                return (
                  <div
                    key={ms.id}
                    className={`p-4 rounded-sm border ${
                      claimed
                        ? 'bg-[#101a19] border-[#34d399]/35'
                        : ready
                        ? 'bg-[#1c1b15] border-[#fbbf24]/60'
                        : 'bg-[#121824] border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-display font-bold text-lg text-[#f7f4ec]">{ms.title}</h4>
                      <span className="font-mono-nums text-xs text-[#78c8f5]">
                        {Math.min(current, ms.target)} / {ms.target}
                      </span>
                    </div>
                    <p className="text-xs text-[#cbd5e1] mt-1">{ms.description}</p>
                    <div className="w-full h-1.5 bg-[#1e2636] mt-2.5 overflow-hidden">
                      <div className="h-full bg-[#d9a441]" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/8 text-xs">
                      <span className="font-mono-nums text-[#e6c15a]">
                        +{ms.rewardSilver} Plata · +{ms.rewardJewels} Joyas · +{ms.rewardReputation} Rep
                      </span>
                      <button
                        onClick={() => onClaimMilestone(ms.id)}
                        disabled={!ready}
                        className={`px-3 py-1 rounded-sm text-xs font-bold cursor-pointer ${
                          claimed
                            ? 'bg-[#152e27] text-[#34d399] cursor-default'
                            : ready
                            ? 'bg-[#fbbf24] hover:bg-[#fcd34d] text-[#090c11]'
                            : 'bg-[#1f2937] text-[#64748b] cursor-not-allowed'
                        }`}
                      >
                        {claimed ? 'Reclamado' : ready ? 'Reclamar' : 'En progreso'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
