"use client";

import { useState, useEffect } from "react";
import { ArrowDownToLine, Search, Plus, Trash2, ArrowUpDown } from "lucide-react";
import { NuevaCompraModal } from "./NuevaCompraModal";

export default function ComprasPage() {
  const [compras, setCompras] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>({ key: 'fecha', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fechaInicio, fechaFin]);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  let filteredCompras = compras.filter(compra => 
    (compra.proveedor?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (compra.estadoPago?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (compra.referencia?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const totales = filteredCompras.reduce((acc, curr) => ({
    totalOperacion: acc.totalOperacion + (curr.totalOperacion || 0),
    baseImponible: acc.baseImponible + (curr.baseImponible || 0),
    impuestos: acc.impuestos + (curr.impuestos || 0),
    retencion25: acc.retencion25 + (curr.retencion25 || 0),
    pagadoTotal: acc.pagadoTotal + (curr.pagadoTotal || 0),
    cxp: acc.cxp + (curr.cxp || 0),
  }), {
    totalOperacion: 0, baseImponible: 0, impuestos: 0, retencion25: 0, pagadoTotal: 0, cxp: 0
  });

  if (sortConfig !== null) {
    filteredCompras.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(filteredCompras.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCompras = filteredCompras.slice(startIndex, startIndex + itemsPerPage);

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
                  <button onClick={() => handleSort('proveedor')} className="flex items-center gap-1 hover:text-foreground transition-colors w-full">
                    Proveedor <ArrowUpDown size={14} className={sortConfig?.key === 'proveedor' ? 'text-primary' : 'opacity-50'} />
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
                    Base Imponible <ArrowUpDown size={14} className={sortConfig?.key === 'baseImponible' ? 'text-primary' : 'opacity-50'} />
                  </button>
                  <div className="text-xs font-bold mt-1">{formatCurrency(totales.baseImponible, true)}</div>
                </th>
                <th className="px-4 py-3 font-medium text-right text-amber-500 align-top">
                  <button onClick={() => handleSort('impuestos')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    Impuestos <ArrowUpDown size={14} className={sortConfig?.key === 'impuestos' ? 'text-primary' : 'opacity-50'} />
                  </button>
                  <div className="text-xs font-bold mt-1">{formatCurrency(totales.impuestos, true)}</div>
                </th>
                <th className="px-4 py-3 font-medium text-right text-purple-400 align-top">
                  <button onClick={() => handleSort('retencion25')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    Retención 25% <ArrowUpDown size={14} className={sortConfig?.key === 'retencion25' ? 'text-primary' : 'opacity-50'} />
                  </button>
                  <div className="text-xs font-bold mt-1">{formatCurrency(totales.retencion25, true)}</div>
                </th>
                <th className="px-4 py-3 font-medium text-right align-top">
                  <button onClick={() => handleSort('pagadoTotal')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    Pagado Total <ArrowUpDown size={14} className={sortConfig?.key === 'pagadoTotal' ? 'text-primary' : 'opacity-50'} />
                  </button>
                  <div className="text-xs font-bold mt-1 text-emerald-500">{formatCurrency(totales.pagadoTotal, true)}</div>
                </th>
                <th className="px-4 py-3 font-medium text-right text-red-400 align-top">
                  <button onClick={() => handleSort('cxp')} className="flex items-center justify-end gap-1 hover:text-foreground transition-colors w-full">
                    Por Pagar (CxP) <ArrowUpDown size={14} className={sortConfig?.key === 'cxp' ? 'text-primary' : 'opacity-50'} />
                  </button>
                  <div className="text-xs font-bold mt-1">{formatCurrency(totales.cxp, true)}</div>
                </th>
                <th className="px-4 py-3 font-medium text-center align-top">Estado</th>
                <th className="px-4 py-3 font-medium align-top"></th>
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
                paginatedCompras.map((compra) => (
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
                    <td className="px-4 py-3 text-right text-purple-400">{formatCurrency(compra.retencion25, true)}</td>
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
            <tfoot className="bg-muted/50 font-bold border-t-2 border-border">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right">TOTALES:</td>
                <td className="px-4 py-3 text-right">{formatCurrency(totales.totalOperacion, true)}</td>
                <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(totales.baseImponible, true)}</td>
                <td className="px-4 py-3 text-right text-amber-400">{formatCurrency(totales.impuestos, true)}</td>
                <td className="px-4 py-3 text-right text-purple-400">{formatCurrency(totales.retencion25, true)}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(totales.pagadoTotal, true)}</td>
                <td className="px-4 py-3 text-right text-red-400">{formatCurrency(totales.cxp, true)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>Mostrando {paginatedCompras.length} de {filteredCompras.length} registros (Página {currentPage} de {totalPages || 1})</span>
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
