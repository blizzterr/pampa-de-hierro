import React, { useEffect } from 'react';
import type { GraphicsSettings, HardwareProfile } from '../types/game';

interface TitleScreenProps {
  hardware: HardwareProfile;
  graphics: GraphicsSettings;
  activeEvent: string;
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hardware,
  graphics,
  activeEvent,
  onStart,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-8 md:p-14 bg-gradient-to-r from-[#090c11]/88 via-[#090c11]/45 to-transparent">
      {/* Top quiet metadata bar */}
      <div className="flex items-center justify-between text-xs text-[#c9c3b6] tracking-wide">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[#e6c15a]">Reino del Sur</span>
          <span aria-hidden="true">·</span>
          <span>Fuerte Lorencia</span>
          <span aria-hidden="true">·</span>
          <span className="text-[#78c8f5]">{activeEvent}</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 font-mono-nums text-[#aeb7c4]">
          <span>Auto-HW: {hardware.detectedTier}</span>
          <span aria-hidden="true">·</span>
          <span>{graphics.targetFps} FPS</span>
        </div>
      </div>

      {/* Left-aligned bespoke SVG Title Lockup over calm negative space */}
      <div className="max-w-xl my-auto">
        <svg
          viewBox="0 0 540 164"
          className="w-full max-w-[490px] h-auto mb-5"
          role="img"
          aria-label="Pampa de Hierro"
        >
          <defs>
            <linearGradient id="solGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8e39b" />
              <stop offset="52%" stopColor="#d9a441" />
              <stop offset="100%" stopColor="#9c6b1c" />
            </linearGradient>
            <linearGradient id="celesteMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#96d7ff" />
              <stop offset="100%" stopColor="#2f85c4" />
            </linearGradient>
          </defs>

          {/* Heraldic Sol de Mayo crest */}
          <g transform="translate(52, 78)">
            <circle r="34" fill="none" stroke="url(#celesteMetal)" strokeWidth="2.5" opacity="0.85" />
            <circle r="24" fill="#121822" stroke="url(#solGold)" strokeWidth="2.5" />
            {Array.from({ length: 16 }).map((_, i) => {
              const ang = (i / 16) * 360;
              return (
                <polygon
                  key={i}
                  points="0,-42 3,-27 -3,-27"
                  fill="url(#solGold)"
                  transform={`rotate(${ang})`}
                />
              );
            })}
            <circle r="11" fill="url(#solGold)" />
          </g>

          {/* Display Typography */}
          <text
            x="108"
            y="74"
            fill="#f7f4ec"
            fontFamily="Barlow Condensed, sans-serif"
            fontWeight="800"
            fontSize="64"
            letterSpacing="3"
          >
            PAMPA DE HIERRO
          </text>
          <rect x="108" y="88" width="388" height="2" fill="url(#solGold)" opacity="0.85" />
          <text
            x="108"
            y="114"
            fill="#8ecdf5"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="600"
            fontSize="16"
            letterSpacing="4.5"
          >
            MMORPG MEDIEVAL ARGENTINO 3D
          </text>
          <text
            x="108"
            y="138"
            fill="#b8b2a6"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="500"
            fontSize="13"
          >
            Combos Criollos · Resets Infinitos · Comercio Justo · Clanes y Voz Posicional
          </text>
        </svg>

        <p className="text-sm md:text-base text-[#d5d0c5] leading-relaxed mb-7 max-w-md">
          Encarna al Caudillo Errante en una tierra medieval forjada entre ombúes, quebradas andinas y
          catacumbas dinámicas. Domina cadenas de habilidades, funda tu clan y defiende el Coliseo de Mayo.
        </p>

        <div className="flex items-center gap-4">
          <button
            onClick={onStart}
            className="px-8 py-3.5 bg-[#d9a441] hover:bg-[#e8b856] active:scale-[0.99] text-[#090c11] font-display font-extrabold text-xl tracking-wider uppercase rounded-sm transition-transform cursor-pointer shadow-lg"
          >
            Entrar al Reino
          </button>
          <span className="text-xs text-[#aeb7c4]">Pulsa Enter o Espacio para comenzar</span>
        </div>
      </div>

      {/* Single flat control-hint footer line */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs text-[#b5becb]">
        <div className="font-mono-nums">
          WASD / Clic Mover · 1-4 Habilidades y Combos · Espacio Esquivar · F Mate · M Mapa · Esc Pausa
        </div>
        <div className="text-[#8e99a8]">
          Perfil gráfico calibrado: {graphics.tier} ({hardware.cpuCores} núcleos · {hardware.memoryGb} GB RAM)
        </div>
      </div>
    </div>
  );
};
