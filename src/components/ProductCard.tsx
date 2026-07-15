import React, { useState } from 'react';
import { Share2, AlertTriangle, MessageCircle, Star, CheckCircle2 } from 'lucide-react';
import { Product } from '../types.ts';

interface ProductCardProps {
  product: Product;
  categoryName: string;
  brandName: string;
  images: string[];
  onViewDetails: (p: Product) => void;
  onShare: (p: Product, e: React.MouseEvent) => void;
  onWhatsAppQuery: (p: Product, e: React.MouseEvent) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  categoryName,
  brandName,
  images,
  onViewDetails,
  onShare,
  onWhatsAppQuery
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

  const formatPrice = (price: number) => {
    const [intPart, decPart] = price.toFixed(2).split('.');
    return (
      <div className="flex items-start text-[#0F1111]">
        <span className="text-[10px] mt-[4px] font-medium mr-[1px]">US$</span>
        <span className="text-[20px] font-normal leading-none tracking-tight">{intPart}</span>
        <span className="text-[10px] font-medium ml-[1px] leading-none mt-[2px]">{decPart}</span>
      </div>
    );
  };

  return (
    <div 
      onClick={() => onViewDetails(product)}
      className="bg-[#F7F7F7] rounded-md overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col cursor-pointer group select-none relative border border-transparent hover:border-gray-200"
      id={`product-card-${product.id}`}
    >
      {/* Top Image area */}
      <div className="relative pt-[100%] bg-[#F7F7F7] overflow-hidden">
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
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Placeholder SVG */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full h-full bg-gray-200 rounded animate-pulse"></div>
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
          <div className="absolute inset-0 bg-[#F7F7F7]/70 flex items-center justify-center backdrop-blur-[1px]">
            <span className="bg-gray-900 text-white text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-md shadow-lg flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-[#FF9900]" />
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Info Content Area */}
      <div className="p-3 flex-1 flex flex-col text-left">
        {/* Product Name */}
        <h3 className="font-normal text-[13px] text-[#222222] line-clamp-1 leading-snug mb-1" title={product.name}>
          {product.name}
        </h3>

        {/* Price display */}
        <div className="mt-auto">
          {product.offer_price ? (
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                {formatPrice(product.offer_price)}
                <span className="text-[10px] text-gray-400 line-through">US${product.price.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            formatPrice(product.price)
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
