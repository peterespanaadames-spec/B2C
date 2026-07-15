/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { Category, Brand, Product, ProductImage, SystemSettings } from '../types';

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

// Initial Local Storage setup for settings only
const initializeLocalDb = () => {
  if (!localStorage.getItem('copias_bellavista_settings')) {
    localStorage.setItem('copias_bellavista_settings', JSON.stringify({
      supabaseUrl: 'https://absmxrciaasihyqpinlm.supabase.co',
      supabaseAnonKey: 'sb_publishable_rn_0iwmTGj_z1ZaneXBdpw_eSvlUIU_',
      useSupabase: true
    }));
  }
};

initializeLocalDb();

// ==========================================
// DB SERVICE METHODS (REAL DATABASE)
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
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return data as Category[];
  },

  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    if (!supabase) throw new Error('Supabase is not configured');
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID()
    };
    const { data, error } = await supabase.from('categories').insert([newCategory]).select();
    if (error) throw error;
    return data[0] as Category;
  },

  async updateCategory(id: string, category: Partial<Category>): Promise<Category> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.from('categories').update(category).eq('id', id).select();
    if (error) throw error;
    return data[0] as Category;
  },

  async deleteCategory(id: string): Promise<boolean> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // Brand Operations
  async getBrands(): Promise<Brand[]> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.from('brands').select('*').order('name');
    if (error) throw error;
    return data as Brand[];
  },

  async createBrand(brand: Omit<Brand, 'id'>): Promise<Brand> {
    if (!supabase) throw new Error('Supabase is not configured');
    const newBrand: Brand = {
      ...brand,
      id: crypto.randomUUID()
    };
    const { data, error } = await supabase.from('brands').insert([newBrand]).select();
    if (error) throw error;
    return data[0] as Brand;
  },

  async updateBrand(id: string, brand: Partial<Brand>): Promise<Brand> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.from('brands').update(brand).eq('id', id).select();
    if (error) throw error;
    return data[0] as Brand;
  },

  async deleteBrand(id: string): Promise<boolean> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) throw error;
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
    if (!supabase) throw new Error('Supabase is not configured');
    
    let query = supabase.from('products').select('*', { count: 'exact' });
    
    // Only active products in public paginated view
    query = query.eq('active', true);

    if (params.searchTerm) {
      query = query.or(`name.ilike.%${params.searchTerm}%,description.ilike.%${params.searchTerm}%`);
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
    
    if (error) throw error;
    
    return { data: data as Product[], count: count || 0 };
  },

  // Product Operations
  async getProducts(): Promise<Product[]> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as Product[];
  },

  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    if (!supabase) throw new Error('Supabase is not configured');
    const sanitizedProduct = {
      ...product,
      category_id: product.category_id === '' ? null : product.category_id,
      brand_id: product.brand_id === '' ? null : product.brand_id
    };
    
    // rating_stars and rating_count do not exist in database products table
    delete (sanitizedProduct as any).rating_stars;
    delete (sanitizedProduct as any).rating_count;

    const newProduct = {
      ...sanitizedProduct,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase.from('products').insert([newProduct]).select();
    if (error) throw error;
    return data[0] as Product;
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    if (!supabase) throw new Error('Supabase is not configured');
    const sanitizedProduct = { ...product };
    if (product.category_id === '') sanitizedProduct.category_id = null;
    if (product.brand_id === '') sanitizedProduct.brand_id = null;
    
    // rating_stars and rating_count do not exist in database products table
    delete (sanitizedProduct as any).rating_stars;
    delete (sanitizedProduct as any).rating_count;

    const updatedFields = {
      ...sanitizedProduct,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('products').update(updatedFields).eq('id', id).select();
    if (error) throw error;
    return data[0] as Product;
  },

  async deleteProduct(id: string): Promise<boolean> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    // Also delete associated images
    await supabase.from('product_images').delete().eq('product_id', id);
    return true;
  },

  // Product Images Operations
  async getProductImages(productId?: string): Promise<ProductImage[]> {
    if (!supabase) throw new Error('Supabase is not configured');
    let query = supabase.from('product_images').select('*').order('sort_order');
    if (productId) {
      query = query.eq('product_id', productId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as ProductImage[];
  },

  async addProductImage(productImage: Omit<ProductImage, 'id'>): Promise<ProductImage> {
    if (!supabase) throw new Error('Supabase is not configured');
    const newImage: ProductImage = {
      ...productImage,
      id: crypto.randomUUID()
    };
    const { data, error } = await supabase.from('product_images').insert([newImage]).select();
    if (error) throw error;
    return data[0] as ProductImage;
  },

  async removeProductImage(id: string): Promise<boolean> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { error } = await supabase.from('product_images').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
