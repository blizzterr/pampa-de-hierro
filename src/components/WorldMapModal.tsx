import React from 'react';
import { Compass, MapPin, Shield, Swords, X } from 'lucide-react';
import { MAPS } from '../data/lore';
import type { MapId } from '../types/game';

interface WorldMapModalProps {
  currentMap: MapId;
  heroLevel: number;
  onSelectMap: (mapId: MapId) => void;
  onClose: () => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  currentMap,
  heroLevel,
  onSelectMap,
  onClose,
}) => {
  const mapList = Object.values(MAPS);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/75 p-4">
      <div className="w-full max-w-4xl bg-[#0e131c] border border-[#d9a441]/35 rounded-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display font-bold text-2xl tracking-wide text-[#f7f4ec]">
              Mapa Interactivo del Reino del Sur
            </h2>
            <p className="text-xs text-[#9aa5b4]">
              Viaja entre regiones pampeanas, mazmorras dinámicas y la arena PvP de clanes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-sm bg-[#18202e] hover:bg-[#232f42] flex items-center justify-center text-[#cbd5e1] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Interactive Cartographic Canvas */}
          <div className="md:col-span-7 p-5 bg-[#0a0e16] border-b md:border-b-0 md:border-r border-white/10">
            <div className="relative w-full aspect-[4/3] bg-[#111926] border border-[#d9a441]/25 rounded-sm overflow-hidden">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Stylized medieval Argentine silhouette contours */}
                <path
                  d="M28,10 L58,12 L84,26 L79,48 L67,64 L44,88 L22,92 L18,62 L22,30 Z"
                  fill="#192334"
                  stroke="#d9a441"
                  strokeWidth="0.6"
                  opacity="0.9"
                />
                {/* Roads connecting the 5 regions */}
                <line x1="52" y1="54" x2="74" y2="31" stroke="#64748b" strokeDasharray="2,2" strokeWidth="0.5" />
                <line x1="52" y1="54" x2="30" y2="24" stroke="#64748b" strokeDasharray="2,2" strokeWidth="0.5" />
                <line x1="52" y1="54" x2="25" y2="76" stroke="#38bdf8" strokeDasharray="2,2" strokeWidth="0.6" />
                <line x1="52" y1="54" x2="64" y2="69" stroke="#f59e0b" strokeDasharray="2,2" strokeWidth="0.6" />
              </svg>

              {mapList.map((m) => {
                const isActive = m.id === currentMap;
                return (
                  <button
                    key={m.id}
                    onClick={() => onSelectMap(m.id)}
                    style={{ left: `${m.coords.x}%`, top: `${m.coords.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-sm border text-left transition-transform cursor-pointer ${
                      isActive
                        ? 'bg-[#d9a441] text-[#090c11] border-[#fef08a] font-bold scale-105'
                        : 'bg-[#0e141f]/95 hover:bg-[#1a2436] text-[#f4f1ea] border-white/25'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{m.name}</span>
                    </div>
                  </button>
                );
              })}

              <div className="absolute bottom-2 right-2 flex items-center gap-1.5 text-[10px] text-[#94a3b8] bg-[#0a0e16]/85 px-2 py-1">
                <Compass className="w-3 h-3 text-[#d9a441]" />
                <span>Rosa de los Vientos · Sur Austral</span>
              </div>
            </div>
          </div>

          {/* Region list & teleport controls */}
          <div className="md:col-span-5 p-5 max-h-[460px] overflow-y-auto pampa-scroll space-y-2.5">
            {mapList.map((m) => {
              const isCurrent = m.id === currentMap;
              return (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-sm border ${
                    isCurrent
                      ? 'bg-[#192231] border-[#d9a441]/60'
                      : 'bg-[#111722] border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-bold text-lg text-[#f7f4ec] leading-tight">
                        {m.name}
                      </h3>
                      <div className="text-[11px] text-[#94a3b8] mt-0.5">
                        {m.region} · Nv rec. {m.recommendedLevel}+
                      </div>
                    </div>
                    {m.mode === 'PVP_ARENA' ? (
                      <Swords className="w-4 h-4 text-[#f59e0b] shrink-0" />
                    ) : m.mode === 'DUNGEON' ? (
                      <Shield className="w-4 h-4 text-[#56c8ff] shrink-0" />
                    ) : null}
                  </div>
                  <p className="text-xs text-[#cbd5e1] mt-2 leading-relaxed">{m.subtitle}</p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/8">
                    <span className="text-[11px] text-[#94a3b8] truncate">
                      {m.enemies.join(', ')}
                    </span>
                    <button
                      onClick={() => onSelectMap(m.id)}
                      disabled={isCurrent}
                      className={`px-3 py-1.5 rounded-sm text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                        isCurrent
                          ? 'bg-[#1f2937] text-[#94a3b8] cursor-default'
                          : 'bg-[#d9a441] hover:bg-[#e8b856] text-[#090c11]'
                      }`}
                    >
                      {isCurrent ? 'Ubicación Actual' : heroLevel < m.recommendedLevel ? 'Viajar (Desafío)' : 'Viajar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
