/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { Category, Brand, Product, ProductImage, UserProfile, SystemSettings } from '../types';

// Read configuration from localStorage or initial environment
const getInitialSettings = (): SystemSettings => {
  const defaultUrl = 'https://absmxrciaasihyqpinlm.supabase.co';
  const defaultKey = 'sb_publishable_rn_0iwmTGj_z1ZaneXBdpw_eSvlUIU_';

  try {
    const saved = localStorage.getItem('copias_bellavista_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        supabaseUrl: parsed.supabaseUrl || (import.meta as any).env.VITE_SUPABASE_URL || defaultUrl,
        supabaseAnonKey: parsed.supabaseAnonKey || (import.meta as any).env.VITE_SUPABASE_ANON_KEY || defaultKey,
        useSupabase: parsed.useSupabase !== undefined ? parsed.useSupabase === true : true
      };
    }
  } catch (e) {
    console.error("Error reading settings", e);
  }

  const envUrl = (import.meta as any).env.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

  return {
    supabaseUrl: envUrl || defaultUrl,
    supabaseAnonKey: envKey || defaultKey,
    useSupabase: true
  };
};

export const currentSettings = getInitialSettings();

// Helper to sanitize Supabase URL (strips trailing slashes and /rest/v1 if present)
const sanitizeSupabaseUrl = (url: string): string => {
  if (!url) return '';
  let cleaned = url.trim();
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  if (cleaned.endsWith('/rest/v1')) {
    cleaned = cleaned.slice(0, -8);
  }
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
};

// Initialize actual Supabase client optionally
export const supabase = (currentSettings.useSupabase && currentSettings.supabaseUrl && currentSettings.supabaseAnonKey)
  ? createClient(sanitizeSupabaseUrl(currentSettings.supabaseUrl), currentSettings.supabaseAnonKey)
  : null;

// ==========================================
// SEED DATA FOR LOCAL SIMULATION (DEFAULT)
// ==========================================

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Sistemas de Impresión y Copiado',
    slug: 'sistemas-impresion-copiado',
    image_url: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'cat-2',
    name: 'Escolares y Marcadores',
    slug: 'escolares-marcadores',
    image_url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'cat-3',
    name: 'Papelería y Oficina',
    slug: 'papeleria-oficina',
    image_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'cat-4',
    name: 'Consumibles y Tóner',
    slug: 'consumibles-toner',
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'cat-5',
    name: 'Equipos de Oficina y Encuadernación',
    slug: 'equipos-encuadernacion',
    image_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600'
  }
];

