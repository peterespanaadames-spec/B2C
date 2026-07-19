/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, ShoppingCart, MessageCircle, AlertCircle, MapPin, Navigation, Loader2 } from 'lucide-react';
import { Product, CartItem } from '../types.ts';
import { dbService } from '../lib/supabase.ts';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  productImages: { product_id: string; image_url: string }[];
  onOrderSuccess?: (orderId: string) => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  productImages,
  onOrderSuccess
}: CartDrawerProps) {
  // Customer info form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [countryPrefix, setCountryPrefix] = useState('+58');
  const [deliveryMethod, setDeliveryMethod] = useState<'b2c' | 'retiro'>('retiro');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState('');
  const [comments, setComments] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pagomovil' | 'efectivo' | 'transferencia'>('pagomovil');
  const [paymentAmountWith, setPaymentAmountWith] = useState('');

  // Address suggestions and geolocation states
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [suggestionTimeout, setSuggestionTimeout] = useState<any>(null);

  const countries = [
    { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
    { code: '+57', flag: '🇨🇴', name: 'Colombia' },
    { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
    { code: '+51', flag: '🇵🇪', name: 'Perú' },
    { code: '+56', flag: '🇨🇱', name: 'Chile' },
    { code: '+54', flag: '🇦🇷', name: 'Argentina' },
    { code: '+34', flag: '🇪🇸', name: 'España' },
    { code: '+1', flag: '🇺🇸', name: 'Estados Unidos' },
    { code: '+507', flag: '🇵🇦', name: 'Panamá' },
  ];

  const handleAddressChange = (val: string) => {
    setAddress(val);
    
    if (suggestionTimeout) {
      clearTimeout(suggestionTimeout);
    }

    if (val.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=4&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'CopiasBellaVista-Applet/1.0'
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const uniqueSuggestions: string[] = data.map((item: any) => item.display_name);
            setAddressSuggestions(uniqueSuggestions);
          }
        }
      } catch (err) {
        console.error("Error fetching address suggestions:", err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 500);

    setSuggestionTimeout(timeout);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no está soportada por tu navegador.");
      return;
    }

    setIsLocating(true);
    setLocationStatus('idle');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'CopiasBellaVista-Applet/1.0'
              }
            }
          );
          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              setAddress(data.display_name);
              setLocationStatus('success');
            } else {
              setAddress(`Ubicación: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
              setLocationStatus('success');
            }
          } else {
            setAddress(`Ubicación: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            setLocationStatus('success');
          }
        } catch (err) {
          console.error("Error doing reverse geocoding:", err);
          setAddress(`Ubicación: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setLocationStatus('success');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Error getting geolocation:", error);
        setLocationStatus('error');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Calculate totals
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cartItems.reduce((acc, item) => {
    const price = item.product.offer_price !== null ? item.product.offer_price : item.product.price;
    return acc + price * item.quantity;
  }, 0);

  // Helper to get product image
  const getProductImage = (productId: string) => {
    const found = productImages.find(img => img.product_id === productId);
    return found ? found.image_url : 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=150';
  };

  // WhatsApp Order Submission
  const handleConfirmOrder = async () => {
    if (!customerName.trim()) {
      setFormError('Por favor, ingresa tu nombre completo para continuar.');
      return;
    }
    if (!customerPhone.trim()) {
      setFormError('Por favor, ingresa tu número de teléfono para continuar.');
      return;
    }
    if (deliveryMethod === 'b2c' && !address.trim()) {
      setFormError('Por favor, ingresa tu dirección para la entrega a domicilio.');
      return;
    }

    // Validation for cash payment
    if (paymentMethod === 'efectivo') {
      if (!paymentAmountWith.trim()) {
        setFormError('Por favor, indica con cuánto vas a pagar en efectivo.');
        return;
      }
      const amountNum = parseFloat(paymentAmountWith);
      if (isNaN(amountNum) || amountNum <= 0) {
        setFormError('Por favor, ingresa un monto válido.');
        return;
      }
      if (amountNum < totalPrice) {
        setFormError(`El monto a pagar ($${amountNum.toFixed(2)}) no puede ser menor al total del pedido ($${totalPrice.toFixed(2)}).`);
        return;
      }
    }

    setFormError('');

    const fullPhone = `${countryPrefix} ${customerPhone.trim()}`;
    let createdOrderId = '';

    // Calculate loyalty points: $1 spent = 1 point, minimum of 1
    const loyaltyPoints = Math.max(1, Math.floor(totalPrice));

    // Try to save to Supabase
    try {
      const orderItems = cartItems.map(item => {
        const itemPrice = item.product.offer_price !== null ? item.product.offer_price : item.product.price;
        return {
          product_id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: itemPrice
        };
      });

      const orderData = {
        customer_name: customerName.trim(),
        phone_number: fullPhone,
        delivery_method: deliveryMethod,
        address_text: deliveryMethod === 'b2c' ? address.trim() : null,
        items: orderItems,
        total_price: totalPrice,
        status: 'pendiente',
        comments: comments.trim() || null,
        payment_method: paymentMethod,
        payment_amount_with: paymentMethod === 'efectivo' ? parseFloat(paymentAmountWith) : null,
        payment_status: 'pendiente',
        points: loyaltyPoints
      };

      const created = await dbService.createOrder(orderData);
      if (created && created.id) {
        createdOrderId = created.id;
        localStorage.setItem('copias_bellavista_last_order_id', created.id);
      }
    } catch (e) {
      console.warn("Could not save order to Supabase. This might be because the table is not created yet or Supabase is not configured.", e);
      // We still proceed to send WhatsApp as it is the primary checkout flow!
    }

    const phoneNumber = '584125043857'; // Business contact number in Barinitas
    
    // Construct message
    let message = `🛒 *NUEVO PEDIDO - COPIAS BELLA VISTA* 🛒\n\n`;
    message += `👤 *Cliente:* ${customerName.trim()}\n`;
    message += `📞 *Teléfono:* ${fullPhone}\n`;
    message += `📦 *Entrega:* ${deliveryMethod === 'retiro' ? 'Retiro en Tienda (Bella Vista, Barinitas)' : 'Envío a Domicilio'}\n`;
    if (deliveryMethod === 'b2c') {
      message += `📍 *Dirección:* ${address.trim()}\n`;
    }

    const methodLabels = {
      pagomovil: 'Pagomóvil',
      efectivo: 'Efectivo',
      transferencia: 'Transferencia Bancaria'
    };
    message += `💳 *Método de Pago:* ${methodLabels[paymentMethod]}\n`;

    if (paymentMethod === 'efectivo') {
      const payWith = parseFloat(paymentAmountWith);
      message += `💵 *Paga con:* $${payWith.toFixed(2)} USD (Cambio: $${(payWith - totalPrice).toFixed(2)} USD)\n`;
    }

    if (comments.trim()) {
      message += `📝 *Comentarios/Instrucciones:* ${comments.trim()}\n`;
    }

    message += `🎁 *Puntos Estimados:* +${loyaltyPoints} pts\n`;
    message += `\n---------------------------------------\n`;
    message += `📝 *Detalle del Pedido:*\n`;

    cartItems.forEach((item) => {
      const price = item.product.offer_price !== null ? item.product.offer_price : item.product.price;
      const formattedPrice = `$${price.toFixed(2)} USD`;
      const itemSubtotal = `$${(price * item.quantity).toFixed(2)} USD`;
      
      message += `• ${item.quantity}x _${item.product.name}_ (SKU: ${item.product.sku}) - ${formattedPrice} c/u | Subtotal: ${itemSubtotal}\n`;
    });

    message += `---------------------------------------\n`;
    message += `💰 *TOTAL A PAGAR:* *$${totalPrice.toFixed(2)} USD*\n\n`;
    message += `_¡Hola! He armado este pedido desde su catálogo online. ¿Me podrían confirmar la disponibilidad de los productos y los datos de pago? ¡Gracias!_`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');

    // Notify parent to open the order tracking view
    if (onOrderSuccess && createdOrderId) {
      onOrderSuccess(createdOrderId);
    } else if (onOrderSuccess) {
      // Fallback if DB save failed
      onOrderSuccess('temp-last-order');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs cursor-pointer"
          />

          {/* Cart Panel Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col select-none border-l border-gray-200"
          >
            {/* Header */}
            <div className="bg-[#131921] text-white px-4 py-4 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#FF9900]" />
                <h3 className="font-bold text-base uppercase tracking-wider">Tu Carrito</h3>
                <span className="bg-[#FF9900] text-[#131921] text-[11px] font-black rounded-full px-2 py-0.5">
                  {totalItems}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 text-left">
              {cartItems.length === 0 ? (
                <div className="h-60 flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-gray-400">
                    <ShoppingCart className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Tu carrito está vacío</h4>
                    <p className="text-xs text-gray-400 mt-1">Explora nuestro catálogo y agrega los productos que desees comprar.</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#F2C200] rounded text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Seguir Comprando
                  </button>
                </div>
              ) : (
                <>
                  {/* Items list */}
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-xs text-[#0F1111] uppercase tracking-wider border-b border-gray-100 pb-1">Artículos seleccionados:</h4>
                    {cartItems.map((item) => {
                      const itemPrice = item.product.offer_price !== null ? item.product.offer_price : item.product.price;
                      return (
                        <div 
                          key={item.product.id}
                          className="flex gap-3 bg-gray-50 border border-gray-200 rounded-lg p-2.5 hover:shadow-xs transition relative"
                        >
                          {/* Image */}
                          <div className="w-16 h-16 bg-white border border-gray-200 rounded p-1 flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                              src={getProductImage(item.product.id)}
                              alt={item.product.name}
                              className="max-h-full max-w-full object-contain mix-blend-multiply"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 flex flex-col justify-between min-w-0">
                            <div>
                              <h5 className="text-xs font-bold text-[#0F1111] truncate" title={item.product.name}>
                                {item.product.name}
                              </h5>
                              <p className="text-[10px] text-gray-400 font-bold font-mono">SKU: {item.product.sku}</p>
                            </div>

                            <div className="flex items-center justify-between mt-1.5">
                              {/* Quantity Controls */}
                              <div className="flex items-center border border-gray-300 rounded bg-white shrink-0">
                                <button
                                  onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                                  className="px-2 py-0.5 text-gray-500 hover:text-gray-800 font-bold text-xs cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-2 text-xs font-bold text-gray-800 min-w-[1.25rem] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                                  className="px-2 py-0.5 text-gray-500 hover:text-gray-800 font-bold text-xs cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              {/* Price */}
                              <span className="text-xs font-black text-[#0F1111]">
                                US${(itemPrice * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Delete Trash Button */}
                          <button
                            onClick={() => onRemoveItem(item.product.id)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-red-600 transition cursor-pointer"
                            title="Eliminar artículo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Customer Information Form */}
                  <div className="space-y-3 bg-[#F7F7F7] border border-gray-200 rounded-lg p-3.5">
                    <h4 className="font-extrabold text-xs text-[#0F1111] uppercase tracking-wider border-b border-gray-200 pb-1 flex items-center gap-1.5">
                      <span>Datos del Pedido</span>
                    </h4>

                    {formError && (
                      <div className="flex items-start gap-1.5 p-2 bg-red-50 border border-red-200 text-red-600 rounded text-xs font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <div className="space-y-3.5">
                      {/* Name input */}
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Ej. María Pérez"
                          className="w-full px-3 py-1.5 text-xs text-[#0F1111] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                        />
                      </div>

                      {/* Phone input with country selector */}
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1">
                          Número de Teléfono *
                        </label>
                        <div className="flex gap-1.5">
                          <div className="relative shrink-0">
                            <select
                              value={countryPrefix}
                              onChange={(e) => setCountryPrefix(e.target.value)}
                              className="h-full px-2.5 py-1.5 text-xs text-[#0F1111] bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF9900] appearance-none cursor-pointer pr-7 font-extrabold"
                            >
                              {countries.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.flag} {c.code}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-500">
                              <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                              </svg>
                            </div>
                          </div>
                          <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => {
                              // Filter numeric input only
                              setCustomerPhone(e.target.value.replace(/[^\d\s-]/g, ''));
                            }}
                            placeholder="Ej. 412-1234567"
                            className="flex-1 min-w-0 px-3 py-1.5 text-xs text-[#0F1111] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
                          />
                        </div>
                      </div>

                      {/* Delivery Option */}
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1">
                          Método de Entrega *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setDeliveryMethod('retiro')}
                            className={`px-3 py-1.5 text-xs font-bold rounded border transition cursor-pointer text-center ${
                              deliveryMethod === 'retiro'
                                ? 'bg-[#FF9900]/10 border-[#FF9900] text-[#131921]'
                                : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                            }`}
                          >
                            Retiro Tienda
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeliveryMethod('b2c')}
                            className={`px-3 py-1.5 text-xs font-bold rounded border transition cursor-pointer text-center ${
                              deliveryMethod === 'b2c'
                                ? 'bg-[#FF9900]/10 border-[#FF9900] text-[#131921]'
                                : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                            }`}
                          >
                            A Domicilio
                          </button>
                        </div>
                      </div>

                      {/* Conditional address field with autocomplete & geolocation */}
                      {deliveryMethod === 'b2c' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1.5"
                        >
                          <div className="flex justify-between items-center">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wide">
                              Dirección de Entrega *
                            </label>
                            
                            {/* Geolocation Button */}
                            <button
                              type="button"
                              onClick={handleUseCurrentLocation}
                              disabled={isLocating}
                              className="inline-flex items-center gap-1 text-[9px] font-black text-[#FF9900] hover:text-[#e68a00] uppercase tracking-wider transition cursor-pointer disabled:opacity-60"
                            >
                              {isLocating ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Navigation className="w-3 h-3 text-[#FF9900] animate-pulse" />
                              )}
                              {isLocating ? 'Buscando...' : 'Usar mi ubicación actual'}
                            </button>
                          </div>

                          <div className="relative">
                            <textarea
                              value={address}
                              onChange={(e) => handleAddressChange(e.target.value)}
                              placeholder="Ej. Calle Principal, Sector Bella Vista, Casa Nro. 24"
                              rows={2}
                              className="w-full px-3 py-1.5 text-xs text-[#0F1111] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF9900] resize-none"
                            />

                            {/* Suggestions Dropdown */}
                            {addressSuggestions.length > 0 && (
                              <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto bg-white border border-gray-200 rounded shadow-lg text-left divide-y divide-gray-100">
                                {addressSuggestions.map((suggestion, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                      setAddress(suggestion);
                                      setAddressSuggestions([]);
                                    }}
                                    className="w-full px-3 py-2 text-[10px] text-gray-700 hover:bg-amber-50 text-left truncate block font-medium transition cursor-pointer"
                                  >
                                    📍 {suggestion}
                                  </button>
                                ))}
                              </div>
                            )}

                            {isLoadingSuggestions && (
                              <div className="absolute right-3.5 top-2.5">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                              </div>
                            )}
                          </div>

                          {locationStatus === 'success' && (
                            <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                              ✓ Dirección cargada exitosamente mediante GPS.
                            </p>
                          )}
                          {locationStatus === 'error' && (
                            <p className="text-[9px] text-rose-600 font-bold flex items-center gap-1">
                              ⚠ Permiso GPS denegado o error. Escribe tu dirección manualmente.
                            </p>
                          )}
                        </motion.div>
                      )}

                      {/* Comments Input */}
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1">
                          Comentarios u Observaciones (Opcional)
                        </label>
                        <textarea
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          placeholder="Instrucciones especiales para tu pedido o entrega..."
                          rows={2}
                          className="w-full px-3 py-1.5 text-xs text-[#0F1111] border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF9900] resize-none font-medium"
                        />
                      </div>

                      {/* Payment Method Dropdown */}
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1">
                          Método de Pago *
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full px-3 py-2 text-xs text-[#0F1111] bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#FF9900] cursor-pointer font-bold"
                        >
                          <option value="pagomovil">Pagomóvil</option>
                          <option value="efectivo">Efectivo (USD / Bs)</option>
                          <option value="transferencia">Transferencia Bancaria</option>
                        </select>
                      </div>

                      {/* Dynamic Payment Instructions */}
                      <AnimatePresence mode="wait">
                        {(paymentMethod === 'pagomovil' || paymentMethod === 'transferencia') && (
                          <motion.div
                            key="bank-instructions"
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="p-3 bg-amber-50 border border-amber-200 rounded text-left space-y-1"
                          >
                            <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">
                              Instrucciones de Pago ({paymentMethod === 'pagomovil' ? 'Pagomóvil' : 'Transferencia'})
                            </p>
                            <p className="text-xs text-amber-950 font-bold leading-relaxed">
                              Por favor realice el pago a los siguientes datos:
                            </p>
                            <div className="text-[11px] text-amber-950 font-medium space-y-0.5 mt-1 bg-white/60 p-2 rounded border border-amber-100">
                              <div>🏦 <strong className="font-extrabold">Banco:</strong> Banco Banesco</div>
                              <div>🆔 <strong className="font-extrabold">Cédula:</strong> V-12.206.392</div>
                              <div>📞 <strong className="font-extrabold">Teléfono:</strong> 0412-504.38.57</div>
                              <div className="text-[9px] pt-1 text-amber-800 font-bold">⚠️ Guarde el comprobante de pago para enviarlo adjunto por WhatsApp.</div>
                            </div>
                          </motion.div>
                        )}

                        {paymentMethod === 'efectivo' && (
                          <motion.div
                            key="cash-instructions"
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="p-3 bg-blue-50 border border-blue-200 rounded text-left space-y-2.5"
                          >
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider">
                                Pago en Efectivo
                              </p>
                              <p className="text-xs text-blue-950 font-bold">
                                Indica el monto exacto del billete con el que vas a pagar para prepararte el cambio:
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-blue-950 font-extrabold">A pagar con: US$</span>
                              <input
                                type="number"
                                min={Math.ceil(totalPrice)}
                                step="any"
                                value={paymentAmountWith}
                                onChange={(e) => setPaymentAmountWith(e.target.value)}
                                placeholder={`Mínimo $${totalPrice.toFixed(2)}`}
                                className="w-28 px-2 py-1 bg-white border border-blue-300 rounded text-xs font-bold text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            {parseFloat(paymentAmountWith) > totalPrice && (
                              <p className="text-[10px] text-blue-800 font-extrabold">
                                💵 Tu cambio estimado será de: <span className="text-emerald-600 font-black">US$ {(parseFloat(paymentAmountWith) - totalPrice).toFixed(2)}</span>
                              </p>
                            )}

                            <div className="text-[10px] text-blue-800 font-bold bg-white/60 p-1.5 rounded border border-blue-100 flex items-center gap-1.5">
                              ⚠️ <span className="uppercase tracking-wide font-black text-blue-900">Nota:</span> Los billetes deben estar en buen estado.
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Summary & Order Button */}
            {cartItems.length > 0 && (
              <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>Total artículos:</span>
                    <span className="font-bold">{totalItems}</span>
                  </div>
                  <div className="flex justify-between items-baseline border-t border-gray-200 pt-1.5">
                    <span className="font-bold text-[#0F1111]">Total a Pagar:</span>
                    <span className="text-xl font-black text-[#0F1111]">
                      US$ {totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold text-center mt-1 uppercase tracking-wide">
                    • Pago calculado al cambio oficial de la tasa BCV •
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={onClearCart}
                    className="py-2 px-1 text-xs font-bold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded transition cursor-pointer flex items-center justify-center gap-1"
                    title="Vaciar carrito"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Vaciar
                  </button>

                  <button
                    onClick={handleConfirmOrder}
                    className="col-span-2 py-2.5 px-4 bg-[#FFA41C] hover:bg-[#FA8900] text-[#0F1111] font-black rounded border border-[#E68200] shadow transition flex items-center justify-center gap-1.5 cursor-pointer text-xs md:text-sm active:scale-95 duration-100"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0 text-[#131921]" />
                    Pedir (US$ {totalPrice.toFixed(2)})
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
