"use strict";

import { X, Save } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function NuevaCompraModal({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    proveedor: "",
    tipoCompra: "",
    notaEntrega: "",
    metodoPago: "",
    baseImponible: "",
    iva: "",
    exento: "",
    totalPagar: "",
    estadoPago: "POR PAGAR"
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          baseImponible: parseFloat(formData.baseImponible) || 0,
          iva: parseFloat(formData.iva) || 0,
          exento: parseFloat(formData.exento) || 0,
          totalPagar: parseFloat(formData.totalPagar) || 0
        })
      });
      if (res.ok) {
        onSave();
        onClose();
      } else {
        alert("Error al guardar la compra");
      }
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al intentar conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card w-full max-w-lg rounded-xl shadow-lg border border-border flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-lg">Registrar Nueva Compra</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col p-4 space-y-4 max-h-[80vh] overflow-y-auto">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Fecha</label>
                <input required type="date" name="fecha" value={formData.fecha} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Estado</label>
                <select name="estadoPago" value={formData.estadoPago} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                  <option value="POR PAGAR">Por Pagar</option>
                  <option value="PAGADO">Pagado</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Proveedor</label>
              <input required type="text" name="proveedor" placeholder="Nombre del proveedor" value={formData.proveedor} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Tipo de Compra</label>
                <input required type="text" name="tipoCompra" placeholder="Ej: Mercancía" value={formData.tipoCompra} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Nota de Entrega / Factura</label>
                <input type="text" name="notaEntrega" placeholder="Opcional" value={formData.notaEntrega} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Método de Pago</label>
              <input required type="text" name="metodoPago" placeholder="Ej: Zelle, Banesco..." value={formData.metodoPago} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border mt-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Base Imponible ($)</label>
                <input type="number" step="0.01" name="baseImponible" value={formData.baseImponible} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">IVA ($)</label>
                <input type="number" step="0.01" name="iva" value={formData.iva} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Exento ($)</label>
                <input type="number" step="0.01" name="exento" value={formData.exento} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground text-primary">Total a Pagar ($)</label>
                <input required type="number" step="0.01" name="totalPagar" value={formData.totalPagar} onChange={handleChange} className="w-full bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary font-bold" />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 mt-4 border-t border-border">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50">
                <Save size={16} />
                {loading ? "Guardando..." : "Guardar Compra"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
