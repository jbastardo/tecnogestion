"use client";

import { useState, useEffect } from "react";
import { ArrowDownToLine, Search, Plus, Trash2, ArrowUpDown } from "lucide-react";
import { NuevoIngresoModal } from "./NuevoIngresoModal";

export default function IngresosPage() {
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchIngresos = () => {
    setLoading(true);
    fetch('/api/ingresos')
      .then(res => res.json())
      .then(data => {
        setIngresos(data.ingresos || []);
        setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchIngresos();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este ingreso?")) return;
    try {
      const res = await fetch('/api/ingresos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchIngresos();
      } else {
        alert("Error al eliminar el ingreso");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión");
    }
  };

  const formatCurrency = (val: any, isDivisa: boolean = false) => {
    const symbol = isDivisa ? '$ ' : 'Bs. ';
    return symbol + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val) || 0);
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === "desc" ? "asc" : "desc");
  };

  let filteredIngresos = ingresos.filter(ingreso => 
    String(ingreso.fecha || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  filteredIngresos = filteredIngresos.sort((a, b) => {
    const dateA = new Date(a.fecha).getTime();
    const dateB = new Date(b.fecha).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Registro de Ingresos</h2>
          <p className="text-muted-foreground">Flujo diario de entradas y desgloses de pago</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors flex items-center gap-2">
            <ArrowDownToLine size={16} />
            Exportar CSV
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Plus size={16} />
            Nuevo Ingreso
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por fecha..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <button onClick={toggleSort} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    Fecha <ArrowUpDown size={14} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">Base Imponible Z</th>
                <th className="px-4 py-3 font-medium text-right">IVA Z</th>
                <th className="px-4 py-3 font-medium text-right">Nota Entrega</th>
                <th className="px-4 py-3 font-medium text-right">Efectivo Bs</th>
                <th className="px-4 py-3 font-medium text-right">Bancos</th>
                <th className="px-4 py-3 font-medium text-right">Efectivo $</th>
                <th className="px-4 py-3 font-medium text-right">Zelle $</th>
                <th className="px-4 py-3 font-medium text-right">Binance $</th>
                <th className="px-4 py-3 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando registros...
                  </td>
                </tr>
              ) : filteredIngresos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    No hay registros encontrados.
                  </td>
                </tr>
              ) : (
                filteredIngresos.map((ingreso) => (
                  <tr key={ingreso.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{ingreso.fecha || "S/F"}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(ingreso.baseImponibleZ)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(ingreso.ivaZ)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(ingreso.notasEntrega)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(ingreso.efectivoBs)}</td>
                    <td className="px-4 py-3 text-right text-blue-400">{formatCurrency(ingreso.bancos)}</td>
                    <td className="px-4 py-3 text-right text-emerald-500">{formatCurrency(ingreso.usd, true)}</td>
                    <td className="px-4 py-3 text-right text-purple-400">{formatCurrency(ingreso.zelle, true)}</td>
                    <td className="px-4 py-3 text-right text-yellow-500">{formatCurrency(ingreso.binance, true)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(ingreso.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Eliminar Ingreso">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>Mostrando {filteredIngresos.length} registros</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded border border-border hover:bg-secondary disabled:opacity-50" disabled>Anterior</button>
            <button className="px-3 py-1 rounded border border-border hover:bg-secondary disabled:opacity-50" disabled>Siguiente</button>
          </div>
        </div>
      </div>

      <NuevoIngresoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchIngresos} 
      />
    </div>
  );
}
