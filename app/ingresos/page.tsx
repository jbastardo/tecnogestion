"use client";

import { useState, useEffect } from "react";
import { ArrowDownToLine, Search } from "lucide-react";

export default function IngresosPage() {
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ingresos')
      .then(res => res.json())
      .then(data => {
        setIngresos(data.ingresos || []);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const filteredIngresos = ingresos.filter(ingreso => 
    ingreso.fecha?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Registro de Ingresos</h2>
          <p className="text-muted-foreground">Flujo diario de entradas y desgloses de pago</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <ArrowDownToLine size={16} />
            Exportar CSV
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
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium text-right">Reporte Z</th>
                <th className="px-4 py-3 font-medium text-right">Nota Entrega</th>
                <th className="px-4 py-3 font-medium text-right">Efectivo Bs</th>
                <th className="px-4 py-3 font-medium text-right">Bancos</th>
                <th className="px-4 py-3 font-medium text-right">Zelle</th>
                <th className="px-4 py-3 font-medium text-right">Base Imp.</th>
                <th className="px-4 py-3 font-medium text-right">IVA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando registros...
                  </td>
                </tr>
              ) : filteredIngresos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No hay registros encontrados.
                  </td>
                </tr>
              ) : (
                filteredIngresos.map((ingreso) => (
                  <tr key={ingreso.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{ingreso.fecha || "S/F"}</td>
                    <td className="px-4 py-3 text-right">${ingreso.reporteZ.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">${ingreso.notasEntrega.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">Bs. {ingreso.efectivoBs.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-blue-400">Bs. {ingreso.bancos.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-purple-400">${ingreso.zelle.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">${ingreso.baseImponible.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-destructive">${ingreso.iva.toFixed(2)}</td>
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
    </div>
  );
}
