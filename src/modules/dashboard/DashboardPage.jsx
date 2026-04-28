import { useState, useEffect } from 'react'
import { Package, Users, AlertTriangle, DollarSign, Gem } from 'lucide-react'
import { usePrecioDelDia } from '../metales/usePrecioDelDia'
import { supabase } from '../../lib/supabase'

export function DashboardPage() {
  const { precioHoy } = usePrecioDelDia()
  const fmt = (n) => n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'

  const [stats, setStats] = useState({ productos: 0, clientes: 0, stockBajo: 0 })

  useEffect(() => {
    async function cargar() {
      const [prodRes, cliRes, invRes] = await Promise.all([
        supabase.from('productos').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('inventario').select('stock_actual, stock_minimo'),
      ])
      const stockBajo = (invRes.data || []).filter((i) => i.stock_actual <= i.stock_minimo).length
      setStats({
        productos: prodRes.count || 0,
        clientes: cliRes.count || 0,
        stockBajo,
      })
    }
    cargar()
  }, [])

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-bold text-warm-900 mb-2">Dashboard</h1>
      <p className="text-warm-400 text-sm mb-8">Resumen general de Meridiano Joyería</p>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Gold price */}
        <div className="card-gold">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center">
                <DollarSign size={14} className="text-white" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Oro hoy</span>
            </div>
            <p className="font-display text-2xl font-bold text-warm-900">{precioHoy ? fmt(precioHoy.oro_por_gramo) : '—'}</p>
            <p className="text-xs text-warm-300 mt-0.5">MXN / gramo</p>
          </div>
        </div>

        {/* Silver price */}
        <div className="card-gold">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                <Gem size={14} className="text-white" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Plata hoy</span>
            </div>
            <p className="font-display text-2xl font-bold text-warm-900">{precioHoy ? fmt(precioHoy.plata_por_gramo) : '—'}</p>
            <p className="text-xs text-warm-300 mt-0.5">MXN / gramo</p>
          </div>
        </div>

        {/* Products */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-ivory-100 flex items-center justify-center">
              <Package size={14} className="text-warm-400" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Productos</span>
          </div>
          <p className="font-display text-2xl font-bold text-warm-900">{stats.productos}</p>
          <p className="text-xs text-warm-300 mt-0.5">activos en catálogo</p>
        </div>

        {/* Clients */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-ivory-100 flex items-center justify-center">
              <Users size={14} className="text-warm-400" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Clientes</span>
          </div>
          <p className="font-display text-2xl font-bold text-warm-900">{stats.clientes}</p>
          <p className="text-xs text-warm-300 mt-0.5">registrados</p>
        </div>
      </div>

      {/* Alerts */}
      {stats.stockBajo > 0 && (
        <div className="card p-5 border-amber-200 bg-amber-50 max-w-md">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {stats.stockBajo} producto{stats.stockBajo !== 1 && 's'} con stock bajo
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Revisa el módulo de inventario para reponer.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
