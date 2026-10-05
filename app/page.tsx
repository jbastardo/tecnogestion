"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, CreditCard, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function Home() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [cajaData, setCajaData] = useState<any>(null);
  
  // Obtener fecha actual en zona horaria de Caracas (UTC-4)
  const getCaracasDate = () => {
    const date = new Date();
    const caracasTime = new Date(date.getTime() + (date.getTimezoneOffset() * 60000) - (4 * 3600000));
    return caracasTime.toISOString().split('T')[0];
  };

  const [fechaInicio, setFechaInicio] = useState(getCaracasDate());
  const [fechaFin, setFechaFin] = useState(getCaracasDate());

  useEffect(() => {
    setDashboardData(null); // Mostrar loading

    Promise.all([
      fetch(`/api/dashboard?inicio=${fechaInicio}&fin=${fechaFin}`).then(r => r.json()),
      fetch(`/api/caja/global`).then(r => r.json())
    ])
    .then(([dashData, cData]) => {
      if (dashData.error) throw new Error(dashData.error);
      setDashboardData(dashData);
      
      // Calculate split between Cajas and Bancos
      let totalBancosBs = 0;
      let totalBancosUsd = 0;
      let totalCajasBs = 0;
      let totalCajasUsd = 0;
      
      if (cData && cData.cajas) {
        cData.cajas.forEach((c: any) => {
          if (c.id.toString().startsWith('banco_')) {
            totalBancosBs += c.saldoActualBs || 0;
            totalBancosUsd += c.saldoActualUsd || 0;
          } else {
            totalCajasBs += c.saldoActualBs || 0;
            totalCajasUsd += c.saldoActualUsd || 0;
          }
        });
      }
      setCajaData({ totalBancosBs, totalBancosUsd, totalCajasBs, totalCajasUsd, totalUsd: cData.totalUsd || 0 });
    })
    .catch(err => {
      console.error(err);
      setDashboardData({ error: true });
    });
  }, [fechaInicio, fechaFin]);

  if (!dashboardData) {
    return <div className="flex h-[50vh] items-center justify-center">Cargando métricas...</div>;
  }

  if (dashboardData.error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center space-y-4">
        <div className="text-destructive font-bold text-xl">Error al cargar datos</div>
        <p className="text-muted-foreground">Ocurrió un error al conectar con Odoo o la base de datos.</p>
        <p className="text-sm">Verifica las variables de entorno ODOO_URL, ODOO_DB, etc.</p>
      </div>
    );
  }

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Resumen Financiero</h2>
          <p className="text-muted-foreground">Visión general del estado administrativo</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-2 py-1">
            <span className="text-sm text-muted-foreground">Desde:</span>
            <input 
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="bg-transparent border-none text-sm outline-none focus:ring-0 text-foreground"
            />
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-2 py-1">
            <span className="text-sm text-muted-foreground">Hasta:</span>
            <input 
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="bg-transparent border-none text-sm outline-none focus:ring-0 text-foreground"
            />
          </div>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Descargar Reporte
          </button>
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* Tarjeta 1 */}
        <motion.div variants={item} className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Ingresos Percibidos</h3>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold">${(dashboardData.ingresosTotales - dashboardData.detalles.ventas.cxc.usd).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</div>
          <p className="text-xs text-emerald-400 flex items-center mt-1">
            <ArrowUpRight className="mr-1 h-3 w-3" />
            +20.1% desde el mes pasado
          </p>
        </motion.div>

        {/* Tarjeta 2 */}
        <motion.div variants={item} className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Gastos Operativos</h3>
            <CreditCard className="h-4 w-4 text-destructive" />
          </div>
          <div className="text-2xl font-bold">${dashboardData.gastosTotales.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</div>
          <p className="text-xs text-destructive flex items-center mt-1">
            <ArrowUpRight className="mr-1 h-3 w-3" />
            +4.3% desde el mes pasado
          </p>
        </motion.div>

        {/* Tarjeta 3 */}
        <motion.div variants={item} className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Fondo Global (USD)</h3>
            <Wallet className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold">${cajaData?.totalUsd?.toLocaleString("es-VE", { minimumFractionDigits: 2 }) || '0.00'}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Efectivo y bancos en divisas
          </p>
        </motion.div>

        {/* Tarjeta 4 */}
        <motion.div variants={item} className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Margen Neto Mensual</h3>
            <Activity className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold">{dashboardData.margenNeto.toFixed(1)}%</div>
          <p className={`text-xs flex items-center mt-1 ${(dashboardData.margenNeto - dashboardData.margenNetoPrevio) >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
            {(dashboardData.margenNeto - dashboardData.margenNetoPrevio) >= 0 ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
            {((dashboardData.margenNeto - dashboardData.margenNetoPrevio) > 0 ? '+' : '')}{(dashboardData.margenNeto - dashboardData.margenNetoPrevio).toFixed(1)}% desde el mes pasado
          </p>
        </motion.div>
      </motion.div>

      {/* DETALLES DE MÓDULOS */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* VENTAS */}
        <motion.div variants={item} className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="tracking-tight text-sm font-medium mb-4 text-emerald-400">Desglose de Ventas</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Ventas Totales</span>
              <span className="font-medium">${dashboardData.detalles.ventas.total.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm pl-2 border-l-2 border-emerald-500/20">
              <span className="text-muted-foreground">↳ Facturas</span>
              <span className="font-medium">${dashboardData.detalles.ventas.facturado?.toLocaleString("es-VE", { minimumFractionDigits: 2 }) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm pl-2 border-l-2 border-emerald-500/20">
              <span className="text-muted-foreground">↳ Notas de Venta</span>
              <span className="font-medium">${dashboardData.detalles.ventas.notasDeVenta?.toLocaleString("es-VE", { minimumFractionDigits: 2 }) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ingresos Percibidos</span>
              <span className="font-medium text-emerald-500">${(dashboardData.detalles.ventas.total - dashboardData.detalles.ventas.cxc.usd).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Impuestos Generados</span>
              <span className="font-medium">${dashboardData.detalles.ventas.impuestos.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">CxC (Por Cobrar)</span>
              <div className="text-right">
                <div className="font-medium text-amber-400">${dashboardData.detalles.ventas.cxc.usd.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</div>
                <div className="font-medium text-amber-400/80 text-xs">Bs. {dashboardData.detalles.ventas.cxc.ves.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* COMPRAS */}
        <motion.div variants={item} className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="tracking-tight text-sm font-medium mb-4 text-blue-400">Desglose de Compras</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reposición Mercancía</span>
              <span className="font-medium">${dashboardData.detalles.compras.totalReposicion.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Retención IVA (25%)</span>
              <span className="font-medium text-destructive">${dashboardData.detalles.compras.iva25.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </motion.div>

        {/* GASTOS */}
        <motion.div variants={item} className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="tracking-tight text-sm font-medium mb-4 text-destructive">Desglose de Gastos</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nómina</span>
              <span className="font-medium">${dashboardData.detalles.gastos.nomina.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Servicios</span>
              <span className="font-medium">${dashboardData.detalles.gastos.servicios.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gastos Operativos</span>
              <span className="font-medium">${dashboardData.detalles.gastos.otros.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="text-muted-foreground">Retención IVA (25%)</span>
              <span className="font-medium text-destructive">${dashboardData.detalles.gastos.iva25.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </motion.div>

        {/* MOVIMIENTOS CAJA/BANCO */}
        <motion.div variants={item} className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="tracking-tight text-sm font-medium mb-4 text-purple-400">Movimientos y Saldos</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Bancos (Bs)</span>
              <span className="font-medium">Bs. {cajaData?.totalBancosBs?.toLocaleString("es-VE", { minimumFractionDigits: 2 }) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Bancos (USD)</span>
              <span className="font-medium">$ {cajaData?.totalBancosUsd?.toLocaleString("es-VE", { minimumFractionDigits: 2 }) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Cajas Físicas (Bs)</span>
              <span className="font-medium">Bs. {cajaData?.totalCajasBs?.toLocaleString("es-VE", { minimumFractionDigits: 2 }) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="text-muted-foreground">Total Cajas Físicas (USD)</span>
              <span className="font-medium">$ {cajaData?.totalCajasUsd?.toLocaleString("es-VE", { minimumFractionDigits: 2 }) || '0.00'}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-4 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex flex-col space-y-1.5 mb-4">
            <h3 className="font-semibold leading-none tracking-tight">Evolución de Ingresos y Gastos</h3>
            <p className="text-sm text-muted-foreground">Comparativa mensual del año en curso.</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardData.graficoMensual} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIngresos)" />
                <Area type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorGastos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="col-span-3 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex flex-col space-y-1.5 mb-4">
            <h3 className="font-semibold leading-none tracking-tight">Distribución de Métodos de Pago</h3>
            <p className="text-sm text-muted-foreground">Volumen transado por modalidad.</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.graficoMetodosPago} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#334155', opacity: 0.4}}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
