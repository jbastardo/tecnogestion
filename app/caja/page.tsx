"use client";

import { useState } from "react";
import { Search, Plus, ArrowUpRight, ArrowDownRight, Wallet, History, FileText } from "lucide-react";

export default function CajaPage() {
  const [activeTab, setActiveTab] = useState<"resumen" | "movimientos" | "cuadres">("resumen");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Caja Administrativa</h2>
          <p className="text-muted-foreground">Control de bóveda, efectivo y cuadres de caja diarios</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Plus size={16} />
            Nuevo Movimiento
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
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

      {activeTab === "resumen" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Efectivo en Bóveda</span>
                <Wallet className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold">$8,543.00</div>
                <p className="text-xs text-muted-foreground mt-1">Saldo actual físico verificado</p>
              </div>
            </div>
            
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Ingresos del Día</span>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-emerald-500">+$340.50</div>
                <p className="text-xs text-muted-foreground mt-1">Recaudado hoy</p>
              </div>
            </div>
            
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Egresos del Día</span>
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-destructive">-$120.00</div>
                <p className="text-xs text-muted-foreground mt-1">Pagos en efectivo</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl border border-border bg-card shadow-sm p-8 text-center flex flex-col items-center justify-center">
             <History className="h-12 w-12 text-muted-foreground/30 mb-4" />
             <h3 className="text-lg font-medium">No hay alertas de caja</h3>
             <p className="text-sm text-muted-foreground max-w-md mt-2">
               El último cuadre se realizó ayer a las 6:30 PM sin diferencias. El saldo inicial de hoy fue verificado exitosamente.
             </p>
          </div>
        </div>
      )}

      {activeTab === "movimientos" && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar movimiento..." 
                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="p-8 text-center text-muted-foreground">
            Aún no hay movimientos manuales registrados el día de hoy.
          </div>
        </div>
      )}

      {activeTab === "cuadres" && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha y Hora</th>
                <th className="px-4 py-3 font-medium">Responsable</th>
                <th className="px-4 py-3 font-medium">Saldo Sistema</th>
                <th className="px-4 py-3 font-medium">Saldo Físico</th>
                <th className="px-4 py-3 font-medium">Diferencia</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">30/09/2026 18:30</td>
                <td className="px-4 py-3">Admin</td>
                <td className="px-4 py-3">$8,322.50</td>
                <td className="px-4 py-3">$8,322.50</td>
                <td className="px-4 py-3 text-emerald-500">$0.00</td>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-xs font-medium">Cuadrado</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
