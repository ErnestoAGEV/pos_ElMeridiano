import { useState, useEffect } from 'react'
import {
  Package, Users, AlertTriangle, DollarSign, Gem,
  ShoppingCart, CreditCard, TrendingUp, RotateCcw,
} from 'lucide-react'
import { usePrecioDelDia } from '../metales/usePrecioDelDia'
import { supabase } from '../../lib/supabase'

export function DashboardPage() {
  const { precioHoy } = usePrecioDelDia()
  const fmt = (n) => n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'

  const [stats, setStats] = useState({
    productos: 0, clientes: 0, stockBajo: 0,
    ventasHoy: 0, totalHoy: 0,
    apartadosActivos: 0, saldoPendiente: 0,
    devolucionesHoy: 0,
  })

  useEffect(() => {
    async function cargar() {
      const hoy = new Date()
      const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

      const [prodRes, cliRes, invRes, ventasRes, apartadosRes, devRes] = await Promise.all([
        supabase.from('productos').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('inventario').select('stock_actual, stock_minimo'),
        supabase.from('ventas').select('id, total').eq('estado', 'completada').gte('created_at', inicioHoy),
        supabase.from('apartados').select('id, saldo_pendiente').eq('estado', 'activo'),
        supabase.from('devoluciones').select('id').gte('created_at', inicioHoy),
      ])

      const stockBajo = (invRes.data || []).filter((i) => i.stock_actual <= i.stock_minimo).length
      const ventasData = ventasRes.data || []
      const apartadosData = apartadosRes.data || []

      setStats({
        productos: prodRes.count || 0,
        clientes: cliRes.count || 0,
        stockBajo,
        ventasHoy: ventasData.length,
        totalHoy: ventasData.reduce((s, v) => s + (parseFloat(v.total) || 0), 0),
        apartadosActivos: apartadosData.length,
        saldoPendiente: apartadosData.reduce((s, a) => s + (parseFloat(a.saldo_pendiente) || 0), 0),
        devolucionesHoy: (devRes.data || []).length,
      })
    }
    cargar()
  }, [])

  return (
    <div className="p-8">
      <h1 className="font-display text-3xl font-bold text-warm-900 mb-2">Dashboard</h1>
      <p className="text-warm-400 text-sm mb-8">Resumen general de Meridiano Joyeria</p>

      {/* Sales today highlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card-gold lg:col-span-2">
          <div className="p-6 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center shrink-0">
              <ShoppingCart size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Ventas Hoy</p>
              <p className="font-display text-3xl font-bold text-warm-900">{fmt(stats.totalHoy)}</p>
              <p className="text-xs text-warm-400 mt-0.5">{stats.ventasHoy} transaccion{stats.ventasHoy !== 1 && 'es'} completada{stats.ventasHoy !== 1 && 's'}</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <CreditCard size={16} className="text-amber-500" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-warm-400 font-semibold">Apartados Activos</span>
          </div>
          <p className="font-display text-2xl font-bold text-warm-900">{stats.apartadosActivos}</p>
          <p className="text-xs text-warm-400 mt-0.5">Saldo pendiente: {fmt(stats.saldoPendiente)}</p>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
          <p className="text-xs text-warm-300 mt-0.5">activos en catalogo</p>
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
      <div className="flex flex-wrap gap-4">
        {stats.stockBajo > 0 && (
          <div className="card p-5 border-amber-200 bg-amber-50 flex-1 min-w-[280px]">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {stats.stockBajo} producto{stats.stockBajo !== 1 && 's'} con stock bajo
                </p>
                <p className="text-xs text-amber-600 mt-0.5">Revisa el modulo de inventario para reponer.</p>
              </div>
            </div>
          </div>
        )}

        {stats.devolucionesHoy > 0 && (
          <div className="card p-5 border-red-200 bg-red-50 flex-1 min-w-[280px]">
            <div className="flex items-center gap-3">
              <RotateCcw size={20} className="text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  {stats.devolucionesHoy} devolucion{stats.devolucionesHoy !== 1 && 'es'} hoy
                </p>
                <p className="text-xs text-red-600 mt-0.5">Revisa el modulo de devoluciones.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
