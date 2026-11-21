import React from 'react';
import { Cpu, Gauge, Monitor, Sparkles, X } from 'lucide-react';
import type { GraphicsSettings, HardwareProfile, HardwareTier, ServerConfig } from '../types/game';

interface GraphicsSettingsModalProps {
  hardware: HardwareProfile;
  graphics: GraphicsSettings;
  serverConfig: ServerConfig;
  currentFps: number;
  onUpdateGraphics: (next: GraphicsSettings) => void;
  onAutoCalibrate: () => void;
  onClose: () => void;
}

export const GraphicsSettingsModal: React.FC<GraphicsSettingsModalProps> = ({
  hardware,
  graphics,
  serverConfig,
  currentFps,
  onUpdateGraphics,
  onAutoCalibrate,
  onClose,
}) => {
  const applyPreset = (tier: HardwareTier) => {
    const clamp = (v: number) => Math.max(serverConfig.minFps, Math.min(serverConfig.maxFps, v));
    if (tier === 'BAJO') {
      onUpdateGraphics({
        tier: 'BAJO',
        targetFps: clamp(Math.min(serverConfig.defaultFps, 45)),
        pixelRatio: 1,
        shadowsEnabled: false,
        particleDensity: 0.45,
        antialiasing: false,
        autoDetected: false,
      });
    } else if (tier === 'MEDIO') {
      onUpdateGraphics({
        tier: 'MEDIO',
        targetFps: clamp(serverConfig.defaultFps),
        pixelRatio: 1.5,
        shadowsEnabled: !hardware.isSoftwareGl,
        particleDensity: 0.75,
        antialiasing: !hardware.isSoftwareGl,
        autoDetected: false,
      });
    } else {
      onUpdateGraphics({
        tier: 'ALTO',
        targetFps: clamp(serverConfig.maxFps),
        pixelRatio: Math.min(window.devicePixelRatio || 2, 2),
        shadowsEnabled: !hardware.isSoftwareGl,
        particleDensity: 1.0,
        antialiasing: !hardware.isSoftwareGl,
        autoDetected: false,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/75 p-4">
      <div className="w-full max-w-2xl bg-[#0e131c] border border-[#d9a441]/35 rounded-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display font-bold text-2xl tracking-wide text-[#f7f4ec]">
              Auto-Detección de Hardware y Rendimiento FPS
            </h2>
            <p className="text-xs text-[#9aa5b4]">
              Rango autorizado por el servidor: {serverConfig.minFps} FPS mínimo · {serverConfig.defaultFps} FPS por defecto · {serverConfig.maxFps} FPS máximo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-sm bg-[#18202e] hover:bg-[#232f42] flex items-center justify-center text-[#cbd5e1] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Hardware Detection Readout */}
          <div className="p-4 bg-[#121824] border border-white/12 rounded-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] text-[#94a3b8] flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-[#78c8f5]" /> GPU Detectada
              </div>
              <div className="text-xs font-semibold text-[#f4f1ea] mt-1 truncate" title={hardware.gpuRenderer}>
                {hardware.gpuRenderer}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#94a3b8] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#d9a441]" /> CPU / Memoria
              </div>
              <div className="text-xs font-mono-nums font-semibold text-[#f4f1ea] mt-1">
                {hardware.cpuCores} hilos · {hardware.memoryGb} GB RAM
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#94a3b8] flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-[#34d399]" /> Perfil Sugerido / Actual
              </div>
              <div className="text-xs font-mono-nums font-semibold text-[#34d399] mt-1">
                {hardware.detectedTier} · {currentFps} FPS activos
              </div>
            </div>
          </div>

          {/* Preset Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#f4f1ea]">Perfil de Computadora</span>
              <button
                onClick={onAutoCalibrate}
                className="text-xs text-[#78c8f5] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Re-calibrar Automáticamente
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {(['BAJO', 'MEDIO', 'ALTO'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => applyPreset(tier)}
                  className={`py-2.5 rounded-sm border text-xs font-bold cursor-pointer ${
                    graphics.tier === tier
                      ? 'bg-[#d9a441] text-[#090c11] border-[#fbbf24]'
                      : 'bg-[#141c29] hover:bg-[#1e293d] text-[#e2e8f0] border-white/12'
                  }`}
                >
                  Rendimiento {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Target FPS Slider clamped by Server Policy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#cbd5e1]">Límite Objetivo de FPS (Controlado por Servidor)</span>
              <span className="font-mono-nums font-bold text-[#fbbf24]">{graphics.targetFps} FPS</span>
            </div>
            <input
              type="range"
              min={serverConfig.minFps}
              max={serverConfig.maxFps}
              step={1}
              value={graphics.targetFps}
              onChange={(e) =>
                onUpdateGraphics({
                  ...graphics,
                  targetFps: Number(e.target.value),
                  autoDetected: false,
                })
              }
              className="w-full accent-[#d9a441]"
            />
            <div className="flex justify-between text-[11px] font-mono-nums text-[#64748b]">
              <span>Min Servidor: {serverConfig.minFps}</span>
              <span>Defecto: {serverConfig.defaultFps}</span>
              <span>Max Servidor: {serverConfig.maxFps}</span>
            </div>
          </div>

          {/* Fine controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
            <label className="flex items-center justify-between p-3 bg-[#121824] border border-white/10 rounded-sm text-xs cursor-pointer">
              <span className="text-[#e2e8f0]">Sombras Dinámicas PCF</span>
              <input
                type="checkbox"
                checked={graphics.shadowsEnabled}
                onChange={(e) =>
                  onUpdateGraphics({ ...graphics, shadowsEnabled: e.target.checked, autoDetected: false })
                }
              />
            </label>
            <div className="p-3 bg-[#121824] border border-white/10 rounded-sm">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#e2e8f0]">Densidad de Partículas</span>
                <span className="font-mono-nums text-[#78c8f5]">{Math.round(graphics.particleDensity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.35}
                max={1}
                step={0.05}
                value={graphics.particleDensity}
                onChange={(e) =>
                  onUpdateGraphics({
                    ...graphics,
                    particleDensity: Number(e.target.value),
                    autoDetected: false,
                  })
                }
                className="w-full accent-[#56c8ff]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
