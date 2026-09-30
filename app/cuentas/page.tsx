"use client";

import { useState, useEffect } from "react";
import { ArrowDownToLine, Search } from "lucide-react";

export default function CuentasPage() {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cuentas')
      .then(res => res.json())
      .then(data => {
        setCuentas(data.cuentasPorCobrar || []);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const filteredCuentas = cuentas.filter(cuenta => 
    (cuenta.descripcion?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (cuenta.metodoPago?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cuentas por Cobrar</h2>
          <p className="text-muted-foreground">Gestión de saldos de clientes, Cashea y métodos de pago</p>
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
              placeholder="Buscar por cliente o método..." 
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
                <th className="px-4 py-3 font-medium">N° Factura/Nota E.</th>
                <th className="px-4 py-3 font-medium">Cliente / Descripción</th>
                <th className="px-4 py-3 font-medium">Método Pago</th>
                <th className="px-4 py-3 font-medium text-right">Monto Total</th>
                <th className="px-4 py-3 font-medium text-right text-emerald-400">Abono</th>
                <th className="px-4 py-3 font-medium text-right text-destructive">Saldo Adeudado</th>
                <th className="px-4 py-3 font-medium text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando registros...
                  </td>
                </tr>
              ) : filteredCuentas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No hay registros encontrados.
                  </td>
                </tr>
              ) : (
                filteredCuentas.map((cuenta) => (
                  <tr key={cuenta.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{cuenta.fecha || "S/F"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {cuenta.numeroFactura ? `FT: ${cuenta.numeroFactura}` : `NE: ${cuenta.notaEntrega || "S/N"}`}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{cuenta.descripcion}</td>
                    <td className="px-4 py-3">
                      <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs font-medium">
                        {cuenta.metodoPago}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">${cuenta.monto.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">${cuenta.abono.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-destructive font-bold">${cuenta.saldo.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        cuenta.estado === 'Pagado' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {cuenta.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>Mostrando {filteredCuentas.length} registros</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded border border-border hover:bg-secondary disabled:opacity-50" disabled>Anterior</button>
            <button className="px-3 py-1 rounded border border-border hover:bg-secondary disabled:opacity-50" disabled>Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
}
