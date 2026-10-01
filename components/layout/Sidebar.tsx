"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  TrendingUp, 
  ShoppingCart, 
  Users, 
  Landmark, 
  CreditCard, 
  Briefcase, 
  Receipt, 
  Shield, 
  LogOut 
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/ingresos", label: "Ingresos", icon: TrendingUp },
    { href: "/compras", label: "Compras", icon: ShoppingCart },
    { href: "/cxc", label: "Cuentas por Cobrar", icon: Users },
    { href: "/caja", label: "Caja & Bancos", icon: Landmark },
    { href: "/gastos", label: "Gastos CXP", icon: Receipt },
    { href: "/tesoreria", label: "Tesorería", icon: Briefcase },
    { href: "/roles", label: "Roles y Permisos", icon: Shield },
  ];

  return (
    <div className="flex h-screen w-64 flex-col bg-card border-r border-border">
      <div className="flex h-16 items-center justify-center border-b border-border">
        <h1 className="text-xl font-bold text-primary bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          TecnoGestión
        </h1>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                isActive 
                  ? "bg-primary/10 text-primary hover:bg-primary/20" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
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
