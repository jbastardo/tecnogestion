"use client";

import Link from "next/link";
import { LayoutDashboard, FileText, ShoppingCart, DollarSign, Settings, LogOut } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="flex h-screen w-64 flex-col bg-card border-r border-border">
      <div className="flex h-16 items-center justify-center border-b border-border">
        <h1 className="text-xl font-bold text-primary bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          TecnoGestión
        </h1>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        <Link href="/" className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2 text-primary transition-all hover:bg-primary/20">
          <LayoutDashboard size={20} />
          <span className="font-medium">Resumen</span>
        </Link>
        <Link href="/ingresos" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground">
          <FileText size={20} />
          <span className="font-medium">Ingresos</span>
        </Link>
        <Link href="/compras" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground">
          <ShoppingCart size={20} />
          <span className="font-medium">Compras</span>
        </Link>
        <Link href="/gastos" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground">
          <DollarSign size={20} />
          <span className="font-medium">Gastos</span>
        </Link>
        <Link href="/caja" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground">
          <Settings size={20} />
          <span className="font-medium">Caja Admin</span>
        </Link>
      </nav>
      <div className="p-4 border-t border-border">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive">
          <LogOut size={20} />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}
