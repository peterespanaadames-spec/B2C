/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Printer, GraduationCap, Clock, Flame, Cake } from 'lucide-react';

interface BannerProps {
  onSelectCategoryByName: (keyword: string) => void;
  setOnlyOffers: (val: boolean) => void;
}

export default function Banner({ onSelectCategoryByName, setOnlyOffers }: BannerProps) {
  return (
    <div className="bg-gradient-to-r from-[#131921] via-[#232F3E] to-[#1b2533] text-white py-8 px-6 rounded-lg border border-gray-800 shadow-lg mb-8 relative overflow-hidden select-none animate-fadeIn">
      {/* Decorative background shapes */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9900]/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute -bottom-10 left-1/3 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>

      <div className="max-w-4xl relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-left">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 px-2.5 py-0.5 rounded text-[11px] font-bold text-gray-200 shadow-sm mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Abierto • Despachos directos en Barinitas, Venezuela
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Artículos <span className="text-[#FF9900]">Escolares y de Oficina</span>
          </h1>
          <p className="mt-2 text-sm md:text-base font-normal max-w-xl text-gray-300 leading-snug">
            ¡Precios especiales de distribuidor! Explora el catálogo oficial de <span className="font-extrabold text-[#FF9900] bg-gray-800/80 px-1.5 py-0.5 rounded">COPIAS BELLA VISTA</span>. Consultas al instante y compras directas por WhatsApp.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button 
              onClick={() => onSelectCategoryByName('sistemas')}
              className="bg-[#131921] border border-gray-800 hover:border-gray-600 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer transition transform hover:scale-105 active:scale-95"
              id="banner-btn-photocopies"
            >
              <Printer className="w-3.5 h-3.5 text-[#FF9900]" />
              Fotocopias e Impresiones
            </button>
            <button 
              onClick={() => onSelectCategoryByName('papeleria')}
              className="bg-gray-800 border border-gray-700 hover:border-gray-500 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer transition transform hover:scale-105 active:scale-95"
              id="banner-btn-supplies"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#FF9900]" />
              Papelería y Oficina
            </button>
            <button 
              onClick={() => onSelectCategoryByName('escolares')}
              className="bg-emerald-950/50 border border-emerald-800/80 hover:border-emerald-600 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer transition transform hover:scale-105 active:scale-95"
              id="banner-btn-school"
            >
              <GraduationCap className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              Escolares
            </button>
            <button 
              onClick={() => onSelectCategoryByName('postre')}
              className="bg-pink-950/50 border border-pink-800/80 hover:border-pink-600 text-pink-300 text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer transition transform hover:scale-105 active:scale-95"
              id="banner-btn-desserts"
            >
              <Cake className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              Postres
            </button>
          </div>
        </div>

        {/* Highlight badge right side (Interactive Season Offer badge) */}
        <button 
          onClick={() => setOnlyOffers(true)}
          className="bg-[#131921] text-white p-4 rounded border border-gray-700 shadow-2xl flex flex-col items-center justify-center min-w-[170px] shrink-0 text-center transform hover:scale-110 active:scale-95 transition duration-300 cursor-pointer hover:border-[#FF9900]"
          title="Ver todos los productos en oferta"
          id="banner-badge-offers"
        >
          <Flame className="w-8 h-8 text-[#FF9900] animate-bounce" />
          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Ofertas de Temporada</p>
          <p className="text-xl font-black text-[#FF9900]">-25% OFF</p>
          <p className="text-[9px] text-gray-300 mt-1 font-semibold">Tóner y Resmas de Papel</p>
        </button>
      </div>
    </div>
  );
}
