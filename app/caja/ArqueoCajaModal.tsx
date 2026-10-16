"use client";

import { useState, useMemo } from "react";
import { X, Calculator, Copy, Check, RotateCcw, ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";

interface Denomination {
  value: number;
  label: string;
  type: "bill" | "coin";
}

const DENOMINACIONES_USD: Denomination[] = [
  { value: 100, label: "$100", type: "bill" },
  { value: 50, label: "$50", type: "bill" },
  { value: 20, label: "$20", type: "bill" },
  { value: 10, label: "$10", type: "bill" },
  { value: 5, label: "$5", type: "bill" },
  { value: 2, label: "$2", type: "bill" },
  { value: 1, label: "$1", type: "bill" },
  { value: 0.5, label: "$0.50 (Moneda)", type: "coin" },
  { value: 0.25, label: "$0.25 (Moneda)", type: "coin" },
];

const DENOMINACIONES_BS: Denomination[] = [
  { value: 500, label: "Bs. 500", type: "bill" },
  { value: 200, label: "Bs. 200", type: "bill" },
  { value: 100, label: "Bs. 100", type: "bill" },
  { value: 50, label: "Bs. 50", type: "bill" },
  { value: 20, label: "Bs. 20", type: "bill" },
  { value: 10, label: "Bs. 10", type: "bill" },
  { value: 5, label: "Bs. 5", type: "bill" },
];

interface ArqueoCajaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cajaNombre?: string;
  saldosEsperados?: {
    saldoActualUsd?: number;
    saldoActualBs?: number;
  };
  onApply?: (resultado: { totalUsd: number; totalBs: number; desgloseTexto: string }) => void;
  applyLabel?: string;
}

