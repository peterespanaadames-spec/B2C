/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Share2, Clipboard, Printer, CheckCircle2, AlertTriangle, ChevronRight, FileText, Download } from 'lucide-react';
import { Product, Category, Brand, ProductImage } from '../types.ts';
import { dbService } from '../lib/supabase.ts';

interface ProductDetailModalProps {
  product: Product;
  categories: Category[];
  brands: Brand[];
  allProducts: Product[];
  onClose: () => void;
  onViewProduct: (product: Product) => void;
  onShare: (product: Product) => void;
  onWhatsAppQuery: (product: Product) => void;
}

export default function ProductDetailModal({
  product,
  categories,
  brands,
  allProducts,
  onClose,
  onViewProduct,
  onShare,
  onWhatsAppQuery
}: ProductDetailModalProps) {
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  const formatModalPrice = (price: number, size: 'large' | 'small' = 'large') => {
    const formattedPrice = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const [intPart, decPart] = formattedPrice.split('.');
    
    if (size === 'small') {
      return (
        <div className="flex items-start text-[#0F1111]">
          <span className="text-[12px] font-bold mt-[1px] mr-[2px]">US$</span>
          <span className="text-lg font-black leading-none tracking-tight">{intPart}</span>
          <span className="text-[10px] font-bold ml-[1px] leading-none mt-[2px]">{decPart}</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-start text-[#0F1111]">
        <span className="text-[16px] font-bold mt-[4px] mr-[4px]">US$</span>
        <span className="text-3xl font-black leading-none tracking-tight">{intPart}</span>
        <span className="text-[14px] font-bold ml-[1px] leading-none mt-[3px]">{decPart}</span>
      </div>
    );
  };

  // Load product images and related products
  useEffect(() => {
    const loadImages = async () => {
      const imgs = await dbService.getProductImages(product.id);
      setProductImages(imgs);
      setSelectedImageIndex(0);
    };

    loadImages();

    // Get related products (same category, active, not current)
    const related = allProducts
      .filter(p => p.category_id === product.category_id && p.id !== product.id && p.active)
      .slice(0, 4);
    setRelatedProducts(related);
  }, [product, allProducts]);

  const category = categories.find(c => c.id === product.category_id);
  const brand = brands.find(b => b.id === product.brand_id);

  // Get current active images list
  const activeImages = productImages.length > 0 
    ? productImages.map(img => img.image_url) 
    : ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=600'];

  // Handle printing/saving sheet
  const handlePrintTechnicalSheet = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor habilite los pop-ups en su navegador para descargar la ficha técnica.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ficha Técnica - ${product.name}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #111;
            margin: 40px;
            line-height: 1.6;
          }
          .header {
            border-bottom: 3px solid #FF9900;
            padding-bottom: 15px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #131921;
          }
          .logo span {
            color: #FF9900;
          }
          .catalog-title {
            text-align: right;
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .product-title {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #131921;
          }
          .meta-info {
            font-size: 14px;
            color: #555;
            margin-bottom: 25px;
            background: #f8f9fa;
            padding: 10px 15px;
            border-left: 4px solid #131921;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #232F3E;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-top: 30px;
            margin-bottom: 15px;
          }
          .specs-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .specs-table th, .specs-table td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
          }
          .specs-table th {
            width: 30%;
            background-color: #fafafa;
            font-weight: bold;
            color: #444;
          }
          .description {
            margin-bottom: 30px;
            text-align: justify;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #ddd;
            padding-top: 15px;
            font-size: 11px;
            color: #777;
            text-align: center;
          }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Copias<span>Bella Vista</span></div>
          <div class="catalog-title">Ficha Técnica Oficial</div>
        </div>

        <div class="product-title">${product.name}</div>
        
        <div class="meta-info">
          <strong>SKU:</strong> ${product.sku} &nbsp;|&nbsp; 
          <strong>Marca:</strong> ${brand?.name || 'S/M'} &nbsp;|&nbsp; 
          <strong>Categoría:</strong> ${category?.name || 'General'} &nbsp;|&nbsp;
          <strong>Precio Sugerido:</strong> $${(product.offer_price || product.price).toFixed(2)} USD
        </div>

        <div class="section-title">Descripción del Producto</div>
        <div class="description">
          ${product.description}
        </div>

        <div class="section-title">Especificaciones Técnicas</div>
        <table class="specs-table">
          <tr>
            <th>Código SKU</th>
            <td>${product.sku}</td>
          </tr>
          <tr>
            <th>Marca del Fabricante</th>
            <td>${brand?.name || 'S/M'}</td>
          </tr>
          <tr>
            <th>Categoría de Catálogo</th>
            <td>${category?.name || 'General'}</td>
          </tr>
          <tr>
            <th>Moneda de Consulta</th>
            <td>Dólar Americano ($ / USD)</td>
          </tr>
          <tr>
            <th>Precio de Catálogo</th>
            <td>$${product.price.toFixed(2)} USD</td>
          </tr>
          <tr>
            <th>Precio de Oferta Especial</th>
            <td>${product.offer_price ? `$${product.offer_price.toFixed(2)} USD` : 'N/A'}</td>
          </tr>
          <tr>
            <th>Disponibilidad de Stock</th>
            <td>${product.stock > 0 ? `${product.stock} unidades en existencia` : 'Bajo Pedido (Agotado)'}</td>
          </tr>
          <tr>
            <th>Garantía de Tienda</th>
            <td>Garantía directa de 30 días contra defectos de fábrica</td>
          </tr>
          <tr>
            <th>Ubicación de Despacho</th>
            <td>Barinitas, Estado Barinas, Venezuela</td>
          </tr>
        </table>

        <div class="footer">
          Documento generado automáticamente por Copias Bella Vista. Todos los precios están sujetos a cambios sin previo aviso.<br>
          © 2026 Copias Bella Vista. Barinitas, Venezuela.
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const copyProductLink = () => {
    const url = `${window.location.origin}/producto/${product.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 md:p-6 backdrop-blur-xs select-none">
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto flex flex-col relative"
        id="modal-product-detail"
      >
        {/* Header Close button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition z-10 cursor-pointer"
          id="btn-close-modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Main Grid */}
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Image Carousel / Gallery */}
          <div className="flex flex-col gap-4">
            {/* Primary active image view */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-center relative aspect-square overflow-hidden">
              {product.featured && (
                <span className="absolute top-3 left-3 bg-[#FF9900] text-[#131921] text-[11px] font-black px-2.5 py-0.5 rounded shadow">
                  DESTACADO
                </span>
              )}
              {product.stock === 0 && (
                <span className="absolute top-3 right-3 bg-red-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded shadow">
                  SIN STOCK
                </span>
              )}
              <img
                src={activeImages[selectedImageIndex]}
                alt={product.name}
                className="max-h-[350px] w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Gallery Thumbnails List */}
            {activeImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {activeImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-16 h-16 rounded border bg-gray-50 p-1 flex items-center justify-center shrink-0 transition cursor-pointer ${
                      selectedImageIndex === idx 
                        ? 'border-[#FF9900] ring-2 ring-[#FF9900]/20' 
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`Thumbnail ${idx + 1}`} 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Detailed Product Info */}
          <div className="flex flex-col text-left">
            {/* Brand, SKU & Category */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-[#232F3E] text-white text-xs font-bold px-3 py-1 rounded">
                {brand?.name || 'Sin Marca'}
              </span>
              <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded">
                {category?.name || 'General'}
              </span>
              <span className="text-xs font-mono text-gray-400 font-bold ml-auto bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                SKU: {product.sku}
              </span>
            </div>

            {/* Product Title */}
            <h2 className="text-xl md:text-2xl font-black text-[#0F1111] leading-tight mb-2">
              {product.name}
            </h2>

            {/* Stock State Alert */}
            <div className="mb-4">
              {product.stock > 15 ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                  Disponible para Entrega Inmediata ({product.stock} unidades)
                </div>
              ) : product.stock > 0 ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                  <AlertTriangle className="w-4 h-4 animate-bounce" />
                  ¡Últimas unidades! Solo quedan {product.stock} disponibles
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                  <AlertTriangle className="w-4 h-4" />
                  Temporalmente Agotado (Bajo Pedido)
                </div>
              )}
            </div>

            {/* Divider */}
            <hr className="border-gray-200 my-2" />

            {/* Price Box */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-5">
              <div className="flex items-center gap-4">
                {product.offer_price ? (
                  <div>
                    <span className="text-xs font-bold text-red-600 uppercase tracking-widest block mb-0.5">Oferta Distribuidor</span>
                    <div className="flex items-baseline gap-2">
                      {formatModalPrice(product.offer_price)}
                      <span className="text-base text-gray-400 line-through">US${product.price.toFixed(2)}</span>
                      <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                        Ahorra US${(product.price - product.offer_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Precio Unitario</span>
                    {formatModalPrice(product.price)}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-wide">
                • Los pagos en Venezuela se calculan en dólares ($) o su equivalente en bolívares.
              </p>
            </div>

            {/* Description Text */}
            <div className="mb-6">
              <h4 className="font-extrabold text-xs text-[#0F1111] uppercase tracking-wider mb-2">Descripción del Producto:</h4>
              <p className="text-sm text-gray-600 leading-relaxed text-justify">
                {product.description}
              </p>
            </div>

            {/* Ficha técnica PDF & Action buttons container */}
            <div className="space-y-4 mt-auto">
              {/* Technical sheet box */}
              <div className="flex items-center justify-between p-3.5 bg-sky-50/50 border border-sky-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-100 text-[#007185] rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h5 className="text-xs font-bold text-[#0F1111]">Ficha Técnica Oficial</h5>
                    <p className="text-[11px] text-gray-400">Especificaciones detalladas del fabricante</p>
                  </div>
                </div>
                <button
                  onClick={handlePrintTechnicalSheet}
                  className="bg-white border border-gray-300 hover:border-[#007185] text-[#007185] hover:text-[#007185] font-bold px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir / PDF
                </button>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Consult WhatsApp */}
                <button
                  onClick={() => onWhatsAppQuery(product)}
                  className="w-full py-3 bg-[#FFA41C] hover:bg-[#FA8900] text-[#0F1111] font-black rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer border border-[#E68200]"
                  id="btn-modal-whatsapp"
                >
                  <MessageCircle className="w-5 h-5 text-[#131921]" />
                  Consultar por WhatsApp
                </button>

                {/* Share Product */}
                <button
                  onClick={copyProductLink}
                  className={`w-full py-3 border font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                    copiedLink 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                      : 'bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border-[#F2C200]'
                  }`}
                  id="btn-modal-share"
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      ¡Enlace Copiado!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-[#131921]" />
                      Compartir Producto
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Section: Related Products */}
        {relatedProducts.length > 0 && (
          <div className="bg-gray-50 p-6 md:p-8 border-t border-gray-100 text-left">
            <h4 className="font-extrabold text-sm text-[#0F1111] uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span>Productos Relacionados</span>
              <ChevronRight className="w-4 h-4 text-[#FF9900]" />
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedProducts.map((relProd) => {
                const relImage = relProd.technical_sheet_url || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=200';
                return (
                  <div 
                    key={relProd.id}
                    onClick={() => onViewProduct(relProd)}
                    className="bg-white rounded-lg p-3 border border-gray-200 hover:border-[#FF9900] cursor-pointer transition flex flex-col justify-between group"
                  >
                    <div className="aspect-square bg-gray-50 rounded flex items-center justify-center p-2 mb-2 overflow-hidden">
                      <img
                        src={relProd.technical_sheet_url || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=150'}
                        alt={relProd.name}
                        className="max-h-[80px] w-auto object-contain group-hover:scale-105 transition duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#0F1111] line-clamp-2 leading-tight group-hover:text-[#007185] transition-colors mb-1 min-h-[32px]">
                        {relProd.name}
                      </h5>
                      {formatModalPrice(relProd.offer_price || relProd.price, 'small')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
