"use client";

import { X, Save, PlusCircle, RefreshCw, Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function NuevoGastoModal({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: () => void }) {
  const [loading, setLoading] = useState(false);
  const [loadingRecursos, setLoadingRecursos] = useState(false);
  const [buscandoProveedor, setBuscandoProveedor] = useState(false);
  
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [diarios, setDiarios] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [metodosPago, setMetodosPago] = useState<any[]>([]);

  const [searchProveedor, setSearchProveedor] = useState("");
  const [creandoProveedor, setCreandoProveedor] = useState(false);
  const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState("");
  
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

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
      const [diarioRes, cuentaRes] = await Promise.all([
        fetch('/api/odoo/recursos?type=diarios'),
        fetch('/api/odoo/recursos?type=cuentas_gasto')
      ]);
      const diarioData = await diarioRes.json();
      const cuentaData = await cuentaRes.json();
      
      setDiarios(diarioData.diarios || []);
      setMetodosPago(diarioData.metodos_pago || []);
      setCuentas(cuentaData.cuentas || []);
    } catch (e) {
      console.error("Error cargando recursos de Odoo", e);
    } finally {
      setLoadingRecursos(false);
    }
  };

  const handleSearchProveedor = (q: string) => {
    setSearchProveedor(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (q.length < 3) {
      setProveedores([]);
      return;
    }
    
    searchTimeout.current = setTimeout(async () => {
      setBuscandoProveedor(true);
      try {
        const res = await fetch(`/api/odoo/recursos?type=proveedores&q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setProveedores(data.partners || []);
      } catch (e) {
        console.error(e);
      } finally {
        setBuscandoProveedor(false);
      }
    }, 500);
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
        setProveedores([{ id: data.id, name: data.name, vat: '' }, ...proveedores]);
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
    
    let proveedorNombre = formData.proveedor_nombre;
    if (formData.proveedor_id && !proveedorNombre) {
      proveedorNombre = proveedores.find(p => p.id.toString() === formData.proveedor_id)?.name || "";
    }
    
    let metodoPagoNombre = formData.metodoPago;
    if (formData.metodoPago && metodosPago.length > 0) {
      const found = metodosPago.find(m => m.id.toString() === formData.metodoPago);
      if (found) metodoPagoNombre = found.name;
    }

    try {
      const res = await fetch("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          proveedor: proveedorNombre,
          metodoPago: metodoPagoNombre, // Ahora enviamos el nombre real
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

          <form onSubmit={handleSubmit} className="flex flex-col p-4 space-y-4 max-h-[85vh] overflow-y-auto">
            
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

            <div className="space-y-2 border p-3 rounded-lg border-border bg-secondary/20">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-muted-foreground">Proveedor (Odoo)</label>
                <button 
                  type="button" 
                  onClick={() => setCreandoProveedor(!creandoProveedor)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <PlusCircle size={12} /> {creandoProveedor ? "Buscar Existente" : "Crear Nuevo Proveedor"}
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
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder="Buscar por Nombre o RIF (mín 3 letras)..." 
                      value={searchProveedor}
                      onChange={(e) => handleSearchProveedor(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                    {buscandoProveedor && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                  </div>
                  
                  {proveedores.length > 0 && (
                    <select 
                      required 
                      name="proveedor_id" 
                      value={formData.proveedor_id} 
                      onChange={(e) => {
                        handleChange(e);
                        // Also save the name automatically for TecnoGestion
                        const p = proveedores.find(p => p.id.toString() === e.target.value);
                        if (p) setFormData(prev => ({ ...prev, proveedor_nombre: p.name }));
                      }}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    >
                      <option value="">Seleccione el proveedor encontrado...</option>
                      {proveedores.map(p => (
                        <option key={p.id} value={p.id}>{p.name} {p.vat ? `(RIF: ${p.vat})` : ''}</option>
                      ))}
                    </select>
                  )}
                  {searchProveedor.length >= 3 && proveedores.length === 0 && !buscandoProveedor && (
                    <p className="text-xs text-destructive">No se encontraron proveedores. Intente crear uno nuevo.</p>
                  )}
                </div>
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
                <label className="text-sm font-medium text-muted-foreground">Diario de Compras (Odoo)</label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Categoría / Tipo de Gasto</label>
                <input required type="text" name="tipoGasto" placeholder="Ej: Servicios, IT..." value={formData.tipoGasto} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Método de Pago (TecnoGestión)</label>
                <select 
                  name="metodoPago" 
                  value={formData.metodoPago} 
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">(Opcional) Seleccione método de pago...</option>
                  {metodosPago.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border mt-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Base Imponible ($)</label>
                <input type="number" step="0.01" name="baseImponible" value={formData.baseImponible} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">IVA ($)</label>
                <input type="number" step="0.01" name="iva" value={formData.iva} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Exento ($)</label>
                <input type="number" step="0.01" name="exento" value={formData.exento} onChange={handleChange} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <div className="space-y-1 w-1/3">
                <label className="text-sm font-medium text-muted-foreground text-primary block text-right">Total a Pagar ($)</label>
                <input required type="number" step="0.01" name="totalPagar" value={formData.totalPagar} onChange={handleChange} className="w-full bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 text-lg focus:outline-none focus:border-primary font-bold text-right" />
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
