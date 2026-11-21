import React, { useEffect, useState } from 'react';
import {
  Activity,
  Code2,
  Database,
  Download,
  Lock,
  Server,
  ShieldAlert,
  Sliders,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { AccountRole, ServerConfig, ServerStateSnapshot } from '../types/game';

interface AdminSecurityModalProps {
  serverState: ServerStateSnapshot;
  onUpdateConfig: (next: Partial<ServerConfig>) => Promise<void>;
  onAccountAction: (
    accountId: string,
    action: string,
    extra?: { role?: AccountRole; reputationDelta?: number }
  ) => Promise<void>;
  onSimulateDdos: () => Promise<void>;
  onClose: () => void;
}

export const AdminSecurityModal: React.FC<AdminSecurityModalProps> = ({
  serverState,
  onUpdateConfig,
  onAccountAction,
  onSimulateDdos,
  onClose,
}) => {
  const [tab, setTab] = useState<'server' | 'accounts' | 'security' | 'architecture'>('server');
  const [cfg, setCfg] = useState<ServerConfig>(serverState.config);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [blueprints, setBlueprints] = useState<{ cppHeader: string; mssqlSchema: string; sqlitePath: string } | null>(
    null
  );

  useEffect(() => {
    setCfg(serverState.config);
  }, [serverState.config]);

  useEffect(() => {
    if (tab === 'architecture' && !blueprints) {
      fetch('/api/blueprints')
        .then((r) => r.json())
        .then((d) => setBlueprints(d))
        .catch(() => {});
    }
  }, [tab, blueprints]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    await onUpdateConfig(cfg);
    setSaving(false);
    setSavedMsg('Configuración persistida en SQLite y aplicada en vivo.');
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sec = serverState.security;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/80 p-4">
      <div className="w-full max-w-6xl bg-[#0e131c] border border-[#d9a441]/40 rounded-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display font-bold text-2xl tracking-wide text-[#f7f4ec]">
              Consola Web Administrativa, Moderación y Ciberseguridad
            </h2>
            <div className="text-xs text-[#9aa5b4] font-mono-nums mt-0.5">
              BD Activa: {sec.dbEngine} · Producción: {sec.prodTargetDb} · Tráfico: {sec.packetsPerSec} pkt/s · Amenaza: {sec.threatLevel}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-sm bg-[#18202e] hover:bg-[#232f42] flex items-center justify-center text-[#cbd5e1] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-white/10 bg-[#0a0e16] overflow-x-auto">
          {[
            { id: 'server' as const, label: 'Servidor, FPS y Eventos', icon: Sliders },
            { id: 'accounts' as const, label: 'Cuentas, Roles y Sanciones', icon: Users },
            { id: 'security' as const, label: 'Defensa DDoS, Cifrado y Logs', icon: ShieldAlert },
            { id: 'architecture' as const, label: 'Núcleo C++20 y SQL Server', icon: Code2 },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
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

        <div className="p-6 max-h-[540px] overflow-y-auto pampa-scroll">
          {tab === 'server' && (
            <form onSubmit={handleSaveConfig} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#121824] border border-white/12 rounded-sm space-y-3">
                  <div className="text-xs font-bold text-[#78c8f5] uppercase tracking-wider">
                    Política de FPS por Hardware
                  </div>
                  <div>
                    <label className="block text-xs text-[#94a3b8] mb-1">FPS por Defecto</label>
                    <input
                      type="number"
                      min={20}
                      max={240}
                      value={cfg.defaultFps}
                      onChange={(e) => setCfg({ ...cfg, defaultFps: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-[#0b1018] border border-white/15 rounded-sm text-sm font-mono-nums text-[#f4f1ea]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">FPS Mínimo</label>
                      <input
                        type="number"
                        min={20}
                        max={120}
                        value={cfg.minFps}
                        onChange={(e) => setCfg({ ...cfg, minFps: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-[#0b1018] border border-white/15 rounded-sm text-sm font-mono-nums text-[#f4f1ea]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">FPS Máximo</label>
                      <input
                        type="number"
                        min={30}
                        max={240}
                        value={cfg.maxFps}
                        onChange={(e) => setCfg({ ...cfg, maxFps: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-[#0b1018] border border-white/15 rounded-sm text-sm font-mono-nums text-[#f4f1ea]"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#121824] border border-white/12 rounded-sm space-y-3">
                  <div className="text-xs font-bold text-[#fbbf24] uppercase tracking-wider">
                    Balance MU Online y Resets
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">Rate XP (x)</label>
                      <input
                        type="number"
                        step="0.25"
                        value={cfg.xpMultiplier}
                        onChange={(e) => setCfg({ ...cfg, xpMultiplier: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-[#0b1018] border border-white/15 rounded-sm text-sm font-mono-nums text-[#f4f1ea]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">Rate Drop (x)</label>
                      <input
                        type="number"
                        step="0.25"
                        value={cfg.dropMultiplier}
                        onChange={(e) => setCfg({ ...cfg, dropMultiplier: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-[#0b1018] border border-white/15 rounded-sm text-sm font-mono-nums text-[#f4f1ea]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">Nivel Reset</label>
                      <input
                        type="number"
                        value={cfg.resetMinLevel}
                        onChange={(e) => setCfg({ ...cfg, resetMinLevel: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-[#0b1018] border border-white/15 rounded-sm text-sm font-mono-nums text-[#f4f1ea]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">Pts por Reset</label>
                      <input
                        type="number"
                        value={cfg.resetStatBonus}
                        onChange={(e) => setCfg({ ...cfg, resetStatBonus: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-[#0b1018] border border-white/15 rounded-sm text-sm font-mono-nums text-[#f4f1ea]"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#121824] border border-white/12 rounded-sm space-y-3">
                  <div className="text-xs font-bold text-[#34d399] uppercase tracking-wider">
                    Escalabilidad y Evento Global
                  </div>
                  <div>
                    <label className="block text-xs text-[#94a3b8] mb-1">Evento Activo del Reino</label>
                    <input
                      type="text"
                      value={cfg.activeEvent}
                      onChange={(e) => setCfg({ ...cfg, activeEvent: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#0b1018] border border-white/15 rounded-sm text-xs text-[#f4f1ea]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">Tope Combo (x)</label>
                      <input
                        type="number"
                        value={cfg.comboMaxMultiplier}
                        onChange={(e) => setCfg({ ...cfg, comboMaxMultiplier: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-[#0b1018] border border-white/15 rounded-sm text-sm font-mono-nums text-[#f4f1ea]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">Cap. Jugadores</label>
                      <input
                        type="number"
                        value={cfg.maxConcurrentUsers}
                        onChange={(e) => setCfg({ ...cfg, maxConcurrentUsers: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-[#0b1018] border border-white/15 rounded-sm text-sm font-mono-nums text-[#f4f1ea]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[#34d399]">{savedMsg}</span>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#d9a441] hover:bg-[#e8b856] text-[#090c11] font-bold text-xs rounded-sm cursor-pointer"
                >
                  {saving ? 'Guardando en SQLite...' : 'Aplicar Configuración Global'}
                </button>
              </div>
            </form>
          )}

          {tab === 'accounts' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/12 text-[#94a3b8]">
                    <th className="py-2.5 px-3">Cuenta / Personaje</th>
                    <th className="py-2.5 px-3">Rol</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 font-mono-nums">Reputación</th>
                    <th className="py-2.5 px-3 font-mono-nums">Resets</th>
                    <th className="py-2.5 px-3">IP (Enmascarada)</th>
                    <th className="py-2.5 px-3 text-right">Moderación y Sanciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {serverState.accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-[#141c29]">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#f7f4ec]">{acc.characterName}</div>
                        <div className="text-[11px] text-[#94a3b8]">@{acc.username}</div>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={acc.role}
                          onChange={(e) =>
                            onAccountAction(acc.id, 'SET_ROLE', { role: e.target.value as AccountRole })
                          }
                          className="bg-[#0b1018] border border-white/15 px-2 py-1 rounded-sm text-[11px] text-[#e2e8f0]"
                        >
                          <option value="PLAYER">PLAYER</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 font-mono-nums">
                        <span
                          className={
                            acc.status === 'ACTIVE'
                              ? 'text-[#34d399]'
                              : acc.status === 'BANNED'
                              ? 'text-[#ef4444]'
                              : 'text-[#fbbf24]'
                          }
                        >
                          {acc.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono-nums text-[#78c8f5]">{acc.reputation}/1000</td>
                      <td className="py-3 px-3 font-mono-nums text-[#fbbf24]">{acc.resets}</td>
                      <td className="py-3 px-3 font-mono-nums text-[#94a3b8]">{acc.ipMask}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onAccountAction(acc.id, 'MUTE')}
                            className="px-2 py-1 bg-[#1e293b] hover:bg-[#334155] text-[#fde68a] rounded-sm text-[11px] cursor-pointer"
                          >
                            Mutear
                          </button>
                          <button
                            onClick={() => onAccountAction(acc.id, 'SUSPEND_VOICE')}
                            className="px-2 py-1 bg-[#3f1d24] hover:bg-[#5c2530] text-[#fca5a5] rounded-sm text-[11px] cursor-pointer"
                          >
                            Susp. Voz
                          </button>
                          <button
                            onClick={() =>
                              onAccountAction(acc.id, acc.status === 'BANNED' ? 'ACTIVATE' : 'BAN')
                            }
                            className={`px-2 py-1 rounded-sm text-[11px] font-semibold cursor-pointer ${
                              acc.status === 'BANNED'
                                ? 'bg-[#14532d] text-[#86efac]'
                                : 'bg-[#7f1d1d] hover:bg-[#991b1b] text-[#fecaca]'
                            }`}
                          >
                            {acc.status === 'BANNED' ? 'Reactivar' : 'Banear'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-5">
              {/* Security KPI strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[#121824] border border-white/10 rounded-sm">
                  <div className="text-[11px] text-[#94a3b8] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#34d399]" /> Estado Defensa
                  </div>
                  <div
                    className={`font-display font-bold text-2xl mt-1 ${
                      sec.threatLevel === 'MITIGANDO' ? 'text-[#fbbf24]' : 'text-[#34d399]'
                    }`}
                  >
                    {sec.threatLevel}
                  </div>
                </div>
                <div className="p-3.5 bg-[#121824] border border-white/10 rounded-sm">
                  <div className="text-[11px] text-[#94a3b8]">Paquetes DDoS Bloqueados</div>
                  <div className="font-mono-nums font-bold text-2xl text-[#f87171] mt-1">
                    {sec.blockedDdosPackets.toLocaleString('es-AR')}
                  </div>
                </div>
                <div className="p-3.5 bg-[#121824] border border-white/10 rounded-sm">
                  <div className="text-[11px] text-[#94a3b8]">Bloqueos Anti-RMT</div>
                  <div className="font-mono-nums font-bold text-2xl text-[#fbbf24] mt-1">
                    {sec.rmtBlocksCount}
                  </div>
                </div>
                <div className="p-3.5 bg-[#121824] border border-white/10 rounded-sm">
                  <div className="text-[11px] text-[#94a3b8] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#78c8f5]" /> Sesiones Cifradas
                  </div>
                  <div className="font-mono-nums font-bold text-2xl text-[#78c8f5] mt-1">
                    {sec.encryptedSessions}
                  </div>
                </div>
              </div>

              {/* Defense Protocol Controls */}
              <div className="p-4 bg-[#121824] border border-white/12 rounded-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-4">
                  <label className="block text-xs text-[#94a3b8] mb-1">Protocolo de Encriptación de Tráfico</label>
                  <select
                    value={cfg.encryptionProtocol}
                    onChange={(e) => {
                      const val = e.target.value as ServerConfig['encryptionProtocol'];
                      setCfg({ ...cfg, encryptionProtocol: val });
                      onUpdateConfig({ encryptionProtocol: val });
                    }}
                    className="w-full px-3 py-2 bg-[#0b1018] border border-white/15 rounded-sm text-xs text-[#f4f1ea]"
                  >
                    <option value="AES-256-GCM + Ed25519">AES-256-GCM + Ed25519 (Recomendado)</option>
                    <option value="ChaCha20-Poly1305 + X25519">ChaCha20-Poly1305 + X25519 (Baja Latencia)</option>
                    <option value="TLS 1.3 Mutual + DTLS-SRTP">TLS 1.3 Mutual + DTLS-SRTP (Voz Cifrada)</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs text-[#94a3b8] mb-1">Umbral Anti-DDoS (req/s por IP)</label>
                  <input
                    type="number"
                    value={cfg.ddosRateLimitPerSec}
                    onChange={(e) => setCfg({ ...cfg, ddosRateLimitPerSec: Number(e.target.value) })}
                    onBlur={() => onUpdateConfig({ ddosRateLimitPerSec: cfg.ddosRateLimitPerSec })}
                    className="w-full px-3 py-2 bg-[#0b1018] border border-white/15 rounded-sm text-xs font-mono-nums text-[#f4f1ea]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-[#94a3b8] mb-1">Tolerancia RMT (±%)</label>
                  <input
                    type="number"
                    value={cfg.antiRmtTolerancePct}
                    onChange={(e) => setCfg({ ...cfg, antiRmtTolerancePct: Number(e.target.value) })}
                    onBlur={() => onUpdateConfig({ antiRmtTolerancePct: cfg.antiRmtTolerancePct })}
                    className="w-full px-3 py-2 bg-[#0b1018] border border-white/15 rounded-sm text-xs font-mono-nums text-[#f4f1ea]"
                  />
                </div>
                <div className="md:col-span-3">
                  <button
                    onClick={onSimulateDdos}
                    className="w-full py-2 px-3 bg-[#dc2626] hover:bg-[#ef4444] text-white font-bold text-xs rounded-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Simular Mitigación DDoS</span>
                  </button>
                </div>
              </div>

              {/* Live Audit Logs from SQLite */}
              <div>
                <h4 className="font-display font-bold text-lg text-[#f7f4ec] mb-2">
                  Auditoría en Tiempo Real (SQLite WAL)
                </h4>
                <div className="bg-[#090c11] border border-white/10 rounded-sm divide-y divide-white/6 max-h-[210px] overflow-y-auto pampa-scroll font-mono-nums text-[11px]">
                  {serverState.auditLogs.map((log) => (
                    <div key={log.id} className="px-3 py-2 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`font-bold shrink-0 ${
                            log.severity === 'CRITICAL'
                              ? 'text-[#f87171]'
                              : log.severity === 'WARN'
                              ? 'text-[#fbbf24]'
                              : 'text-[#78c8f5]'
                          }`}
                        >
                          [{log.category}]
                        </span>
                        <span className="text-[#e2e8f0] break-words">{log.message}</span>
                      </div>
                      <span className="text-[#64748b] shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString('es-AR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'architecture' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-[#0a0e16] border border-white/12 rounded-sm overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#78c8f5]">
                    <Server className="w-4 h-4" />
                    <span>PampaServer.hpp — Núcleo C++20 Multiplataforma</span>
                  </div>
                  {blueprints && (
                    <button
                      onClick={() => downloadFile('PampaServer.hpp', blueprints.cppHeader)}
                      className="text-[11px] text-[#fbbf24] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar .hpp
                    </button>
                  )}
                </div>
                <pre className="p-4 text-[11px] font-mono-nums text-[#cbd5e1] overflow-auto max-h-[380px] pampa-scroll leading-relaxed">
                  {blueprints ? blueprints.cppHeader : 'Cargando plantilla C++20...'}
                </pre>
              </div>

              <div className="bg-[#0a0e16] border border-white/12 rounded-sm overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#fbbf24]">
                    <Database className="w-4 h-4" />
                    <span>schema_mssql.sql — Migración SQLite → SQL Server</span>
                  </div>
                  {blueprints && (
                    <button
                      onClick={() => downloadFile('schema_mssql.sql', blueprints.mssqlSchema)}
                      className="text-[11px] text-[#78c8f5] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar .sql
                    </button>
                  )}
                </div>
                <pre className="p-4 text-[11px] font-mono-nums text-[#cbd5e1] overflow-auto max-h-[380px] pampa-scroll leading-relaxed">
                  {blueprints ? blueprints.mssqlSchema : 'Cargando esquema SQL Server...'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
