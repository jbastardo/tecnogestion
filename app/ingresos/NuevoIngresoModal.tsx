import { useState } from "react";
import { X, Check } from "lucide-react";

export function NuevoIngresoModal({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    baseImponibleZ: "",
    ivaZ: "",
    igtfZ: "",
    notasEntrega: "",
    efectivoBs: "",
    bancos: "",
    usd: "",
    zelle: "",
    binance: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/ingresos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          baseImponibleZ: Number(formData.baseImponibleZ),
          ivaZ: Number(formData.ivaZ),
          igtfZ: Number(formData.igtfZ),
          notasEntrega: Number(formData.notasEntrega),
          efectivoBs: Number(formData.efectivoBs),
          bancos: Number(formData.bancos),
          usd: Number(formData.usd),
          zelle: Number(formData.zelle),
          binance: Number(formData.binance),
        })
      });
      if (res.ok) {
        onSave();
        onClose();
        setFormData({
          fecha: new Date().toISOString().split('T')[0],
          baseImponibleZ: "", ivaZ: "", igtfZ: "", notasEntrega: "", 
          efectivoBs: "", bancos: "", usd: "", zelle: "", binance: ""
        });
      } else {
        alert("Error al guardar el ingreso");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-lg font-semibold">Registrar Nuevo Ingreso</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Fecha</label>
              <input type="date" required value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Base Imponible Z (Bs.)</label>
              <input type="number" step="0.01" value={formData.baseImponibleZ} onChange={e => setFormData({...formData, baseImponibleZ: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">IVA Z (Bs.)</label>
              <input type="number" step="0.01" value={formData.ivaZ} onChange={e => setFormData({...formData, ivaZ: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">IGTF Z (Bs.)</label>
              <input type="number" step="0.01" value={formData.igtfZ} onChange={e => setFormData({...formData, igtfZ: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nota Entrega (Bs.)</label>
              <input type="number" step="0.01" value={formData.notasEntrega} onChange={e => setFormData({...formData, notasEntrega: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="0.00" />
            </div>
          </div>

          <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-4">
            <h4 className="text-sm font-medium mb-2">Desglose de Pago</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-emerald-400">Efectivo (Bs.)</label>
                <input type="number" step="0.01" value={formData.efectivoBs} onChange={e => setFormData({...formData, efectivoBs: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-blue-400">Bancos (Punto/PagoMóvil) (Bs.)</label>
                <input type="number" step="0.01" value={formData.bancos} onChange={e => setFormData({...formData, bancos: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-emerald-500">Efectivo ($)</label>
                <input type="number" step="0.01" value={formData.usd} onChange={e => setFormData({...formData, usd: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-purple-400">Zelle ($)</label>
                <input type="number" step="0.01" value={formData.zelle} onChange={e => setFormData({...formData, zelle: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-yellow-500">Binance ($)</label>
                <input type="number" step="0.01" value={formData.binance} onChange={e => setFormData({...formData, binance: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="0.00" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50">
              {isSubmitting ? "Guardando..." : <><Check size={16} /> Guardar Ingreso</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
