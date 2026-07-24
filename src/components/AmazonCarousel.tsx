import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ShoppingCart, Sparkles, Star } from 'lucide-react';
import { Product, Category, ProductImage } from '../types';
import { CurrencyCode, formatCurrency } from '../lib/currency';

interface AmazonCarouselProps {
  products: Product[];
  categories: Category[];
  productImages: ProductImage[];
  onViewDetails: (product: Product) => void;
  onAddToCart?: (product: Product, e: React.MouseEvent) => void;
  activeCurrency: CurrencyCode;
  currencyRates: Record<CurrencyCode, number>;
  onSelectCategoryByName: (keyword: string) => void;
}

export default function AmazonCarousel({
  products,
  categories,
  productImages,
  onViewDetails,
  onAddToCart,
  activeCurrency,
  currencyRates,
  onSelectCategoryByName
}: AmazonCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Helper to check scroll position to hide/show navigation arrows
  const checkScrollPosition = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 5);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkScrollPosition);
      // Run once on load/resize
      checkScrollPosition();
      window.addEventListener('resize', checkScrollPosition);
    }
    return () => {
      if (scrollEl) {
        scrollEl.removeEventListener('scroll', checkScrollPosition);
      }
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [products]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.8 : clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Helper to get product image or fallback
  const getProductImage = (product: Product): string => {
    const associated = productImages.find(img => img.product_id === product.id);
    if (associated?.image_url) return associated.image_url;
    
    // In-object fallback
    if ((product as any).image_url) return (product as any).image_url;
    
    return 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=300';
  };

  // Find products matching categories: Papelería, Copias, Escolar, Postres
  const getProductsForCategoryKeyword = (categoryKeywords: string[], productKeywords: string[]): Product[] => {
    // 1. Find categories matching categoryKeywords
    const matchedCategoryIds = categories
      .filter(c => categoryKeywords.some(kw => c.name.toLowerCase().includes(kw.toLowerCase())))
      .map(c => c.id);

    // 2. Filter products in those categories
    let matchedProducts = products.filter(p => matchedCategoryIds.includes(p.category_id) && p.stock > 0);

    // 3. If matched products are fewer than 4, also find products by keyword in name/description
    if (matchedProducts.length < 4) {
      const nameMatched = products.filter(p => 
        p.stock > 0 && 
        !matchedProducts.some(mp => mp.id === p.id) &&
        productKeywords.some(kw => 
          p.name.toLowerCase().includes(kw.toLowerCase()) || 
          (p.description && p.description.toLowerCase().includes(kw.toLowerCase()))
        )
      );
      matchedProducts = [...matchedProducts, ...nameMatched];
    }

    return matchedProducts.slice(0, 4);
  };

  // Specific grids with dedicated keywords to keep products strictly relevant to their categories
  const papeleriaProducts = getProductsForCategoryKeyword(
    ['papeleria', 'papelería'],
    ['papel', 'hoja', 'cartulina', 'cuaderno', 'lápiz', 'lapiz', 'bolígrafo', 'boligrafo', 'marcador', 'sacapuntas', 'borrador', 'tijera', 'regla', 'block', 'tempera', 'témpera', 'pincel', 'goma', 'pega', 'silicon', 'silicón']
  );
  const copiasProducts = getProductsForCategoryKeyword(
    ['copia', 'copias', 'impresion', 'impresión', 'encuadernacion', 'encuadernación', 'anillado', 'plastificado', 'digitalizacion', 'digitalización'],
    ['copia', 'copias', 'impresion', 'impresión', 'encuadernacion', 'encuadernación', 'anillado', 'plastificado', 'escaner', 'escáner']
  );
  const escolarProducts = getProductsForCategoryKeyword(
    ['escolar', 'útiles', 'utiles', 'colegio', 'escolares y marcadores', 'escolares', 'marcadores'],
    ['mochila', 'morral', 'cartuchera', 'sacapuntas', 'borrador', 'cuaderno', 'regla', 'marcador', 'marcadores', 'colores', 'creyones', 'lapiz', 'lápiz', 'lapices', 'lápices', 'tijera', 'pega', 'goma', 'tempera', 'témpera', 'escarcha']
  );
  const postresProducts = getProductsForCategoryKeyword(
    ['postre', 'postres', 'dulce', 'dulces', 'reposteria', 'repostería'],
    ['torta', 'tortas', 'quesillo', 'ponque', 'ponqué', 'galleta', 'galletas', 'chocolate', 'dulce', 'dulces', 'postre', 'postres', 'muffin', 'cupcake', 'brownie', 'marquesa']
  );

  // Get single featured / best seller products
  const featuredProducts = products.filter(p => p.featured && p.stock > 0);
  const bestSellerProducts = products.filter(p => p.offer_price && p.stock > 0);

  // Select two single featured items
  const impresionesCategory = categories.find(c => 
    c.name.toLowerCase().includes('impresion') || 
    c.name.toLowerCase().includes('copia') || 
    c.name.toLowerCase().includes('copiado')
  );
  const impresionesProducts = impresionesCategory 
    ? products.filter(p => p.category_id === impresionesCategory.id && p.stock > 0)
    : [];
  const nitidezCalidadProduct = impresionesProducts[0] || copiasProducts[0] || products.find(p => 
    p.name.toLowerCase().includes('copia') || 
    p.name.toLowerCase().includes('impresion') || 
    p.name.toLowerCase().includes('anillado')
  ) || featuredProducts[0] || products[0];

  const singleFeatured1 = nitidezCalidadProduct;
  const singleFeatured2 = bestSellerProducts[0] || featuredProducts[1] || products[1];

  // Define Cards array for the carousel rendering
  const cards = [
    // Card 1: Copias (2x2 Grid) - Deep Blue style - Now first as requested!
    {
      id: 'cat-copias',
      type: 'grid',
      title: 'Copias & Encuadernación',
      subtitle: 'Rápidas, nítidas y listas al instante',
      bgClass: 'bg-gradient-to-br from-[#2f3542] to-[#1e272e] text-white',
      badge: 'Servicio Express',
      products: copiasProducts
    },
    // Card 2: Featured 1 (Single item card) - Slate Gray style
    {
      id: 'featured-1',
      type: 'single',
      title: 'Nitidez & Calidad',
      subtitle: 'Nuestros productos estrella de impresión',
      bgClass: 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white',
      badge: 'Destacado',
      product: singleFeatured1
    },
    // Card 3: Papelería (2x2 Grid) - Lime Green style
    {
      id: 'cat-papeleria',
      type: 'grid',
      title: 'Papelería Creativa',
      subtitle: 'Todo para tus ideas al mejor precio',
      bgClass: 'bg-gradient-to-br from-[#c4e538] to-[#a3cb38] text-gray-900',
      badge: 'Ofertas Diarias',
      products: papeleriaProducts
    },
    // Card 4: Escolar (2x2 Grid) - Vibrant Orange style
    {
      id: 'cat-escolar',
      type: 'grid',
      title: 'Útiles Escolares',
      subtitle: 'Ahorros diarios para el regreso a clases',
      bgClass: 'bg-gradient-to-br from-[#ff7f50] to-[#ff6347] text-white',
      badge: 'Temporada Escolar',
      products: escolarProducts
    },
    // Card 5: Postres (2x2 Grid) - Warm Gold/Peach style
    {
      id: 'cat-postres',
      type: 'grid',
      title: 'Dulces & Postres',
      subtitle: 'Un antojo delicioso para acompañar tu día',
      bgClass: 'bg-gradient-to-br from-[#f8c291] to-[#e77f67] text-gray-900',
      badge: 'Recién Horneado',
      products: postresProducts
    },
    // Card 6: Featured 2 (Single item card) - Summer Cyan style
    {
      id: 'featured-2',
      type: 'single',
      title: 'Super Oferta del Día',
      subtitle: 'Estilos y productos con precios de locura',
      bgClass: 'bg-gradient-to-br from-[#00a8ff] to-[#0097e6] text-white',
      badge: 'Oferta Especial',
      product: singleFeatured2
    }
  ];

  if (products.length === 0) return null;

  return (
    <div className="relative w-full my-6 select-none group/carousel max-w-[1440px] mx-auto px-1">
      {/* Section Title */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#FF9900] fill-[#FF9900]" />
        <h2 className="text-lg md:text-xl font-black text-[#131921] uppercase tracking-tight">
          Destacados & Categorías del Día
        </h2>
      </div>

      {/* Main Carousel Wrapper */}
      <div className="relative">
        {/* Left Scroll Button */}
        {showLeftArrow && (
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-11 h-20 bg-white hover:bg-gray-50 border border-gray-200 rounded-r-lg shadow-xl hover:shadow-2xl flex items-center justify-center transition duration-200 cursor-pointer text-gray-800"
            style={{ contentVisibility: 'auto' }}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}

        {/* Right Scroll Button */}
        {showRightArrow && (
          <button
            onClick={() => handleScroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-11 h-20 bg-white hover:bg-gray-50 border border-gray-200 rounded-l-lg shadow-xl hover:shadow-2xl flex items-center justify-center transition duration-200 cursor-pointer text-gray-800"
            style={{ contentVisibility: 'auto' }}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-5 overflow-x-auto pb-4 pt-1 px-2 scrollbar-none snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {cards.map((card) => {
            return (
              <div
                key={card.id}
                className={`snap-start shrink-0 w-[290px] md:w-[325px] h-[420px] rounded-2xl shadow-md border border-gray-200/50 p-5 flex flex-col justify-between ${card.bgClass} relative overflow-hidden transition-all duration-300 hover:shadow-lg`}
              >
                {/* Accent Highlight Banner in Card corner */}
                {card.badge && (
                  <span className="absolute top-3 right-3 bg-white/25 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full text-current">
                    {card.badge}
                  </span>
                )}

                {/* Card Headings */}
                <div className="text-left pr-16">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-90 block mb-0.5">
                    {card.id.startsWith('featured') ? 'Recomendado' : 'Categorías'}
                  </span>
                  <h3 className="text-lg font-black leading-tight tracking-tight mb-1">
                    {card.title}
                  </h3>
                  <p className="text-[11px] font-medium leading-tight opacity-80">
                    {card.subtitle}
                  </p>
                </div>

                {/* Card Content Area */}
                {card.type === 'grid' && card.products ? (
                  /* 2X2 Grid Layout for Category Cards */
                  <div className="grid grid-cols-2 gap-2.5 my-3 flex-1 justify-center content-center">
                    {card.products.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => onViewDetails(p)}
                        className="bg-white rounded-xl p-2 flex flex-col items-center justify-between h-[125px] hover:scale-102 transition duration-200 cursor-pointer border border-gray-100 shadow-xs relative"
                      >
                        {/* Image inside box */}
                        <div className="w-full h-[75px] flex items-center justify-center overflow-hidden">
                          <img
                            src={getProductImage(p)}
                            alt={p.name}
                            className="max-w-full max-h-full object-contain mix-blend-multiply"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        {/* Short Caption */}
                        <div className="w-full text-center mt-1">
                          <p className="text-[10px] text-gray-700 font-bold truncate px-0.5" title={p.name}>
                            {p.name}
                          </p>
                          <span className="text-[11px] font-black text-[#007185]">
                            {formatCurrency(p.offer_price || p.price, activeCurrency, currencyRates)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : card.product ? (
                  /* Single Large Product Card Layout for Featured items */
                  <div
                    onClick={() => onViewDetails(card.product!)}
                    className="bg-white rounded-xl p-4 my-2 flex-1 flex flex-col justify-between hover:scale-[1.02] transition duration-200 cursor-pointer border border-gray-100 shadow-sm relative group/single"
                  >
                    {/* Discount badge inside white container */}
                    {card.product.offer_price && (
                      <span className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">
                        OFERTA
                      </span>
                    )}

                    {/* Image Area - enlarged to h-[180px] for maximum visual impact */}
                    <div className="w-full h-[180px] flex items-center justify-center overflow-hidden relative p-1 mt-1">
                      <img
                        src={getProductImage(card.product)}
                        alt={card.product.name}
                        className="max-w-full max-h-full object-contain mix-blend-multiply transition duration-300 group-hover/single:scale-110"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Footer Info Area */}
                    <div className="text-left mt-2 border-t border-gray-100 pt-2 flex items-end justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="text-xs font-black text-gray-900 truncate" title={card.product.name}>
                          {card.product.name}
                        </h4>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-[15px] font-black text-emerald-600">
                            {formatCurrency(card.product.offer_price || card.product.price, activeCurrency, currencyRates)}
                          </span>
                          {card.product.offer_price && (
                            <span className="text-[10px] text-gray-400 line-through font-bold">
                              {formatCurrency(card.product.price, activeCurrency, currencyRates)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Add to Cart quick button - enlarged for better accessibility */}
                      {onAddToCart && card.product.stock > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(card.product!, e);
                          }}
                          className="w-8.5 h-8.5 bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] rounded-full flex items-center justify-center transition border border-[#F2C200] active:scale-95 shadow-sm hover:shadow"
                          title="Añadir al Carrito"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-xs opacity-75">No hay productos para mostrar</p>
                  </div>
                )}

                {/* Footer view link */}
                <div className="text-left">
                  {card.type === 'grid' ? (
                    <button
                      onClick={() => {
                        if (card.id === 'cat-copias') {
                          onSelectCategoryByName('copias');
                        } else if (card.id === 'cat-papeleria') {
                          onSelectCategoryByName('papelería');
                        } else if (card.id === 'cat-escolar') {
                          onSelectCategoryByName('escolar');
                        } else if (card.id === 'cat-postres') {
                          onSelectCategoryByName('postres');
                        } else {
                          onSelectCategoryByName(card.title);
                        }
                      }}
                      className="text-[11px] font-bold uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer focus:outline-none"
                    >
                      Ver más ofertas &rarr;
                    </button>
                  ) : card.product ? (
                    <button
                      onClick={() => onViewDetails(card.product!)}
                      className="text-[11px] font-bold uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer focus:outline-none"
                    >
                      Comprar ahora &rarr;
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
