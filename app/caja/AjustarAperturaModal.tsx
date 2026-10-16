import { useState } from "react";
import { X, Calculator } from "lucide-react";
import { ArqueoCajaModal } from "./ArqueoCajaModal";

export function AjustarAperturaModal({ isOpen, onClose, onSave, cajaActiva }: any) {
  const [saldoUsd, setSaldoUsd] = useState("");
  const [saldoBs, setSaldoBs] = useState("");
  const [loading, setLoading] = useState(false);
  const [isArqueoOpen, setIsArqueoOpen] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apertura',
          cajaId: cajaActiva,
          saldoAperturaUsd: saldoUsd,
          saldoAperturaBs: saldoBs
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onSave();
      onClose();
    } catch (error: any) {
      alert("Error al aperturar caja: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">
            Abrir {cajaActiva === "boveda" ? "Bóveda Principal" : "Caja Chica"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setIsArqueoOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            <Calculator size={15} />
            Contador de Billetes / Arqueo Inicial
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Monto de Apertura (Dólares $)</label>
            <input 
              type="number" 
              step="0.01" 
              required
              value={saldoUsd}
              onChange={(e) => setSaldoUsd(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monto de Apertura (Bolívares Bs)</label>
            <input 
              type="number" 
              step="0.01" 
              required
              value={saldoBs}
              onChange={(e) => setSaldoBs(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Abriendo..." : "Confirmar Apertura"}
            </button>
          </div>
        </form>

        <ArqueoCajaModal
          isOpen={isArqueoOpen}
          onClose={() => setIsArqueoOpen(false)}
          cajaNombre={cajaActiva === "boveda" ? "Bóveda Principal" : "Caja Chica"}
          applyLabel="Usar montos de arqueo"
          onApply={({ totalUsd, totalBs }) => {
            setSaldoUsd(totalUsd.toString());
            setSaldoBs(totalBs.toString());
          }}
        />
      </div>
    </div>
  );
}