export function ArqueoCajaModal({
  isOpen,
  onClose,
  cajaNombre = "Caja",
  saldosEsperados,
  onApply,
  applyLabel = "Aplicar al Formulario"
}: ArqueoCajaModalProps) {
  const [monedaTab, setMonedaTab] = useState<"USD" | "BS" | "AMBAS">("AMBAS");
  const [conteoUsd, setConteoUsd] = useState<Record<number, number>>({});
  const [conteoBs, setConteoBs] = useState<Record<number, number>>({});
  const [copied, setCopied] = useState(false);

  // Totales calculados
  const totalUsd = useMemo(() => {
    return DENOMINACIONES_USD.reduce((acc, d) => {
      const qty = conteoUsd[d.value] || 0;
      return acc + (qty * d.value);
    }, 0);
  }, [conteoUsd]);

  const totalBs = useMemo(() => {
    return DENOMINACIONES_BS.reduce((acc, d) => {
      const qty = conteoBs[d.value] || 0;
      return acc + (qty * d.value);
    }, 0);
  }, [conteoBs]);

  if (!isOpen) return null;

  const handleUpdateUsd = (val: number, deltaOrAbs: number, isAbsolute: boolean = false) => {
    setConteoUsd(prev => {
      const current = prev[val] || 0;
      const next = isAbsolute ? Math.max(0, deltaOrAbs) : Math.max(0, current + deltaOrAbs);
      return { ...prev, [val]: next };
    });
  };

  const handleUpdateBs = (val: number, deltaOrAbs: number, isAbsolute: boolean = false) => {
    setConteoBs(prev => {
      const current = prev[val] || 0;
      const next = isAbsolute ? Math.max(0, deltaOrAbs) : Math.max(0, current + deltaOrAbs);
      return { ...prev, [val]: next };
    });
  };

  const handleReset = () => {
    if (confirm("¿Deseas reiniciar todas las cantidades a cero?")) {
      setConteoUsd({});
      setConteoBs({});
    }
  };

  const generarTextoDesglose = () => {
    const usdLines = DENOMINACIONES_USD
      .filter(d => (conteoUsd[d.value] || 0) > 0)
      .map(d => `${conteoUsd[d.value]} x ${d.label} = $${((conteoUsd[d.value] || 0) * d.value).toFixed(2)}`);

    const bsLines = DENOMINACIONES_BS
      .filter(d => (conteoBs[d.value] || 0) > 0)
      .map(d => `${conteoBs[d.value]} x ${d.label} = Bs. ${((conteoBs[d.value] || 0) * d.value).toFixed(2)}`);

    return [
      `=== ARQUEO DE CAJA (${cajaNombre}) ===`,
      `Fecha: ${new Date().toLocaleString()}`,
      `Total USD: $${totalUsd.toFixed(2)}`,
      usdLines.length > 0 ? `Billetes USD:\n  ` + usdLines.join("\n  ") : `Billetes USD: Ninguno`,
      `----------------------------`,
      `Total Bs: Bs. ${totalBs.toFixed(2)}`,
      bsLines.length > 0 ? `Billetes Bs:\n  ` + bsLines.join("\n  ") : `Billetes Bs: Ninguno`,
    ].join("\n");
  };

  const handleCopy = () => {
    const text = generarTextoDesglose();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApply) {
      onApply({
        totalUsd: Number(totalUsd.toFixed(2)),
        totalBs: Number(totalBs.toFixed(2)),
        desgloseTexto: generarTextoDesglose()
      });
      onClose();
    }
  };

  // Comparaciones
  const difUsd = saldosEsperados?.saldoActualUsd !== undefined ? totalUsd - saldosEsperados.saldoActualUsd : null;
  const difBs = saldosEsperados?.saldoActualBs !== undefined ? totalBs - saldosEsperados.saldoActualBs : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Calculator size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Arqueo de Caja & Contador de Billetes
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                  {cajaNombre}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Conteo rápido de denominaciones físicas en efectivo (Dólares y Bolívares)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Resumen Superior / KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-background p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Físico USD</span>
              <div className="text-2xl font-bold text-emerald-500 mt-1">
                ${totalUsd.toFixed(2)}
              </div>
            </div>
            {difUsd !== null && (
              <div className="text-right">
                <span className="text-[11px] text-muted-foreground block">Esperado: ${(saldosEsperados?.saldoActualUsd || 0).toFixed(2)}</span>
                <span className={`text-xs font-semibold inline-flex items-center gap-1 ${Math.abs(difUsd) < 0.01 ? 'text-emerald-500' : difUsd > 0 ? 'text-blue-500' : 'text-destructive'}`}>
                  {Math.abs(difUsd) < 0.01 ? 'Cuadrado' : difUsd > 0 ? `+${difUsd.toFixed(2)}$ Sobrante` : `${difUsd.toFixed(2)}$ Faltante`}
                </span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-background p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Físico Bs</span>
              <div className="text-2xl font-bold text-primary mt-1">
                Bs. {totalBs.toFixed(2)}
              </div>
            </div>
            {difBs !== null && (
              <div className="text-right">
                <span className="text-[11px] text-muted-foreground block">Esperado: Bs. {(saldosEsperados?.saldoActualBs || 0).toFixed(2)}</span>
                <span className={`text-xs font-semibold inline-flex items-center gap-1 ${Math.abs(difBs) < 0.01 ? 'text-emerald-500' : difBs > 0 ? 'text-blue-500' : 'text-destructive'}`}>
                  {Math.abs(difBs) < 0.01 ? 'Cuadrado' : difBs > 0 ? `+${difBs.toFixed(2)}Bs Sobrante` : `${difBs.toFixed(2)}Bs Faltante`}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-xl text-xs font-medium border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              Reiniciar
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-xl text-xs font-medium border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copied ? "¡Copiado!" : "Copiar Arqueo"}
            </button>
          </div>
        </div>

        {/* Tab switch for mobile or full side-by-side on desktop */}
        <div className="flex md:hidden border-b border-border">
          <button
            onClick={() => setMonedaTab("USD")}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${monedaTab === "USD" ? "border-emerald-500 text-emerald-500" : "border-transparent text-muted-foreground"}`}
          >
            Dólares ($ USD)
          </button>
          <button
            onClick={() => setMonedaTab("BS")}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${monedaTab === "BS" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            Bolívares (Bs. VES)
          </button>
        </div>

        {/* Tablas de denominaciones (Widescreen Horizontal Layout) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 pr-1">
          {/* Columna USD */}
          {(monedaTab === "USD" || monedaTab === "AMBAS") && (
            <div className="rounded-xl border border-border bg-background/50 overflow-hidden flex flex-col">
              <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-3 flex items-center justify-between">
                <span className="font-bold text-sm text-emerald-600 flex items-center gap-1.5">
                  💵 Billetes & Monedas USD
                </span>
                <span className="text-xs font-bold text-emerald-600 font-mono">
                  ${totalUsd.toFixed(2)}
                </span>
              </div>
              <div className="divide-y divide-border overflow-y-auto">
                {DENOMINACIONES_USD.map(d => {
                  const qty = conteoUsd[d.value] || 0;
                  const subtotal = qty * d.value;
                  return (
                    <div key={d.value} className="p-3 flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors">
                      <div className="w-24">
                        <span className="font-semibold text-sm">{d.label}</span>
                        <span className="block text-[11px] text-muted-foreground font-mono">
                          = ${subtotal.toFixed(2)}
                        </span>
                      </div>

                      {/* Botones de acción rápida */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateUsd(d.value, -1)}
                          disabled={qty <= 0}
                          className="w-7 h-7 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-xs font-bold disabled:opacity-30"
                        >
                          -1
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={qty === 0 ? "" : qty}
                          placeholder="0"
                          onChange={e => handleUpdateUsd(d.value, parseInt(e.target.value) || 0, true)}
                          className="w-16 text-center font-bold text-sm bg-card border border-border rounded-lg py-1 outline-none focus:border-emerald-500 font-mono"
                        />

                        <button
                          type="button"
                          onClick={() => handleUpdateUsd(d.value, 1)}
                          className="w-7 h-7 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-xs font-bold text-emerald-500"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateUsd(d.value, 5)}
                          className="w-8 h-7 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-[11px] font-semibold text-muted-foreground"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateUsd(d.value, 10)}
                          className="w-8 h-7 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-[11px] font-semibold text-muted-foreground"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Columna Bolívares */}
          {(monedaTab === "BS" || monedaTab === "AMBAS") && (
            <div className="rounded-xl border border-border bg-background/50 overflow-hidden flex flex-col">
              <div className="bg-primary/10 border-b border-primary/20 px-4 py-3 flex items-center justify-between">
                <span className="font-bold text-sm text-primary flex items-center gap-1.5">
                  🇻🇪 Billetes Bolívares (VES)
                </span>
                <span className="text-xs font-bold text-primary font-mono">
                  Bs. {totalBs.toFixed(2)}
                </span>
              </div>
              <div className="divide-y divide-border overflow-y-auto">
                {DENOMINACIONES_BS.map(d => {
                  const qty = conteoBs[d.value] || 0;
                  const subtotal = qty * d.value;
                  return (
                    <div key={d.value} className="p-3 flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors">
                      <div className="w-24">
                        <span className="font-semibold text-sm">{d.label}</span>
                        <span className="block text-[11px] text-muted-foreground font-mono">
                          = Bs. {subtotal.toFixed(2)}
                        </span>
                      </div>

                      {/* Botones de acción rápida */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateBs(d.value, -1)}
                          disabled={qty <= 0}
                          className="w-7 h-7 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-xs font-bold disabled:opacity-30"
                        >
                          -1
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={qty === 0 ? "" : qty}
                          placeholder="0"
                          onChange={e => handleUpdateBs(d.value, parseInt(e.target.value) || 0, true)}
                          className="w-16 text-center font-bold text-sm bg-card border border-border rounded-lg py-1 outline-none focus:border-primary font-mono"
                        />

                        <button
                          type="button"
                          onClick={() => handleUpdateBs(d.value, 1)}
                          className="w-7 h-7 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-xs font-bold text-primary"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateBs(d.value, 5)}
                          className="w-8 h-7 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-[11px] font-semibold text-muted-foreground"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateBs(d.value, 10)}
                          className="w-8 h-7 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-[11px] font-semibold text-muted-foreground"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Total Arqueado: <strong className="text-foreground">${totalUsd.toFixed(2)}</strong> | <strong className="text-foreground">Bs. {totalBs.toFixed(2)}</strong>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
            >
              Cerrar
            </button>
            {onApply && (
              <button
                type="button"
                onClick={handleApply}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
              >
                <ArrowRight size={16} />
                {applyLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
