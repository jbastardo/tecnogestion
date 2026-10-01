import { useState } from "react";
import { X } from "lucide-react";

export function NuevoMovimientoModal({ isOpen, onClose, onSave, cajaActiva }: any) {
  const [tipo, setTipo] = useState("INGRESO");
  const [concepto, setConcepto] = useState("");
  const [montoUsd, setMontoUsd] = useState("0");
  const [montoBs, setMontoBs] = useState("0");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'movimiento',
          cajaId: cajaActiva,
          tipo,
          concepto,
          montoUsd,
          montoBs
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onSave();
      onClose();
    } catch (error: any) {
      alert("Error al registrar movimiento: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">
            Nuevo Movimiento ({cajaActiva === "boveda" ? "Bóveda" : "Caja Chica"})
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Movimiento</label>
            <select 
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              <option value="INGRESO">Ingreso (Entrada de dinero)</option>
              <option value="EGRESO">Egreso (Salida de dinero)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Concepto / Motivo</label>
            <input 
              type="text" 
              required
              placeholder="Ej. Pago de proveedor, Venta manual..."
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Monto (Dólares $)</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                value={montoUsd}
                onChange={(e) => setMontoUsd(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monto (Bolívares Bs)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0"
                value={montoBs}
                onChange={(e) => setMontoBs(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
