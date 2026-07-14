/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Package, LayoutGrid, CheckCircle2, AlertTriangle, 
  Settings, HelpCircle, Phone, ArrowUp, Info, ShieldAlert, Lock
} from 'lucide-react';
import { Category, Brand, Product, ProductImage } from './types';
import { dbService } from './lib/supabase.ts';
import Navbar from './components/Navbar.tsx';
import Banner from './components/Banner.tsx';
import Sidebar from './components/Sidebar.tsx';
import ProductCard from './components/ProductCard.tsx';
import ProductDetailModal from './components/ProductDetailModal.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import SettingsModal from './components/SettingsModal.tsx';

export default function App() {
  // Database states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout and view states
  const [activeRole, setActiveRole] = useState<'admin' | 'vendedor' | 'cliente'>('cliente');
  const [isAdminView, setIsAdminView] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAdminShortcutButton, setShowAdminShortcutButton] = useState(false);

  // Global search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlyOffers, setOnlyOffers] = useState(false);

  // Fetch all initial data
  // Pagination states
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const observerTarget = useRef<HTMLDivElement>(null);

  const loadGlobalData = async () => {
    try {
      const [cats, brs, imgs] = await Promise.all([
        dbService.getCategories(),
        dbService.getBrands(),
        dbService.getProductImages()
      ]);
      setCategories(cats);
      setBrands(brs);
      setProductImages(imgs);
    } catch (e) {
      console.error("Error loading application data:", e);
    }
  };

  useEffect(() => {
    loadGlobalData();

    // Scroll listener for back-to-top button
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Public View: Fetch paginated products based on filters
  useEffect(() => {
    if (isAdminView) return;

    let isMounted = true;
    const fetchInitialProducts = async () => {
      setLoading(true);
      setPage(0);
      try {
        const { data, count } = await dbService.getProductsPaginated({
          page: 0,
          pageSize: 20,
          searchTerm,
          categoryId: selectedCategory,
          brandId: selectedBrand,
          onlyAvailable: onlyInStock,
          onlyFeatured,
          onlyOffers,
          minPrice,
          maxPrice
        });
        if (isMounted) {
          setProducts(data);
          setTotalCount(count);
          setHasMore(data.length < count);
        }
      } catch (e) {
        console.error("Error loading products:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchInitialProducts();
    
    return () => { isMounted = false; };
  }, [isAdminView, searchTerm, selectedCategory, selectedBrand, minPrice, maxPrice, onlyInStock, onlyFeatured, onlyOffers]);

  // Load more function
  const loadMoreProducts = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { data, count } = await dbService.getProductsPaginated({
        page: nextPage,
        pageSize: 20,
        searchTerm,
        categoryId: selectedCategory,
        brandId: selectedBrand,
        onlyAvailable: onlyInStock,
        onlyFeatured,
        onlyOffers,
        minPrice,
        maxPrice
      });
      setProducts(prev => {
        const newTotal = prev.length + data.length;
        setHasMore(newTotal < count);
        return [...prev, ...data];
      });
      setPage(nextPage);
    } catch (e) {
      console.error("Error loading more products:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore, loading, searchTerm, selectedCategory, selectedBrand, minPrice, maxPrice, onlyInStock, onlyFeatured, onlyOffers]);

  // IntersectionObserver for infinite scrolling
  useEffect(() => {
    if (isAdminView || loading || loadingMore || !hasMore) return;
    
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMoreProducts();
        }
      },
      { threshold: 0.1 }
    );
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    
    return () => observer.disconnect();
  }, [isAdminView, loading, loadingMore, hasMore, loadMoreProducts]);

  // Admin View: Load full inventory
  useEffect(() => {
    if (isAdminView) {
      setLoading(true);
      dbService.getProducts().then(prods => {
        setProducts(prods);
        setLoading(false);
      });
    }
  }, [isAdminView]);

  // Keyboard combination shortcut (Ctrl + A + S) to toggle the admin login button visibility
  useEffect(() => {
    const pressedKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      pressedKeys.add(key);

      const hasCtrl = e.ctrlKey || e.metaKey || pressedKeys.has('control');
      const hasA = pressedKeys.has('a');
      const hasS = pressedKeys.has('s');

      // Prevent default action for Ctrl+S (Save) and Ctrl+A (Select All) to make experience smooth
      if (hasCtrl && (key === 'a' || key === 's')) {
        e.preventDefault();
      }

      if (hasCtrl && hasA && hasS) {
        setShowAdminShortcutButton(prev => {
          const next = !prev;
          triggerToast(next 
            ? "🔑 ¡Combinación Ctrl + A + S activada! Botón de acceso administrador visible." 
            : "🔒 ¡Combinación Ctrl + A + S activada! Botón de acceso administrador ocultado."
          );
          return next;
        });
        pressedKeys.clear();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.key.toLowerCase());
    };

    const handleBlur = () => {
      pressedKeys.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Display toast utility
  const triggerToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // WhatsApp click redirection
  const handleWhatsAppQuery = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const phoneNumber = '584125043857'; // Default Venezuela Barinitas contact phone
    const formattedPrice = product.offer_price ? `$${product.offer_price.toFixed(2)} USD (Precio Oferta)` : `$${product.price.toFixed(2)} USD`;
    const message = `Hola Copias Bella Vista, estoy interesado en el siguiente artículo de su catálogo online:
      
*Producto:* ${product.name}
*SKU:* ${product.sku}
*Precio:* ${formattedPrice}
      
¿Tienen disponibilidad y método de entrega en Barinitas? ¡Muchas gracias!`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  // Share link trigger
  const handleShareProduct = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = `${window.location.origin}/producto/${product.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      triggerToast(`¡Enlace del producto ${product.sku} copiado al portapapeles!`);
    });
  };

  // Reset filter inputs
  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setMinPrice(0);
    setMaxPrice(1000);
    setOnlyInStock(false);
    setOnlyFeatured(false);
    setOnlyOffers(false);
    setSearchTerm('');
    triggerToast("Filtros de catálogo restablecidos.");
  };

  // Helper to filter by category name keyword from menus/buttons
  const handleSelectCategoryByName = (keyword: string) => {
    // Try to find matching category by name or slug (case-insensitive)
    const found = categories.find(c => 
      c.name.toLowerCase().includes(keyword.toLowerCase()) || 
      c.slug.toLowerCase().includes(keyword.toLowerCase())
    );
    if (found) {
      setSelectedCategory(found.id);
      setSelectedBrand('all');
      setOnlyOffers(false);
      setOnlyFeatured(false);
      setSearchTerm('');
      triggerToast(`Filtrando por categoría: ${found.name}`);
    } else {
      // Fallback: search for it using global search
      setSearchTerm(keyword);
      setSelectedCategory('all');
      setSelectedBrand('all');
      setOnlyOffers(false);
      setOnlyFeatured(false);
      triggerToast(`Buscando artículos de "${keyword}"`);
    }
  };

  const handleRefreshAdminData = () => {
    loadGlobalData();
    if (isAdminView) {
      setLoading(true);
      dbService.getProducts().then(prods => {
        setProducts(prods);
        setLoading(false);
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#EAEDED] flex flex-col font-sans text-[#0F1111]">
      {/* Dynamic Toast Alerts */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white font-bold px-4 py-3 rounded-lg shadow-2xl border border-gray-800 text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#FF9900]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeRole={activeRole}
        onOpenSettings={() => setShowSettingsModal(true)}
        onNavigateToAdmin={() => setIsAdminView(true)}
        isAdminView={isAdminView}
        onExitAdminView={() => setIsAdminView(false)}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onlyOffers={onlyOffers}
        setOnlyOffers={setOnlyOffers}
        onResetFilters={handleResetFilters}
        onSelectCategoryByName={handleSelectCategoryByName}
      />

      {/* Main Application Body */}
      <main className="flex-1 py-6 max-w-7xl mx-auto px-4 w-full">
        {isAdminView ? (
          /* ADMINISTRATIVE MODULE VIEW */
          <AdminPanel
            products={products}
            categories={categories}
            brands={brands}
            productImages={productImages}
            onRefreshData={handleRefreshAdminData}
            activeRole={activeRole}
          />
        ) : (
          /* PUBLIC MARKETPLACE VIEW */
          <>
            {/* Header Banner */}
            <div className="hidden lg:block">
              <Banner 
                onSelectCategoryByName={handleSelectCategoryByName}
                setOnlyOffers={setOnlyOffers}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Left Column: Filter Sidebar */}
              <div className="hidden lg:block lg:col-span-1">
                <Sidebar
                  categories={categories}
                  brands={brands}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  selectedBrand={selectedBrand}
                  setSelectedBrand={setSelectedBrand}
                  minPrice={minPrice}
                  setMinPrice={setMinPrice}
                  maxPrice={maxPrice}
                  setMaxPrice={setMaxPrice}
                  onlyInStock={onlyInStock}
                  setOnlyInStock={setOnlyInStock}
                  onlyFeatured={onlyFeatured}
                  setOnlyFeatured={setOnlyFeatured}
                  onResetFilters={handleResetFilters}
                />
              </div>

              {/* Right Column: Products Display Grid */}
              <div className="lg:col-span-3 text-left">
                {/* Result header count */}
                <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Resultados encontrados: <span className="text-[#0F1111] font-black">{totalCount} artículos</span>
                  </span>
                  
                  {/* Active filters count summary badges */}
                  <div className="flex gap-2">
                    {selectedCategory !== 'all' && (
                      <span className="bg-sky-50 text-[#007185] border border-sky-100 text-[10px] font-bold px-2 py-0.5 rounded">
                        Categoría Activa
                      </span>
                    )}
                    {selectedBrand !== 'all' && (
                      <span className="bg-sky-50 text-[#007185] border border-sky-100 text-[10px] font-bold px-2 py-0.5 rounded">
                        Marca Activa
                      </span>
                    )}
                    {(minPrice > 0 || maxPrice < 1000) && (
                      <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2 py-0.5 rounded">
                        Filtro Precio
                      </span>
                    )}
                  </div>
                </div>

                {/* Loading indicator */}
                {loading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                    {/* Skeletons para carga inicial */}
                    {[...Array(8)].map((_, i) => (
                      <div key={`skeleton-${i}`} className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden flex flex-col h-[320px] animate-pulse">
                        <div className="h-40 bg-gray-200"></div>
                        <div className="p-3 flex-1 flex flex-col gap-2">
                          <div className="h-3 bg-gray-200 w-1/3 rounded"></div>
                          <div className="h-4 bg-gray-200 w-3/4 rounded"></div>
                          <div className="h-4 bg-gray-200 w-1/2 rounded mb-auto"></div>
                          <div className="h-6 bg-gray-200 w-1/4 rounded mt-4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  /* Empty state */
                  <div className="bg-white p-16 rounded-lg border border-gray-200 text-center shadow-sm flex flex-col items-center justify-center max-w-xl mx-auto my-6">
                    <Package className="w-12 h-12 text-[#FF9900] mb-4" />
                    <h3 className="text-lg font-black text-[#131921] mb-1">Sin Resultados Coincidentes</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-6 max-w-md">
                      No encontramos ningún artículo que coincida con tus criterios de búsqueda. Prueba modificando los filtros del panel lateral o buscando otro término.
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="px-5 py-2.5 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] font-black rounded text-xs uppercase tracking-wider transition shadow cursor-pointer"
                    >
                      Limpiar Todos los Filtros
                    </button>
                  </div>
                ) : (
                  /* Standard Grid */
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                      {products.map((product) => {
                        const category = categories.find(c => c.id === product.category_id);
                        const brand = brands.find(b => b.id === product.brand_id);
                        const associatedImages = productImages
                          .filter(img => img.product_id === product.id)
                          .map(img => img.image_url);

                        return (
                          <ProductCard
                            key={product.id}
                            product={product}
                            categoryName={category?.name || 'General'}
                            brandName={brand?.name || 'S/M'}
                            images={associatedImages}
                            onViewDetails={(p) => setSelectedProduct(p)}
                            onShare={(p, e) => handleShareProduct(p, e)}
                            onWhatsAppQuery={(p, e) => handleWhatsAppQuery(p, e)}
                          />
                        );
                      })}
                      
                      {/* Skeletons para carga al hacer scroll */}
                      {loadingMore && [...Array(4)].map((_, i) => (
                        <div key={`more-skeleton-${i}`} className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden flex flex-col h-[320px] animate-pulse">
                          <div className="h-40 bg-gray-200"></div>
                          <div className="p-3 flex-1 flex flex-col gap-2">
                            <div className="h-3 bg-gray-200 w-1/3 rounded"></div>
                            <div className="h-4 bg-gray-200 w-3/4 rounded"></div>
                            <div className="h-4 bg-gray-200 w-1/2 rounded mb-auto"></div>
                            <div className="h-6 bg-gray-200 w-1/4 rounded mt-4"></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Sentinel para Intersection Observer */}
                    <div id="scroll-sentinel" ref={observerTarget} className="h-10 mt-4 w-full"></div>
                  </>
                )}
              </div>

            </div>
          </>
        )}
      </main>

      {/* Floating Call to Action and back to top */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-2">
        <button
          onClick={() => {
            const encoded = encodeURIComponent("Hola Copias Bella Vista, me gustaría realizar una consulta sobre sus servicios.");
            window.open(`https://api.whatsapp.com/send?phone=584125043857&text=${encoded}`, '_blank');
          }}
          className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-2xl hover:scale-110 transition cursor-pointer"
          title="Atención directa por WhatsApp"
        >
          <Phone className="w-5 h-5 fill-current" />
        </button>
      </div>

      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-[#232F3E] text-white hover:bg-[#131921] border border-gray-700 flex items-center justify-center shadow-xl hover:scale-105 transition cursor-pointer"
          title="Subir al inicio"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* ====================================
          MODAL VIEWS OVERLAYS
          ==================================== */}

      {/* 1. PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          categories={categories}
          brands={brands}
          allProducts={products}
          onClose={() => setSelectedProduct(null)}
          onViewProduct={(p) => setSelectedProduct(p)}
          onShare={handleShareProduct}
          onWhatsAppQuery={handleWhatsAppQuery}
        />
      )}

      {/* 2. SETTINGS / SUPABASE INTEGRATION MODAL */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Footer Area */}
      <footer className="bg-[#131921] text-white py-10 border-t-4 border-[#FF9900] select-none text-xs">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          
          {/* Col 1 */}
          <div>
            <h4 className="font-extrabold text-sm uppercase tracking-wider mb-3">Copias Bella Vista</h4>
            <p className="text-gray-400 leading-relaxed mb-4">
              Tu aliado estratégico de confianza en fotocopiado, impresión, encuadernación y útiles escolares de primera calidad. Despachos y atención inmediata en la ciudad de Barinitas, Estado Barinas, Venezuela.
            </p>
            <span className="inline-flex items-center gap-1 bg-gray-800 text-[#FF9900] px-2.5 py-1 rounded text-[10px] font-bold">
              <Info className="w-3.5 h-3.5" />
              Precios Calculados en USD ($)
            </span>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="font-extrabold text-sm uppercase tracking-wider mb-3">Soporte y Consultas</h4>
            <ul className="space-y-2 text-gray-400 font-medium">
              <li>• Horario: Lunes a Sábado de 8:30 a 12:00 - 2:30 a 6:00</li>
              <li>• Despachos en Barinitas</li>
              <li>• Facturación formal disponible</li>
              <li>• Consultas al por mayor para colegios y oficinas</li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            {activeRole !== 'admin' ? (
              <>
                <h4 className="font-extrabold text-sm uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-gray-400" />
                  Acceso Técnico
                </h4>
                <p className="text-gray-400 leading-relaxed mb-4 text-xs">
                  La configuración de la base de datos Supabase y la simulación de roles están reservadas exclusivamente para administradores autorizados.
                </p>
                {showAdminShortcutButton && (
                  <button
                    onClick={() => {
                      setActiveRole('admin');
                      setIsAdminView(true);
                      triggerToast('¡Modo Administrador activado! Bienvenido al Panel de Administración para gestionar productos, marcas y categorías.');
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded flex items-center gap-1.5 cursor-pointer transition shadow-lg text-[11px] uppercase tracking-wider animate-fadeIn"
                    id="footer-btn-login-admin"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                    Acceder como Administrador
                  </button>
                )}
              </>
            ) : (
              <>
                <h4 className="font-extrabold text-sm text-[#FF9900] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#FF9900]" />
                  Consola de Administrador
                </h4>
                <p className="text-gray-400 leading-relaxed mb-3">
                  Estás navegando como <strong className="text-red-500 uppercase">ADMINISTRADOR</strong>. Tienes acceso completo a la configuración del sistema.
                </p>
                
                <div className="flex flex-col gap-2.5">
                  {/* Botón Configurar Supabase */}
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="w-full px-3.5 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] font-black rounded transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md text-xs"
                    id="footer-btn-configure"
                  >
                    <Settings className="w-4 h-4" />
                    Configurar Supabase
                  </button>

                  {/* Selector de Rol Activo */}
                  <div className="bg-[#232F3E] border border-gray-700 rounded p-1.5">
                    <p className="text-[9px] text-gray-400 font-bold mb-1 uppercase tracking-wider text-left">Simular como otro Rol:</p>
                    <div className="flex gap-1">
                      {(['cliente', 'vendedor', 'admin'] as const).map((role) => (
                        <button
                          key={role}
                          onClick={() => {
                            setActiveRole(role);
                            if (role !== 'admin' && role !== 'vendedor') {
                              setIsAdminView(false);
                            }
                            triggerToast(`Rol simulado cambiado a: ${role.toUpperCase()}`);
                          }}
                          className={`flex-1 py-1 rounded text-[9px] font-black transition uppercase ${
                            activeRole === role
                              ? 'bg-red-600 text-white font-extrabold'
                              : 'bg-[#131921] text-gray-400 hover:text-white'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 mt-8 pt-6 border-t border-gray-800 text-center text-gray-500 font-semibold flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Copias Bella Vista. Todos los derechos reservados. Barinitas, Venezuela.</p>
          <p className="text-[10px]">Diseñado y desarrollado por Google AI Studio</p>
        </div>
      </footer>
    </div>
  );
}
