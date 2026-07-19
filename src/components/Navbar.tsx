/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, MapPin, ShieldAlert, Laptop, UserCheck, Settings, RefreshCw, ShoppingCart } from 'lucide-react';
import { dbService, currentSettings } from '../lib/supabase.ts';

interface NavbarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  activeRole: 'admin' | 'vendedor' | 'cliente';
  onOpenSettings: () => void;
  onNavigateToAdmin: () => void;
  isAdminView: boolean;
  onExitAdminView: () => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  onlyOffers: boolean;
  setOnlyOffers: (val: boolean) => void;
  onResetFilters: () => void;
  onSelectCategoryByName: (keyword: string) => void;
  cartItemsCount: number;
  onOpenCart: () => void;
  onClearFiltersOnly?: () => void;
}

export default function Navbar({
  searchTerm,
  setSearchTerm,
  activeRole,
  onOpenSettings,
  onNavigateToAdmin,
  isAdminView,
  onExitAdminView,
  selectedCategory,
  setSelectedCategory,
  onlyOffers,
  setOnlyOffers,
  onResetFilters,
  onSelectCategoryByName,
  cartItemsCount,
  onOpenCart,
  onClearFiltersOnly
}: NavbarProps) {

  const scrollToProducts = () => {
    setTimeout(() => {
      const element = document.getElementById('products-display-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#131921] text-white select-none">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center gap-4">
        {/* Logo */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div 
            onClick={() => {
              onExitAdminView();
              scrollToProducts();
            }} 
            className="cursor-pointer group flex flex-col"
            id="nav-logo"
          >
            <span className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center uppercase">
              COPIAS <span className="text-[#FF9900] ml-1">BELLA VISTA</span>
            </span>
            <span className="text-[10px] text-[#FF9900] font-bold uppercase tracking-widest">
              Distribuidor Oficial
            </span>
          </div>
        </div>

        {/* Location Info (Desktop Only) */}
        <div className="hidden lg:flex items-center gap-2 text-left text-sm max-w-[200px]">
          <MapPin className="text-[#FF9900] w-5 h-5 shrink-0" />
          <div className="leading-tight flex flex-col">
            <span className="text-[11px] text-gray-400 opacity-70">Entregar en</span>
            <span className="font-bold text-white text-xs flex items-center gap-0.5">
              Venezuela (USD)
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="w-full md:flex-1 relative flex">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (onClearFiltersOnly) onClearFiltersOnly();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (onClearFiltersOnly) onClearFiltersOnly();
                scrollToProducts();
              }
            }}
            placeholder="Buscar por nombre, marca o categoría..."
            className="w-full pl-4 pr-14 py-2 bg-white text-[#0F1111] placeholder-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-[#FF9900] text-sm font-medium border border-gray-300"
            id="input-global-search"
          />
          <button 
            type="button"
            onClick={() => {
              if (onClearFiltersOnly) onClearFiltersOnly();
              scrollToProducts();
            }}
            className="absolute right-0 top-0 h-full bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] px-4 rounded-r flex items-center justify-center cursor-pointer transition-colors border-l border-gray-300"
          >
            <Search className="w-5 h-5 font-bold" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4 justify-end w-full md:w-auto">
          {/* Shopping Cart Button */}
          {!isAdminView && (
            <button
              onClick={onOpenCart}
              className="relative p-2 text-white hover:text-[#FF9900] transition cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95 duration-150 mr-1"
              id="btn-navbar-cart"
              title="Abrir Carrito"
            >
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-white hover:text-[#FF9900] transition" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#FF9900] text-[#131921] text-[10px] font-black rounded-full h-4.5 w-4.5 flex items-center justify-center border-2 border-[#131921] animate-bounce">
                    {cartItemsCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-xs font-extrabold uppercase tracking-wider">Carrito</span>
            </button>
          )}

          {/* Admin Navigation Button */}
          {isAdminView ? (
            <button
              onClick={onExitAdminView}
              className="px-4 py-1.5 bg-[#FF9900] text-[#131921] font-bold rounded hover:bg-[#e68a00] transition text-xs shadow cursor-pointer flex items-center gap-1"
              id="btn-exit-admin"
            >
              <Laptop className="w-4 h-4" />
              Ver Catálogo Público
            </button>
          ) : (
            <>
              {(activeRole === 'admin' || activeRole === 'vendedor') && (
                <button
                  onClick={onNavigateToAdmin}
                  className="px-4 py-1.5 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition text-xs shadow-md cursor-pointer flex items-center gap-1 animate-pulse"
                  id="btn-go-admin"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Panel Admin
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sub-navigation bar (Dark Navy) */}
      <nav className="bg-[#232F3E] text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center gap-4 overflow-x-auto whitespace-nowrap border-t border-gray-800">
        <div 
          onClick={() => {
            onResetFilters();
            scrollToProducts();
          }}
          className={`flex items-center gap-1 cursor-pointer transition px-2 py-0.5 border rounded ${
            selectedCategory === 'all' && !onlyOffers
              ? 'border-[#FF9900] text-[#FF9900] font-extrabold bg-[#131921]'
              : 'border-transparent hover:border-gray-700 hover:text-[#FF9900]'
          }`}
          id="nav-sub-todo"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
          <span>Todo</span>
        </div>
        <span className="text-gray-500">|</span>
        <span 
          onClick={() => {
            setOnlyOffers(true);
            setSelectedCategory('all');
            setSearchTerm('');
            scrollToProducts();
          }}
          className={`cursor-pointer transition px-2 py-0.5 rounded border ${
            onlyOffers
              ? 'border-[#FF9900] text-[#FF9900] font-extrabold bg-[#131921]'
              : 'border-transparent hover:border-gray-700 hover:text-[#FF9900]'
          }`}
          id="nav-sub-offers"
        >
          Ofertas
        </span>
        <span 
          onClick={() => {
            onSelectCategoryByName('Papelería y Oficina');
            scrollToProducts();
          }}
          className={`cursor-pointer transition px-2 py-0.5 rounded border ${
            selectedCategory === 'cat-3' && !onlyOffers
              ? 'border-[#FF9900] text-[#FF9900] font-extrabold bg-[#131921]'
              : 'border-transparent hover:border-gray-700 hover:text-[#FF9900]'
          }`}
          id="nav-sub-stationery"
        >
          Papelería
        </span>
        <span 
          onClick={() => {
            onSelectCategoryByName('Impresiones y Copiado');
            scrollToProducts();
          }}
          className={`cursor-pointer transition px-2 py-0.5 rounded border ${
            selectedCategory === 'cat-1' && !onlyOffers
              ? 'border-[#FF9900] text-[#FF9900] font-extrabold bg-[#131921]'
              : 'border-transparent hover:border-gray-700 hover:text-[#FF9900]'
          }`}
          id="nav-sub-copias"
        >
          Copias
        </span>
        <span 
          onClick={() => {
            onSelectCategoryByName('Escolares y Marcadores');
            scrollToProducts();
          }}
          className={`cursor-pointer transition px-2 py-0.5 rounded border ${
            selectedCategory === 'cat-2' && !onlyOffers
              ? 'border-[#FF9900] text-[#FF9900] font-extrabold bg-[#131921]'
              : 'border-transparent hover:border-gray-700 hover:text-[#FF9900]'
          }`}
          id="nav-sub-supplies"
        >
          Escolares
        </span>
        <span 
          onClick={() => {
            onSelectCategoryByName('Postres');
            scrollToProducts();
          }}
          className={`cursor-pointer transition px-2 py-0.5 rounded border ${
            selectedCategory === 'c5fd6476-9639-4cd6-af3e-8515f366fd07' && !onlyOffers
              ? 'border-[#FF9900] text-[#FF9900] font-extrabold bg-[#131921]'
              : 'border-transparent hover:border-gray-700 hover:text-[#FF9900]'
          }`}
          id="nav-sub-postres"
        >
          Postres
        </span>
        <div className="flex-1"></div>
        <span className="text-xs font-bold text-[#FF9900] bg-[#131921] px-2 py-1 rounded border border-gray-800 flex items-center gap-1.5">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${currentSettings.useSupabase ? 'bg-green-500' : 'bg-red-500'}`}></span>
          Tasa de cambio: BCV
        </span>
      </nav>
    </header>
  );
}
