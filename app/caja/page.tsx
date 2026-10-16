"use client";

import { useState, useEffect } from "react";
import { 
  Search, Plus, ArrowUpRight, ArrowDownRight, Wallet, History, 
  FileText, AlertTriangle, Calculator, Calendar, Landmark, 
  Store, CheckCircle2, XCircle, Clock
} from "lucide-react";
import { AjustarAperturaModal } from "./AjustarAperturaModal";
import { NuevoMovimientoModal } from "./NuevoMovimientoModal";
import { CerrarCajaModal } from "./CerrarCajaModal";
import { ArqueoCajaModal } from "./ArqueoCajaModal";
import { formatCurrencyVE, formatNumberVE } from "@/lib/format";

export default function CajaPage() {
  const [activeTab, setActiveTab] = useState<"resumen" | "movimientos" | "cuadres">("resumen");
  const [cajaActiva, setCajaActiva] = useState<string>("global");
  const [categoriaFiltro, setCategoriaFiltro] = useState<"todas" | "locales" | "pos" | "bancos">("todas");
  
  // Filtros de fecha permanentes en toda la sección
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [odooCajas, setOdooCajas] = useState<any[]>([]);
  const [odooBancos, setOdooBancos] = useState<any[]>([]);
  
  // Modales
  const [isAperturaOpen, setIsAperturaOpen] = useState(false);
  const [isMovimientoOpen, setIsMovimientoOpen] = useState(false);
  const [isCerrarOpen, setIsCerrarOpen] = useState(false);
  const [isArqueoOpen, setIsArqueoOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (cajaActiva === 'global') {
        const res = await fetch(`/api/caja/global?inicio=${fechaInicio}&fin=${fechaFin}`);
        const json = await res.json();
        setData({ ...json, isGlobal: true });
      } else {
        const res = await fetch(`/api/caja?cajaId=${cajaActiva}&action=${activeTab}&inicio=${fechaInicio}&fin=${fechaFin}`);
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
  }, [cajaActiva, activeTab, fechaInicio, fechaFin]);

  useEffect(() => {
    fetch('/api/caja/odoo-boxes')
      .then(res => res.json())
      .then(data => {
        if (data.configs) setOdooCajas(data.configs);
        if (data.banks) setOdooBancos(data.banks);
      })
      .catch(console.error);
  }, []);

  // Obtener nombre amigable de la caja activa
  const getNombreCajaActiva = () => {
    if (cajaActiva === 'global') return "Resumen Global (Todas)";
    if (cajaActiva === 'boveda') return "Bóveda Principal";
    if (cajaActiva === 'caja_chica') return "Caja Chica";
    if (cajaActiva.startsWith('odoo_')) {
      const id = parseInt(cajaActiva.split('_')[1]);
      const found = odooCajas.find(c => c.id === id);
      return found ? `POS: ${found.name}` : "Caja POS";
    }
    if (cajaActiva.startsWith('journal_')) {
      const id = parseInt(cajaActiva.split('_')[1]);
      const found = odooBancos.find(b => b.id === id);
      return found ? `Banco: ${found.name}` : "Banco";
    }
    return "Caja";
  };

  // Filtrado de cajas en vista global
  const cajasFiltradas = (data?.cajas || []).filter((c: any) => {
    if (categoriaFiltro === "todas") return true;
    if (categoriaFiltro === "locales") return c.category === 'LOCAL' || c.type === 'LOCAL';
    if (categoriaFiltro === "pos") return c.category === 'POS' || c.type === 'POS_ODOO';
    if (categoriaFiltro === "bancos") return c.category === 'BANCO' || c.type === 'BANCO_ODOO';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Encabezado Superior */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Caja & Bancos</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
              {getNombreCajaActiva()}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            Control de bóveda, cajas POS, bancos autorizados y arqueo de denominaciones
          </p>
        </div>

        {/* Toolbar de Acciones y Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Cajas y Bancos agrupados */}
          <select 
            value={cajaActiva}
            onChange={(e) => setCajaActiva(e.target.value)}
            className="bg-card border border-border text-sm rounded-lg px-3 py-2 outline-none focus:border-primary font-medium text-foreground shadow-sm"
          >
            <option value="global">🌐 Resumen Global (Todas)</option>
            
            <optgroup label="🏦 Cajas Locales">
              <option value="boveda">Bóveda Principal (Local)</option>
              <option value="caja_chica">Caja Chica (Admin)</option>
            </optgroup>

            {odooCajas.length > 0 && (
              <optgroup label="🖥️ Cajas POS (Puntos de Venta)">
                {odooCajas.map((c) => (
                  <option key={c.id} value={`odoo_${c.id}`}>POS: {c.name}</option>
                ))}
              </optgroup>
            )}

            {odooBancos.length > 0 && (
              <optgroup label="💳 Bancos & Cuentas">
                {odooBancos.map((b) => (
                  <option key={b.id} value={`journal_${b.id}`}>Banco: {b.name}</option>
                ))}
              </optgroup>
            )}
          </select>

          {/* FILTRO DE FECHAS: Permanentemente visible en todas las ventanas */}
          <div className="flex items-center gap-1.5 bg-card border border-border px-2.5 py-1.5 rounded-lg shadow-sm">
            <Calendar size={14} className="text-muted-foreground shrink-0" />
            <input 
              type="date"
              title="Fecha Inicio"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="bg-transparent border-none text-xs outline-none text-foreground font-medium"
            />
            <span className="text-muted-foreground text-xs font-semibold">-</span>
            <input 
              type="date"
              title="Fecha Fin"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="bg-transparent border-none text-xs outline-none text-foreground font-medium"
            />
          </div>

          {/* Botón Arqueo de Caja / Denominaciones */}
          <button 
            onClick={() => setIsArqueoOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            title="Contador de Billetes y Monedas"
          >
            <Calculator size={16} />
            Arqueo de Caja
          </button>

          {/* Botón Nuevo Movimiento */}
          <button 
            onClick={() => setIsMovimientoOpen(true)}
            disabled={cajaActiva === 'global' || data?.estado === 'CERRADA' || cajaActiva.startsWith('odoo_') || cajaActiva.startsWith('journal_')}
            className="bg-primary text-primary-foreground px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
          >
            <Plus size={16} />
            Movimiento
          </button>

          {/* Botón Cerrar Caja */}
          <button 
            onClick={() => setIsCerrarOpen(true)}
            disabled={cajaActiva === 'global' || data?.estado === 'CERRADA' || cajaActiva.startsWith('odoo_') || cajaActiva.startsWith('journal_')}
            className="bg-blue-600 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
          >
            <FileText size={16} />
            Cerrar Caja
          </button>
        </div>
      </div>

      {/* Tabs Principales */}
      <div className="flex border-b border-border gap-4">
        <button 
          onClick={() => setActiveTab("resumen")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "resumen" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Resumen
        </button>
        <button 
          onClick={() => setActiveTab("movimientos")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "movimientos" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Movimientos (Correlativos)
        </button>
        <button 
          onClick={() => setActiveTab("cuadres")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "cuadres" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Historial de Cuadres
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {loading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          <div className="animate-pulse space-y-2">
            <p className="font-medium text-foreground">Sincronizando información de caja y bancos...</p>
            <p className="text-xs">Consultando Odoo y registros locales</p>
          </div>
        </div>
      ) : activeTab === "resumen" && data?.isGlobal ? (
        /* VISTA RESUMEN GLOBAL (Widescreen Horizontal Layout) */
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* KPI 1: Total Global USD */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo Global Total (USD)</span>
              <div className="text-3xl font-bold text-emerald-500 mt-2">{formatCurrencyVE(data.totalUsd || 0, true)}</div>
              <span className="text-xs text-muted-foreground mt-1">Cajas locales + POS + Bancos</span>
            </div>

            {/* KPI 2: Total Global Bs */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo Global Total (Bs)</span>
              <div className="text-3xl font-bold text-primary mt-2">{formatCurrencyVE(data.totalBs || 0, false)}</div>
              <span className="text-xs text-muted-foreground mt-1">Bolívares en efectivo y cuentas</span>
            </div>

            {/* KPI 3: Monto de Apertura Global del Día */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aperturas del Día</span>
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrencyVE(data.totalAperturaUsd || 0, true)}
                </div>
                <div className="text-sm font-semibold text-muted-foreground">
                  {formatCurrencyVE(data.totalAperturaBs || 0, false)}
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">Base de apertura inicial</span>
            </div>

            {/* KPI 4: Cajas y Bancos Activos */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entidades Registradas</span>
              <div className="text-3xl font-bold text-foreground mt-2">{data.cajas?.length || 0}</div>
              <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                <span>Locales: {data.cajas?.filter((c: any) => c.type === 'LOCAL').length || 0}</span> | 
                <span>POS: {data.cajas?.filter((c: any) => c.type === 'POS_ODOO').length || 0}</span> | 
                <span>Bancos: {data.cajas?.filter((c: any) => c.type === 'BANCO_ODOO').length || 0}</span>
              </div>
            </div>
          </div>

          {/* Filtro por Categorías de Cajas / Bancos */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <h3 className="text-lg font-bold text-foreground">Desglose por Caja & Banco</h3>
            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border text-xs">
              <button
                onClick={() => setCategoriaFiltro("todas")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${categoriaFiltro === "todas" ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Todas ({data.cajas?.length || 0})
              </button>
              <button
                onClick={() => setCategoriaFiltro("locales")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${categoriaFiltro === "locales" ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Cajas Locales ({data.cajas?.filter((c: any) => c.type === 'LOCAL').length || 0})
              </button>
              <button
                onClick={() => setCategoriaFiltro("pos")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${categoriaFiltro === "pos" ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Cajas POS ({data.cajas?.filter((c: any) => c.type === 'POS_ODOO').length || 0})
              </button>
              <button
                onClick={() => setCategoriaFiltro("bancos")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${categoriaFiltro === "bancos" ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
              >
                Bancos ({data.cajas?.filter((c: any) => c.type === 'BANCO_ODOO').length || 0})
              </button>
            </div>
          </div>

          {/* Tabla de cajas filtradas */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
             <table className="w-full text-sm text-left">
               <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                 <tr>
                   <th className="px-4 py-3 font-semibold">Tipo / Categoría</th>
                   <th className="px-4 py-3 font-semibold">Nombre de la Entidad</th>
                   <th className="px-4 py-3 font-semibold text-right">Apertura ($ / Bs)</th>
                   <th className="px-4 py-3 font-semibold text-right">Saldo Actual (USD $)</th>
                   <th className="px-4 py-3 font-semibold text-right">Saldo Actual (Bs)</th>
                   <th className="px-4 py-3 text-center">Acción</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border">
                 {cajasFiltradas.map((c: any) => {
                   const isLocal = c.type === 'LOCAL';
                   const isPos = c.type === 'POS_ODOO';
                   const isBanco = c.type === 'BANCO_ODOO';

                   return (
                     <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                       <td className="px-4 py-3 font-medium">
                         {isLocal && (
                           <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                             🏦 Caja Local
                           </span>
                         )}
                         {isPos && (
                           <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                             🖥️ POS Odoo
                           </span>
                         )}
                         {isBanco && (
                           <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                             💳 Banco Odoo
                           </span>
                         )}
                       </td>
                       <td className="px-4 py-3 font-semibold text-foreground">
                         {c.name}
                       </td>
                       <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                         {c.saldoAperturaUsd > 0 || c.saldoAperturaBs > 0 ? (
                           <>
                             {formatCurrencyVE(c.saldoAperturaUsd || 0, true)}<br/>
                             <span>{formatCurrencyVE(c.saldoAperturaBs || 0, false)}</span>
                           </>
                         ) : (
                           <span className="text-muted-foreground/60">-</span>
                         )}
                       </td>
                       <td className="px-4 py-3 text-right font-bold text-emerald-500 text-base">
                         {formatCurrencyVE(c.saldoActualUsd || 0, true)}
                       </td>
                       <td className="px-4 py-3 text-right font-semibold text-foreground text-sm">
                         {formatCurrencyVE(c.saldoActualBs || 0, false)}
                       </td>
                       <td className="px-4 py-3 text-center">
                         <button
                           onClick={() => setCajaActiva(c.id)}
                           className="text-xs font-semibold px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
                         >
                           Ver Detalle
                         </button>
                       </td>
                     </tr>
                   );
                 })}
                 {cajasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No hay cajas ni bancos para la categoría seleccionada.
                      </td>
                    </tr>
                 )}
               </tbody>
             </table>
          </div>
        </div>
      ) : activeTab === "resumen" && (
        /* VISTA RESUMEN INDIVIDUAL CON MONTO DE APERTURA PROMINENTE */
        <div className="space-y-6">
          {/* Banner de Estado y Monto de Apertura del Día */}
          <div className="rounded-2xl border border-border bg-gradient-to-r from-card via-card to-primary/5 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Estado de {getNombreCajaActiva()}
                  </span>
                  {data?.estado === 'ABIERTA' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      ABIERTA
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/30">
                      <XCircle size={14} />
                      CERRADA
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-extrabold text-foreground tracking-tight">
                  {getNombreCajaActiva()}
                </h3>
              </div>

              {/* Acciones de Apertura / Cierre */}
              <div className="flex items-center gap-2">
                {data?.estado === 'CERRADA' && !cajaActiva.startsWith('odoo_') && !cajaActiva.startsWith('journal_') && (
                  <button 
                    onClick={() => setIsAperturaOpen(true)}
                    className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl transition-colors font-semibold shadow-sm flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Abrir Caja del Día
                  </button>
                )}
                {data?.estado === 'ABIERTA' && !cajaActiva.startsWith('odoo_') && !cajaActiva.startsWith('journal_') && (
                  <button 
                    onClick={() => setIsCerrarOpen(true)}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-colors font-semibold shadow-sm flex items-center gap-2"
                  >
                    <FileText size={16} />
                    Cerrar y Cuadrar Caja
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Panel de KPIs (4 Cards con Monto de Apertura del Día) */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: MONTO DE APERTURA DE CAJA DEL DÍA */}
            <div className="rounded-xl border border-primary/20 bg-card p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Apertura del Día
                </span>
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-extrabold text-foreground">
                  {formatCurrencyVE(data?.cajaAbierta?.saldoAperturaUsd || 0, true)}
                </div>
                <div className="text-lg font-semibold text-muted-foreground mt-0.5">
                  {formatCurrencyVE(data?.cajaAbierta?.saldoAperturaBs || 0, false)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {data?.cajaAbierta?.fechaApertura && data.cajaAbierta.fechaApertura !== 'Siempre Activa'
                    ? `Aperturada: ${new Date(data.cajaAbierta.fechaApertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : "Base inicial registrada"}
                </p>
              </div>
            </div>

            {/* Card 2: Ingresos del Período / Día */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ingresos del Período
                </span>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-emerald-500">
                  +{formatCurrencyVE(data?.resumen?.ingresosUsd || 0, true)}
                </div>
                <div className="text-base font-semibold text-emerald-500/80 mt-0.5">
                  +{formatCurrencyVE(data?.resumen?.ingresosBs || 0, false)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Cobros y entradas efectivas</p>
              </div>
            </div>

            {/* Card 3: Egresos del Período / Día */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Egresos del Período
                </span>
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-destructive">
                  -{formatCurrencyVE(data?.resumen?.egresosUsd || 0, true)}
                </div>
                <div className="text-base font-semibold text-destructive/80 mt-0.5">
                  -{formatCurrencyVE(data?.resumen?.egresosBs || 0, false)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Gastos, compras y retiros</p>
              </div>
            </div>

            {/* Card 4: Saldo Actual Disponible */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Saldo Actual Disponible
                </span>
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-extrabold text-foreground">
                  {formatCurrencyVE(data?.resumen?.saldoActualUsd || 0, true)}
                </div>
                <div className="text-lg font-semibold text-muted-foreground mt-0.5">
                  {formatCurrencyVE(data?.resumen?.saldoActualBs || 0, false)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Apertura + Ingresos - Egresos</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB MOVIMIENTOS CON CORRELATIVO */}
      {!loading && activeTab === "movimientos" && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {cajaActiva === 'global' ? (
             <div className="p-8 text-center text-muted-foreground">
               Por favor selecciona una caja o banco específico para examinar sus movimientos con correlativo.
             </div>
          ) : data?.movimientos?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Aún no hay movimientos registrados para el rango de fechas seleccionado.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-semibold">Correlativo</th>
                  <th className="px-4 py-3 font-semibold">Fecha / Hora</th>
                  <th className="px-4 py-3 font-semibold">Concepto / Referencia</th>
                  <th className="px-4 py-3 font-semibold text-right">Monto ($)</th>
                  <th className="px-4 py-3 font-semibold text-right">Monto (Bs)</th>
                  <th className="px-4 py-3 font-semibold text-center">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.movimientos?.map((mov: any) => (
                  <tr key={mov.id} className="hover:bg-muted/30 transition-colors">
                    {/* Correlativo secuencial comenzando en 00-0121 */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border border-border">
                        {mov.correlativo || "00-0121"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(mov.fecha).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {mov.concepto}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">
                      {formatCurrencyVE(mov.montoUsd, true)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-muted-foreground">
                      {formatCurrencyVE(mov.montoBs, false)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        mov.tipo === 'INGRESO' 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : 'bg-destructive/10 text-destructive border border-destructive/20'
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

      {/* TAB HISTORIAL DE CUADRES */}
      {!loading && activeTab === "cuadres" && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {cajaActiva === 'global' ? (
             <div className="p-8 text-center text-muted-foreground">
               Por favor selecciona una caja específica para ver sus cuadres.
             </div>
          ) : data?.cuadres?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Aún no hay cuadres registrados para este período.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-semibold">Apertura</th>
                  <th className="px-4 py-3 font-semibold">Cierre</th>
                  <th className="px-4 py-3 font-semibold text-right">Físico Contado</th>
                  <th className="px-4 py-3 font-semibold text-right">Diferencia</th>
                  <th className="px-4 py-3 font-semibold">Observaciones / Arqueo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.cuadres?.map((cuadre: any) => {
                  const difUsd = (cuadre.saldoFisicoUsd || 0) - (cuadre.saldoSistemaUsd || 0);
                  const difBs = (cuadre.saldoFisicoBs || 0) - (cuadre.saldoSistemaBs || 0);
                  const hasDif = Math.abs(difUsd) > 0.01 || Math.abs(difBs) > 0.01;

                  return (
                    <tr key={cuadre.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(cuadre.fechaApertura).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {cuadre.fechaCierre ? new Date(cuadre.fechaCierre).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {formatCurrencyVE(cuadre.saldoFisicoUsd || 0, true)}<br/>
                        <span className="text-xs text-muted-foreground font-medium">{formatCurrencyVE(cuadre.saldoFisicoBs || 0, false)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasDif ? (
                          <div className="flex flex-col items-end text-destructive font-bold text-xs">
                            <span className="flex items-center gap-1">
                              <AlertTriangle size={12}/> {difUsd > 0 ? `+${formatCurrencyVE(difUsd, true)}` : formatCurrencyVE(difUsd, true)}
                            </span>
                            <span className="text-[11px] font-medium">{difBs > 0 ? `+${formatCurrencyVE(difBs, false)}` : formatCurrencyVE(difBs, false)}</span>
                          </div>
                        ) : (
                          <span className="text-emerald-500 font-bold inline-flex items-center gap-1">
                            <CheckCircle2 size={14} /> Cuadrada
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-sm whitespace-pre-line">
                        {cuadre.observaciones || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modales */}
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
      <ArqueoCajaModal
        isOpen={isArqueoOpen}
        onClose={() => setIsArqueoOpen(false)}
        cajaNombre={getNombreCajaActiva()}
        saldosEsperados={data?.resumen}
      />
    </div>
  );
}
