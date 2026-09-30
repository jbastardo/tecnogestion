"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, CreditCard, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function Home() {
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => setDashboardData(data))
      .catch(console.error);
  }, []);

  if (!dashboardData) {
    return <div className="flex h-[50vh] items-center justify-center">Cargando métricas...</div>;
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
          <p className="text-muted-foreground">Visión general del estado administrativo (Julio 2026)</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-card border border-border text-sm rounded-lg px-3 py-2 outline-none focus:border-primary">
            <option>Julio 2026</option>
            <option>Junio 2026</option>
          </select>
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
            <h3 className="tracking-tight text-sm font-medium">Ingresos Totales</h3>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold">${dashboardData.ingresosTotales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
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
          <div className="text-2xl font-bold">${dashboardData.gastosTotales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
          <p className="text-xs text-destructive flex items-center mt-1">
            <ArrowUpRight className="mr-1 h-3 w-3" />
            +4.3% desde el mes pasado
          </p>
        </motion.div>

        {/* Tarjeta 3 */}
        <motion.div variants={item} className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Fondo en Caja</h3>
            <Wallet className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold">${dashboardData.fondoCaja.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Efectivo disponible en bóveda
          </p>
        </motion.div>

        {/* Tarjeta 4 */}
        <motion.div variants={item} className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Margen Neto</h3>
            <Activity className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold">{dashboardData.margenNeto}%</div>
          <p className="text-xs text-emerald-400 flex items-center mt-1">
            <ArrowUpRight className="mr-1 h-3 w-3" />
            +1.2% desde el mes pasado
          </p>
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
