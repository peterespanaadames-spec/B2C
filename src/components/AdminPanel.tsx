/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  BarChart, Package, Tag, Layers, ToggleLeft, ToggleRight, 
  Plus, Edit3, Trash2, Check, AlertTriangle, Printer, Star, Search, Image as ImageIcon, FileText, X, Upload, Download 
} from 'lucide-react';
import { Product, Category, Brand, ProductImage } from '../types.ts';
import { dbService } from '../lib/supabase.ts';
import * as XLSX from 'xlsx';

interface AdminPanelProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  productImages: ProductImage[];
  onRefreshData: () => void;
  activeRole: 'admin' | 'vendedor' | 'cliente';
}

export default function AdminPanel({
  products,
  categories,
  brands,
  productImages,
  onRefreshData,
  activeRole
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'brands'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals visibility states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);

  // Edit target states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Form states - Products
  const [prodSku, setProdSku] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodOfferPrice, setProdOfferPrice] = useState<string>('');
  const [prodStock, setProdStock] = useState(0);
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodBrandId, setProdBrandId] = useState('');
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodActive, setProdActive] = useState(true);
  const [prodRatingStars, setProdRatingStars] = useState<number>(5);
  const [prodRatingCount, setProdRatingCount] = useState<number>(0);
  const [prodImageUrl, setProdImageUrl] = useState(''); // Comma separated for multiples
  const [prodTechUrl, setProdTechUrl] = useState('');

  // Form states - Categories
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catImageUrl, setCatImageUrl] = useState('');

  // Form states - Brands
  const [brandName, setBrandName] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');

  // Calculate general dashboard metrics
  const totalProducts = products.length;
  const totalCategories = categories.length;
  const totalBrands = brands.length;
  const outOfStockProducts = products.filter(p => p.stock === 0).length;
  const featuredProducts = products.filter(p => p.featured).length;

  // Handle open Product form
  const handleOpenProductForm = (prod: Product | null = null) => {
    if (prod) {
      setEditingProduct(prod);
      setProdSku(prod.sku);
      setProdName(prod.name);
      setProdDescription(prod.description);
      setProdPrice(prod.price);
      setProdOfferPrice(prod.offer_price !== null ? prod.offer_price.toString() : '');
      setProdStock(prod.stock);
      setProdCategoryId(prod.category_id);
      setProdBrandId(prod.brand_id);
      setProdFeatured(prod.featured);
      setProdActive(prod.active);
      setProdRatingStars(prod.rating_stars ?? 5);
      setProdRatingCount(prod.rating_count ?? 0);
      setProdTechUrl(prod.technical_sheet_url || '');

      // Load images
      const associatedImgs = productImages
        .filter(img => img.product_id === prod.id)
        .map(img => img.image_url)
        .join(', ');
      setProdImageUrl(associatedImgs);
    } else {
      setEditingProduct(null);
      setProdSku('PRD-' + Math.random().toString(36).substring(2, 8).toUpperCase());
      setProdName('');
      setProdDescription('');
      setProdPrice(0);
      setProdOfferPrice('');
      setProdStock(10);
      setProdCategoryId(categories[0]?.id || '');
      setProdBrandId(brands[0]?.id || '');
      setProdFeatured(false);
      setProdActive(true);
      setProdRatingStars(5);
      setProdRatingCount(0);
      setProdImageUrl('');
      setProdTechUrl('');
    }
    setShowProductModal(true);
  };

  // Handle save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const offerPriceNum = prodOfferPrice.trim() !== '' ? Number(prodOfferPrice) : null;
    const slug = prodName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const payload = {
      sku: prodSku.trim(),
      name: prodName.trim(),
      slug: slug,
      description: prodDescription.trim(),
      price: Number(prodPrice),
      offer_price: offerPriceNum,
      stock: Number(prodStock),
      category_id: prodCategoryId,
      brand_id: prodBrandId,
      featured: prodFeatured,
      active: prodActive,
      rating_stars: Number(prodRatingStars),
      rating_count: Number(prodRatingCount),
      technical_sheet_url: prodTechUrl.trim() || null
    };

    try {
      let savedProduct: Product;
      if (editingProduct) {
        savedProduct = await dbService.updateProduct(editingProduct.id, payload);
      } else {
        savedProduct = await dbService.createProduct(payload);
      }

      // Handle additional images save
      if (prodImageUrl.trim() !== '') {
        // Clear previous images if editing
        if (editingProduct) {
          const prevImgs = productImages.filter(img => img.product_id === editingProduct.id);
          for (const img of prevImgs) {
            await dbService.removeProductImage(img.id);
          }
        }

        // Add new images
        const urls = prodImageUrl.split(',').map(u => u.trim()).filter(u => u !== '');
        for (let i = 0; i < urls.length; i++) {
          await dbService.addProductImage({
            product_id: savedProduct.id,
            image_url: urls[i],
            sort_order: i + 1
          });
        }
      }

      setShowProductModal(false);
      onRefreshData();
    } catch (e) {
      console.error("Error saving product", e);
    }
  };

  // Handle delete Product
  const handleDeleteProduct = async (id: string) => {
    if (activeRole === 'vendedor') {
      alert("Su rol de Vendedor no tiene permisos para eliminar registros.");
      return;
    }
    if (confirm("¿Está seguro de que desea eliminar este producto del catálogo?")) {
      await dbService.deleteProduct(id);
      onRefreshData();
    }
  };

  // Handle toggle Active state product
  const handleToggleActiveProduct = async (prod: Product) => {
    await dbService.updateProduct(prod.id, { active: !prod.active });
    onRefreshData();
  };

  // Handle toggle Featured state product
  const handleToggleFeaturedProduct = async (prod: Product) => {
    await dbService.updateProduct(prod.id, { featured: !prod.featured });
    onRefreshData();
  };

  // Handle open Category form
  const handleOpenCategoryForm = (cat: Category | null = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name);
      setCatSlug(cat.slug);
      setCatImageUrl(cat.image_url);
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatSlug('');
      setCatImageUrl('');
    }
    setShowCategoryModal(true);
  };

  // Handle save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = catSlug.trim() || catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const payload = {
      name: catName.trim(),
      slug: slug,
      image_url: catImageUrl.trim() || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=400'
    };

    if (editingCategory) {
      await dbService.updateCategory(editingCategory.id, payload);
    } else {
      await dbService.createCategory(payload);
    }
    setShowCategoryModal(false);
    onRefreshData();
  };

  // Handle delete Category
  const handleDeleteCategory = async (id: string) => {
    if (activeRole === 'vendedor') {
      alert("Su rol de Vendedor no tiene permisos para eliminar registros.");
      return;
    }
    if (confirm("¿Está seguro de eliminar esta categoría? Los productos asociados quedarán sin categoría.")) {
      await dbService.deleteCategory(id);
      onRefreshData();
    }
  };

  // Handle open Brand form
  const handleOpenBrandForm = (b: Brand | null = null) => {
    if (b) {
      setEditingBrand(b);
      setBrandName(b.name);
      setBrandLogoUrl(b.logo_url);
    } else {
      setEditingBrand(null);
      setBrandName('');
      setBrandLogoUrl('');
    }
    setShowBrandModal(true);
  };

  // Handle save Brand
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: brandName.trim(),
      logo_url: brandLogoUrl.trim() || 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?auto=format&fit=crop&q=80&w=200'
    };

    if (editingBrand) {
      await dbService.updateBrand(editingBrand.id, payload);
    } else {
      await dbService.createBrand(payload);
    }
    setShowBrandModal(false);
    onRefreshData();
  };

  // Handle delete Brand
  const handleDeleteBrand = async (id: string) => {
    if (activeRole === 'vendedor') {
      alert("Su rol de Vendedor no tiene permisos para eliminar registros.");
      return;
    }
    if (confirm("¿Está seguro de eliminar esta marca? Los productos asociados quedarán sin marca registrada.")) {
      await dbService.deleteBrand(id);
      onRefreshData();
    }
  };

  // Print Inventory Report
  const handlePrintInventoryReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tableRows = products.map((p, idx) => {
      const cat = categories.find(c => c.id === p.category_id)?.name || 'General';
      const brand = brands.find(b => b.id === p.brand_id)?.name || 'S/M';
      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${p.sku}</strong></td>
          <td>${p.name}</td>
          <td>${brand}</td>
          <td>${cat}</td>
          <td>$${p.price.toFixed(2)}</td>
          <td>${p.offer_price ? `$${p.offer_price.toFixed(2)}` : '-'}</td>
          <td class="${p.stock === 0 ? 'out' : ''}">${p.stock}</td>
          <td>${p.active ? 'Activo' : 'Inactivo'}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html>
      <head>
        <title>Reporte de Inventario y Precios - Copias Bella Vista</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; font-size: 12px; color: #333; }
          .header { border-bottom: 2px solid #FF9900; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #131921; }
          .meta { margin-top: 5px; color: #666; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
          th { background-color: #131921; color: white; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .out { color: red; font-weight: bold; background-color: #ffe6e6; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Copias Bella Vista - Inventario y Precios</div>
          <div class="meta">
            Fecha de Reporte: ${new Date().toLocaleString()} &nbsp;|&nbsp; 
            Total de Productos: ${products.length} &nbsp;|&nbsp; 
            Moneda: Dólar Americano ($ / USD)
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>SKU</th>
              <th>Nombre de Producto</th>
              <th>Marca</th>
              <th>Categoría</th>
              <th>Precio Standard</th>
              <th>Precio Oferta</th>
              <th>Existencia (Stock)</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          © 2026 Copias Bella Vista. Barinitas, Venezuela. Reporte confidencial para uso interno.
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = () => {
    const data = products.map(p => {
      const category = categories.find(c => c.id === p.category_id);
      const brand = brands.find(b => b.id === p.brand_id);
      return {
        ID: p.id,
        SKU: p.sku,
        Nombre: p.name,
        Slug: p.slug,
        Descripcion: p.description,
        Precio: p.price,
        PrecioOferta: p.offer_price || '',
        Stock: p.stock,
        Categoria: category?.name || '',
        Marca: brand?.name || '',
        Destacado: p.featured ? 'Si' : 'No',
        Activo: p.active ? 'Si' : 'No',
        Estrellas: p.rating_stars ?? 5,
        Reviews: p.rating_count ?? 0,
        FichaTecnica: p.technical_sheet_url || ''
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "Inventario_Copias_Bella_Vista.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeRole === 'vendedor') {
      alert("Su rol de Vendedor no tiene permisos para importar registros masivos.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);
        
        let importedCount = 0;
        
        for (const row of data) {
          // Required fields basic check
          if (!row.Nombre || !row.SKU || row.Precio === undefined || row.Stock === undefined) continue;

          // Try to find category, else use first one or default
          let catId = categories[0]?.id || '';
          if (row.Categoria) {
            const foundCat = categories.find(c => c.name.toLowerCase() === row.Categoria.toString().toLowerCase());
            if (foundCat) catId = foundCat.id;
          }

          // Try to find brand, else use first one or default
          let brandId = brands[0]?.id || '';
          if (row.Marca) {
            const foundBrand = brands.find(b => b.name.toLowerCase() === row.Marca.toString().toLowerCase());
            if (foundBrand) brandId = foundBrand.id;
          }

          const offerPriceNum = row.PrecioOferta && row.PrecioOferta !== '' ? Number(row.PrecioOferta) : null;
          const slug = row.Slug || row.Nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

          const payload = {
            sku: row.SKU.toString(),
            name: row.Nombre.toString(),
            slug: slug,
            description: row.Descripcion?.toString() || '',
            price: Number(row.Precio),
            offer_price: offerPriceNum,
            stock: Number(row.Stock),
            category_id: catId,
            brand_id: brandId,
            featured: row.Destacado === 'Si' || row.Destacado === true,
            active: row.Activo === 'Si' || row.Activo === true,
            rating_stars: row.Estrellas !== undefined ? Number(row.Estrellas) : 5,
            rating_count: row.Reviews !== undefined ? Number(row.Reviews) : 0,
            technical_sheet_url: row.FichaTecnica?.toString() || null
          };

          if (row.ID) {
            // Check if exists
            const exists = products.find(p => p.id === row.ID.toString());
            if (exists) {
              await dbService.updateProduct(exists.id, payload);
              importedCount++;
              continue;
            }
          }
          // Create new
          await dbService.createProduct(payload);
          importedCount++;
        }
        
        alert(`Se han importado o actualizado exitosamente ${importedCount} productos.`);
        onRefreshData();
      } catch (err) {
        console.error("Error importing Excel file:", err);
        alert("Ocurrió un error al procesar el archivo Excel. Verifique el formato.");
      }
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Filtered lists for table views
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    categories.find(c => c.id === p.category_id)?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    brands.find(b => b.id === p.brand_id)?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 select-none text-[#0F1111]">
      
      {/* Admin Title / Role Badge */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 text-left">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-[#131921] uppercase tracking-tight">
            Panel Administrativo de Catálogo
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Gestión completa de productos, categorías, inventario y marcas del sistema.
          </p>
        </div>

        {/* Top actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrintInventoryReport}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded flex items-center gap-2 cursor-pointer shadow"
          >
            <Printer className="w-4 h-4 text-[#FF9900]" />
            Imprimir Reporte Inventario
          </button>
          
          {activeTab === 'products' && (
            <div className="flex flex-wrap gap-2">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".xlsx, .xls"
                onChange={handleImportExcel}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shadow"
                id="btn-import-products"
              >
                <Upload className="w-4 h-4" />
                Importar Excel
              </button>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shadow"
                id="btn-export-products"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </button>
              <button
                onClick={() => handleOpenProductForm(null)}
                className="px-4 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] text-xs font-black rounded flex items-center gap-1.5 cursor-pointer shadow"
                id="btn-add-product"
              >
                <Plus className="w-4 h-4" />
                Nuevo Producto
              </button>
            </div>
          )}

          {activeTab === 'categories' && (
            <button
              onClick={() => handleOpenCategoryForm(null)}
              className="px-4 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] text-xs font-black rounded flex items-center gap-1.5 cursor-pointer shadow"
              id="btn-add-category"
            >
              <Plus className="w-4 h-4" />
              Nueva Categoría
            </button>
          )}

          {activeTab === 'brands' && (
            <button
              onClick={() => handleOpenBrandForm(null)}
              className="px-4 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] text-xs font-black rounded flex items-center gap-1.5 cursor-pointer shadow"
              id="btn-add-brand"
            >
              <Plus className="w-4 h-4" />
              Nueva Marca
            </button>
          )}
        </div>
      </div>

      {/* Metrics Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        
        {/* Total products */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4 text-left">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Total Artículos</p>
            <p className="text-2xl font-black text-[#131921]">{totalProducts}</p>
          </div>
        </div>

        {/* Total categories */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4 text-left">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Categorías</p>
            <p className="text-2xl font-black text-[#131921]">{totalCategories}</p>
          </div>
        </div>

        {/* Total brands */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4 text-left">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Marcas</p>
            <p className="text-2xl font-black text-[#131921]">{totalBrands}</p>
          </div>
        </div>

        {/* Out of Stock warning */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4 text-left">
          <div className={`p-3 rounded-full ${outOfStockProducts > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Sin Stock</p>
            <p className={`text-2xl font-black ${outOfStockProducts > 0 ? 'text-red-600 font-black' : 'text-gray-500'}`}>
              {outOfStockProducts}
            </p>
          </div>
        </div>

        {/* Featured count */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4 text-left col-span-2 md:col-span-1">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-full">
            <Star className="w-6 h-6 fill-current" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Destacados</p>
            <p className="text-2xl font-black text-[#131921]">{featuredProducts}</p>
          </div>
        </div>

      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => { setActiveTab('products'); setSearchQuery(''); }}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'products'
              ? 'border-[#FF9900] text-[#131921]'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          Artículos del Catálogo ({totalProducts})
        </button>
        <button
          onClick={() => { setActiveTab('categories'); setSearchQuery(''); }}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'categories'
              ? 'border-[#FF9900] text-[#131921]'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          Categorías ({totalCategories})
        </button>
        <button
          onClick={() => { setActiveTab('brands'); setSearchQuery(''); }}
          className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'brands'
              ? 'border-[#FF9900] text-[#131921]'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          Marcas ({totalBrands})
        </button>
      </div>

      {/* Search Filter for Table */}
      <div className="mb-4 relative max-w-md text-left">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Buscar en la lista de ${activeTab === 'products' ? 'productos' : activeTab === 'categories' ? 'categorías' : 'marcas'}...`}
          className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-300 rounded text-xs focus:ring-1 focus:ring-[#FF9900] focus:outline-none font-medium"
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2" />
      </div>

      {/* TABLE VIEWS CONTAINER */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
        
        {/* Products Table */}
        {activeTab === 'products' && (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#131921] text-white">
                <th className="p-3 font-extrabold">SKU</th>
                <th className="p-3 font-extrabold">Nombre</th>
                <th className="p-3 font-extrabold">Categoría</th>
                <th className="p-3 font-extrabold">Marca</th>
                <th className="p-3 font-extrabold">Precio (USD)</th>
                <th className="p-3 font-extrabold">Stock</th>
                <th className="p-3 font-extrabold text-center">Destacado</th>
                <th className="p-3 font-extrabold text-center">Visible</th>
                <th className="p-3 font-extrabold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400 font-semibold text-xs">
                    No se encontraron productos coincidentes en la lista.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const cat = categories.find(c => c.id === prod.category_id)?.name || 'General';
                  const brand = brands.find(b => b.id === prod.brand_id)?.name || 'Sin Marca';
                  return (
                    <tr key={prod.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-3 font-mono font-bold text-gray-500">{prod.sku}</td>
                      <td className="p-3 font-bold text-gray-900 truncate max-w-xs">{prod.name}</td>
                      <td className="p-3 font-semibold text-gray-600">{cat}</td>
                      <td className="p-3 font-semibold text-[#007185]">{brand}</td>
                      <td className="p-3 font-black text-gray-900">
                        {prod.offer_price ? (
                          <div className="flex flex-col">
                            <span className="text-[#FF9900] font-black">${prod.offer_price.toFixed(2)}</span>
                            <span className="text-[10px] text-gray-400 line-through">${prod.price.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span>${prod.price.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`font-bold px-2 py-0.5 rounded ${prod.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {prod.stock} disp.
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleFeaturedProduct(prod)}
                          className="text-gray-400 hover:text-amber-500 transition focus:outline-none"
                        >
                          <Star className={`w-4 h-4 mx-auto ${prod.featured ? 'fill-[#FF9900] text-[#FF9900]' : 'text-gray-300'}`} />
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleActiveProduct(prod)}
                          className="text-gray-400 hover:text-[#007185] transition"
                        >
                          {prod.active ? (
                            <ToggleRight className="w-6 h-6 mx-auto text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 mx-auto text-gray-300" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenProductForm(prod)}
                          className="p-1 text-sky-600 hover:bg-sky-50 rounded border border-transparent hover:border-sky-200 transition cursor-pointer inline-flex items-center"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition cursor-pointer inline-flex items-center"
                          title="Eliminar"
                          disabled={activeRole === 'vendedor'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* Categories Table */}
        {activeTab === 'categories' && (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#131921] text-white">
                <th className="p-3 font-extrabold">Miniatura</th>
                <th className="p-3 font-extrabold">Nombre de Categoría</th>
                <th className="p-3 font-extrabold">Slug Único</th>
                <th className="p-3 font-extrabold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400 font-semibold">
                    No hay categorías registradas.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-3">
                      <img 
                        src={cat.image_url} 
                        alt={cat.name} 
                        className="w-8 h-8 rounded object-cover border border-gray-100"
                        referrerPolicy="no-referrer"
                      />
                    </td>
                    <td className="p-3 font-bold text-gray-900">{cat.name}</td>
                    <td className="p-3 font-mono text-gray-400">{cat.slug}</td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenCategoryForm(cat)}
                        className="p-1 text-sky-600 hover:bg-sky-50 rounded border border-transparent hover:border-sky-200 transition cursor-pointer"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition cursor-pointer"
                        title="Eliminar"
                        disabled={activeRole === 'vendedor'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Brands Table */}
        {activeTab === 'brands' && (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#131921] text-white">
                <th className="p-3 font-extrabold">Logo</th>
                <th className="p-3 font-extrabold">Nombre de Marca</th>
                <th className="p-3 font-extrabold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400 font-semibold">
                    No hay marcas registradas.
                  </td>
                </tr>
              ) : (
                filteredBrands.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-3">
                      <img 
                        src={b.logo_url} 
                        alt={b.name} 
                        className="w-10 h-6 rounded object-contain bg-gray-50 border border-gray-200 p-0.5"
                        referrerPolicy="no-referrer"
                      />
                    </td>
                    <td className="p-3 font-bold text-gray-900">{b.name}</td>
                    <td className="p-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenBrandForm(b)}
                        className="p-1 text-sky-600 hover:bg-sky-50 rounded border border-transparent hover:border-sky-200 transition cursor-pointer"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteBrand(b.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition cursor-pointer"
                        title="Eliminar"
                        disabled={activeRole === 'vendedor'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

      </div>

      {/* ====================================
          MODAL DIALOGS FOR CRUD MANAGEMENT
          ==================================== */}

      {/* 1. PRODUCT CREATE/EDIT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left">
            <div className="bg-[#131921] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-5 h-5 text-[#FF9900]" />
                {editingProduct ? 'Editar Producto del Catálogo' : 'Añadir Nuevo Producto'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* SKU */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Código SKU</label>
                  <input
                    type="text"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-1.5 text-xs font-mono font-bold focus:ring-1 focus:ring-[#FF9900] focus:outline-none"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Nombre Completo del Producto</label>
                  <input
                    type="text"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    required
                    className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900] focus:outline-none font-semibold"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Descripción y Detalles del Producto</label>
                <textarea
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  required
                  rows={3}
                  placeholder="Especificaciones, funcionalidades, para qué sirve, etc."
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900] focus:outline-none font-medium leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Price standard */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Precio Standard ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    required
                    className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900] focus:outline-none font-bold"
                  />
                </div>

                {/* Price offer */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Precio Oferta ($ USD) - Opcional</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={prodOfferPrice}
                    onChange={(e) => setProdOfferPrice(e.target.value)}
                    placeholder="Ninguno"
                    className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900] focus:outline-none font-bold text-red-600"
                  />
                </div>

                {/* Stock */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Cantidad de Inventario (Stock)</label>
                  <input
                    type="number"
                    min="0"
                    value={prodStock}
                    onChange={(e) => setProdStock(Number(e.target.value))}
                    required
                    className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900] focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category ID */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Categoría del Catálogo</label>
                  <select
                    value={prodCategoryId}
                    onChange={(e) => setProdCategoryId(e.target.value)}
                    required
                    className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900] focus:outline-none font-semibold"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Brand ID */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Marca o Fabricante</label>
                  <select
                    value={prodBrandId}
                    onChange={(e) => setProdBrandId(e.target.value)}
                    required
                    className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900] focus:outline-none font-semibold"
                  >
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Image URL(s) */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">
                  Enlace(s) de Imágenes (Múltiples separados por comas)
                </label>
                <input
                  type="text"
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900] focus:outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">Sugerencia: puedes usar enlaces directos de Unsplash o cualquier servidor de imágenes.</p>
              </div>

              {/* Technical Sheet PDF link */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Enlace de Ficha Técnica PDF Oficial (Opcional)</label>
                <input
                  type="url"
                  value={prodTechUrl}
                  onChange={(e) => setProdTechUrl(e.target.value)}
                  placeholder="https://example.com/technical-specs.pdf"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900] focus:outline-none"
                />
              </div>

              {/* Featured & Active checkboxes */}
              <div className="flex flex-col gap-3 p-3 bg-gray-50 border border-gray-150 rounded-lg">
                <div className="flex gap-6 items-center">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prodFeatured}
                      onChange={(e) => setProdFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-[#FF9900] focus:ring-[#FF9900] accent-[#FF9900]"
                    />
                    <span>Destacar en Inicio (Oferta Principal)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prodActive}
                      onChange={(e) => setProdActive(e.target.checked)}
                      className="w-4 h-4 rounded text-[#FF9900] focus:ring-[#FF9900] accent-[#FF9900]"
                    />
                    <span>Activo y Visible en Catálogo Público</span>
                  </label>
                </div>
                
                {prodFeatured && (
                  <div className="flex gap-4 items-center border-t border-gray-200 pt-3 mt-1">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-[#FF9900] fill-[#FF9900]" />
                        Calificación Manual (Estrellas 1-5)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="0.5"
                        value={prodRatingStars}
                        onChange={(e) => setProdRatingStars(Number(e.target.value))}
                        className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900]"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Número de Usuarios (Reviews)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={prodRatingCount}
                        onChange={(e) => setProdRatingCount(Number(e.target.value))}
                        className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Save button */}
              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-xs font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] font-black rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  id="btn-save-product-modal"
                >
                  <Check className="w-4 h-4" />
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CATEGORY CREATE/EDIT MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full text-left">
            <div className="bg-[#131921] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-5 h-5 text-[#FF9900]" />
                {editingCategory ? 'Editar Categoría' : 'Añadir Nueva Categoría'}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Nombre de la Categoría</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                  placeholder="ej. Papelería, Consumibles"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900] focus:outline-none font-bold"
                />
              </div>

              {/* Category Slug */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Slug Único (Opcional)</label>
                <input
                  type="text"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  placeholder="ej. papeleria-oficina"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs font-mono focus:ring-1 focus:ring-[#FF9900] focus:outline-none"
                />
              </div>

              {/* Category Image */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Enlace de Imagen Representativa</label>
                <input
                  type="text"
                  value={catImageUrl}
                  onChange={(e) => setCatImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900] focus:outline-none"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-xs font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] font-black rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  id="btn-save-category-modal"
                >
                  <Check className="w-4 h-4" />
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. BRAND CREATE/EDIT MODAL */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full text-left">
            <div className="bg-[#131921] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-5 h-5 text-[#FF9900]" />
                {editingBrand ? 'Editar Marca' : 'Añadir Nueva Marca'}
              </h3>
              <button onClick={() => setShowBrandModal(false)} className="text-gray-400 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="p-6 space-y-4">
              {/* Brand Name */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Nombre de la Marca</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  required
                  placeholder="ej. Zeppelin, Faber-Castell"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900] focus:outline-none font-bold"
                />
              </div>

              {/* Brand Logo URL */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Enlace del Logotipo</label>
                <input
                  type="text"
                  value={brandLogoUrl}
                  onChange={(e) => setBrandLogoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#FF9900] focus:outline-none"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-xs font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] font-black rounded text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  id="btn-save-brand-modal"
                >
                  <Check className="w-4 h-4" />
                  Guardar Marca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
