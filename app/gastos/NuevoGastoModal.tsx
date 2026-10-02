"use client";

import { X, Save, PlusCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function NuevoGastoModal({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: () => void }) {
  const [loading, setLoading] = useState(false);
  const [loadingRecursos, setLoadingRecursos] = useState(false);
  
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [diarios, setDiarios] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<any[]>([]);

  const [searchProveedor, setSearchProveedor] = useState("");
  const [creandoProveedor, setCreandoProveedor] = useState(false);
  const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState("");

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    proveedor_id: "",
    proveedor_nombre: "",
    concepto: "",
    tipoGasto: "",
    cuenta_id: "",
    diario_id: "",
    metodoPago: "",
    baseImponible: "",
    iva: "",
    exento: "",
    totalPagar: "",
    status: "POR PAGAR",
    enviarOdoo: true
  });

  useEffect(() => {
    if (isOpen) {
      cargarRecursos();
    }
  }, [isOpen]);

  const cargarRecursos = async () => {
    setLoadingRecursos(true);
    try {
      const [provRes, diarioRes, cuentaRes] = await Promise.all([
        fetch('/api/odoo/recursos?type=proveedores'),
        fetch('/api/odoo/recursos?type=diarios'),
        fetch('/api/odoo/recursos?type=cuentas_gasto')
      ]);
      const provData = await provRes.json();
      const diarioData = await diarioRes.json();
      const cuentaData = await cuentaRes.json();
      
      setProveedores(provData.partners || []);
      setDiarios(diarioData.diarios || []);
      setCuentas(cuentaData.cuentas || []);
    } catch (e) {
      console.error("Error cargando recursos de Odoo", e);
    } finally {
      setLoadingRecursos(false);
    }
  };

  const handleCrearProveedor = async () => {
    if (!nuevoProveedorNombre) return;
    setLoading(true);
    try {
      const res = await fetch('/api/odoo/recursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'proveedor', name: nuevoProveedorNombre })
      });
      const data = await res.json();
      if (data.id) {
        setProveedores([{ id: data.id, name: data.name }, ...proveedores]);
        setFormData({ ...formData, proveedor_id: data.id, proveedor_nombre: data.name });
        setCreandoProveedor(false);
        setNuevoProveedorNombre("");
      } else {
        alert("Error creando proveedor: " + data.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Set text fields automatically based on IDs
    let proveedorNombre = formData.proveedor_nombre;
    if (formData.proveedor_id && !proveedorNombre) {
      proveedorNombre = proveedores.find(p => p.id.toString() === formData.proveedor_id)?.name || "";
    }
    
    let metodoPagoNombre = formData.metodoPago;
    if (formData.diario_id && !metodoPagoNombre) {
      metodoPagoNombre = diarios.find(d => d.id.toString() === formData.diario_id)?.name || "";
    }

    try {
      const res = await fetch("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          proveedor: proveedorNombre,
          metodoPago: metodoPagoNombre,
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
        const errorData = await res.json();
        alert("Error al guardar el gasto: " + (errorData.error || 'Desconocido'));
      }
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al intentar conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card w-full max-w-2xl rounded-xl shadow-lg border border-border flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              Registrar Nuevo Gasto 
              {loadingRecursos && <RefreshCw size={14} className="animate-spin text-primary" />}
            </h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col p-4 space-y-4 max-h-[80vh] overflow-y-auto">
            
            <div className="flex items-center justify-end">
              <label className="flex items-center gap-2 text-sm font-medium text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 cursor-pointer">
                <input 
                  type="checkbox" 
                  name="enviarOdoo" 
                  checked={formData.enviarOdoo} 
                  onChange={handleChange} 
                  className="accent-emerald-500"
                />
                Crear Factura en Odoo
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Fecha</label>
                <input required type="date" name="fecha" value={formData.fecha} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Estado Inicial (TecnoGestión)</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                  <option value="POR PAGAR">Por Pagar (A Tesorería)</option>
                  <option value="Pagado">Pagado</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 border p-3 rounded-lg border-border bg-secondary/20">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-muted-foreground">Proveedor (Odoo)</label>
                <button 
                  type="button" 
                  onClick={() => setCreandoProveedor(!creandoProveedor)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <PlusCircle size={12} /> {creandoProveedor ? "Cancelar" : "Nuevo Proveedor"}
                </button>
              </div>
              
              {creandoProveedor ? (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nombre del nuevo proveedor" 
                    value={nuevoProveedorNombre}
                    onChange={(e) => setNuevoProveedorNombre(e.target.value)}
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                  <button 
                    type="button"
                    onClick={handleCrearProveedor}
                    disabled={loading || !nuevoProveedorNombre}
                    className="bg-primary text-primary-foreground px-3 rounded-lg text-sm disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              ) : (
                <select 
                  required 
                  name="proveedor_id" 
                  value={formData.proveedor_id} 
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Seleccione un proveedor...</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Concepto</label>
              <input required type="text" name="concepto" placeholder="Descripción del gasto" value={formData.concepto} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Cuenta de Gasto (Odoo)</label>
                <select 
                  name="cuenta_id" 
                  value={formData.cuenta_id} 
                  onChange={handleChange}
                  required={formData.enviarOdoo}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Seleccione cuenta contable...</option>
                  {cuentas.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Diario / Método de Pago (Odoo)</label>
                <select 
                  name="diario_id" 
                  value={formData.diario_id} 
                  onChange={handleChange}
                  required={formData.enviarOdoo}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Seleccione diario...</option>
                  {diarios.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
                  ))}
                </select>
              </div>
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
                {loading ? "Guardando..." : "Guardar Gasto"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