const DEFAULT_BRANDS: Brand[] = [
  { id: 'brand-1', name: 'Zeppelin', logo_url: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?auto=format&fit=crop&q=80&w=200' },
  { id: 'brand-2', name: 'Xerox', logo_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=200' },
  { id: 'brand-3', name: 'HP', logo_url: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&q=80&w=200' },
  { id: 'brand-4', name: 'Faber-Castell', logo_url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&q=80&w=200' },
  { id: 'brand-5', name: 'Sharp', logo_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=200' }
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'PRD-XRX-B405',
    name: 'Fotocopiadora Multifuncional Xerox VersaLink B405',
    slug: 'xerox-versalink-b405',
    description: 'Fotocopiadora e impresora láser monocromática de alta velocidad. Ideal para centros de copiado intensivo y oficinas corporativas. Velocidad de impresión de hasta 47 páginas por minuto (ppm), impresión a doble cara automática, alimentador automático de documentos de una sola pasada y pantalla táctil intuitiva de 5 pulgadas configurable.',
    price: 850.00,
    offer_price: 799.00,
    stock: 4,
    category_id: 'cat-1',
    brand_id: 'brand-2',
    featured: true,
    active: true,
    technical_sheet_url: 'https://www.xerox.com/office/VLB405_tech_sheet.pdf'
  },
  {
    id: 'prod-2',
    sku: 'PRD-ZEP-M18A',
    name: 'Marcador Artístico Doble Punta Zeppelin (Estuche x 18)',
    slug: 'marcador-artistico-doble-punta-zeppelin',
    description: 'Estuche de 18 marcadores profesionales de doble punta Zeppelin. Cuenta con una punta fina pincel para trazos dinámicos, dibujo artístico y caligrafía, y una punta biselada para rellenar fondos o trazos anchos. Tinta base de alcohol no tóxica y de alta adherencia, ideal para papel de ilustración, cartulina y superficies porosas.',
    price: 27.90,
    offer_price: 19.99,
    stock: 35,
    category_id: 'cat-2',
    brand_id: 'brand-1',
    featured: true,
    active: true,
    technical_sheet_url: null
  },
  {
    id: 'prod-3',
    sku: 'PRD-SHP-AL2040',
    name: 'Copiadora Digital de Escritorio Sharp AL-2040CS',
    slug: 'sharp-al-2040cs',
    description: 'Copiadora, impresora y escáner digital compacta con alimentador automático. Velocidad de hasta 20 copias por minuto (cpm), resolución real de 600 ppp, bandeja de papel integrada de 250 hojas y bypass manual para transparencias y etiquetas. Perfecta para un volumen moderado y escritorios ejecutivos.',
    price: 380.00,
    offer_price: 349.00,
    stock: 2,
    category_id: 'cat-1',
    brand_id: 'brand-5',
    featured: true,
    active: true,
    technical_sheet_url: 'https://www.sharpusa.com/AL-2040CS_tech.pdf'
  },
  {
    id: 'prod-4',
    sku: 'PRD-ZEP-MPN12',
    name: 'Marcador Permanente Negro Zeppelin (Caja x 12)',
    slug: 'marcador-permanente-negro-zeppelin-12',
    description: 'Caja de 12 marcadores permanentes de punta redonda color negro intenso. Equipado con punta de nylon de larga duración que no se deforma. Tinta de secado ultra rápido, resistente al agua, la decoloración y el frote. Ideal para rotular cajas de embalaje, plásticos, vidrios y metales.',
    price: 14.90,
    offer_price: null,
    stock: 120,
    category_id: 'cat-2',
    brand_id: 'brand-1',
    featured: false,
    active: true,
    technical_sheet_url: null
  },
  {
    id: 'prod-5',
    sku: 'PRD-HP-CE285A',
    name: 'Cartucho de Tóner Original HP 85A Negro (CE285A)',
    slug: 'toner-hp-85a-negro',
    description: 'Cartucho de tóner LaserJet original negro HP 85A. Diseñado para ofrecer confiabilidad constante y resultados profesionales de alta calidad. Rendimiento medio de impresión estimado en 1,600 páginas estándar de acuerdo con las normativas ISO/IEC. Compatible con impresoras HP LaserJet Pro P1102 y M1212.',
    price: 65.00,
    offer_price: 59.90,
    stock: 18,
    category_id: 'cat-4',
    brand_id: 'brand-3',
    featured: true,
    active: true,
    technical_sheet_url: 'https://www.hp.com/toner-85a-datasheet.pdf'
  },
  {
    id: 'prod-6',
    sku: 'PRD-FBC-TL46P',
    name: 'Resaltadores Faber-Castell Textliner 46 Pastel (Caja x 8)',
    slug: 'resaltadores-faber-castell-textliner-46-pastel',
    description: 'Caja de 8 resaltadores Faber-Castell Textliner en hermosos tonos pastel surtidos. Tinta base de agua de alta calidad ecológica. Punta especial biselada que permite tres grosores de trazo diferentes: 5mm, 2mm y 1mm para un resaltado preciso o marcación de áreas.',
    price: 15.50,
    offer_price: 12.90,
    stock: 40,
    category_id: 'cat-2',
    brand_id: 'brand-4',
    featured: false,
    active: true,
    technical_sheet_url: null
  },
  {
    id: 'prod-7',
    sku: 'PRD-HP-PAPERC',
    name: 'Resma de Papel Carta Multifuncional HP Ultra White',
    slug: 'resma-papel-carta-hp',
    description: 'Resma de papel tamaño carta de 20 lb y blancura superior al 96% de tecnología ColorLok para colores un 30% más vivos y secado un 25% más veloz. Contiene 500 hojas diseñadas para resistir atascos en fotocopiadoras automáticas e impresoras láser de alta velocidad.',
    price: 6.50,
    offer_price: 5.80,
    stock: 250,
    category_id: 'cat-3',
    brand_id: 'brand-3',
    featured: false,
    active: true,
    technical_sheet_url: null
  },
  {
    id: 'prod-8',
    sku: 'PRD-FBC-EBERH',
    name: 'Borradores de Goma Faber-Castell Eberhard Faber',
    slug: 'borradores-faber-castell-eberhard',
    description: 'Caja de 20 borradores de goma natural Faber-Castell Eberhard Faber libres de PVC. Suaves al tacto, no manchan ni rompen el papel. Ideales para lápices de grafito estándar y uso escolar intensivo.',
    price: 8.00,
    offer_price: null,
    stock: 75,
    category_id: 'cat-2',
    brand_id: 'brand-4',
    featured: false,
    active: true,
    technical_sheet_url: null
  },
  {
    id: 'prod-9',
    sku: 'PRD-HP-OFFICEC',
    name: 'Impresora Fotocopiadora HP OfficeJet Pro 9015e',
    slug: 'hp-officejet-pro-9015e',
    description: 'Impresora fotocopiadora multifunción de inyección de tinta térmica inteligente a color. Ofrece impresión a doble cara ultrarrápida, copia, escaneo y fax móviles. Ideal para pequeñas oficinas y negocios que requieren color profesional con bajo costo por página.',
    price: 245.00,
    offer_price: 219.00,
    stock: 0,
    category_id: 'cat-1',
    brand_id: 'brand-3',
    featured: false,
    active: true,
    technical_sheet_url: 'https://www.hp.com/officejet-9015e-spec.pdf'
  },
  {
    id: 'prod-10',
    sku: 'PRD-ZEP-ART48',
    name: 'Estuche de Colores Premium Zeppelin Art (x 48)',
    slug: 'colores-zeppelin-art-48',
    description: 'Set de arte profesional con 48 lápices de colores premium Zeppelin. Minas súper suaves y extra resistentes de 4.0mm con pigmentación concentrada para una mezcla de color y degradación asombrosa. Presentado en un elegante estuche metálico de protección.',
    price: 34.00,
    offer_price: 29.50,
    stock: 12,
    category_id: 'cat-2',
    brand_id: 'brand-1',
    featured: true,
    active: true,
    technical_sheet_url: null
  }
];

const DEFAULT_PRODUCT_IMAGES: ProductImage[] = [
  // Xerox B405
  { id: 'img-1-1', product_id: 'prod-1', image_url: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&q=80&w=600', sort_order: 1 },
  { id: 'img-1-2', product_id: 'prod-1', image_url: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&q=80&w=600', sort_order: 2 },
  // Zeppelin M18A
  { id: 'img-2-1', product_id: 'prod-2', image_url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&q=80&w=600', sort_order: 1 },
  { id: 'img-2-2', product_id: 'prod-2', image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=600', sort_order: 2 },
  // Sharp AL2040
  { id: 'img-3-1', product_id: 'prod-3', image_url: 'https://images.unsplash.com/photo-1563161431-1e247480cf89?auto=format&fit=crop&q=80&w=600', sort_order: 1 },
  // Zeppelin Negro
  { id: 'img-4-1', product_id: 'prod-4', image_url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&q=80&w=600', sort_order: 1 },
  // Toner HP
  { id: 'img-5-1', product_id: 'prod-5', image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600', sort_order: 1 },
  // Faber Resaltadores
  { id: 'img-6-1', product_id: 'prod-6', image_url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&q=80&w=600', sort_order: 1 },
  // HP Resma
  { id: 'img-7-1', product_id: 'prod-7', image_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=600', sort_order: 1 },
  // Borradores
  { id: 'img-8-1', product_id: 'prod-8', image_url: 'https://images.unsplash.com/photo-1562240020-ce31ccb0fa7d?auto=format&fit=crop&q=80&w=600', sort_order: 1 },
  // HP Printer
  { id: 'img-9-1', product_id: 'prod-9', image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600', sort_order: 1 },
  // Zeppelin 48
  { id: 'img-10-1', product_id: 'prod-10', image_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=600', sort_order: 1 }
];

// Initial Local Storage setup
const initializeLocalDb = () => {
  if (!localStorage.getItem('copias_bellavista_settings')) {
    localStorage.setItem('copias_bellavista_settings', JSON.stringify({
      supabaseUrl: 'https://absmxrciaasihyqpinlm.supabase.co',
      supabaseAnonKey: 'sb_publishable_rn_0iwmTGj_z1ZaneXBdpw_eSvlUIU_',
      useSupabase: true
    }));
  }
  if (!localStorage.getItem('bellavista_categories')) {
    localStorage.setItem('bellavista_categories', JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (!localStorage.getItem('bellavista_brands')) {
    localStorage.setItem('bellavista_brands', JSON.stringify(DEFAULT_BRANDS));
  }
  if (!localStorage.getItem('bellavista_products')) {
    localStorage.setItem('bellavista_products', JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem('bellavista_product_images')) {
    localStorage.setItem('bellavista_product_images', JSON.stringify(DEFAULT_PRODUCT_IMAGES));
  }
  if (!localStorage.getItem('bellavista_users')) {
    localStorage.setItem('bellavista_users', JSON.stringify([
      { id: 'user-admin', email: 'admin@bellavista.com', role: 'admin' },
      { id: 'user-vendedor', email: 'vendedor@bellavista.com', role: 'vendedor' },
      { id: 'user-cliente', email: 'cliente@bellavista.com', role: 'cliente' }
    ]));
  }
};

initializeLocalDb();

// ==========================================
// DB SERVICE METHODS (REAL OR SIMULATED)
// ==========================================

export const dbService = {
  // Get active settings
  getSettings(): SystemSettings {
    return getInitialSettings();
  },

  // Save active settings
  saveSettings(settings: SystemSettings) {
    localStorage.setItem('copias_bellavista_settings', JSON.stringify(settings));
    // Reload page to re-evaluate Supabase client creation
    window.location.reload();
  },

  // Category Operations
  async getCategories(): Promise<Category[]> {
    if (supabase && currentSettings.useSupabase) {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (!error && data) return data as Category[];
      console.warn("Supabase error, falling back to local storage:", error);
    }
    return JSON.parse(localStorage.getItem('bellavista_categories') || '[]');
  },

  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID()
    };
    if (supabase && currentSettings.useSupabase) {
      const { data, error } = await supabase.from('categories').insert([newCategory]).select();
      if (!error && data && data.length > 0) return data[0] as Category;
      console.warn("Supabase error during insert, using local storage:", error);
    }
    const list = JSON.parse(localStorage.getItem('bellavista_categories') || '[]');
    list.push(newCategory);
    localStorage.setItem('bellavista_categories', JSON.stringify(list));
    return newCategory;
  },

  async updateCategory(id: string, category: Partial<Category>): Promise<Category> {
    if (supabase && currentSettings.useSupabase) {
      const { data, error } = await supabase.from('categories').update(category).eq('id', id).select();
      if (!error && data && data.length > 0) return data[0] as Category;
      console.warn("Supabase error during update, using local storage:", error);
    }
    const list: Category[] = JSON.parse(localStorage.getItem('bellavista_categories') || '[]');
    const index = list.findIndex(c => c.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...category };
      localStorage.setItem('bellavista_categories', JSON.stringify(list));
      return list[index];
    }
    return {
      id,
      ...category
    } as Category;
  },

  async deleteCategory(id: string): Promise<boolean> {
    if (supabase && currentSettings.useSupabase) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) return true;
      console.warn("Supabase error during delete, using local storage:", error);
    }
    const list: Category[] = JSON.parse(localStorage.getItem('bellavista_categories') || '[]');
    const filtered = list.filter(c => c.id !== id);
    localStorage.setItem('bellavista_categories', JSON.stringify(filtered));
    return true;
  },

  // Brand Operations
  async getBrands(): Promise<Brand[]> {
    if (supabase && currentSettings.useSupabase) {
      const { data, error } = await supabase.from('brands').select('*').order('name');
      if (!error && data) return data as Brand[];
      console.warn("Supabase error, falling back to local storage:", error);
    }
    return JSON.parse(localStorage.getItem('bellavista_brands') || '[]');
  },

  async createBrand(brand: Omit<Brand, 'id'>): Promise<Brand> {
    const newBrand: Brand = {
      ...brand,
      id: crypto.randomUUID()
    };
    if (supabase && currentSettings.useSupabase) {
      const { data, error } = await supabase.from('brands').insert([newBrand]).select();
      if (!error && data && data.length > 0) return data[0] as Brand;
      console.warn("Supabase error during insert, using local storage:", error);
    }
    const list = JSON.parse(localStorage.getItem('bellavista_brands') || '[]');
    list.push(newBrand);
    localStorage.setItem('bellavista_brands', JSON.stringify(list));
    return newBrand;
  },

  async updateBrand(id: string, brand: Partial<Brand>): Promise<Brand> {
    if (supabase && currentSettings.useSupabase) {
      const { data, error } = await supabase.from('brands').update(brand).eq('id', id).select();
      if (!error && data && data.length > 0) return data[0] as Brand;
      console.warn("Supabase error during update, using local storage:", error);
    }
    const list: Brand[] = JSON.parse(localStorage.getItem('bellavista_brands') || '[]');
    const index = list.findIndex(b => b.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...brand };
      localStorage.setItem('bellavista_brands', JSON.stringify(list));
      return list[index];
    }
    return {
      id,
      ...brand
    } as Brand;
  },

  async deleteBrand(id: string): Promise<boolean> {
    if (supabase && currentSettings.useSupabase) {
      const { error } = await supabase.from('brands').delete().eq('id', id);
      if (!error) return true;
      console.warn("Supabase error during delete, using local storage:", error);
    }
    const list: Brand[] = JSON.parse(localStorage.getItem('bellavista_brands') || '[]');
    const filtered = list.filter(b => b.id !== id);
    localStorage.setItem('bellavista_brands', JSON.stringify(filtered));
    return true;
  },

  async getProductsPaginated(params: {
    page: number;
    pageSize: number;
    searchTerm?: string;
    categoryId?: string;
    brandId?: string;
    onlyAvailable?: boolean;
    onlyFeatured?: boolean;
    onlyOffers?: boolean;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<{ data: Product[], count: number }> {
    if (supabase && currentSettings.useSupabase) {
      let query = supabase.from('products').select('*', { count: 'exact' });
      
      if (params.searchTerm) {
        query = query.or(`name.ilike.%${params.searchTerm}%,sku.ilike.%${params.searchTerm}%,description.ilike.%${params.searchTerm}%`);
      }
      if (params.categoryId && params.categoryId !== 'all') {
        query = query.eq('category_id', params.categoryId);
      }
      if (params.brandId && params.brandId !== 'all') {
        query = query.eq('brand_id', params.brandId);
      }
      if (params.onlyAvailable) {
        query = query.gt('stock', 0);
      }
      if (params.onlyFeatured) {
        query = query.eq('featured', true);
      }
      if (params.onlyOffers) {
        query = query.not('offer_price', 'is', null);
      }
      if (params.minPrice !== undefined && params.minPrice > 0) {
        query = query.gte('price', params.minPrice);
      }
      if (params.maxPrice !== undefined && params.maxPrice < 1000) {
        query = query.lte('price', params.maxPrice);
      }

      query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });

      const from = params.page * params.pageSize;
      const to = from + params.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (!error && data) {
        return { data: data as Product[], count: count || 0 };
      }
      console.warn("Supabase error, falling back to local storage:", error);
    }
    
    // Fallback to local storage (basic logic)
    let list: Product[] = JSON.parse(localStorage.getItem('bellavista_products') || '[]');
    if (params.searchTerm) {
      const q = params.searchTerm.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if (params.categoryId && params.categoryId !== 'all') list = list.filter(p => p.category_id === params.categoryId);
    if (params.brandId && params.brandId !== 'all') list = list.filter(p => p.brand_id === params.brandId);
    if (params.onlyAvailable) list = list.filter(p => p.stock > 0);
    if (params.onlyFeatured) list = list.filter(p => p.featured);
    if (params.onlyOffers) list = list.filter(p => p.offer_price !== null);
    if (params.minPrice !== undefined && params.minPrice > 0) list = list.filter(p => p.price >= params.minPrice!);
    if (params.maxPrice !== undefined && params.maxPrice < 1000) list = list.filter(p => p.price <= params.maxPrice!);

    // Sort by featured, then created_at (simulate)
    list.sort((a, b) => {
      if (a.featured === b.featured) {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      }
      return a.featured ? -1 : 1;
    });

    const from = params.page * params.pageSize;
    const data = list.slice(from, from + params.pageSize);
    
    return { data, count: list.length };
  },

  // Product Operations
  async getProducts(): Promise<Product[]> {
    if (supabase && currentSettings.useSupabase) {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!error && data) return data as Product[];
      console.warn("Supabase error, falling back to local storage:", error);
    }
    return JSON.parse(localStorage.getItem('bellavista_products') || '[]');
  },

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const sanitizedProduct = {
      ...product,
      category_id: product.category_id === '' ? null : product.category_id,
      brand_id: product.brand_id === '' ? null : product.brand_id
    };
    const newProduct: Product = {
      ...sanitizedProduct,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (supabase && currentSettings.useSupabase) {
      const { data, error } = await supabase.from('products').insert([newProduct]).select();
      if (!error && data && data.length > 0) return data[0] as Product;
      console.warn("Supabase error during insert, using local storage:", error);
    }
    const list = JSON.parse(localStorage.getItem('bellavista_products') || '[]');
    list.push(newProduct);
    localStorage.setItem('bellavista_products', JSON.stringify(list));
    return newProduct;
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const sanitizedProduct = {
      ...product
    };
    if (product.category_id === '') {
      sanitizedProduct.category_id = null;
    }
    if (product.brand_id === '') {
      sanitizedProduct.brand_id = null;
    }
    const updatedFields = {
      ...sanitizedProduct,
      updated_at: new Date().toISOString()
    };
    if (supabase && currentSettings.useSupabase) {
      const { data, error } = await supabase.from('products').update(updatedFields).eq('id', id).select();
      if (!error && data && data.length > 0) return data[0] as Product;
      console.warn("Supabase error during update, using local storage:", error);
    }
    const list: Product[] = JSON.parse(localStorage.getItem('bellavista_products') || '[]');
    const index = list.findIndex(p => p.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updatedFields };
      localStorage.setItem('bellavista_products', JSON.stringify(list));
      return list[index];
    }
    return {
      id,
      ...updatedFields
    } as Product;
  },

  async deleteProduct(id: string): Promise<boolean> {
    if (supabase && currentSettings.useSupabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) {
        // Also delete associated images
        await supabase.from('product_images').delete().eq('product_id', id);
        return true;
      }
      console.warn("Supabase error during delete, using local storage:", error);
    }
    const list: Product[] = JSON.parse(localStorage.getItem('bellavista_products') || '[]');
    const filtered = list.filter(p => p.id !== id);
    localStorage.setItem('bellavista_products', JSON.stringify(filtered));

    const imgList: ProductImage[] = JSON.parse(localStorage.getItem('bellavista_product_images') || '[]');
    const filteredImg = imgList.filter(img => img.product_id !== id);
    localStorage.setItem('bellavista_product_images', JSON.stringify(filteredImg));

    return true;
  },

  // Product Images Operations
  async getProductImages(productId?: string): Promise<ProductImage[]> {
    if (supabase && currentSettings.useSupabase) {
      let query = supabase.from('product_images').select('*').order('sort_order');
      if (productId) {
        query = query.eq('product_id', productId);
      }
      const { data, error } = await query;
      if (!error && data) return data as ProductImage[];
      console.warn("Supabase error, falling back to local storage:", error);
    }
    const list: ProductImage[] = JSON.parse(localStorage.getItem('bellavista_product_images') || '[]');
    if (productId) {
      return list.filter(img => img.product_id === productId).sort((a, b) => a.sort_order - b.sort_order);
    }
    return list;
  },

  async addProductImage(productImage: Omit<ProductImage, 'id'>): Promise<ProductImage> {
    const newImage: ProductImage = {
      ...productImage,
      id: crypto.randomUUID()
    };
    if (supabase && currentSettings.useSupabase) {
      const { data, error } = await supabase.from('product_images').insert([newImage]).select();
      if (!error && data && data.length > 0) return data[0] as ProductImage;
      console.warn("Supabase error during image insert, using local storage:", error);
    }
    const list = JSON.parse(localStorage.getItem('bellavista_product_images') || '[]');
    list.push(newImage);
    localStorage.setItem('bellavista_product_images', JSON.stringify(list));
    return newImage;
  },

  async removeProductImage(id: string): Promise<boolean> {
    if (supabase && currentSettings.useSupabase) {
      const { error } = await supabase.from('product_images').delete().eq('id', id);
      if (!error) return true;
      console.warn("Supabase error during image delete, using local storage:", error);
    }
    const list: ProductImage[] = JSON.parse(localStorage.getItem('bellavista_product_images') || '[]');
    const filtered = list.filter(img => img.id !== id);
    localStorage.setItem('bellavista_product_images', JSON.stringify(filtered));
    return true;
  }
};
