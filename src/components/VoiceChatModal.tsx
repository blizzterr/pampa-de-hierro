import React, { useState } from 'react';
import { Lock, Mic, MicOff, Plus, Radio, ShieldBan, UserX, Volume2, VolumeX, X } from 'lucide-react';
import type { AccountRecord, HeroState, RadarEntity, VoiceAccessMode, VoiceChannel } from '../types/game';

interface VoiceChatModalProps {
  hero: HeroState;
  channels: VoiceChannel[];
  accounts: AccountRecord[];
  nearbyAllies: RadarEntity[];
  activeChannelId: string;
  micActive: boolean;
  micError: string | null;
  personalMutedNames: string[];
  onToggleMic: () => void;
  onSelectChannel: (channel: VoiceChannel, passwordAttempt?: string) => string | null;
  onTogglePersonalMute: (name: string) => void;
  onAdminSuspendToxic: (accountId: string) => Promise<void>;
  onCreateChannel: (payload: {
    name: string;
    accessMode: VoiceAccessMode;
    password: string;
    requiredRole: string;
  }) => Promise<void>;
  onTestSpatialCue: (relX: number, dist: number) => void;
  onClose: () => void;
}

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  hero,
  channels,
  accounts,
  nearbyAllies,
  activeChannelId,
  micActive,
  micError,
  personalMutedNames,
  onToggleMic,
  onSelectChannel,
  onTogglePersonalMute,
  onAdminSuspendToxic,
  onCreateChannel,
  onTestSpatialCue,
  onClose,
}) => {
  const [newName, setNewName] = useState('');
  const [accessMode, setAccessMode] = useState<VoiceAccessMode>('CLAN_OPEN');
  const [newPassword, setNewPassword] = useState('');
  const [requiredRole, setRequiredRole] = useState('Capitán de Posta');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const isAdmin = hero.role === 'ADMIN' || hero.role === 'MODERATOR';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onCreateChannel({
      name: newName.trim(),
      accessMode,
      password: newPassword,
      requiredRole,
    });
    setNewName('');
    setNewPassword('');
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/75 p-4">
      <div className="w-full max-w-5xl bg-[#0e131c] border border-[#56c8ff]/35 rounded-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display font-bold text-2xl tracking-wide text-[#f7f4ec]">
              Voz Posicional de Proximidad y Salas de Clan
            </h2>
            <p className="text-xs text-[#9aa5b4]">
              Audio espacial 3D por distancia, silencio personal por jugador y moderación rápida de tóxicos (solo Admin).
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-sm bg-[#18202e] hover:bg-[#232f42] flex items-center justify-center text-[#cbd5e1] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[540px] overflow-y-auto pampa-scroll">
          {/* Left: Proximity Speakers & Moderation */}
          <div className="lg:col-span-7 p-5 border-b lg:border-b-0 lg:border-r border-white/10 space-y-4">
            {/* Microphone Control */}
            <div className="p-4 bg-[#121824] border border-white/12 rounded-sm flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[#f7f4ec]">Tu Micrófono (Voz 3D WebAudio)</div>
                <div className="text-xs text-[#94a3b8]">
                  {micActive
                    ? 'Micrófono activo transmitiendo en canal seleccionado.'
                    : 'Micrófono en pausa. Actívalo para hablar por proximidad o en tu clan.'}
                </div>
                {micError && <div className="text-[11px] text-[#fbbf24] mt-1">{micError}</div>}
              </div>
              <button
                onClick={onToggleMic}
                className={`px-4 py-2 rounded-sm text-xs font-bold flex items-center gap-2 cursor-pointer ${
                  micActive
                    ? 'bg-[#dc2626] hover:bg-[#ef4444] text-white'
                    : 'bg-[#34d399] hover:bg-[#10b981] text-[#090c11]'
                }`}
              >
                {micActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{micActive ? 'Silenciar Mi Mic' : 'Activar Micrófono'}</span>
              </button>
            </div>

            {/* Nearby 3D Proximity Players */}
            <div>
              <h3 className="font-display font-bold text-lg text-[#f7f4ec] mb-2 flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#34d399]" />
                <span>Jugadores en Rango de Proximidad 3D</span>
              </h3>
              <div className="space-y-2">
                {nearbyAllies.length === 0 ? (
                  <div className="p-3 bg-[#121824] border border-white/10 text-xs text-[#94a3b8]">
                    No hay aliados cercanos en este mapa. Acércate al Fogón en Fuerte Lorencia del Sur.
                  </div>
                ) : (
                  nearbyAllies.map((ally) => {
                    const isLocallyMuted = personalMutedNames.includes(ally.name);
                    return (
                      <div
                        key={ally.id}
                        className="p-3 bg-[#121824] border border-white/10 rounded-sm flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-[#f7f4ec]">
                            {ally.name}{' '}
                            {ally.guildTag && <span className="text-xs text-[#78c8f5]">[{ally.guildTag}]</span>}
                          </div>
                          <div className="text-[11px] font-mono-nums text-[#94a3b8]">
                            Distancia 3D: {ally.distance ?? 4}m · {ally.speaking ? 'Hablando ahora' : 'En escucha'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onTestSpatialCue(ally.x, ally.distance ?? 5)}
                            className="px-2.5 py-1.5 bg-[#1b2536] hover:bg-[#243248] text-[11px] text-[#78c8f5] rounded-sm flex items-center gap-1 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" /> Probar 3D
                          </button>
                          <button
                            onClick={() => onTogglePersonalMute(ally.name)}
                            className={`px-2.5 py-1.5 rounded-sm text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                              isLocallyMuted
                                ? 'bg-[#3b1c20] text-[#fca5a5] border border-[#ef4444]/40'
                                : 'bg-[#1b2536] hover:bg-[#243248] text-[#e2e8f0]'
                            }`}
                          >
                            {isLocallyMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            <span>{isLocallyMuted ? 'Silenciado (Solo yo)' : 'Mutear para mí'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Group & Toxicity Moderation List */}
            <div>
              <h3 className="font-display font-bold text-lg text-[#f7f4ec] mb-2">
                Gestión de Grupo y Control de Conducta
              </h3>
              <div className="space-y-2">
                {accounts
                  .filter((a) => a.characterName !== hero.name)
                  .map((acc) => {
                    const isLocallyMuted = personalMutedNames.includes(acc.characterName);
                    const isSuspended = acc.status === 'VOICE_SUSPENDED' || acc.status === 'BANNED';
                    return (
                      <div
                        key={acc.id}
                        className="p-3 bg-[#111722] border border-white/10 rounded-sm flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-semibold text-[#f4f1ea]">
                            {acc.characterName}{' '}
                            <span className="text-[11px] text-[#94a3b8]">({acc.role})</span>
                          </div>
                          <div className="text-[11px] font-mono-nums text-[#94a3b8]">
                            Rep: {acc.reputation} · Alertas tox.: {acc.toxicWarnings} · Estado:{' '}
                            <span className={isSuspended ? 'text-[#f87171]' : 'text-[#34d399]'}>{acc.status}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onTogglePersonalMute(acc.characterName)}
                            className="px-2.5 py-1 bg-[#1b2536] hover:bg-[#26344a] rounded-sm text-[11px] text-[#e2e8f0] cursor-pointer"
                          >
                            {isLocallyMuted ? 'Desmutear (Mío)' : 'Mutear (Solo yo)'}
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => onAdminSuspendToxic(acc.id)}
                              disabled={isSuspended}
                              title="Solo Administradores: expulsar y suspender voz a jugador tóxico"
                              className="px-2.5 py-1 bg-[#7f1d1d] hover:bg-[#991b1b] disabled:bg-[#1f2937] disabled:text-[#64748b] rounded-sm text-[11px] font-semibold text-[#fecaca] flex items-center gap-1 cursor-pointer"
                            >
                              {isSuspended ? <ShieldBan className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                              <span>{isSuspended ? 'Suspendido' : 'Expulsar / Suspender'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Right: Private Clan Voice Channels */}
          <div className="lg:col-span-5 p-5 bg-[#0b1018] space-y-4">
            <h3 className="font-display font-bold text-lg text-[#f7f4ec]">Canales de Voz Activos</h3>

            {joinError && (
              <div className="p-2.5 bg-[#2a1215] border border-[#ef4444]/50 text-xs text-[#fecaca] rounded-sm">
                {joinError}
              </div>
            )}

            <div className="space-y-2">
              {channels.map((ch) => {
                const isJoined = ch.id === activeChannelId;
                const modeLabel =
                  ch.accessMode === 'PROXIMITY'
                    ? 'Proximidad 3D'
                    : ch.accessMode === 'PASSWORD'
                    ? 'Privado con Clave'
                    : ch.accessMode === 'AUTO_ROLE'
                    ? `Auto-Rol: ${ch.requiredRole}`
                    : 'Libre para el Clan';
                return (
                  <div
                    key={ch.id}
                    className={`p-3 rounded-sm border ${
                      isJoined ? 'bg-[#142536] border-[#56c8ff]/60' : 'bg-[#121824] border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#f7f4ec] truncate flex items-center gap-1.5">
                          {ch.accessMode === 'PASSWORD' && <Lock className="w-3 h-3 text-[#fbbf24]" />}
                          <span>{ch.name}</span>
                        </div>
                        <div className="text-[11px] text-[#94a3b8] mt-0.5">
                          {modeLabel} · {ch.activeUsers.length}/{ch.maxUsers} conectados
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const err = onSelectChannel(ch, joinPassword);
                          setJoinError(err);
                        }}
                        className={`px-3 py-1.5 rounded-sm text-[11px] font-bold shrink-0 cursor-pointer ${
                          isJoined
                            ? 'bg-[#34d399] text-[#090c11]'
                            : 'bg-[#1d283a] hover:bg-[#2a3952] text-[#f4f1ea]'
                        }`}
                      >
                        {isJoined ? 'Conectado' : 'Entrar'}
                      </button>
                    </div>
                    {ch.accessMode === 'PASSWORD' && !isJoined && (
                      <input
                        type="password"
                        placeholder="Clave (ej. mayo1810)"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                        className="mt-2 w-full px-2.5 py-1 bg-[#0a0e16] border border-white/15 rounded-sm text-[11px] text-[#f4f1ea]"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Create Private Clan Channel */}
            <form onSubmit={handleCreate} className="pt-4 border-t border-white/10 space-y-2.5">
              <div className="text-xs font-semibold text-[#f8e39b]">Crear Canal Privado de Clan</div>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre de la sala..."
                className="w-full px-3 py-2 bg-[#141c29] border border-white/15 rounded-sm text-xs text-[#f4f1ea]"
              />
              <select
                value={accessMode}
                onChange={(e) => setAccessMode(e.target.value as VoiceAccessMode)}
                className="w-full px-3 py-2 bg-[#141c29] border border-white/15 rounded-sm text-xs text-[#f4f1ea]"
              >
                <option value="CLAN_OPEN">Libre para miembros del clan</option>
                <option value="PASSWORD">Acceso con clave privada</option>
                <option value="AUTO_ROLE">Aceptación automática por rol de clan</option>
              </select>

              {accessMode === 'PASSWORD' && (
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Clave de acceso de la sala"
                  className="w-full px-3 py-2 bg-[#141c29] border border-white/15 rounded-sm text-xs text-[#f4f1ea]"
                />
              )}

              {accessMode === 'AUTO_ROLE' && (
                <input
                  type="text"
                  value={requiredRole}
                  onChange={(e) => setRequiredRole(e.target.value)}
                  placeholder="Rol requerido (ej. Capitán de Posta)"
                  className="w-full px-3 py-2 bg-[#141c29] border border-white/15 rounded-sm text-xs text-[#f4f1ea]"
                />
              )}

              <button
                type="submit"
                className="w-full py-2 bg-[#56c8ff] hover:bg-[#7dd6ff] text-[#090c11] font-bold text-xs rounded-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Crear Sala de Clan
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
