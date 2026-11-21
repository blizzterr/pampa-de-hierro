import React, { useState } from 'react';
import { CheckCircle2, Lock, Scale, ShieldAlert, ShoppingBag, X } from 'lucide-react';
import type { HeroState, MarketListing, ServerConfig } from '../types/game';

interface FairMarketModalProps {
  hero: HeroState;
  listings: MarketListing[];
  serverConfig: ServerConfig;
  onBuyListing: (listing: MarketListing) => Promise<void>;
  onCreateListing: (payload: {
    itemName: string;
    itemCategory: 'Arma' | 'Poncho' | 'Joya' | 'Reliquia';
    upgradeLevel: number;
    fairValue: number;
    price: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}

const FAIR_PRESETS: Array<{
  name: string;
  category: 'Arma' | 'Poncho' | 'Joya' | 'Reliquia';
  upgradeLevel: number;
  fairValue: number;
}> = [
  { name: 'Facón de Acero Templado', category: 'Arma', upgradeLevel: 6, fairValue: 1100 },
  { name: 'Poncho Punzó Bordado', category: 'Poncho', upgradeLevel: 5, fairValue: 1450 },
  { name: 'Joya de la Plata Pura (x2)', category: 'Joya', upgradeLevel: 0, fairValue: 650 },
  { name: 'Boleadoras de Plata Labrada', category: 'Reliquia', upgradeLevel: 8, fairValue: 1950 },
];

export const FairMarketModal: React.FC<FairMarketModalProps> = ({
  hero,
  listings,
  serverConfig,
  onBuyListing,
  onCreateListing,
  onClose,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [askPrice, setAskPrice] = useState(String(FAIR_PRESETS[0].fairValue));
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const preset = FAIR_PRESETS[selectedIdx];
  const tol = serverConfig.antiRmtTolerancePct;
  const minFair = Math.round(preset.fairValue * (1 - tol / 100));
  const maxFair = Math.round(preset.fairValue * (1 + tol / 100));

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    const res = await onCreateListing({
      itemName: preset.name,
      itemCategory: preset.category,
      upgradeLevel: preset.upgradeLevel,
      fairValue: preset.fairValue,
      price: Number(askPrice),
    });
    setBusy(false);
    if (res.ok) {
      setFeedback({ type: 'ok', text: 'Oferta publicada con custodia Escrow y sello Anti-RMT.' });
    } else {
      setFeedback({ type: 'err', text: res.error || 'Operación rechazada por protección Anti-RMT.' });
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/75 p-4">
      <div className="w-full max-w-5xl bg-[#0e131c] border border-[#d9a441]/35 rounded-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display font-bold text-2xl tracking-wide text-[#f7f4ec]">
              Mercado de Comercio Justo y Custodia Anti-RMT
            </h2>
            <div className="text-xs text-[#9aa5b4] mt-0.5 font-mono-nums">
              Tu Reputación: {hero.reputation}/1000 · Saldo: {hero.silver.toLocaleString('es-AR')} Plata · Banda Justa: ±{tol}% del valor de referencia
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-sm bg-[#18202e] hover:bg-[#232f42] flex items-center justify-center text-[#cbd5e1] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[540px] overflow-y-auto pampa-scroll">
          {/* Active Fair-Trade Listings */}
          <div className="lg:col-span-7 p-5 border-b lg:border-b-0 lg:border-r border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#f7f4ec] flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#d9a441]" />
                <span>Ofertas Verificadas por Reputación</span>
              </h3>
              <span className="text-[11px] text-[#34d399] flex items-center gap-1">
                <Lock className="w-3 h-3" /> Custodia Escrow Activa
              </span>
            </div>

            {listings.filter((l) => l.status === 'ACTIVE').length === 0 ? (
              <div className="p-6 text-center text-xs text-[#94a3b8] bg-[#121824] border border-white/8">
                No hay ofertas activas en este momento. Publica un objeto para iniciar el intercambio.
              </div>
            ) : (
              listings
                .filter((l) => l.status === 'ACTIVE')
                .map((item) => {
                  const canAfford = hero.silver >= item.price;
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 bg-[#121824] border border-white/10 rounded-sm flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#f7f4ec] truncate">
                            {item.itemName}
                            {item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : ''}
                          </span>
                          <span className="text-[11px] text-[#78c8f5]">{item.itemCategory}</span>
                        </div>
                        <div className="text-[11px] text-[#94a3b8] font-mono-nums mt-1">
                          Vendedor: {item.sellerName} · Rep {item.sellerReputation}/1000 · Ref {item.fairValue} Plata
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-mono-nums">
                          <div className="text-sm font-bold text-[#fbbf24]">
                            {item.price.toLocaleString('es-AR')} Plata
                          </div>
                          <div className="text-[10px] text-[#34d399]">Precio Justo</div>
                        </div>
                        <button
                          onClick={() => onBuyListing(item)}
                          disabled={!canAfford}
                          className="px-3.5 py-2 rounded-sm text-xs font-bold bg-[#d9a441] hover:bg-[#e8b856] disabled:bg-[#232c3b] disabled:text-[#64748b] text-[#090c11] cursor-pointer"
                        >
                          Comprar
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Publish Listing with Live Anti-RMT Guard */}
          <div className="lg:col-span-5 p-5 bg-[#0b1018]">
            <h3 className="font-display font-bold text-lg text-[#f7f4ec] flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-[#78c8f5]" />
              <span>Publicar / Intercambiar Objeto</span>
            </h3>

            <form onSubmit={handlePublish} className="space-y-3.5">
              <div>
                <label className="block text-xs text-[#94a3b8] mb-1">Objeto de tu Inventario</label>
                <select
                  value={selectedIdx}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    setSelectedIdx(idx);
                    setAskPrice(String(FAIR_PRESETS[idx].fairValue));
                    setFeedback(null);
                  }}
                  className="w-full px-3 py-2 bg-[#141c29] border border-white/15 rounded-sm text-xs text-[#f4f1ea]"
                >
                  {FAIR_PRESETS.map((p, i) => (
                    <option key={p.name} value={i}>
                      {p.name} {p.upgradeLevel > 0 ? `+${p.upgradeLevel}` : ''} (Ref: {p.fairValue} Plata)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#94a3b8] mb-1">
                  Precio en Pesos de Plata (Banda justa: {minFair} – {maxFair})
                </label>
                <input
                  type="number"
                  value={askPrice}
                  onChange={(e) => setAskPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141c29] border border-white/15 rounded-sm text-sm font-mono-nums text-[#f4f1ea]"
                />
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setAskPrice(String(preset.fairValue))}
                    className="text-[11px] text-[#78c8f5] hover:underline cursor-pointer"
                  >
                    Usar valor justo ({preset.fairValue})
                  </button>
                  <span className="text-[#475569]">·</span>
                  <button
                    type="button"
                    onClick={() => setAskPrice(String(preset.fairValue * 4))}
                    className="text-[11px] text-[#f87171] hover:underline cursor-pointer"
                  >
                    Probar bloqueo Anti-RMT ({preset.fairValue * 4})
                  </button>
                </div>
              </div>

              <div className="p-3 bg-[#121925] border border-white/10 rounded-sm text-[11px] text-[#cbd5e1] leading-relaxed">
                El escudo económico valida la reputación mínima (300 pts) y bloquea precios abusivos o traspasos encubiertos (RMT), registrando cada intento en el log de auditoría SQLite.
              </div>

              {feedback && (
                <div
                  className={`p-3 rounded-sm border text-xs flex items-start gap-2 ${
                    feedback.type === 'ok'
                      ? 'bg-[#0f241d] border-[#34d399]/50 text-[#a7f3d0]'
                      : 'bg-[#2a1215] border-[#ef4444]/60 text-[#fecaca]'
                  }`}
                >
                  {feedback.type === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 rounded-sm text-xs font-bold bg-[#d9a441] hover:bg-[#e8b856] text-[#090c11] cursor-pointer"
              >
                {busy ? 'Validando Escrow...' : 'Publicar en Comercio Justo'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
