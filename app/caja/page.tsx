"use client";

import { useState, useEffect } from "react";
import { Search, Plus, ArrowUpRight, ArrowDownRight, Wallet, History, FileText, AlertTriangle } from "lucide-react";
import { AjustarAperturaModal } from "./AjustarAperturaModal";
import { NuevoMovimientoModal } from "./NuevoMovimientoModal";
import { CerrarCajaModal } from "./CerrarCajaModal";

export default function CajaPage() {
  const [activeTab, setActiveTab] = useState<"resumen" | "movimientos" | "cuadres">("resumen");
  const [cajaActiva, setCajaActiva] = useState<any>("global");
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [odooCajas, setOdooCajas] = useState<any[]>([]);
  
  // Modal states
  const [isAperturaOpen, setIsAperturaOpen] = useState(false);
  const [isMovimientoOpen, setIsMovimientoOpen] = useState(false);
  const [isCerrarOpen, setIsCerrarOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (cajaActiva === 'global') {
        const res = await fetch(`/api/caja/global`);
        const json = await res.json();
        setData({ ...json, isGlobal: true });
      } else {
        const res = await fetch(`/api/caja?cajaId=${cajaActiva}&action=${activeTab}`);
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Error fetching caja:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [cajaActiva, activeTab]);

  useEffect(() => {
    fetch('/api/caja/odoo-boxes')
      .then(res => res.json())
      .then(data => {
        if (data.configs) setOdooCajas(data.configs);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Caja & Bancos</h2>
          <p className="text-muted-foreground">Control de bóveda, efectivo y cuadres de caja diarios</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={cajaActiva}
            onChange={(e) => setCajaActiva(e.target.value as any)}
            className="bg-card border border-border text-sm rounded-lg px-3 py-2 outline-none focus:border-primary font-medium text-foreground"
          >
            <option value="global">Resumen Global (Todas)</option>
            <optgroup label="Cajas Locales">
              <option value="boveda">Bóveda Principal (Local)</option>
              <option value="caja_chica">Caja Chica (Admin)</option>
            </optgroup>
            <optgroup label="Bancos (Ingresos)">
              <option value="banco_nacional">Bancos Nacionales (Bs)</option>
              <option value="banco_zelle">Banco Zelle (USD)</option>
              <option value="banco_binance">Banco Binance (USD)</option>
              <option value="banco_panama">Banco Banesco Panamá (USD)</option>
            </optgroup>
            {odooCajas.length > 0 && (
              <optgroup label="Cajas POS (Odoo)">
                {odooCajas.map((c) => (
                  <option key={c.id} value={`odoo_${c.id}`}>{c.name}</option>
                ))}
              </optgroup>
            )}
          </select>
          <button 
            onClick={() => setIsMovimientoOpen(true)}
            disabled={cajaActiva === 'global' || data?.estado === 'CERRADA' || cajaActiva.startsWith('odoo_')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Plus size={16} />
            Nuevo Movimiento
          </button>
          <button 
            onClick={() => setIsCerrarOpen(true)}
            disabled={cajaActiva === 'global' || data?.estado === 'CERRADA' || cajaActiva.startsWith('odoo_')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <FileText size={16} />
            Cerrar Caja
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button 
          onClick={() => setActiveTab("resumen")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "resumen" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Resumen
        </button>
        <button 
          onClick={() => setActiveTab("movimientos")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "movimientos" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Movimientos
        </button>
        <button 
          onClick={() => setActiveTab("cuadres")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "cuadres" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Historial de Cuadres
        </button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground p-8">Cargando...</div>
      ) : activeTab === "resumen" && data?.isGlobal ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
               <h3 className="text-sm font-medium text-muted-foreground">Total Global USD</h3>
               <div className="text-3xl font-bold text-emerald-500 mt-2">${(data.totalUsd || 0).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
               <h3 className="text-sm font-medium text-muted-foreground">Total Global Bs</h3>
               <div className="text-3xl font-bold mt-2">Bs. {(data.totalBs || 0).toFixed(2)}</div>
            </div>
          </div>
          <h3 className="text-lg font-bold">Desglose por Caja / Banco</h3>
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
             <table className="w-full text-sm text-left">
               <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                 <tr>
                   <th className="px-4 py-3 font-medium">Nombre</th>
                   <th className="px-4 py-3 font-medium text-right">Saldo USD</th>
                   <th className="px-4 py-3 font-medium text-right">Saldo Bs</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border">
                 {data.cajas?.map((c: any) => (
                   <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                     <td className="px-4 py-3 font-medium flex items-center gap-2">
                        {c.name}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border">{c.type}</span>
                     </td>
                     <td className="px-4 py-3 text-right font-bold text-emerald-500">${c.saldoActualUsd.toFixed(2)}</td>
                     <td className="px-4 py-3 text-right font-medium">Bs. {c.saldoActualBs.toFixed(2)}</td>
                   </tr>
                 ))}
                 {(!data.cajas || data.cajas.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">
                        No hay cajas ni bancos abiertos.
                      </td>
                    </tr>
                 )}
               </tbody>
             </table>
          </div>
        </div>
      ) : activeTab === "resumen" && (
        <div className="space-y-6">
          
          <div className="flex items-center gap-4 bg-muted/30 border border-border p-4 rounded-xl">
             <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Estado de la Caja</p>
                <div className="flex items-center gap-2 mt-1">
                  {data?.estado === 'ABIERTA' ? (
                    <>
                      <span className="text-xl font-bold text-emerald-500">ABIERTA</span>
                      <span className="text-sm ml-4">
                        Apertura ($): <strong>${data?.cajaAbierta?.saldoAperturaUsd?.toFixed(2)}</strong> | (Bs): <strong>Bs. {data?.cajaAbierta?.saldoAperturaBs?.toFixed(2)}</strong>
                      </span>
                    </>
                  ) : (
                    <span className="text-xl font-bold text-destructive">CERRADA</span>
                  )}
                </div>
             </div>
             
             {data?.estado === 'CERRADA' && !cajaActiva.startsWith('odoo_') && (
               <button 
                 onClick={() => setIsAperturaOpen(true)}
                 className="text-sm border border-border bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-4 py-2 rounded-lg transition-colors font-semibold"
               >
                 Abrir Caja
               </button>
             )}
             {cajaActiva.startsWith('odoo_') && (
               <div className="text-sm text-muted-foreground flex flex-col items-end">
                 <span>Las cajas Odoo de POS se administran en Odoo.</span>
               </div>
             )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Efectivo Total</span>
                <Wallet className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold">${(data?.resumen?.saldoActualUsd || 0).toFixed(2)}</div>
                <div className="text-xl font-medium text-muted-foreground">Bs. {(data?.resumen?.saldoActualBs || 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Saldo + Ingresos - Egresos</p>
              </div>
            </div>
            
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Ingresos del Día</span>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-emerald-500">+${(data?.resumen?.ingresosUsd || 0).toFixed(2)}</div>
                <div className="text-lg font-medium text-emerald-500/70">+Bs. {(data?.resumen?.ingresosBs || 0).toFixed(2)}</div>
              </div>
            </div>
            
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Egresos del Día</span>
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-destructive">-${(data?.resumen?.egresosUsd || 0).toFixed(2)}</div>
                <div className="text-lg font-medium text-destructive/70">-Bs. {(data?.resumen?.egresosBs || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === "movimientos" && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {cajaActiva === 'global' ? (
             <div className="p-8 text-center text-muted-foreground">
               Por favor selecciona una caja específica para ver sus movimientos.
             </div>
          ) : data?.movimientos?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Aún no hay movimientos registrados para esta caja.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Concepto</th>
                  <th className="px-4 py-3 font-medium text-right">Monto ($)</th>
                  <th className="px-4 py-3 font-medium text-right">Monto (Bs)</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.movimientos?.map((mov: any) => (
                  <tr key={mov.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(mov.fecha).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium">{mov.concepto}</td>
                    <td className="px-4 py-3 text-right">${mov.montoUsd.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">Bs. {mov.montoBs.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        mov.tipo === 'INGRESO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {mov.tipo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && activeTab === "cuadres" && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {cajaActiva === 'global' ? (
             <div className="p-8 text-center text-muted-foreground">
               Por favor selecciona una caja específica para ver sus cuadres.
             </div>
          ) : data?.cuadres?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Aún no hay cuadres registrados.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Apertura</th>
                  <th className="px-4 py-3 font-medium">Cierre</th>
                  <th className="px-4 py-3 font-medium text-right">Físico</th>
                  <th className="px-4 py-3 font-medium text-right">Diferencia</th>
                  <th className="px-4 py-3 font-medium">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.cuadres?.map((cuadre: any) => {
                  const difUsd = (cuadre.saldoFisicoUsd || 0) - (cuadre.saldoSistemaUsd || 0);
                  const difBs = (cuadre.saldoFisicoBs || 0) - (cuadre.saldoSistemaBs || 0);
                  const hasDif = difUsd !== 0 || difBs !== 0;

                  return (
                    <tr key={cuadre.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(cuadre.fechaApertura).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {cuadre.fechaCierre ? new Date(cuadre.fechaCierre).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${(cuadre.saldoFisicoUsd || 0).toFixed(2)}<br/>
                        <span className="text-xs text-muted-foreground">Bs. {(cuadre.saldoFisicoBs || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasDif ? (
                          <div className="flex flex-col items-end text-destructive font-medium">
                            <span className="flex items-center gap-1"><AlertTriangle size={12}/> {difUsd.toFixed(2)}$</span>
                            <span className="text-xs">Bs. {difBs.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="text-emerald-500 font-medium">OK</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                        {cuadre.observaciones || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <AjustarAperturaModal 
        isOpen={isAperturaOpen} 
        onClose={() => setIsAperturaOpen(false)}
        cajaActiva={cajaActiva}
        onSave={fetchData}
      />
      <NuevoMovimientoModal 
        isOpen={isMovimientoOpen} 
        onClose={() => setIsMovimientoOpen(false)}
        cajaActiva={cajaActiva}
        onSave={fetchData}
      />
      <CerrarCajaModal 
        isOpen={isCerrarOpen} 
        onClose={() => setIsCerrarOpen(false)}
        cajaActiva={cajaActiva}
        saldosEsperados={data?.resumen}
        onSave={fetchData}
      />
    </div>
  );
}
