"use client";

import { useState, useEffect } from 'react';
import { Briefcase, CreditCard, CheckCircle2, XCircle, Search, RefreshCcw, DollarSign, ArrowRightLeft, Landmark } from 'lucide-react';

export default function TesoreriaPage() {
  const [tab, setTab] = useState('pendientes'); // 'pendientes' | 'ordenes'
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [cajas, setCajas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendientes = async () => {
    try {
      const url = `/api/gastos`;
      const res = await fetch(url);
      if(res.ok) {
        const data = await res.json();
        const porPagar = data.gastos.filter((g: any) => g.status === 'POR PAGAR' || g.cxp > 0);
        setPendientes(porPagar);
      }
    } catch(e) { console.error(e); }
  };

  const fetchOrdenes = async () => {
    try {
      const res = await fetch('/api/tesoreria');
      if(res.ok) {
        const data = await res.json();
        setOrdenes(data.ordenes);
      }
    } catch(e) { console.error(e); }
  };

  const fetchCajas = async () => {
    try {
      const res = await fetch('/api/caja/global');
      if(res.ok) {
        const data = await res.json();
        const localesYBancos = data.resumen.filter((c: any) => c.tipo !== 'odoo_pos');
        setCajas(localesYBancos);
      }
    } catch(e) { console.error(e); }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.allSettled([fetchPendientes(), fetchOrdenes(), fetchCajas()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCrearOrden = async (gasto: any) => {
    const res = await fetch('/api/tesoreria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concepto: `Pago de ${gasto.concepto}`,
        montoBs: gasto.moneda === 'Bs' ? gasto.cxp : 0,
        montoUsd: gasto.moneda === 'USD' ? gasto.cxp : 0,
        gastoRef: gasto.id,
        proveedorNombre: gasto.proveedor
      })
    });
    if(res.ok) {
      loadData();
      setTab('ordenes');
    } else {
      alert("Error al crear la orden de pago");
    }
  };

  const handleUpdateOrden = async (ordenId: string, nuevoEstado: string, cajaId?: string, metodoPago?: string) => {
    const res = await fetch('/api/tesoreria', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: ordenId,
        estado: nuevoEstado,
        cajaId: cajaId,
        metodoPagoNombre: metodoPago
      })
    });
    if(res.ok) {
      loadData();
    } else {
      alert("Error al actualizar la orden");
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground">
          <Briefcase size={24} className="text-primary" />
          <h2 className="text-2xl font-bold">Tesorería y Pagos</h2>
        </div>
        <button onClick={loadData} className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground">
          <RefreshCcw size={20} className={loading ? "animate-spin text-primary" : ""} />
        </button>
      </header>
      
      <div className="flex-1 flex flex-col min-h-0">
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
            <button
              onClick={() => setTab('pendientes')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${tab === 'pendientes' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary'}`}
            >
              Gastos Pendientes (CXP)
            </button>
            <button
              onClick={() => setTab('ordenes')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${tab === 'ordenes' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary'}`}
            >
              Órdenes de Pago
            </button>
          </div>

          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <RefreshCcw className="animate-spin text-primary w-8 h-8" />
            </div>
          ) : tab === 'pendientes' ? (
            <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3">Concepto</th>
                      <th className="px-4 py-3">Moneda</th>
                      <th className="px-4 py-3 text-right">Monto CXP</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendientes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          No hay gastos pendientes por pagar
                        </td>
                      </tr>
                    ) : pendientes.map((p, i) => (
                      <tr key={i} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 text-foreground font-medium">{p.fecha}</td>
                        <td className="px-4 py-3 text-foreground">{p.proveedor}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.concepto}</td>
                        <td className="px-4 py-3 text-muted-foreground">{p.moneda}</td>
                        <td className="px-4 py-3 text-right font-bold text-destructive">
                          {p.cxp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => handleCrearOrden(p)}
                            className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-3 py-1.5 rounded font-medium transition-colors text-xs"
                          >
                            Generar Orden
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {ordenes.length === 0 ? (
                <div className="col-span-full h-40 flex items-center justify-center text-muted-foreground">
                  No hay órdenes de pago registradas
                </div>
              ) : ordenes.map((orden, i) => (
                <div key={orden.id} className="bg-card border border-border rounded-xl shadow-lg p-5 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-foreground text-lg line-clamp-1" title={orden.concepto}>{orden.concepto}</h3>
                      <p className="text-sm text-muted-foreground">{orden.proveedorNombre || 'Desconocido'}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      orden.estado === 'SOLICITADA' ? 'bg-orange-500/10 text-orange-500' :
                      orden.estado === 'APROBADA' ? 'bg-blue-500/10 text-blue-500' :
                      orden.estado === 'EJECUTADA' ? 'bg-emerald-500/10 text-emerald-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {orden.estado}
                    </span>
                  </div>

                  <div className="flex gap-4 mb-6 mt-auto">
                    <div className="bg-secondary/50 rounded-lg p-3 flex-1">
                      <p className="text-xs text-muted-foreground mb-1 uppercase">Monto USD</p>
                      <p className="text-lg font-bold text-foreground">${(orden.montoUsd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3 flex-1">
                      <p className="text-xs text-muted-foreground mb-1 uppercase">Monto Bs</p>
                      <p className="text-lg font-bold text-foreground">Bs {(orden.montoBs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                    </div>
                  </div>

                  {/* Acciones de estado */}
                  {orden.estado === 'SOLICITADA' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleUpdateOrden(orden.id, 'APROBADA')}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={16} /> Aprobar
                      </button>
                      <button 
                        onClick={() => handleUpdateOrden(orden.id, 'RECHAZADA')}
                        className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center justify-center"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  )}

                  {orden.estado === 'APROBADA' && (
                    <div className="border-t border-border pt-4 mt-2">
                      <p className="text-xs text-muted-foreground mb-2">Ejecutar pago desde:</p>
                      <div className="flex gap-2">
                        <select 
                          id={`caja-${orden.id}`}
                          className="bg-secondary text-foreground text-sm rounded-lg block w-full p-2 border-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">Seleccionar cuenta/caja...</option>
                          {cajas.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre} (Disp: {c.saldoUsd > 0 ? '$'+c.saldoUsd : 'Bs'+c.saldoBs})</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => {
                            const cajaId = (document.getElementById(`caja-${orden.id}`) as HTMLSelectElement).value;
                            if(!cajaId) return alert('Seleccione una caja/banco');
                            const cajaSeleccionada = cajas.find(c => c.id === cajaId);
                            handleUpdateOrden(orden.id, 'EJECUTADA', cajaId, cajaSeleccionada?.nombre);
                          }}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center justify-center"
                        >
                          Pagar
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {orden.estado === 'EJECUTADA' && (
                    <div className="bg-emerald-500/10 text-emerald-500 p-3 rounded-lg text-sm font-medium flex items-center gap-2 mt-2">
                      <CheckCircle2 size={18} />
                      Pagado {orden.metodoPago ? `vía ${orden.metodoPago.nombre}` : ''}
                    </div>
                  )}

                  <div className="mt-4 text-xs text-muted-foreground flex justify-between">
                    <span>Ref: {orden.gastoRef || 'N/A'}</span>
                    <span>{new Date(orden.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
