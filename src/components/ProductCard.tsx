/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Share2, MessageCircle, AlertTriangle, CheckCircle2, Bookmark, Star } from 'lucide-react';
import { Product, Category, Brand } from '../types.ts';

interface ProductCardProps {
  key?: any;
  product: any;
  categoryName: string;
  brandName: string;
  images: string[];
  onViewDetails: (product: any) => void;
  onShare: (product: any, e: any) => void;
  onWhatsAppQuery: (product: any, e: any) => void;
}

export default function ProductCard({
  product,
  categoryName,
  brandName,
  images,
  onViewDetails,
  onShare,
  onWhatsAppQuery
}: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  let optimizedImage = images[0];
  if (optimizedImage && optimizedImage.includes('supabase.co') && !optimizedImage.includes('?')) {
    // Basic Supabase Storage transformation assuming it's supported
    optimizedImage = `${optimizedImage}?width=400&quality=80&format=webp`;
  }
  const mainImage = optimizedImage || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=400';
  
  // Calculate discount percentage
  const discountPercentage = product.offer_price 
    ? Math.round(((product.price - product.offer_price) / product.price) * 100)
    : 0;

  const ratingStars = product.rating_stars ?? Math.max(4, (product.name.length % 2) + 4);
  const ratingCount = product.rating_count ?? (product.sku.charCodeAt(4) || 6) * 3;

  return (
    <div 
      onClick={() => onViewDetails(product)}
      className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 transition duration-300 flex flex-col cursor-pointer group select-none"
      id={`product-card-${product.id}`}
    >
      {/* Top Image area */}
      <div className="relative pt-[100%] bg-gray-50 border-b border-gray-100 overflow-hidden">
        {/* Badges top-left */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
          {product.featured && (
            <span className="bg-[#FF9900] text-[#131921] text-[10px] font-black px-2 py-0.5 rounded shadow-sm uppercase tracking-wide">
              Destacado
            </span>
          )}
          {discountPercentage > 0 && (
            <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm tracking-wide">
              -{discountPercentage}%
            </span>
          )}
        </div>

        {/* Action icons top-right */}
        <div className="hidden sm:flex absolute top-2.5 right-2.5 z-10 flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={(e) => onShare(product, e)}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 shadow transition"
            title="Copiar enlace de producto"
            id={`btn-share-${product.id}`}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Placeholder SVG */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full h-full bg-gray-100 rounded animate-pulse"></div>
          </div>
        )}
        {/* Product Image */}
        <img
          src={mainImage}
          alt={product.name}
          className={`absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-all duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
        />

        {/* Out of Stock visual mask overlay */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center backdrop-blur-[1px]">
            <span className="bg-gray-900 text-white text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-md shadow-lg flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-[#FF9900]" />
              Agotado Temporalmente
            </span>
          </div>
        )}
      </div>

      {/* Info Content Area */}
      <div className="p-2 sm:p-4 flex-1 flex flex-col text-left">
        {/* Brand & Category badges */}
        <div className="hidden sm:flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-[10px] font-bold text-[#007185] bg-sky-50 px-1.5 py-0.5 rounded uppercase">
            {brandName}
          </span>
          <span className="text-[9px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[120px]">
            {categoryName}
          </span>
        </div>

        {/* Product Name */}
        <h3 className="font-medium sm:font-semibold text-xs sm:text-sm text-[#0F1111] line-clamp-2 leading-snug group-hover:text-[#007185] transition-colors mb-1 min-h-[34px] sm:min-h-[40px]">
          {product.name}
        </h3>

        {/* SKU Label */}
        <div className="hidden sm:block text-[11px] font-mono text-gray-400 mb-2">
          SKU: <span className="font-bold text-gray-600">{product.sku}</span>
        </div>

        {/* Rating Stars */}
        <div className="flex items-center gap-1 mb-1 sm:mb-3">
          <div className="flex text-[#FF9900]">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`w-3 sm:w-3.5 h-3 sm:h-3.5 ${i < ratingStars ? 'fill-current' : 'text-gray-200'}`} 
              />
            ))}
          </div>
          <span className="hidden sm:inline text-[10px] font-bold text-[#007185] hover:underline">
            {ratingCount} calificaciones
          </span>
        </div>

        {/* Price display - Amazon style */}
        <div className="mt-auto pt-1 sm:pt-2 border-t border-gray-100 flex items-baseline justify-between flex-wrap gap-1">
          <div>
            {product.offer_price ? (
              <div className="flex flex-col">
                <span className="hidden sm:block text-[11px] text-red-600 font-bold uppercase tracking-wider">Oferta</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm sm:text-lg font-black text-[#0F1111]">${product.offer_price.toFixed(2)}</span>
                  <span className="text-[10px] sm:text-xs text-gray-400 line-through">${product.price.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="hidden sm:block text-[11px] text-gray-400 font-bold uppercase tracking-wider">Precio</span>
                <span className="text-sm sm:text-lg font-black text-[#0F1111]">${product.price.toFixed(2)}</span>
              </div>
            )}
            <span className="text-[10px] font-bold text-[#00A650] block mt-0.5">Envío gratis</span>
          </div>

          {/* Stock state badge */}
          <div className="hidden sm:block">
            {product.stock > 15 ? (
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Disponible
              </span>
            ) : product.stock > 0 ? (
              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {product.stock} disp.
              </span>
            ) : (
              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                Sin Stock
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card CTA Footer Buttons */}
      <div className="hidden sm:flex px-4 pb-4 pt-1 flex-col gap-2 mt-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(product);
          }}
          className="w-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold py-2 rounded-full text-xs shadow-sm transition-colors border border-[#F2C200] cursor-pointer text-center"
        >
          Ver Detalles del Producto
        </button>
        <button
          onClick={(e) => onWhatsAppQuery(product, e)}
          className="w-full py-2 bg-[#FFA41C] hover:bg-[#FA8900] text-[#0F1111] font-bold rounded-full text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer border border-[#E68200]"
          id={`btn-whatsapp-${product.id}`}
        >
          <MessageCircle className="w-4 h-4 shrink-0 text-[#131921]" />
          Contactar por WhatsApp
        </button>
      </div>
    </div>
  );
}
