import { useState } from "react";
import { X, AlertCircle } from "lucide-react";

export function CerrarCajaModal({ isOpen, onClose, onSave, cajaActiva, saldosEsperados }: any) {
  const [saldoUsd, setSaldoUsd] = useState("");
  const [saldoBs, setSaldoBs] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("¿Estás seguro de cerrar la caja? Esta acción no se puede deshacer y registrará el cuadre en el historial.")) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cierre',
          cajaId: cajaActiva,
          saldoFisicoUsd: saldoUsd,
          saldoFisicoBs: saldoBs,
          saldoSistemaUsd: saldosEsperados?.saldoActualUsd || 0,
          saldoSistemaBs: saldosEsperados?.saldoActualBs || 0,
          observaciones
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onSave();
      onClose();
    } catch (error: any) {
      alert("Error al cerrar caja: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-500">
            Cerrar {cajaActiva === "boveda" ? "Bóveda Principal" : "Caja Chica"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        
        <div className="bg-blue-500/10 text-blue-600 border border-blue-500/20 p-3 rounded-lg flex gap-3 text-sm mb-6">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>
            El sistema espera que tengas <strong>${(saldosEsperados?.saldoActualUsd || 0).toFixed(2)}</strong> y <strong>Bs. {(saldosEsperados?.saldoActualBs || 0).toFixed(2)}</strong>. Por favor, ingresa el dinero que tienes en físico.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Efectivo Físico ($)</label>
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
              <label className="block text-sm font-medium mb-1">Efectivo Físico (Bs)</label>
              <input 
                type="number" 
                step="0.01" 
                required
                value={saldoBs}
                onChange={(e) => setSaldoBs(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Observaciones (Opcional)</label>
            <textarea 
              rows={2}
              placeholder="Ej. Faltaron $5 por vuelto, se cobró de más..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Cerrando..." : "Registrar Cierre"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
