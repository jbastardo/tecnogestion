import { Search } from "lucide-react";

export default function CajaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Caja Admin</h2>
          <p className="text-muted-foreground">Gestión de caja y efectivo</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm p-8 text-center text-muted-foreground">
        Este módulo está en construcción. Próximamente podrás gestionar el efectivo en bóveda, cuadres de caja y movimientos diarios aquí.
      </div>
    </div>
  );
}
