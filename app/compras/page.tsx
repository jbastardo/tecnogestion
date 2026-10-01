"use client";

import { useState, useEffect } from "react";
import { ArrowDownToLine, Search, Plus, Trash2 } from "lucide-react";
import { NuevaCompraModal } from "./NuevaCompraModal";

export default function ComprasPage() {
  const [compras, setCompras] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getCaracasDate = () => {
    const date = new Date();
    const caracasTime = new Date(date.getTime() + (date.getTimezoneOffset() * 60000) - (4 * 3600000));
    return caracasTime.toISOString().split('T')[0];
  };

  const [fechaInicio, setFechaInicio] = useState(getCaracasDate());
  const [fechaFin, setFechaFin] = useState(getCaracasDate());

  const formatCurrency = (val: any, isDivisa: boolean = false) => {
    const symbol = isDivisa ? '$ ' : 'Bs. ';
    return symbol + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val) || 0);
  };

  const fetchCompras = () => {
    setLoading(true);
    fetch(`/api/compras?inicio=${fechaInicio}&fin=${fechaFin}`)
      .then(res => res.json())
      .then(data => {
        setCompras(data.compras || []);
        setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchCompras();
  }, [fechaInicio, fechaFin]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta compra?")) return;
    try {
      const res = await fetch('/api/compras', {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchCompras();
      } else {
        alert("Error eliminando compra");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredCompras = compras.filter(compra => 
    (compra.proveedor?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (compra.estadoPago?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <NuevaCompraModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={() => fetchCompras()} 
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Registro de Compras</h2>
          <p className="text-muted-foreground">Adquisición de mercancía, materiales e inventario</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center gap-2">
            <ArrowDownToLine size={16} />
            Exportar CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            Nueva Compra
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por proveedor o referencia..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2 py-1">
              <span className="text-sm text-muted-foreground">Desde:</span>
              <input 
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="bg-transparent border-none text-sm outline-none focus:ring-0 text-foreground"
              />
            </div>
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2 py-1">
              <span className="text-sm text-muted-foreground">Hasta:</span>
              <input 
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="bg-transparent border-none text-sm outline-none focus:ring-0 text-foreground"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium text-left">Proveedor</th>
                <th className="px-4 py-3 font-medium text-left">Operación</th>
                <th className="px-4 py-3 font-medium text-left">Referencia</th>
                <th className="px-4 py-3 font-medium text-right">Total Operación</th>
                <th className="px-4 py-3 font-medium text-right text-emerald-500">Base Imponible</th>
                <th className="px-4 py-3 font-medium text-right text-amber-500">Impuestos</th>
                <th className="px-4 py-3 font-medium text-right">Pagado (Total)</th>
                <th className="px-4 py-3 font-medium text-right text-red-400">Por Pagar (CxP)</th>
                <th className="px-4 py-3 font-medium text-center">Estado</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando registros...
                  </td>
                </tr>
              ) : filteredCompras.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                    No hay registros encontrados.
                  </td>
                </tr>
              ) : (
                filteredCompras.map((compra) => (
                  <tr key={compra.id} className="hover:bg-muted/50 transition-colors group">
                    <td className="px-4 py-3 font-medium">{compra.fecha || "S/F"}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{compra.proveedor}</td>
                    <td className="px-4 py-3 text-left">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${compra.tipoOperacion === 'Factura' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                        {compra.tipoOperacion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">{compra.referencia}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(compra.totalOperacion, true)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(compra.baseImponible, true)}</td>
                    <td className="px-4 py-3 text-right text-amber-400">{formatCurrency(compra.impuestos, true)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(compra.pagadoTotal, true)}</td>
                    <td className="px-4 py-3 text-right text-red-400">{formatCurrency(compra.cxp, true)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        compra.estadoPago === 'PAGADO' || compra.estadoPago === 'Pagado'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {compra.estadoPago}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => handleDelete(compra.id)}
                        title="Eliminar Compra"
                        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>Mostrando {filteredCompras.length} registros</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded border border-border hover:bg-secondary disabled:opacity-50" disabled>Anterior</button>
            <button className="px-3 py-1 rounded border border-border hover:bg-secondary disabled:opacity-50" disabled>Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
}
