import React, { useRef, useState } from 'react';
import { Calendar, Crown, Plus, Shield, Swords, Trophy, Upload, X } from 'lucide-react';
import { PRESET_GUILD_LOGOS } from '../data/lore';
import type { GuildRank, GuildRecord, HeroState, TournamentRecord } from '../types/game';

interface GuildTournamentModalProps {
  hero: HeroState;
  guilds: GuildRecord[];
  tournaments: TournamentRecord[];
  onSaveGuild: (payload: {
    id?: string;
    name: string;
    tag: string;
    motto: string;
    logoUrl: string;
    ranks: GuildRank[];
  }) => Promise<void>;
  onDonateGuildXp: (guildId: string) => Promise<void>;
  onCreateGuildEvent: (guildId: string, title: string, schedule: string, reward: string) => Promise<void>;
  onEnterPvpArena: () => void;
  onClose: () => void;
}

export const GuildTournamentModal: React.FC<GuildTournamentModalProps> = ({
  hero,
  guilds,
  tournaments,
  onSaveGuild,
  onDonateGuildXp,
  onCreateGuildEvent,
  onEnterPvpArena,
  onClose,
}) => {
  const [tab, setTab] = useState<'clan' | 'editor' | 'torneos'>('clan');
  const myGuild = guilds.find((g) => g.id === hero.guildId) || guilds[0];

  const [editMode, setEditMode] = useState<'edit' | 'create'>('edit');
  const [name, setName] = useState(myGuild?.name || 'Orden del Sol de Mayo');
  const [tag, setTag] = useState(myGuild?.tag || 'SOL');
  const [motto, setMotto] = useState(myGuild?.motto || 'Acero y palabra criolla.');
  const [logoUrl, setLogoUrl] = useState(myGuild?.logoUrl || PRESET_GUILD_LOGOS[0].url);
  const [ranks, setRanks] = useState<GuildRank[]>(
    myGuild?.ranks || [
      { id: 'r1', name: 'Gran Caudillo', canInvite: true, canManageEvents: true, canCreateVoice: true, canModerateVoice: true },
      { id: 'r2', name: 'Capitán', canInvite: true, canManageEvents: true, canCreateVoice: true, canModerateVoice: false },
      { id: 'r3', name: 'Baqueano', canInvite: false, canManageEvents: false, canCreateVoice: false, canModerateVoice: false },
    ]
  );

  const [evTitle, setEvTitle] = useState('');
  const [evSchedule, setEvSchedule] = useState('Hoy 22:00 ART');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_800_000) {
      setUploadError('La imagen debe pesar menos de 1.8 MB.');
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveGuild({
      id: editMode === 'edit' ? myGuild?.id : undefined,
      name,
      tag,
      motto,
      logoUrl,
      ranks,
    });
    setTab('clan');
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myGuild || !evTitle.trim()) return;
    await onCreateGuildEvent(myGuild.id, evTitle.trim(), evSchedule, '+900 XP Clan · 2 Joyas');
    setEvTitle('');
  };

  const xpPct = myGuild ? Math.min(100, Math.round((myGuild.sharedXp / Math.max(1, myGuild.nextLevelXp)) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/75 p-4">
      <div className="w-full max-w-5xl bg-[#0e131c] border border-[#d9a441]/35 rounded-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display font-bold text-2xl tracking-wide text-[#f7f4ec]">
              Clanes Criollos y Torneos PvP Competitivos
            </h2>
            <p className="text-xs text-[#9aa5b4]">
              Experiencia compartida, rangos personalizables, carga de logo propio y Copa del Coliseo de Mayo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-sm bg-[#18202e] hover:bg-[#232f42] flex items-center justify-center text-[#cbd5e1] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 pt-3 border-b border-white/10 bg-[#0a0e16]">
          {[
            { id: 'clan' as const, label: 'Mi Clan y Eventos', icon: Shield },
            { id: 'editor' as const, label: 'Crear / Personalizar Logo y Rangos', icon: Crown },
            { id: 'torneos' as const, label: 'Torneos PvP entre Clanes', icon: Trophy },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 cursor-pointer ${
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

        <div className="p-6 max-h-[520px] overflow-y-auto pampa-scroll">
          {tab === 'clan' && myGuild && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 bg-[#121824] border border-white/12 rounded-sm flex items-start gap-4">
                  <img
                    src={myGuild.logoUrl}
                    alt={myGuild.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-sm object-cover border border-[#d9a441]/50 shrink-0 bg-[#0a0e16]"
                  />
                  <div className="min-w-0">
                    <div className="font-display font-bold text-2xl text-[#f7f4ec] leading-tight">
                      [{myGuild.tag}] {myGuild.name}
                    </div>
                    <p className="text-xs text-[#cbd5e1] mt-1">{myGuild.motto}</p>
                    <div className="text-[11px] font-mono-nums text-[#78c8f5] mt-2">
                      Nivel Clan {myGuild.level} · {myGuild.memberCount} Miembros · {myGuild.pvpPoints} pts PvP
                    </div>
                  </div>
                </div>

                {/* Shared Clan XP */}
                <div className="p-4 bg-[#121824] border border-white/12 rounded-sm">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#f4f1ea]">Experiencia Compartida del Clan</span>
                    <span className="font-mono-nums text-[#fbbf24]">
                      {myGuild.sharedXp} / {myGuild.nextLevelXp} XP
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#1e2636] overflow-hidden">
                    <div className="h-full bg-[#d9a441]" style={{ width: `${xpPct}%` }} />
                  </div>
                  <button
                    onClick={() => onDonateGuildXp(myGuild.id)}
                    className="mt-3 w-full py-2 rounded-sm text-xs font-bold bg-[#2f85c4] hover:bg-[#3b98dc] text-white cursor-pointer"
                  >
                    Aportar +350 XP Compartida (300 Plata)
                  </button>
                </div>

                {/* Custom Ranks summary */}
                <div className="p-4 bg-[#121824] border border-white/12 rounded-sm space-y-2">
                  <div className="text-xs font-semibold text-[#f4f1ea]">Jerarquía de Rangos Personalizados</div>
                  {myGuild.ranks.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-white/6 last:border-0">
                      <span className="text-[#e6c15a] font-medium">{r.name}</span>
                      <span className="text-[10px] text-[#94a3b8]">
                        {[
                          r.canInvite && 'Invitar',
                          r.canManageEvents && 'Eventos',
                          r.canCreateVoice && 'Salas Voz',
                          r.canModerateVoice && 'Mod Voz',
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Miembro base'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exclusive Guild Events */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="font-display font-bold text-xl text-[#f7f4ec] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#d9a441]" />
                  <span>Eventos Exclusivos para Miembros</span>
                </h3>

                <form onSubmit={handleAddEvent} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={evTitle}
                    onChange={(e) => setEvTitle(e.target.value)}
                    placeholder="Nombre del evento exclusivo del clan..."
                    className="sm:col-span-6 px-3 py-2 bg-[#141c29] border border-white/15 rounded-sm text-xs text-[#f4f1ea]"
                  />
                  <input
                    type="text"
                    value={evSchedule}
                    onChange={(e) => setEvSchedule(e.target.value)}
                    className="sm:col-span-3 px-3 py-2 bg-[#141c29] border border-white/15 rounded-sm text-xs text-[#f4f1ea]"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-3 py-2 bg-[#d9a441] hover:bg-[#e8b856] text-[#090c11] font-bold text-xs rounded-sm flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Convocar
                  </button>
                </form>

                <div className="space-y-2.5">
                  {myGuild.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3.5 bg-[#121824] border border-white/10 rounded-sm flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[#f7f4ec]">{ev.title}</div>
                        <div className="text-[11px] text-[#94a3b8] mt-0.5">
                          {ev.schedule} · Recompensa: <span className="text-[#fbbf24]">{ev.reward}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#34d399]">
                        {ev.active ? 'En Curso' : 'Programado'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'editor' && (
            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditMode('edit')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-sm border cursor-pointer ${
                      editMode === 'edit'
                        ? 'bg-[#d9a441] text-[#090c11] border-[#fbbf24]'
                        : 'bg-[#141c29] text-[#cbd5e1] border-white/12'
                    }`}
                  >
                    Editar Mi Clan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode('create');
                      setName('');
                      setTag('ARG');
                      setMotto('Gloria eterna en las pampas.');
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-sm border cursor-pointer ${
                      editMode === 'create'
                        ? 'bg-[#d9a441] text-[#090c11] border-[#fbbf24]'
                        : 'bg-[#141c29] text-[#cbd5e1] border-white/12'
                    }`}
                  >
                    Fundar Nuevo Clan
                  </button>
                </div>

                {/* Custom Logo Upload (Beyond MU Online 8x8 pixel grid!) */}
                <div className="p-4 bg-[#121824] border border-white/12 rounded-sm">
                  <div className="text-xs font-semibold text-[#f4f1ea] mb-2">
                    Estandarte y Logo Personalizado (Alta Resolución)
                  </div>
                  <div className="flex items-center gap-4">
                    <img
                      src={logoUrl}
                      alt="Vista previa escudo del clan"
                      referrerPolicy="no-referrer"
                      className="w-24 h-24 rounded-sm object-cover border border-[#d9a441]/60 bg-[#090c11]"
                    />
                    <div className="flex-1 space-y-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="w-full py-2 px-3 bg-[#1d283a] hover:bg-[#27364f] border border-white/15 rounded-sm text-xs font-semibold text-[#f4f1ea] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#78c8f5]" />
                        <span>Subir Imagen Local / Galería</span>
                      </button>
                      <div className="text-[11px] text-[#94a3b8]">
                        Soporta PNG, JPG o WebP desde tu PC o galería externa.
                      </div>
                      {uploadError && <div className="text-[11px] text-[#f87171]">{uploadError}</div>}
                    </div>
                  </div>

                  {/* Curated Argentine Heraldic Presets */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
                    {PRESET_GUILD_LOGOS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setLogoUrl(preset.url)}
                        className={`p-1.5 rounded-sm border text-center cursor-pointer ${
                          logoUrl === preset.url ? 'border-[#fbbf24] bg-[#1c2330]' : 'border-white/10 bg-[#0d121a]'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          referrerPolicy="no-referrer"
                          className="w-full aspect-square object-cover rounded-sm mb-1"
                        />
                        <span className="text-[10px] text-[#cbd5e1] block truncate">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8">
                    <label className="block text-xs text-[#94a3b8] mb-1">Nombre del Clan</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Guardia de la Patagonia"
                      className="w-full px-3 py-2 bg-[#141c29] border border-white/15 rounded-sm text-sm text-[#f4f1ea]"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-xs text-[#94a3b8] mb-1">Etiqueta (Tag)</label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={tag}
                      onChange={(e) => setTag(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-[#141c29] border border-white/15 rounded-sm text-sm font-mono-nums text-[#fbbf24]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#94a3b8] mb-1">Lema del Clan</label>
                  <input
                    type="text"
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141c29] border border-white/15 rounded-sm text-xs text-[#f4f1ea]"
                  />
                </div>

                {/* Editable Custom Ranks */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#f4f1ea]">Rangos Personalizados y Permisos</span>
                    <button
                      type="button"
                      onClick={() =>
                        setRanks((prev) => [
                          ...prev,
                          {
                            id: `r_${Date.now()}`,
                            name: `Rango ${prev.length + 1}`,
                            canInvite: false,
                            canManageEvents: false,
                            canCreateVoice: false,
                            canModerateVoice: false,
                          },
                        ])
                      }
                      className="text-xs text-[#78c8f5] hover:underline cursor-pointer"
                    >
                      + Añadir Rango
                    </button>
                  </div>

                  {ranks.map((rk, idx) => (
                    <div
                      key={rk.id}
                      className="p-2.5 bg-[#121824] border border-white/10 rounded-sm flex flex-wrap items-center gap-3"
                    >
                      <input
                        type="text"
                        value={rk.name}
                        onChange={(e) => {
                          const next = [...ranks];
                          next[idx] = { ...rk, name: e.target.value };
                          setRanks(next);
                        }}
                        className="px-2 py-1 bg-[#0b1018] border border-white/15 rounded-sm text-xs text-[#fbbf24] w-36"
                      />
                      {(
                        [
                          ['canInvite', 'Invitar'],
                          ['canManageEvents', 'Eventos'],
                          ['canCreateVoice', 'Voz'],
                          ['canModerateVoice', 'Mod Voz'],
                        ] as const
                      ).map(([field, label]) => (
                        <label key={field} className="flex items-center gap-1 text-[11px] text-[#cbd5e1] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rk[field]}
                            onChange={(e) => {
                              const next = [...ranks];
                              next[idx] = { ...rk, [field]: e.target.checked };
                              setRanks(next);
                            }}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-sm text-xs font-bold bg-[#d9a441] hover:bg-[#e8b856] text-[#090c11] cursor-pointer"
                >
                  {editMode === 'edit' ? 'Guardar Cambios del Clan en SQLite' : 'Fundar Nuevo Clan'}
                </button>
              </div>
            </form>
          )}

          {tab === 'torneos' && (
            <div className="space-y-5">
              {tournaments.map((tr) => (
                <div key={tr.id} className="p-5 bg-[#121824] border border-[#d9a441]/40 rounded-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div>
                      <h3 className="font-display font-bold text-2xl text-[#f7f4ec]">{tr.name}</h3>
                      <div className="text-xs text-[#94a3b8] font-mono-nums mt-0.5">
                        Premio: {tr.prizeSilver.toLocaleString('es-AR')} Plata · +{tr.prizeReputation} Reputación · Estado: {tr.status}
                      </div>
                    </div>
                    <button
                      onClick={onEnterPvpArena}
                      className="px-5 py-2.5 bg-[#dc2626] hover:bg-[#ef4444] text-white font-display font-bold text-base tracking-wider uppercase rounded-sm flex items-center gap-2 cursor-pointer"
                    >
                      <Swords className="w-4 h-4" />
                      <span>Entrar al Coliseo de Mayo (Duelo 3D)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    {tr.matches.map((m) => (
                      <div key={m.id} className="p-3.5 bg-[#0b1018] border border-white/10 rounded-sm">
                        <div className="flex items-center justify-between text-[11px] text-[#78c8f5] mb-2">
                          <span>{m.round}</span>
                          <span className="font-mono-nums">{m.status}</span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[#f4f1ea] font-medium truncate">{m.clanA}</span>
                            <span className="font-mono-nums font-bold text-[#fbbf24]">{m.scoreA}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#cbd5e1] truncate">{m.clanB}</span>
                            <span className="font-mono-nums font-bold text-[#cbd5e1]">{m.scoreB}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Clan Leaderboard */}
              <div>
                <h4 className="font-display font-bold text-lg text-[#f7f4ec] mb-2.5">
                  Clasificación General de Clanes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {guilds.map((g, i) => (
                    <div key={g.id} className="p-3 bg-[#121824] border border-white/10 rounded-sm flex items-center gap-3">
                      <span className="font-display font-extrabold text-xl text-[#d9a441] w-6">#{i + 1}</span>
                      <img
                        src={g.logoUrl}
                        alt={g.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-sm object-cover border border-white/15"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#f4f1ea] truncate">[{g.tag}] {g.name}</div>
                        <div className="text-[11px] font-mono-nums text-[#78c8f5]">{g.pvpPoints} pts · Nv {g.level}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
