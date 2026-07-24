import React, { useState } from 'react';
import { Share2, AlertTriangle, MessageCircle, Star, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Product } from '../types.ts';
import { CurrencyCode, CURRENCIES, formatCurrency } from '../lib/currency';

interface ProductCardProps {
  product: Product;
  categoryName: string;
  brandName: string;
  images: string[];
  onViewDetails: (p: Product) => void;
  onShare: (p: Product, e: React.MouseEvent) => void;
  onWhatsAppQuery: (p: Product, e: React.MouseEvent) => void;
  onAddToCart?: (p: Product, e: React.MouseEvent) => void;
  activeCurrency: CurrencyCode;
  currencyRates: Record<CurrencyCode, number>;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  categoryName,
  brandName,
  images,
  onViewDetails,
  onShare,
  onWhatsAppQuery,
  onAddToCart,
  activeCurrency,
  currencyRates
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  let optimizedImage = images[0];
  if (optimizedImage && optimizedImage.includes('supabase.co') && !optimizedImage.includes('?')) {
    optimizedImage = `${optimizedImage}?width=400&quality=80&format=webp`;
  }
  const mainImage = optimizedImage || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=400';

  const discountPercentage = product.offer_price 
    ? Math.round(((product.price - product.offer_price) / product.price) * 100)
    : 0;

  const formatPrice = (priceUSD: number) => {
    const rate = currencyRates[activeCurrency] || 1;
    const converted = priceUSD * rate;
    const config = CURRENCIES[activeCurrency];
    const isCOP = activeCurrency === 'COP';
    const decimals = config.decimals;
    
    const formattedNumStr = isCOP ? Math.round(converted).toFixed(0) : converted.toFixed(decimals);
    
    const standardParts = formattedNumStr.split('.');
    const integerPart = standardParts[0];
    const decimalPart = standardParts[1] || '';

    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandSeparator);

    if (config.position === 'prefix') {
      return (
        <div className="flex items-start text-[#0F1111]">
          <span className="text-[12px] font-extrabold mt-[4px] mr-[4px]">{config.symbol}</span>
          <span className="text-[28px] font-black leading-none tracking-tight">{formattedInteger}</span>
          {decimals > 0 && decimalPart && (
            <span className="text-[12px] font-bold ml-[2px] leading-none mt-[4px]">{config.decimalSeparator}{decimalPart}</span>
          )}
        </div>
      );
    } else {
      return (
        <div className="flex items-start text-[#0F1111]">
          <span className="text-[28px] font-black leading-none tracking-tight">{formattedInteger}</span>
          {decimals > 0 && decimalPart && (
            <span className="text-[12px] font-bold ml-[2px] leading-none mt-[4px]">{config.decimalSeparator}{decimalPart}</span>
          )}
          <span className="text-[12px] font-extrabold mt-[4px] ml-[4px]">{config.symbol}</span>
        </div>
      );
    }
  };

  return (
    <div 
      onClick={() => onViewDetails(product)}
      className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col cursor-pointer group select-none relative border border-gray-200 h-[400px] md:h-[420px]"
      id={`product-card-${product.id}`}
    >
      {/* Top Image area */}
      <div className="relative pt-[100%] bg-white overflow-hidden border-b border-gray-100">
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
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 shadow-sm transition"
            title="Copiar enlace de producto"
            id={`btn-share-${product.id}`}
          >
            <Share2 className="w-5 h-5" />
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
          className={`absolute inset-0 w-full h-full object-contain p-4 mix-blend-multiply group-hover:scale-105 transition-transform duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
        />

        {/* Out of Stock visual mask overlay */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center backdrop-blur-[1px]">
            <span className="bg-gray-900 text-white text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-md shadow-lg flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-[#FF9900]" />
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Info Content Area */}
      <div className="p-4 flex-1 flex flex-col text-left">
        {/* Product Name */}
        <h3 className="font-semibold text-[13px] md:text-[14px] text-[#0F1111] line-clamp-2 leading-tight mb-2" title={product.name}>
          {product.name}
        </h3>

        {/* Price display */}
        <div className="mt-auto">
          {product.offer_price ? (
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                {formatPrice(product.offer_price)}
                <span className="text-xs text-gray-400 line-through">
                  {formatCurrency(product.price, activeCurrency, currencyRates)}
                </span>
              </div>
            </div>
          ) : (
            formatPrice(product.price)
          )}
        </div>

        {/* Add to Cart Button if onAddToCart is supplied */}
        {onAddToCart && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {product.stock > 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product, e);
                }}
                className="w-full h-[30px] bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold text-[13px] rounded-md transition flex items-center justify-center gap-2 cursor-pointer shadow-sm border border-[#F2C200] active:scale-95 duration-150"
              >
                <ShoppingCart className="w-4 h-4" />
                Añadir al Carrito
              </button>
            ) : (
              <div className="w-full h-[30px] bg-gray-100 text-gray-400 font-medium text-[13px] rounded-md flex items-center justify-center gap-1 border border-gray-200">
                Agotado
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductCard;
