/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Phone, MapPin, Clock, CheckCircle2, ShieldCheck, HelpCircle } from 'lucide-react';

interface InfoModalProps {
  onClose: () => void;
}

export default function InfoModal({ onClose }: InfoModalProps) {
  const [isOpenNow, setIsOpenNow] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [currentTimeText, setCurrentTimeText] = useState('');

  // Schedule matrix logic
  // Monday to Saturday (1 to 6):
  // 08:00 AM – 12:00 PM (480 to 720 minutes)
  // 02:30 PM – 06:00 PM (870 to 1080 minutes)
  // Sunday (0): Closed
  useEffect(() => {
    const updateStatus = () => {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
      
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentMinutes = hours * 60 + minutes;

      const morningStart = 8 * 60;         // 08:00 AM = 480 mins
      const morningEnd = 12 * 60;          // 12:00 PM = 720 mins
      const afternoonStart = 14 * 60 + 30; // 02:30 PM = 870 mins
      const afternoonEnd = 18 * 60;        // 06:00 PM = 1080 mins

      // Format current time text for display
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      setCurrentTimeText(`${dayNames[day]}, ${formattedTime}`);

      if (day === 0) {
        setIsOpenNow(false);
        setStatusText('Cerrado - Abre el Lunes a las 08:00 AM');
        return;
      }

      const inMorning = currentMinutes >= morningStart && currentMinutes <= morningEnd;
      const inAfternoon = currentMinutes >= afternoonStart && currentMinutes <= afternoonEnd;

      if (inMorning) {
        setIsOpenNow(true);
        setStatusText('Abierto - Turno Mañana (Cierra a las 12:00 PM)');
      } else if (inAfternoon) {
        setIsOpenNow(true);
        setStatusText('Abierto - Turno Tarde (Cierra a las 06:00 PM)');
      } else {
        setIsOpenNow(false);
        if (currentMinutes < morningStart) {
          setStatusText('Cerrado - Abre hoy a las 08:00 AM');
        } else if (currentMinutes < afternoonStart) {
          setStatusText('Cerrado - Abre hoy a las 02:30 PM');
        } else {
          const nextDay = day === 6 ? 'el Lunes' : 'mañana';
          setStatusText(`Cerrado - Abre ${nextDay} a las 08:00 AM`);
        }
      }
    };

    updateStatus();
    // Update every 30 seconds
    const interval = setInterval(updateStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const whatsappNumber = "+574125043857";
  const whatsappUrl = `https://wa.me/574125043857?text=Hola%20Copias%20Bella%20Vista,%20me%20gustar%C3%ADa%20hacer%20una%20consulta.`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs select-none overflow-y-auto">
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
        id="info-modal-container"
      >
        {/* Banner principal */}
        <div className="bg-[#131921] px-6 py-5 text-white flex justify-between items-center border-b-4 border-[#FF9900]">
          <div className="flex items-center gap-3">
            <div className="bg-[#FF9900] text-[#131921] p-2 rounded-lg font-black text-lg">
              CBV
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wide">Copias Bella Vista</h2>
              <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Tu centro de impresión y copiado</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1.5 hover:bg-gray-800 rounded-full cursor-pointer"
            id="info-modal-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4.5 space-y-4">
          {/* Badge dinámico de estado */}
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex flex-col sm:flex-row items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <div className="text-left">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Estado de Atención</p>
                <p className="text-xs text-gray-600 font-bold">{currentTimeText}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center sm:items-end">
              <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm transition-all ${
                isOpenNow 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse' 
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${isOpenNow ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {isOpenNow ? 'Abierto' : 'Cerrado'}
              </span>
              <p className="text-[10px] text-gray-500 font-medium mt-1.5 text-center sm:text-right">
                {statusText}
              </p>
            </div>
          </div>

          {/* Información de Contacto & Dirección */}
          <div className="space-y-2.5">
            <h3 className="text-xs text-gray-400 font-extrabold uppercase tracking-widest text-left border-b border-gray-100 pb-1">
              Detalles del Establecimiento
            </h3>
            
            {/* Dirección */}
            <div className="flex items-start gap-2.5">
              <div className="bg-amber-50 text-amber-600 p-1.5 rounded-lg mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Dirección de la Tienda</p>
                <p className="text-xs text-gray-800 font-bold leading-normal">
                  Carrera 6 entre Calle 19 y 20, local 1-3
                </p>
                <p className="text-[11px] text-gray-500">Barinitas, Estado Barinas, Venezuela</p>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="flex items-start gap-2.5">
              <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg mt-0.5">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-left flex-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Enlace de WhatsApp</p>
                <p className="text-xs text-gray-800 font-bold">{whatsappNumber}</p>
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-extrabold mt-0.5 hover:underline transition"
                >
                  Chatear directamente por WhatsApp &rarr;
                </a>
              </div>
            </div>
          </div>

          {/* Tipos de servicio soportados */}
          <div className="space-y-2">
            <h3 className="text-xs text-gray-400 font-extrabold uppercase tracking-widest text-left border-b border-gray-100 pb-1">
              Tipos de Servicio Soportados
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
              {/* Servicio A domicilio */}
              <div className="border border-gray-200 rounded-lg p-2.5 flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100/50 transition">
                <input 
                  type="checkbox" 
                  checked 
                  disabled 
                  className="w-3.5 h-3.5 text-[#FF9900] bg-gray-100 border-gray-300 rounded focus:ring-amber-500 cursor-not-allowed" 
                />
                <div className="text-left">
                  <p className="text-xs text-gray-800 font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-current" />
                    A Domicilio
                  </p>
                  <p className="text-[10px] text-gray-500">Recibe tu pedido en casa</p>
                </div>
              </div>

              {/* Servicio Retiro en tienda */}
              <div className="border border-gray-200 rounded-lg p-2.5 flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100/50 transition">
                <input 
                  type="checkbox" 
                  checked 
                  disabled 
                  className="w-3.5 h-3.5 text-[#FF9900] bg-gray-100 border-gray-300 rounded focus:ring-amber-500 cursor-not-allowed" 
                />
                <div className="text-left">
                  <p className="text-xs text-gray-800 font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-current" />
                    Retiro en Tienda
                  </p>
                  <p className="text-[10px] text-gray-500">Recoge directamente en local</p>
                </div>
              </div>
            </div>
          </div>

          {/* Matriz de Horarios */}
          <div className="space-y-1.5 bg-[#F7F9FA] rounded-lg p-3 border border-gray-200">
            <h4 className="text-xs text-gray-700 font-black text-left flex items-center gap-1.5 uppercase">
              <Clock className="w-4 h-4 text-[#FF9900]" />
              Matriz de Horarios de Atención
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-600 pt-1 text-left font-medium">
              <div className="flex justify-between border-b border-gray-100 pb-0.5">
                <span className="font-bold text-gray-800">Lunes</span>
              </div>
              <div className="border-b border-gray-100 pb-0.5 text-right font-semibold text-gray-700">
                08:00 a 12:00 - 2:30 a 6:00
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-0.5">
                <span className="font-bold text-gray-800">Martes</span>
              </div>
              <div className="border-b border-gray-100 pb-0.5 text-right font-semibold text-gray-700">
                08:00 a 12:00 - 2:30 a 6:00
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-0.5">
                <span className="font-bold text-gray-800">Miércoles</span>
              </div>
              <div className="border-b border-gray-100 pb-0.5 text-right font-semibold text-gray-700">
                08:00 a 12:00 - 2:30 a 6:00
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-0.5">
                <span className="font-bold text-gray-800">Jueves</span>
              </div>
              <div className="border-b border-gray-100 pb-0.5 text-right font-semibold text-gray-700">
                08:00 a 12:00 - 2:30 a 6:00
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-0.5">
                <span className="font-bold text-gray-800">Viernes</span>
              </div>
              <div className="border-b border-gray-100 pb-0.5 text-right font-semibold text-gray-700">
                08:00 a 12:00 - 2:30 a 6:00
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-0.5">
                <span className="font-bold text-gray-800">Sábado</span>
              </div>
              <div className="border-b border-gray-100 pb-0.5 text-right font-semibold text-gray-700">
                08:00 a 12:00 - 2:30 a 6:00
              </div>

              <div className="flex justify-between text-rose-600 font-bold">
                <span>Domingo</span>
              </div>
              <div className="text-right text-rose-600 font-black">
                Cerrado (No laborable)
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-950 hover:bg-gray-900 text-white font-black text-xs uppercase tracking-wider rounded transition-all cursor-pointer shadow-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
