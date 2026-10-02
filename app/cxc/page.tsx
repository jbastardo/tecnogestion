"use client";

import { useState, useEffect } from "react";
import { ArrowDownToLine, Search, ArrowUpDown } from "lucide-react";

export default function CxcPage() {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>({ key: 'fecha', direction: 'desc' });
  const [filtroConcepto, setFiltroConcepto] = useState("Todos");
  const [filtroMoneda, setFiltroMoneda] = useState("Todas");
  const [filtroOperacion, setFiltroOperacion] = useState("Todas");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const getCaracasDate = () => {
    const date = new Date();
    const caracasTime = new Date(date.getTime() + (date.getTimezoneOffset() * 60000) - (4 * 3600000));
    return caracasTime.toISOString().split('T')[0];
  };

  const [fechaInicio, setFechaInicio] = useState(getCaracasDate());
  const [fechaFin, setFechaFin] = useState(getCaracasDate());

  const fetchCxc = () => {
    setLoading(true);
    fetch(`/api/cxc?inicio=${fechaInicio}&fin=${fechaFin}`)
      .then(res => res.json())
      .then(data => {
        setCuentas(data.cxc || []);
        setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchCxc();
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroConcepto, filtroMoneda, filtroOperacion, fechaInicio, fechaFin]);

  const formatCurrency = (val: any, moneda: string = "USD") => {
    const symbol = moneda === 'VES' ? 'Bs. ' : '$ ';
    return symbol + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val) || 0);
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  let filteredCuentas = cuentas.filter(cuenta => {
    const searchString = String(cuenta.cliente || "") + " " + String(cuenta.referencia || "") + " " + String(cuenta.concepto || "");
    const matchesSearch = searchString.toLowerCase().includes(searchTerm.toLowerCase());
                          
    const matchesConcepto = filtroConcepto === "Todos" || cuenta.concepto === filtroConcepto;
    const matchesMoneda = filtroMoneda === "Todas" || cuenta.moneda === filtroMoneda;
    const matchesOperacion = filtroOperacion === "Todas" || cuenta.tipoOperacion === filtroOperacion;
    
    return matchesSearch && matchesConcepto && matchesMoneda && matchesOperacion;
  });

  const totales = filteredCuentas.reduce((acc, curr) => {
    if (curr.moneda === 'USD') {
      acc.saldoUSD += (curr.saldo || 0);
    } else {
      acc.saldoBs += (curr.saldo || 0);
    }
    return acc;
  }, { saldoUSD: 0, saldoBs: 0 });

  if (sortConfig !== null) {
    filteredCuentas.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(filteredCuentas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCuentas = filteredCuentas.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cuentas por Cobrar (CxC)</h2>
          <p className="text-muted-foreground">Seguimiento de retenciones pendientes, Cashea y créditos.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-secondary transition-colors flex items-center gap-2">
            <ArrowDownToLine size={16} />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card shadow-sm p-6 flex flex-col justify-center">
          <p className="text-sm text-muted-foreground font-medium mb-1">Total Pendiente USD</p>
          <p className="text-3xl font-bold text-red-400">{formatCurrency(totales.saldoUSD, 'USD')}</p>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-sm p-6 flex flex-col justify-center">
          <p className="text-sm text-muted-foreground font-medium mb-1">Total Pendiente Bs</p>
          <p className="text-3xl font-bold text-red-400">{formatCurrency(totales.saldoBs, 'VES')}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar cliente, ref..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <select
              value={filtroConcepto}
              onChange={(e) => setFiltroConcepto(e.target.value)}
              className="bg-background border border-border rounded-lg px-2 py-2 text-sm focus:outline-none"
            >
              <option value="Todos">Todos los Conceptos</option>
              <option value="Crédito Comercial">Crédito Comercial</option>
              <option value="Cashea">Cashea</option>
              <option value="Retención IVA">Retención IVA</option>
              <option value="Retención ISLR">Retención ISLR</option>
              <option value="Otros">Otros</option>
            </select>
            <select
              value={filtroMoneda}
              onChange={(e) => setFiltroMoneda(e.target.value)}
              className="bg-background border border-border rounded-lg px-2 py-2 text-sm focus:outline-none"
            >
              <option value="Todas">Todas las Monedas</option>
              <option value="USD">Solo USD</option>
              <option value="VES">Solo Bs</option>
            </select>
            <select
              value={filtroOperacion}
              onChange={(e) => setFiltroOperacion(e.target.value)}
              className="bg-background border border-border rounded-lg px-2 py-2 text-sm focus:outline-none"
            >
              <option value="Todas">Todas las Operaciones</option>
              <option value="Factura Fiscal">Factura Fiscal</option>
              <option value="No Fiscal">No Fiscal</option>
            </select>
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

        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="w-full text-sm text-left relative">
            <thead className="text-xs text-muted-foreground bg-muted/95 backdrop-blur uppercase border-b border-border sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-medium align-top">
                  <button onClick={() => handleSort('fecha')} className="flex items-center gap-1 hover:text-foreground transition-colors w-full">
                    Fecha <ArrowUpDown size={14} className={sortConfig?.key === 'fecha' ? 'text-primary' : 'opacity-50'} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-left align-top">
                  <button onClick={() => handleSort('cliente')} className="flex items-center gap-1 hover:text-foreground transition-colors w-full">
                    Cliente / Proveedor <ArrowUpDown size={14} className={sortConfig?.key === 'cliente' ? 'text-primary' : 'opacity-50'} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-left align-top">
                  <button onClick={() => handleSort('referencia')} className="flex items-center gap-1 hover:text-foreground transition-colors w-full">
                    Documento <ArrowUpDown size={14} className={sortConfig?.key === 'referencia' ? 'text-primary' : 'opacity-50'} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-left align-top">
                  <button onClick={() => handleSort('concepto')} className="flex items-center gap-1 hover:text-foreground transition-colors w-full">
                    Concepto <ArrowUpDown size={14} className={sortConfig?.key === 'concepto' ? 'text-primary' : 'opacity-50'} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-left align-top">
                  <button onClick={() => handleSort('tipoOperacion')} className="flex items-center gap-1 hover:text-foreground transition-colors w-full">
                    Operación <ArrowUpDown size={14} className={sortConfig?.key === 'tipoOperacion' ? 'text-primary' : 'opacity-50'} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-center align-top">
                  <button onClick={() => handleSort('moneda')} className="flex items-center justify-center gap-1 hover:text-foreground transition-colors w-full">
                    Moneda <ArrowUpDown size={14} className={sortConfig?.key === 'moneda' ? 'text-primary' : 'opacity-50'} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right align-top text-red-400">
                  <button onClick={() => handleSort('saldo')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    Saldo Pendiente <ArrowUpDown size={14} className={sortConfig?.key === 'saldo' ? 'text-primary' : 'opacity-50'} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando cuentas por cobrar desde Odoo...
                  </td>
                </tr>
              ) : filteredCuentas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No hay cuentas pendientes para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedCuentas.map((cuenta) => (
                  <tr key={cuenta.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{cuenta.fecha || "S/F"}</td>
                    <td className="px-4 py-3 text-left font-medium">{cuenta.cliente}</td>
                    <td className="px-4 py-3 text-left text-muted-foreground">{cuenta.referencia}</td>
                    <td className="px-4 py-3 text-left">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        cuenta.concepto === 'Cashea' ? 'bg-indigo-500/10 text-indigo-500' : 
                        cuenta.concepto === 'Retención IVA' || cuenta.concepto === 'Retención ISLR' ? 'bg-amber-500/10 text-amber-500' :
                        cuenta.concepto === 'Crédito Comercial' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-slate-500/10 text-slate-500'
                      }`}>
                        {cuenta.concepto}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        cuenta.tipoOperacion === 'Factura Fiscal' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                      }`}>
                        {cuenta.tipoOperacion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{cuenta.moneda}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-400">
                      {formatCurrency(cuenta.saldo, cuenta.moneda)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>Mostrando {paginatedCuentas.length} de {filteredCuentas.length} registros (Página {currentPage} de {totalPages || 1})</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 rounded border border-border hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
