"use client";

import { useState, useEffect } from "react";
import { ArrowDownToLine, Search, Plus, Trash2, ArrowUpDown } from "lucide-react";
import { NuevoIngresoModal } from "./NuevoIngresoModal";

export default function IngresosPage() {
  const [ingresos, setIngresos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>({ key: 'fecha', direction: 'desc' });
  const [filtroOperacion, setFiltroOperacion] = useState("Todas");
  const [filtroMoneda, setFiltroMoneda] = useState("Todas");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Obtener fecha actual en zona horaria de Caracas (UTC-4)
  const getCaracasDate = () => {
    const date = new Date();
    const caracasTime = new Date(date.getTime() + (date.getTimezoneOffset() * 60000) - (4 * 3600000));
    return caracasTime.toISOString().split('T')[0];
  };

  const [fechaInicio, setFechaInicio] = useState(getCaracasDate());
  const [fechaFin, setFechaFin] = useState(getCaracasDate());

  const fetchIngresos = () => {
    setLoading(true);
    fetch(`/api/ingresos?inicio=${fechaInicio}&fin=${fechaFin}`)
      .then(res => res.json())
      .then(data => {
        setIngresos(data.ingresos || []);
        setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchIngresos();
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroOperacion, filtroMoneda, fechaInicio, fechaFin]);

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

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  let filteredIngresos = ingresos.filter(ingreso => {
    const matchesSearch = String(ingreso.fecha || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          String(ingreso.referencia || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          String(ingreso.tipoOperacion || "").toLowerCase().includes(searchTerm.toLowerCase());
                          
    const matchesOperacion = filtroOperacion === "Todas" || ingreso.tipoOperacion === filtroOperacion;
    
    let matchesMoneda = true;
    if (filtroMoneda === "Solo USD") matchesMoneda = ingreso.pagadoUSD > 0;
    if (filtroMoneda === "Solo Bs") matchesMoneda = ingreso.pagadoBs > 0;
    
    return matchesSearch && matchesOperacion && matchesMoneda;
  });

  const totales = filteredIngresos.reduce((acc, curr) => ({
    totalOperacion: acc.totalOperacion + (curr.totalOperacion || 0),
    baseImponible: acc.baseImponible + (curr.baseImponible || 0),
    impuestos: acc.impuestos + (curr.impuestos || 0),
    igtf: acc.igtf + (curr.igtf || 0),
    pagadoTotal: acc.pagadoTotal + (curr.pagadoTotal || 0),
    pagadoUSD: acc.pagadoUSD + (curr.pagadoUSD || 0),
    pagadoBs: acc.pagadoBs + (curr.pagadoBs || 0),
    pagadoBsReal: acc.pagadoBsReal + (curr.pagadoBsReal || 0),
    pagadoRetencion: acc.pagadoRetencion + (curr.pagadoRetencion || 0),
    cxc: acc.cxc + (curr.cxc || 0),
  }), {
    totalOperacion: 0, baseImponible: 0, impuestos: 0, igtf: 0, pagadoTotal: 0, pagadoUSD: 0, pagadoBs: 0, pagadoBsReal: 0, pagadoRetencion: 0, cxc: 0
  });

  if (sortConfig !== null) {
    filteredIngresos.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }

  const totalPages = Math.ceil(filteredIngresos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIngresos = filteredIngresos.slice(startIndex, startIndex + itemsPerPage);

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
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <select
              value={filtroOperacion}
              onChange={(e) => setFiltroOperacion(e.target.value)}
              className="bg-background border border-border rounded-lg px-2 py-2 text-sm focus:outline-none"
            >
              <option value="Todas">Todas las Operaciones</option>
              <option value="Factura">Facturas</option>
              <option value="Nota de Entrega">Notas de Entrega</option>
            </select>
            <select
              value={filtroMoneda}
              onChange={(e) => setFiltroMoneda(e.target.value)}
              className="bg-background border border-border rounded-lg px-2 py-2 text-sm focus:outline-none"
            >
              <option value="Todas">Todas las Monedas</option>
              <option value="Solo USD">Pagos con USD</option>
              <option value="Solo Bs">Pagos con Bs</option>
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
                  <button onClick={() => handleSort('tipoOperacion')} className="flex items-center gap-1 hover:text-foreground transition-colors w-full">
                    Operación <ArrowUpDown size={14} className={sortConfig?.key === 'tipoOperacion' ? 'text-primary' : 'opacity-50'} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-left align-top">
                  <button onClick={() => handleSort('referencia')} className="flex items-center gap-1 hover:text-foreground transition-colors w-full">
                    Referencia <ArrowUpDown size={14} className={sortConfig?.key === 'referencia' ? 'text-primary' : 'opacity-50'} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right align-top">
                  <button onClick={() => handleSort('totalOperacion')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    Total Operación <ArrowUpDown size={14} className={sortConfig?.key === 'totalOperacion' ? 'text-primary' : 'opacity-50'} />
                  </button>
                  <div className="text-xs font-bold mt-1 text-foreground">{formatCurrency(totales.totalOperacion, true)}</div>
                </th>
                <th className="px-4 py-3 font-medium text-right text-emerald-500 align-top">
                  <button onClick={() => handleSort('baseImponible')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    Ingreso Neto (Base) <ArrowUpDown size={14} className={sortConfig?.key === 'baseImponible' ? 'text-primary' : 'opacity-50'} />
                  </button>
                  <div className="text-xs font-bold mt-1">{formatCurrency(totales.baseImponible, true)}</div>
                </th>
                <th className="px-4 py-3 font-medium text-right text-amber-500 align-top">
                  <button onClick={() => handleSort('impuestos')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    IVA <ArrowUpDown size={14} className={sortConfig?.key === 'impuestos' ? 'text-primary' : 'opacity-50'} />
                  </button>
                  <div className="text-xs font-bold mt-1">{formatCurrency(totales.impuestos, true)}</div>
                </th>
                <th className="px-4 py-3 font-medium text-right text-orange-400 align-top">
                  <button onClick={() => handleSort('igtf')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    IGTF <ArrowUpDown size={14} className={sortConfig?.key === 'igtf' ? 'text-primary' : 'opacity-50'} />
                  </button>
                  <div className="text-xs font-bold mt-1">{formatCurrency(totales.igtf, true)}</div>
                </th>
                <th className="px-4 py-3 font-medium text-right align-top">
                  <button onClick={() => handleSort('pagadoTotal')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    Pagado Total <ArrowUpDown size={14} className={sortConfig?.key === 'pagadoTotal' ? 'text-primary' : 'opacity-50'} />
                  </button>
                  <div className="text-xs font-bold mt-1 text-emerald-500">{formatCurrency(totales.pagadoTotal, true)}</div>
                </th>
                <th className="px-4 py-3 font-medium text-right text-indigo-400 align-top">
                  <button onClick={() => handleSort('pagadoUSD')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    Pagos USD <ArrowUpDown size={14} className={sortConfig?.key === 'pagadoUSD' ? 'text-primary' : 'opacity-50'} />
                  </button>
                  <div className="text-xs font-bold mt-1">{formatCurrency(totales.pagadoUSD, true)}</div>
                </th>
                <th className="px-4 py-3 font-medium text-right text-muted-foreground align-top">
                  <button onClick={() => handleSort('tasaAplicada')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    Tasa <ArrowUpDown size={14} className={sortConfig?.key === 'tasaAplicada' ? 'text-primary' : 'opacity-50'} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right text-blue-400 align-top">
                  <button onClick={() => handleSort('pagadoBsReal')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    Pagos Bs <ArrowUpDown size={14} className={sortConfig?.key === 'pagadoBsReal' ? 'text-primary' : 'opacity-50'} />
                  </button>
                  <div className="text-xs font-bold mt-1">{formatCurrency(totales.pagadoBsReal, false)}</div>
                </th>
                <th className="px-4 py-3 font-medium text-right text-purple-400 align-top">
                  <button onClick={() => handleSort('pagadoRetencion')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    Retenciones <ArrowUpDown size={14} className={sortConfig?.key === 'pagadoRetencion' ? 'text-primary' : 'opacity-50'} />
                  </button>
                  <div className="text-xs font-bold mt-1">{formatCurrency(totales.pagadoRetencion, true)}</div>
                </th>
                <th className="px-4 py-3 font-medium text-right text-red-400 align-top">
                  <button onClick={() => handleSort('cxc')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    Por Cobrar (CxC) <ArrowUpDown size={14} className={sortConfig?.key === 'cxc' ? 'text-primary' : 'opacity-50'} />
                  </button>
                  <div className="text-xs font-bold mt-1">{formatCurrency(totales.cxc, true)}</div>
                </th>
                <th className="px-4 py-3 font-medium text-center align-top">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando registros...
                  </td>
                </tr>
              ) : filteredIngresos.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                    No hay registros encontrados.
                  </td>
                </tr>
              ) : (
                paginatedIngresos.map((ingreso) => (
                  <tr key={ingreso.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{ingreso.fecha || "S/F"}</td>
                    <td className="px-4 py-3 text-left">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${ingreso.tipoOperacion === 'Factura' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                        {ingreso.tipoOperacion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">{ingreso.referencia}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(ingreso.totalOperacion, true)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(ingreso.baseImponible, true)}</td>
                    <td className="px-4 py-3 text-right text-amber-400">{formatCurrency(ingreso.impuestos, true)}</td>
                    <td className="px-4 py-3 text-right text-orange-400">{formatCurrency(ingreso.igtf, true)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(ingreso.pagadoTotal, true)}</td>
                    <td className="px-4 py-3 text-right text-indigo-400">
                      {formatCurrency(ingreso.pagadoUSD, true)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {ingreso.tasaAplicada ? Number(ingreso.tasaAplicada).toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-400 group relative">
                      {formatCurrency(ingreso.pagadoBsReal, false)}
                      {ingreso.pagos && ingreso.pagos.length > 0 && (
                        <div className="absolute hidden group-hover:block bg-popover text-popover-foreground p-2 rounded shadow-lg text-xs z-10 w-48 right-0 border border-border">
                          <div className="font-semibold mb-1 border-b border-border pb-1">Métodos de Pago</div>
                          {ingreso.pagos.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between py-0.5">
                              <span className="truncate mr-2 text-muted-foreground">{p.metodo}</span>
                              <span className="font-medium">{formatCurrency(p.montoReal || p.montoUSD, !p.esBs)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-purple-400">{formatCurrency(ingreso.pagadoRetencion, true)}</td>
                    <td className="px-4 py-3 text-right text-red-400">{formatCurrency(ingreso.cxc, true)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(ingreso.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Eliminar Ingreso">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-muted/50 font-bold border-t-2 border-border">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right">TOTALES:</td>
                <td className="px-4 py-3 text-right">{formatCurrency(totales.totalOperacion, true)}</td>
                <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(totales.baseImponible, true)}</td>
                <td className="px-4 py-3 text-right text-amber-400">{formatCurrency(totales.impuestos, true)}</td>
                <td className="px-4 py-3 text-right text-orange-400">{formatCurrency(totales.igtf, true)}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(totales.pagadoTotal, true)}</td>
                <td className="px-4 py-3 text-right text-indigo-400">{formatCurrency(totales.pagadoUSD, true)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">-</td>
                <td className="px-4 py-3 text-right text-blue-400">{formatCurrency(totales.pagadoBsReal, false)}</td>
                <td className="px-4 py-3 text-right text-purple-400">{formatCurrency(totales.pagadoRetencion, true)}</td>
                <td className="px-4 py-3 text-right text-red-400">{formatCurrency(totales.cxc, true)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>Mostrando {paginatedIngresos.length} de {filteredIngresos.length} registros (Página {currentPage} de {totalPages || 1})</span>
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

      <NuevoIngresoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchIngresos} 
      />
    </div>
  );
}
