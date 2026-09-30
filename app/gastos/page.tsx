"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, MoreVertical, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function GastosPage() {
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch('/api/gastos')
      .then(res => res.json())
      .then(data => {
        setGastos(data.gastos || []);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const filteredGastos = gastos.filter(gasto => 
    (gasto.concepto?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (gasto.tipoGasto?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Control de Gastos</h2>
          <p className="text-muted-foreground">Administración y registro de gastos operativos.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
          <Plus size={18} />
          Nuevo Gasto
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
          <div className="flex items-center gap-2 w-full max-w-sm rounded-lg bg-secondary/50 px-3 py-2 border border-border focus-within:border-primary transition-colors">
            <Search size={18} className="text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por proveedor o concepto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent w-full outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>
          <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
            <Filter size={18} />
            Filtrar
          </button>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 sticky top-0">
              <tr>
                <th className="px-6 py-4 font-medium">Fecha</th>
                <th className="px-6 py-4 font-medium">Proveedor</th>
                <th className="px-6 py-4 font-medium">Concepto</th>
                <th className="px-6 py-4 font-medium">Tipo de Gasto</th>
                <th className="px-6 py-4 font-medium text-right">Total (USD)</th>
                <th className="px-6 py-4 font-medium text-center">Estado</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Cargando registros...
                  </td>
                </tr>
              ) : filteredGastos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    No hay registros encontrados.
                  </td>
                </tr>
              ) : (
                filteredGastos.map((gasto) => (
                  <tr key={gasto.id} className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">{gasto.fecha}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{gasto.proveedor || "N/A"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{gasto.concepto}</td>
                  <td className="px-6 py-4">
                    <span className="bg-secondary px-2.5 py-1 rounded-md text-xs font-medium">
                      {gasto.tipoGasto}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-right">${(gasto.totalPagar || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      gasto.status === 'Pagado' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {gasto.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
