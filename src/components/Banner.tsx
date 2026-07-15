/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Product, ProductImage, Category } from '../types';

interface BannerProps {
  onSelectCategoryByName: (keyword: string) => void;
  setOnlyOffers: (val: boolean) => void;
  products: Product[];
  productImages: ProductImage[];
  categories: Category[];
  onViewProduct: (product: Product) => void;
}

export default function Banner({ 
  onSelectCategoryByName, 
  setOnlyOffers,
  products = [],
  productImages = [],
  categories = [],
  onViewProduct
}: BannerProps) {

  // Helper to find real product images from the database
  const getProductImg = (productId: string): string => {
    const found = productImages.find(img => img.product_id === productId);
    return found ? found.image_url : 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&q=80&w=150';
  };

  // Helper to filter real products of categories matching given name or ID
  const getCategoryProducts = (categoryName: string, fallbackId: string) => {
    // Find matching category object by name, slug or exact ID
    const matchedCategory = categories.find(c => 
      c.name.toLowerCase().trim() === categoryName.toLowerCase().trim() || 
      c.name.toLowerCase().includes(categoryName.toLowerCase().trim()) ||
      c.id === fallbackId
    );
    const categoryId = matchedCategory ? matchedCategory.id : fallbackId;
    
    // Filter active products belonging to this category, max 4
    return products
      .filter(p => p.active && p.category_id === categoryId)
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
      .slice(0, 4);
  };

  // Helper to resolve the correct category name to pass back to the filter handler
  const getCategoryName = (categoryName: string, fallbackId: string) => {
    const matchedCategory = categories.find(c => 
      c.name.toLowerCase().trim() === categoryName.toLowerCase().trim() || 
      c.name.toLowerCase().includes(categoryName.toLowerCase().trim()) ||
      c.id === fallbackId
    );
    return matchedCategory ? matchedCategory.name : categoryName;
  };

  // Extract products for each section from the database (Strictly no simulated/mock items)
  const photocopyProducts = getCategoryProducts('Impresiones y Copiado', 'cat-1');
  const officeProducts = getCategoryProducts('Papelería y Oficina', 'cat-3');
  const schoolProducts = getCategoryProducts('Escolares y Marcadores', 'cat-2');
  const dessertProducts = getCategoryProducts('Postres', 'c5fd6476-9639-4cd6-af3e-8515f366fd07');

  // Resolve category display/filter names dynamically
  const photocopyCatName = getCategoryName('Impresiones y Copiado', 'cat-1');
  const officeCatName = getCategoryName('Papelería y Oficina', 'cat-3');
  const schoolCatName = getCategoryName('Escolares y Marcadores', 'cat-2');
  const dessertCatName = getCategoryName('Postres', 'c5fd6476-9639-4cd6-af3e-8515f366fd07');

  // Dynamic grid renderer depending on the actual number of products available
  const renderProductSubgrid = (sectionProducts: Product[]) => {
    if (sectionProducts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center bg-white/20 border border-dashed border-[#0F1111]/20 rounded-xl p-4 h-[280px]">
          <p className="text-xs font-bold text-[#0F1111]/70 text-center leading-relaxed">
            No hay productos cargados en esta sección actualmente.
          </p>
        </div>
      );
    }

    const count = sectionProducts.length;

    // Grid layout adjustments
    let gridClass = "grid gap-3 mb-4";
    if (count === 1) {
      gridClass += " grid-cols-1";
    } else if (count === 2) {
      gridClass += " grid-cols-2";
    } else {
      gridClass += " grid-cols-2";
    }

    return (
      <div className={gridClass}>
        {sectionProducts.map((product) => {
          const imgUrl = getProductImg(product.id);
          const isSingle = count === 1;

          return (
            <div 
              key={product.id}
              onClick={(e) => {
                e.stopPropagation();
                onViewProduct(product);
              }}
              className={`bg-white p-2.5 rounded-xl border border-gray-200/50 hover:shadow-lg hover:scale-[1.03] transition duration-300 flex flex-col justify-between text-center cursor-pointer ${
                isSingle ? 'h-[280px] p-4' : 'h-[135px]'
              }`}
            >
              <div className={`w-full bg-[#F7F7F7] rounded-lg overflow-hidden flex items-center justify-center p-1 ${
                isSingle ? 'h-[180px] mb-2' : 'h-[75px] mb-1'
              }`}>
                <img 
                  src={imgUrl} 
                  alt={product.name} 
                  className={`object-contain mix-blend-multiply transition duration-300 ${
                    isSingle ? 'max-h-full max-w-full hover:scale-105' : 'w-full h-full'
                  }`}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              </div>
              <div>
                <span className={`font-extrabold text-[#374151] line-clamp-1 block leading-tight px-0.5 ${
                  isSingle ? 'text-xs mb-1 font-black' : 'text-[9px]'
                }`} title={product.name}>
                  {product.name}
                </span>
                <span className={`font-black block text-center ${
                  isSingle ? 'text-sm text-[#FF9900]' : 'text-[10px] text-[#FF9900]'
                }`}>
                  US$ {product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mb-8 select-none">
      {/* Upper Quick Info Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-gradient-to-r from-[#131921] to-[#232F3E] text-white px-6 py-3 rounded-t-xl border border-gray-800 shadow-md gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <p className="text-xs font-semibold tracking-wide text-gray-200">
            Abierto • Despachos directos y entregas en Barinitas, Venezuela
          </p>
        </div>
        <button 
          onClick={() => setOnlyOffers(true)}
          className="bg-[#FF9900] hover:bg-[#FF9900]/90 text-[#131921] text-xs font-bold px-3.5 py-1.5 rounded-md shadow-sm transition transform hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
          id="banner-top-promo-btn"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Ver Ofertas Especiales (-25% OFF)
        </button>
      </div>

      {/* Main 4-Column Bento Classifications Grid with Highly Vivid, Bright Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 bg-gray-100 p-5 rounded-b-xl border-x border-b border-gray-200 shadow-inner">
        
        {/* Card 1: IMPRESIONES Y COPIADO (Vivid Amber/Orange) */}
        <div 
          onClick={() => onSelectCategoryByName(photocopyCatName)}
          className="bg-[#FFA41C] border border-[#E07A00] rounded-2xl p-5 flex flex-col justify-between min-h-[460px] hover:shadow-2xl hover:border-[#0F1111]/30 transition-all duration-300 cursor-pointer group"
          id="banner-section-photocopies"
        >
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-white bg-[#0F1111] px-2.5 py-0.5 rounded-full inline-block mb-2">
              Servicios Rápidos
            </span>
            <h2 className="text-2xl font-black text-[#0F1111] leading-tight mb-1">
              Impresiones y Copiado
            </h2>
            <p className="text-xs text-[#0F1111]/80 font-bold mb-4">
              Calidad láser, digitalización y encuadernados
            </p>

            {/* Dynamic Real Product Subgrid */}
            {renderProductSubgrid(photocopyProducts)}
          </div>

          <div className="text-xs font-extrabold text-[#0F1111] flex items-center gap-1 group-hover:translate-x-1.5 transition-transform mt-2">
            Ver todo Copiado e Impresión
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 2: PAPELERIA Y OFICINA (Vivid Cyan) */}
        <div 
          onClick={() => onSelectCategoryByName(officeCatName)}
          className="bg-[#00D8F6] border border-[#00ADC6] rounded-2xl p-5 flex flex-col justify-between min-h-[460px] hover:shadow-2xl hover:border-[#0F1111]/30 transition-all duration-300 cursor-pointer group"
          id="banner-section-supplies"
        >
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-white bg-[#0F1111] px-2.5 py-0.5 rounded-full inline-block mb-2">
              Oficina y Negocio
            </span>
            <h2 className="text-2xl font-black text-[#0F1111] leading-tight mb-1">
              Papelería y Oficina
            </h2>
            <p className="text-xs text-[#0F1111]/80 font-bold mb-4">
              Resmas de papel, archivo y consumibles
            </p>

            {/* Dynamic Real Product Subgrid */}
            {renderProductSubgrid(officeProducts)}
          </div>

          <div className="text-xs font-extrabold text-[#0F1111] flex items-center gap-1 group-hover:translate-x-1.5 transition-transform mt-2">
            Explorar Papelería
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 3: ESCOLAR Y MARCADORES (Vivid Green) */}
        <div 
          onClick={() => onSelectCategoryByName(schoolCatName)}
          className="bg-[#2BE483] border border-[#059669] rounded-2xl p-5 flex flex-col justify-between min-h-[460px] hover:shadow-2xl hover:border-[#0F1111]/30 transition-all duration-300 cursor-pointer group"
          id="banner-section-school"
        >
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-white bg-[#0F1111] px-2.5 py-0.5 rounded-full inline-block mb-2">
              Planifica tus clases
            </span>
            <h2 className="text-2xl font-black text-[#0F1111] leading-tight mb-1">
              Escolares y Marcadores
            </h2>
            <p className="text-xs text-[#0F1111]/80 font-bold mb-4">
              Lápices, marcadores artísticos y colores
            </p>

            {/* Dynamic Real Product Subgrid */}
            {renderProductSubgrid(schoolProducts)}
          </div>

          <div className="text-xs font-extrabold text-[#0F1111] flex items-center gap-1 group-hover:translate-x-1.5 transition-transform mt-2">
            Ver todo Escolares y Marcadores
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 4: POSTRES (Vivid Rose/Pink) */}
        <div 
          onClick={() => onSelectCategoryByName(dessertCatName)}
          className="bg-[#FF6295] border border-[#EC4899] rounded-2xl p-5 flex flex-col justify-between min-h-[460px] hover:shadow-2xl hover:border-[#0F1111]/30 transition-all duration-300 cursor-pointer group"
          id="banner-section-desserts"
        >
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-white bg-[#0F1111] px-2.5 py-0.5 rounded-full inline-block mb-2">
              Endulza tus tardes
            </span>
            <h2 className="text-2xl font-black text-[#0F1111] leading-tight mb-1">
              Postres Elvirita
            </h2>
            <p className="text-xs text-[#0F1111]/80 font-bold mb-4">
              Porciones de torta tres leches y delicias
            </p>

            {/* Dynamic Real Product Subgrid */}
            {renderProductSubgrid(dessertProducts)}
          </div>

          <div className="text-xs font-extrabold text-[#0F1111] flex items-center gap-1 group-hover:translate-x-1.5 transition-transform mt-2">
            Ver Postres Disponibles
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

      </div>
    </div>
  );
}
