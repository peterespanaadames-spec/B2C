import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ClipboardList, CheckCircle2, Clock, Truck, Store, 
  RefreshCw, MessageCircle, Sparkles, Trophy, ShieldCheck, Eye, EyeOff
} from 'lucide-react';
import { Order } from '../types.ts';
import { dbService } from '../lib/supabase.ts';

interface OrderTrackingModalProps {
  orderId: string;
  onClose: () => void;
}

export default function OrderTrackingModal({ orderId, onClose }: OrderTrackingModalProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      if (orderId === 'temp-last-order') {
        // Fallback mockup if Supabase is offline or order wasn't saved
        const localItemsStr = localStorage.getItem('copias_bellavista_last_order_items') || '[]';
        setOrder({
          id: 'temp-last-order',
          customer_name: 'Cliente Catálogo',
          phone_number: '+58 412-5043857',
          delivery_method: 'retiro',
          address_text: null,
          items: [],
          total_price: 15.00,
          status: 'pendiente',
          payment_method: 'pagomovil',
          payment_status: 'pendiente',
          points: 15,
          order_number: 7
        });
      } else {
        const data = await dbService.getOrder(orderId);
        if (data) {
          setOrder(data);
          setError(null);
        } else {
          setError('No pudimos encontrar los detalles del pedido en la base de datos.');
        }
      }
    } catch (e) {
      console.error("Error fetching tracking order:", e);
      setError('Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Set up polling interval to check order status in real-time every 8 seconds
    const interval = setInterval(() => {
      fetchOrder();
    }, 8000);

    return () => clearInterval(interval);
  }, [orderId]);

  // Determine current active index of the step
  // States: 'pendiente' / 'recibido' -> 'preparacion' -> 'en_camino' / 'listo' -> 'entregado'
  const getStepIndex = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'entregado') return 3;
    if (s === 'en_camino' || s === 'listo' || s === 'en camino' || s === 'listo para retirar') return 2;
    if (s === 'preparacion' || s === 'en preparacion' || s === 'preparando') return 1;
    return 0; // recibido / pendiente
  };

  // Human friendly status labels
  const getStatusText = (status: string, method: 'b2c' | 'retiro') => {
    const s = (status || '').toLowerCase();
    if (s === 'entregado') return 'Entregado';
    if (s === 'en_camino' || s === 'en camino') return 'En camino a tu dirección';
    if (s === 'listo' || s === 'listo para retirar') return 'Listo para retirar en tienda';
    if (s === 'preparacion' || s === 'en preparacion') return 'En preparación';
    
    // Default or fallback based on delivery method
    if (s === 'pendiente' || s === 'recibido') {
      return 'Recibido (Pendiente por confirmar)';
    }
    return status || 'Recibido';
  };

  const steps = [
    { label: 'Recibido', icon: ClipboardList, desc: 'Pedido ingresado en tienda' },
    { label: 'En preparación', icon: Clock, desc: 'Imprimiendo y encuadernando' },
    { 
      label: order?.delivery_method === 'b2c' ? 'En camino' : 'Listo para retirar', 
      icon: order?.delivery_method === 'b2c' ? Truck : Store, 
      desc: order?.delivery_method === 'b2c' ? 'Repartidor en ruta' : 'Pasa a buscar tu pedido' 
    },
    { label: 'Entregado', icon: CheckCircle2, desc: '¡Gracias por tu compra!' }
  ];

  const activeIndex = order ? getStepIndex(order.status) : 0;

  // Format payment method name nicely
  const getPaymentMethodLabel = (method: string) => {
    if (!method) return 'No especificado';
    const m = method.toLowerCase();
    if (m === 'pagomovil') return 'Pagomóvil';
    if (m === 'efectivo') return 'Efectivo';
    if (m === 'transferencia') return 'Transferencia Bancaria';
    return method;
  };

  const isPaid = order?.payment_status?.toLowerCase() === 'pagado';

  const sendWhatsAppHelp = () => {
    if (!order) return;
    const msg = `Hola Copias Bella Vista, estoy consultando el estado de mi pedido #${order.order_number || 'N/A'} (ID: ${order.id}). ¿Tienen alguna actualización?`;
    window.open(`https://api.whatsapp.com/send?phone=584125043857&text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-[#131921] text-white px-4 py-4 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9900] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9900]"></span>
            </span>
            <h3 className="font-extrabold text-sm uppercase tracking-wider">Seguimiento de Pedido</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchOrder(true)}
              disabled={isRefreshing}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition cursor-pointer"
              title="Actualizar estado"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#FF9900]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-center">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#FF9900]" />
              <p className="text-xs text-gray-500 font-extrabold uppercase tracking-widest">Cargando detalles de tu pedido...</p>
            </div>
          ) : error || !order ? (
            <div className="py-8 text-center space-y-4">
              <p className="text-sm text-rose-600 font-bold">{error || 'Ha ocurrido un error al cargar el pedido.'}</p>
              <button
                onClick={() => fetchOrder(true)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-black text-xs uppercase cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <>
              {/* Order Metadata and Highlight */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex justify-between items-center text-left">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Número de Pedido</p>
                  <p className="text-2xl font-black text-[#131921]">#{order.order_number || 7}</p>
                  <p className="text-[11px] text-[#008296] font-bold mt-0.5">
                    Cliente: <span className="text-gray-800">{order.customer_name}</span>
                  </p>
                </div>
                
                {/* Payment Status Badge */}
                <div className="text-right space-y-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Estado de Pago</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                    isPaid 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                    {isPaid ? 'Pagado' : 'No pagado'}
                  </span>
                </div>
              </div>

              {/* Status Header text */}
              <div className="space-y-1 bg-[#008296]/5 border border-[#008296]/20 p-3 rounded-lg text-left">
                <span className="text-[10px] font-black text-[#008296] uppercase tracking-widest">Estatus Actual</span>
                <p className="text-base font-black text-gray-900 leading-tight">
                  {getStatusText(order.status, order.delivery_method)}
                </p>
              </div>

              {/* Visual Stepper Horizontal */}
              <div className="py-4 px-2 relative">
                {/* Connecting Line background */}
                <div className="absolute top-8 left-8 right-8 h-1 bg-gray-200 -z-10 rounded" />
                {/* Connecting Active Line progress */}
                <div 
                  className="absolute top-8 left-8 h-1 bg-[#FF9900] -z-10 rounded transition-all duration-500" 
                  style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
                />

                {/* Steps markers */}
                <div className="grid grid-cols-4 relative z-10">
                  {steps.map((step, idx) => {
                    const Icon = step.icon;
                    const isCompleted = idx < activeIndex;
                    const isActive = idx === activeIndex;
                    const isFuture = idx > activeIndex;

                    return (
                      <div key={idx} className="flex flex-col items-center text-center space-y-2">
                        {/* Step Circle */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition duration-300 shadow-sm ${
                          isCompleted 
                            ? 'bg-[#FF9900] border-[#FF9900] text-[#131921]' 
                            : isActive 
                            ? 'bg-white border-[#FF9900] text-[#FF9900] scale-110 ring-4 ring-[#FF9900]/10' 
                            : 'bg-white border-gray-300 text-gray-400'
                        }`}>
                          <Icon className="w-4 h-4 font-black" />
                        </div>
                        {/* Label */}
                        <div className="space-y-0.5">
                          <p className={`text-[9px] leading-tight font-extrabold uppercase tracking-wider ${
                            isActive ? 'text-[#131921] font-black' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                          }`}>
                            {step.label}
                          </p>
                          <p className="hidden md:block text-[8px] leading-none text-gray-400 font-medium">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Loyalty Gamification points */}
              <div className="bg-amber-50/75 border border-amber-200 rounded-lg p-3 text-left flex items-start gap-3">
                <div className="bg-[#FF9900]/15 p-2 rounded-lg text-[#FF9900] shrink-0 mt-0.5">
                  <Trophy className="w-4 h-4 text-[#FF9900]" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-amber-800 font-black uppercase tracking-wider flex items-center gap-1">
                    Fidelidad Bella Vista <Sparkles className="w-3 h-3 text-[#FF9900] animate-spin" />
                  </p>
                  <p className="text-xs text-amber-950 font-bold leading-normal">
                    Al completar este pedido, ganarás <span className="text-[#FF9900] font-black underline">{order.points || Math.max(1, Math.floor(order.total_price))}</span> puntos.
                  </p>
                  <p className="text-[9px] text-amber-700/80 font-medium">
                    ¡Acumula puntos para canjearlos por copias gratis, carpetas, libretas y más artículos de oficina!
                  </p>
                </div>
              </div>

              {/* Additional Summary Details */}
              <div className="text-left bg-gray-50 rounded-lg p-3.5 border border-gray-100 text-xs space-y-2">
                <div className="flex justify-between font-bold border-b border-gray-200 pb-1.5 mb-1 text-gray-700">
                  <span>Resumen de entrega y pago</span>
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 text-gray-600 font-medium text-[11px]">
                  <div>📍 Método de Entrega:</div>
                  <div className="text-right font-bold text-gray-900">
                    {order.delivery_method === 'retiro' ? 'Retiro en Tienda' : 'Envío a Domicilio'}
                  </div>
                  
                  {order.delivery_method === 'b2c' && order.address_text && (
                    <>
                      <div className="col-span-2 text-gray-400 mt-0.5">Dirección cargada:</div>
                      <div className="col-span-2 bg-white/70 p-1.5 rounded border border-gray-100 italic text-[10px] text-gray-700 truncate">
                        {order.address_text.split('\n')[0]}
                      </div>
                    </>
                  )}

                  <div>💳 Método de Pago:</div>
                  <div className="text-right font-bold text-gray-900">
                    {getPaymentMethodLabel(order.payment_method || '')}
                  </div>

                  {order.payment_amount_with && (
                    <>
                      <div>💵 Paga con:</div>
                      <div className="text-right font-black text-[#008296]">
                        US$ {order.payment_amount_with.toFixed(2)}
                      </div>
                      <div>🪙 Cambio Estimado:</div>
                      <div className="text-right font-black text-emerald-600">
                        US$ {(order.payment_amount_with - order.total_price).toFixed(2)}
                      </div>
                    </>
                  )}

                  <div className="col-span-2 border-t border-dashed border-gray-200 pt-1.5 mt-1 flex justify-between font-bold text-xs text-gray-900">
                    <span>Monto Total:</span>
                    <span>US$ {order.total_price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 border-t border-gray-100 p-4 flex gap-2 shrink-0">
          <button
            onClick={sendWhatsAppHelp}
            disabled={!order}
            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 transition"
          >
            <MessageCircle className="w-4 h-4" />
            Preguntar por WhatsApp
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-black text-xs uppercase tracking-wider cursor-pointer transition"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
