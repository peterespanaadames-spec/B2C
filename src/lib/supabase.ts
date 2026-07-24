/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { Category, Brand, Product, ProductImage, SystemSettings, Order, Provider } from '../types';

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

// Helper to rebuild address_text with parsed extras serialized cleanly
const rebuildAddressWithExtras = (
  currentAddress: string,
  extras: {
    payment_method?: string;
    payment_amount_with?: number;
    comments?: string;
    payment_status?: string;
    customer_email?: string;
  }
) => {
  let cleanAddress = (currentAddress || '')
    .replace(/\[Método Pago:[^\]\n]+\]/g, '')
    .replace(/\[Paga con:[^\]\n]+\]/g, '')
    .replace(/\[Comentarios:[^\]\n]+\]/g, '')
    .replace(/\[Estado Pago:[^\]\n]+\]/g, '')
    .replace(/\[Email:[^\]\n]+\]/g, '')
    .trim();

  let serializedExtra = '';
  if (extras.payment_method) serializedExtra += `\n[Método Pago: ${extras.payment_method}]`;
  if (extras.payment_amount_with) serializedExtra += `\n[Paga con: US$ ${extras.payment_amount_with}]`;
  if (extras.comments) serializedExtra += `\n[Comentarios: ${extras.comments}]`;
  if (extras.payment_status) serializedExtra += `\n[Estado Pago: ${extras.payment_status}]`;
  if (extras.customer_email) serializedExtra += `\n[Email: ${extras.customer_email}]`;

  return `${cleanAddress}${serializedExtra}`.trim();
};

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
      let matchedCategoryIds: string[] = [];
      let matchedBrandIds: string[] = [];

      try {
        const [catRes, brandRes] = await Promise.all([
          supabase.from('categories').select('id').ilike('name', `%${params.searchTerm}%`),
          supabase.from('brands').select('id').ilike('name', `%${params.searchTerm}%`)
        ]);

        if (catRes.data && catRes.data.length > 0) {
          matchedCategoryIds = catRes.data.map(c => c.id);
        }
        if (brandRes.data && brandRes.data.length > 0) {
          matchedBrandIds = brandRes.data.map(b => b.id);
        }
      } catch (e) {
        console.error("Error matching category or brand by search term:", e);
      }

      const orParts = [
        `name.ilike.%${params.searchTerm}%`,
        `description.ilike.%${params.searchTerm}%`
      ];

      if (matchedCategoryIds.length > 0) {
        orParts.push(`category_id.in.(${matchedCategoryIds.join(',')})`);
      }
      if (matchedBrandIds.length > 0) {
        orParts.push(`brand_id.in.(${matchedBrandIds.join(',')})`);
      }

      query = query.or(orParts.join(','));
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

    // If barcode_qr is empty or null, remove it from the payload to avoid error if column does not exist
    if (!newProduct.barcode_qr || newProduct.barcode_qr.trim() === '') {
      delete (newProduct as any).barcode_qr;
    }
    
    try {
      const { data, error } = await supabase.from('products').insert([newProduct]).select();
      if (error) throw error;
      return data[0] as Product;
    } catch (err: any) {
      if (err && (err.code === '42703' || (err.message && err.message.includes('barcode_qr')))) {
        throw new Error('El campo Código de Barra/QR requiere que actualices la base de datos en Supabase. Por favor, ve a Configuración (icono de engranaje) en el panel de administración, copia la consulta de actualización de esquema SQL y ejecútala en la consola de Supabase SQL Editor. O bien, deja el campo de Código de Barra/QR vacío para guardar.');
      }
      throw err;
    }
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

    // If barcode_qr is empty or null, remove it from the payload to avoid error if column does not exist
    if (!updatedFields.barcode_qr || String(updatedFields.barcode_qr).trim() === '') {
      delete (updatedFields as any).barcode_qr;
    }

    try {
      const { data, error } = await supabase.from('products').update(updatedFields).eq('id', id).select();
      if (error) throw error;
      return data[0] as Product;
    } catch (err: any) {
      if (err && (err.code === '42703' || (err.message && err.message.includes('barcode_qr')))) {
        throw new Error('El campo Código de Barra/QR requiere que actualices la base de datos en Supabase. Por favor, ve a Configuración (icono de engranaje) en el panel de administración, copia la consulta de actualización de esquema SQL y ejecútala en la consola de Supabase SQL Editor. O bien, deja el campo de Código de Barra/QR vacío para guardar.');
      }
      throw err;
    }
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
  },

  // Order Operations
  async createOrder(order: Omit<Order, 'id' | 'created_at'>): Promise<Order> {
    if (!supabase) throw new Error('Supabase is not configured');
    
    // 1. Calculate a real sequential order number by querying current count
    let calculatedOrderNumber = 1;
    try {
      const { count } = await supabase.from('orders').select('*', { head: true, count: 'exact' });
      calculatedOrderNumber = (count || 0) + 1;
    } catch (e) {
      console.warn("Could not calculate order sequence, defaulting to random", e);
      calculatedOrderNumber = Math.floor(Math.random() * 1000) + 1;
    }

    const newOrder = {
      ...order,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      order_number: calculatedOrderNumber
    };

    try {
      const { data, error } = await supabase.from('orders').insert([newOrder]).select();
      if (error) {
        // If column doesn't exist error (42703 or undefined_column), fall back to serialized data in address_text
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          console.warn("New columns not found in orders table. Retrying with self-healing serialized fallback inside address_text.");
          
          const fallbackOrder = {
            id: newOrder.id,
            customer_name: newOrder.customer_name,
            phone_number: newOrder.phone_number,
            delivery_method: newOrder.delivery_method,
            total_price: newOrder.total_price,
            status: newOrder.status,
            created_at: newOrder.created_at,
            items: newOrder.items,
            address_text: rebuildAddressWithExtras(newOrder.address_text || '', {
              payment_method: order.payment_method,
              payment_amount_with: order.payment_amount_with,
              comments: order.comments,
              payment_status: order.payment_status || 'pendiente',
              customer_email: order.customer_email || undefined
            })
          };
          
          const { data: fallbackData, error: fallbackError } = await supabase.from('orders').insert([fallbackOrder]).select();
          if (fallbackError) throw fallbackError;
          
          const returnedOrder = fallbackData[0] as Order;
          returnedOrder.order_number = calculatedOrderNumber;
          returnedOrder.payment_method = order.payment_method;
          returnedOrder.payment_amount_with = order.payment_amount_with;
          returnedOrder.comments = order.comments;
          returnedOrder.payment_status = order.payment_status || 'pendiente';
          returnedOrder.points = order.points;
          returnedOrder.customer_email = order.customer_email;

          // Sync client from order
          try {
            await this.syncClientFromOrder(returnedOrder.customer_name, returnedOrder.phone_number, order.customer_email || '');
          } catch (syncErr) {
            console.error("Failed to sync client during order fallback:", syncErr);
          }

          return returnedOrder;
        }
        throw error;
      }
      
      const resultOrder = data[0] as Order;
      if (!resultOrder.order_number) resultOrder.order_number = calculatedOrderNumber;

      // Sync client from order
      try {
        await this.syncClientFromOrder(resultOrder.customer_name, resultOrder.phone_number, order.customer_email || '');
      } catch (syncErr) {
        console.error("Failed to sync client during order creation:", syncErr);
      }

      return resultOrder;
    } catch (err) {
      console.error("Order creation failed:", err);
      throw err;
    }
  },

  async getOrder(id: string): Promise<Order | null> {
    if (!supabase) throw new Error('Supabase is not configured');
    
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
    if (error) {
      console.error("Error fetching order by ID:", error);
      return null;
    }
    if (!data) return null;

    const order = data as Order;
    
    // Parse the self-healing serialized extra information from address_text if columns are missing
    if (order && order.address_text) {
      const addr = order.address_text;
      const methodMatch = addr.match(/\[Método Pago:\s*([^\]\n]+)\]/);
      const amountMatch = addr.match(/\[Paga con:\s*US\$\s*([\d\.]+)\]/);
      const commentsMatch = addr.match(/\[Comentarios:\s*([^\]\n]+)\]/);
      const paymentStatusMatch = addr.match(/\[Estado Pago:\s*([^\]\n]+)\]/);
      const emailMatch = addr.match(/\[Email:\s*([^\]\n]+)\]/);
      
      if (methodMatch && !order.payment_method) order.payment_method = methodMatch[1];
      if (amountMatch && !order.payment_amount_with) order.payment_amount_with = parseFloat(amountMatch[1]);
      if (commentsMatch && !order.comments) order.comments = commentsMatch[1];
      if (paymentStatusMatch && !order.payment_status) order.payment_status = paymentStatusMatch[1];
      if (emailMatch && !order.customer_email) order.customer_email = emailMatch[1];
    }
    
    // Calculate sequential order number on the fly if it is not saved or null
    if (order && !order.order_number) {
      try {
        const { count } = await supabase
          .from('orders')
          .select('*', { head: true, count: 'exact' })
          .lte('created_at', order.created_at || '');
        order.order_number = count || 1;
      } catch (e) {
        order.order_number = 1;
      }
    }
    
    // Default values
    if (order && !order.payment_status) {
      order.payment_status = 'pendiente';
    }
    if (order && !order.points) {
      // Calculate loyalty points: $1 spent = 1 point (rounded down)
      order.points = Math.max(1, Math.floor(order.total_price));
    }

    return order;
  },

  async getOrders(): Promise<Order[]> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data) return [];
    
    // Map self-healing attributes and missing fields
    return data.map((order: any, index: number, array: any[]) => {
      if (order.address_text) {
        const addr = order.address_text;
        const methodMatch = addr.match(/\[Método Pago:\s*([^\]\n]+)\]/);
        const amountMatch = addr.match(/\[Paga con:\s*US\$\s*([\d\.]+)\]/);
        const commentsMatch = addr.match(/\[Comentarios:\s*([^\]\n]+)\]/);
        const paymentStatusMatch = addr.match(/\[Estado Pago:\s*([^\]\n]+)\]/);
        const emailMatch = addr.match(/\[Email:\s*([^\]\n]+)\]/);
        
        if (methodMatch && !order.payment_method) order.payment_method = methodMatch[1];
        if (amountMatch && !order.payment_amount_with) order.payment_amount_with = parseFloat(amountMatch[1]);
        if (commentsMatch && !order.comments) order.comments = commentsMatch[1];
        if (paymentStatusMatch && !order.payment_status) order.payment_status = paymentStatusMatch[1];
        if (emailMatch && !order.customer_email) order.customer_email = emailMatch[1];
      }
      
      if (!order.order_number) {
        order.order_number = array.length - index;
      }
      
      if (!order.payment_status) {
        order.payment_status = 'pendiente';
      }
      if (!order.points) {
        order.points = Math.max(1, Math.floor(order.total_price));
      }
      
      return order as Order;
    });
  },

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    if (!supabase) throw new Error('Supabase is not configured');
    
    const sanitizedUpdates: any = { ...updates };
    
    try {
      const { data, error } = await supabase.from('orders').update(sanitizedUpdates).eq('id', id).select();
      if (error) {
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          const currentOrder = await dbService.getOrder(id);
          if (!currentOrder) throw new Error('Order not found to update');

          const mergedExtras = {
            payment_method: updates.payment_method !== undefined ? updates.payment_method : currentOrder.payment_method,
            payment_amount_with: updates.payment_amount_with !== undefined ? updates.payment_amount_with : currentOrder.payment_amount_with,
            comments: updates.comments !== undefined ? updates.comments : currentOrder.comments,
            payment_status: updates.payment_status !== undefined ? updates.payment_status : currentOrder.payment_status
          };

          const updatedAddress = rebuildAddressWithExtras(currentOrder.address_text || '', mergedExtras);

          const safeUpdates: any = {};
          if (updates.status !== undefined) safeUpdates.status = updates.status;
          safeUpdates.address_text = updatedAddress;
          
          const { data: safeData, error: safeError } = await supabase.from('orders').update(safeUpdates).eq('id', id).select();
          if (safeError) throw safeError;
          
          if (!safeData || safeData.length === 0) {
            throw new Error('La base de datos Supabase rechazó la actualización (0 filas afectadas). Esto ocurre si la tabla "orders" tiene políticas de seguridad RLS (Row Level Security) habilitadas que impiden actualizar (UPDATE) los registros. Habilita una política para permitir UPDATE en la tabla "orders" en tu panel de Supabase.');
          }
          
          const returnedOrder = { ...safeData[0], ...updates } as Order;
          returnedOrder.payment_status = mergedExtras.payment_status || 'pendiente';
          returnedOrder.payment_method = mergedExtras.payment_method;
          returnedOrder.payment_amount_with = mergedExtras.payment_amount_with;
          returnedOrder.comments = mergedExtras.comments;
          return returnedOrder;
        }
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error('La base de datos Supabase rechazó la actualización (0 filas afectadas). Esto ocurre si la tabla "orders" tiene políticas de seguridad RLS (Row Level Security) habilitadas que impiden actualizar (UPDATE) los registros. Habilita una política para permitir UPDATE en la tabla "orders" en tu panel de Supabase.');
      }
      
      return data[0] as Order;
    } catch (err) {
      console.error("Error updating order:", err);
      throw err;
    }
  },

  async getLatestBcvRate(): Promise<{ id: string; rate: number; created_at: string; created_by: string } | null> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase
      .from('bcv_rates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('Error fetching latest BCV rate:', error);
      return null;
    }
    return data;
  },

  async updateBcvRate(rate: number, createdBy: string): Promise<any> {
    if (!supabase) throw new Error('Supabase is not configured');
    const newRate = {
      id: crypto.randomUUID(),
      rate: rate,
      created_by: createdBy || 'Sistema',
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('bcv_rates').insert([newRate]).select();
    if (error) throw error;
    return data ? data[0] : null;
  },

  async getBcvRatesHistory(): Promise<any[]> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase
      .from('bcv_rates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);
    if (error) {
      console.error('Error fetching BCV rates history:', error);
      return [];
    }
    return data || [];
  },

  async getAllCurrencyRates(): Promise<any[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('currency_rates')
        .select('*');
      if (error) {
        // Fallback or retry using legacy bcv_rates for VES
        console.warn('Could not fetch currency_rates table, using fallbacks', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error('Error getting currency rates:', e);
      return [];
    }
  },

  async updateCurrencyRate(code: string, rate: number, updatedBy: string): Promise<any> {
    if (!supabase) throw new Error('Supabase is not configured');
    
    // First, sync to bcv_rates legacy if code is VES
    if (code === 'VES') {
      try {
        await this.updateBcvRate(rate, updatedBy);
      } catch (err) {
        console.error('Failed to sync to legacy bcv_rates:', err);
      }
    }

    const { data, error } = await supabase
      .from('currency_rates')
      .upsert({
        code: code,
        rate: rate,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy || 'Sistema'
      }, { onConflict: 'code' })
      .select();

    if (error) {
      throw error;
    }
    return data ? data[0] : null;
  },

  async getInvoices(): Promise<any[]> {
    let apiInvoices: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          apiInvoices = data;
        } else {
          console.warn('Error fetching invoices from Supabase, loading locals only:', error);
        }
      } catch (e) {
        console.warn('Error in getInvoices (Supabase):', e);
      }
    }

    // Load from localStorage
    let localInvoices: any[] = [];
    try {
      const saved = localStorage.getItem('copias_bellavista_local_invoices');
      if (saved) {
        localInvoices = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading local invoices:', e);
    }

    // Merge both list, avoiding duplicates by id or control_number
    const mergedMap = new Map<string, any>();
    localInvoices.forEach(inv => {
      mergedMap.set(inv.id || inv.control_number, inv);
    });
    apiInvoices.forEach(inv => {
      mergedMap.set(inv.id || inv.control_number, inv);
    });

    return Array.from(mergedMap.values()).sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  },

  async createInvoice(invoice: any): Promise<any> {
    // Generate sequential control number
    let calculatedControlNumber = 'FAC-1001';
    try {
      const allInvoices = await this.getInvoices();
      calculatedControlNumber = `FAC-${1001 + allInvoices.length}`;
    } catch (e) {
      calculatedControlNumber = `FAC-${Math.floor(Math.random() * 90000) + 10000}`;
    }

    const newInvoice = {
      id: invoice.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `local-inv-${Math.floor(Math.random() * 1000000)}`),
      ...invoice,
      control_number: calculatedControlNumber,
      created_at: new Date().toISOString()
    };

    let savedInvoice = newInvoice;

    if (supabase) {
      try {
        const { data, error } = await supabase.from('invoices').insert([newInvoice]).select();
        if (!error && data && data[0]) {
          savedInvoice = data[0];
        } else {
          console.warn("Supabase insert invoice failed (likely RLS). Saving to localStorage fallback:", error);
          
          // Save to localStorage
          const saved = localStorage.getItem('copias_bellavista_local_invoices');
          const localInvoices = saved ? JSON.parse(saved) : [];
          localInvoices.push(newInvoice);
          localStorage.setItem('copias_bellavista_local_invoices', JSON.stringify(localInvoices));
        }
      } catch (e) {
        console.warn("Supabase insert invoice error. Saving to localStorage fallback:", e);
        
        // Save to localStorage
        try {
          const saved = localStorage.getItem('copias_bellavista_local_invoices');
          const localInvoices = saved ? JSON.parse(saved) : [];
          localInvoices.push(newInvoice);
          localStorage.setItem('copias_bellavista_local_invoices', JSON.stringify(localInvoices));
        } catch (localErr) {
          console.error("Failed to save invoice to localStorage:", localErr);
        }
      }
    } else {
      // Save to localStorage
      try {
        const saved = localStorage.getItem('copias_bellavista_local_invoices');
        const localInvoices = saved ? JSON.parse(saved) : [];
        localInvoices.push(newInvoice);
        localStorage.setItem('copias_bellavista_local_invoices', JSON.stringify(localInvoices));
      } catch (localErr) {
        console.error("Failed to save invoice to localStorage:", localErr);
      }
    }

    // Sync client from invoice
    try {
      await this.syncClientFromOrder(newInvoice.customer_name, '');
    } catch (syncErr) {
      console.error("Failed to sync client during invoice creation:", syncErr);
    }

    return savedInvoice;
  },

  async getDraftInvoices(): Promise<any[]> {
    let apiDrafts: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('draft_invoices')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          apiDrafts = data;
        } else {
          console.warn('Error fetching draft invoices from Supabase:', error);
        }
      } catch (e) {
        console.warn('Error in getDraftInvoices (Supabase):', e);
      }
    }

    // Load from localStorage
    let localDrafts: any[] = [];
    try {
      const saved = localStorage.getItem('copias_bellavista_local_drafts');
      if (saved) {
        localDrafts = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading local drafts:', e);
    }

    // Merge both
    const mergedMap = new Map<string, any>();
    localDrafts.forEach(d => {
      mergedMap.set(d.id, d);
    });
    apiDrafts.forEach(d => {
      mergedMap.set(d.id, d);
    });

    // Filter out blacklisted/deleted drafts
    let allDrafts = Array.from(mergedMap.values());
    try {
      const deletedSaved = localStorage.getItem('copias_bellavista_deleted_drafts');
      if (deletedSaved) {
        const deletedIds = JSON.parse(deletedSaved);
        if (Array.isArray(deletedIds)) {
          allDrafts = allDrafts.filter(d => !deletedIds.includes(d.id));
        }
      }
    } catch (e) {
      console.error("Error filtering deleted drafts:", e);
    }

    return allDrafts.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  },

  async createDraftInvoice(draft: any): Promise<any> {
    const newDraft = {
      id: draft.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `local-draft-${Math.floor(Math.random() * 1000000)}`),
      ...draft,
      created_at: new Date().toISOString()
    };

    let savedDraft = newDraft;

    if (supabase) {
      try {
        const { data, error } = await supabase.from('draft_invoices').insert([newDraft]).select();
        if (!error && data && data[0]) {
          savedDraft = data[0];
        } else {
          console.warn("Supabase insert draft invoice failed. Saving to localStorage fallback:", error);
          const saved = localStorage.getItem('copias_bellavista_local_drafts');
          const localDrafts = saved ? JSON.parse(saved) : [];
          localDrafts.push(newDraft);
          localStorage.setItem('copias_bellavista_local_drafts', JSON.stringify(localDrafts));
        }
      } catch (e) {
        console.warn("Supabase insert draft error. Saving to localStorage fallback:", e);
        try {
          const saved = localStorage.getItem('copias_bellavista_local_drafts');
          const localDrafts = saved ? JSON.parse(saved) : [];
          localDrafts.push(newDraft);
          localStorage.setItem('copias_bellavista_local_drafts', JSON.stringify(localDrafts));
        } catch (localErr) {
          console.error("Failed to save draft to localStorage:", localErr);
        }
      }
    } else {
      try {
        const saved = localStorage.getItem('copias_bellavista_local_drafts');
        const localDrafts = saved ? JSON.parse(saved) : [];
        localDrafts.push(newDraft);
        localStorage.setItem('copias_bellavista_local_drafts', JSON.stringify(localDrafts));
      } catch (localErr) {
        console.error("Failed to save draft to localStorage:", localErr);
      }
    }

    // Remove from blacklist if recreating or updating
    try {
      const deletedSaved = localStorage.getItem('copias_bellavista_deleted_drafts');
      if (deletedSaved) {
        let deletedIds = JSON.parse(deletedSaved);
        if (Array.isArray(deletedIds) && deletedIds.includes(newDraft.id)) {
          deletedIds = deletedIds.filter(id => id !== newDraft.id);
          localStorage.setItem('copias_bellavista_deleted_drafts', JSON.stringify(deletedIds));
        }
      }
    } catch (e) {
      console.error("Failed to clean blacklist during draft creation:", e);
    }

    return savedDraft;
  },

  async deleteDraftInvoice(id: string): Promise<boolean> {
    // 1. Add to local blacklist to hide instantly and permanently
    try {
      const deletedSaved = localStorage.getItem('copias_bellavista_deleted_drafts');
      const deletedIds = deletedSaved ? JSON.parse(deletedSaved) : [];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('copias_bellavista_deleted_drafts', JSON.stringify(deletedIds));
      }
    } catch (e) {
      console.error("Failed to save deleted draft to blacklist:", e);
    }

    // 2. Try deleting from Supabase
    if (supabase && id && !String(id).startsWith('local-')) {
      try {
        const { error } = await supabase.from('draft_invoices').delete().eq('id', id);
        if (error) {
          console.warn("Supabase delete draft failed (likely RLS). Relying on blacklist fallback:", error);
        }
      } catch (e) {
        console.warn("Supabase delete draft error. Relying on blacklist fallback:", e);
      }
    }

    // 3. Try deleting from local storage drafts list
    try {
      const saved = localStorage.getItem('copias_bellavista_local_drafts');
      if (saved) {
        let localDrafts = JSON.parse(saved);
        localDrafts = localDrafts.filter((d: any) => d.id !== id);
        localStorage.setItem('copias_bellavista_local_drafts', JSON.stringify(localDrafts));
      }
    } catch (e) {
      console.error("Failed to delete draft from localStorage:", e);
    }
    return true;
  },

  async getClients(): Promise<any[]> {
    let apiClients: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          apiClients = data.map(c => {
            let phone = c.phone || '';
            let email = '';
            if (phone.includes(' | email:')) {
              const parts = phone.split(' | email:');
              phone = parts[0];
              email = parts[1];
            }
            return {
              ...c,
              phone,
              email
            };
          });
        }
      } catch (e) {
        console.warn('Error fetching clients from Supabase:', e);
      }
    }

    // Load from localStorage
    let localClients: any[] = [];
    try {
      const saved = localStorage.getItem('copias_bellavista_local_clients');
      if (saved) {
        localClients = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading local clients:', e);
    }

    // Merge both lists, avoiding duplicates by document or code
    const mergedMap = new Map<string, any>();
    localClients.forEach(c => {
      mergedMap.set(c.id || c.document || c.code, c);
    });
    apiClients.forEach(c => {
      mergedMap.set(c.id || c.document || c.code, c);
    });

    return Array.from(mergedMap.values()).map(c => {
      let phone = c.phone || '';
      let email = c.email || '';
      if (phone.includes(' | email:')) {
        const parts = phone.split(' | email:');
        phone = parts[0].trim();
        email = parts[1].trim();
      }
      return {
        ...c,
        phone,
        email
      };
    }).sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  },

  async createClient(client: any): Promise<any> {
    // Generate sequential code
    let calculatedCode = client.code;
    if (!calculatedCode) {
      try {
        const allClients = await this.getClients();
        calculatedCode = `CLI-${1001 + allClients.length}`;
      } catch (e) {
        calculatedCode = `CLI-${Math.floor(Math.random() * 90000) + 10000}`;
      }
    }

    const phoneWithEmail = client.email 
      ? `${client.phone || ''} | email:${client.email}` 
      : (client.phone || '');

    const newClient = {
      id: client.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `local-${Math.floor(Math.random() * 1000000)}`),
      name: client.name,
      document: client.document,
      type: client.type,
      phone: phoneWithEmail,
      credit_usd: client.credit_usd || 0,
      code: calculatedCode,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('clients').insert([newClient]).select();
        if (!error && data && data[0]) {
          let p = data[0].phone || '';
          let em = '';
          if (p.includes(' | email:')) {
            const pts = p.split(' | email:');
            p = pts[0];
            em = pts[1];
          }
          return { ...data[0], phone: p, email: em };
        } else {
          console.warn("Supabase insert client failed (likely RLS). Saving to localStorage fallback:", error);
        }
      } catch (e) {
        console.warn("Supabase insert client error. Saving to localStorage fallback:", e);
      }
    }

    // Save to localStorage as fallback
    try {
      const saved = localStorage.getItem('copias_bellavista_local_clients');
      const localClients = saved ? JSON.parse(saved) : [];
      localClients.push(newClient);
      localStorage.setItem('copias_bellavista_local_clients', JSON.stringify(localClients));
    } catch (e) {
      console.error("Failed to save client to localStorage:", e);
    }

    let p = newClient.phone || '';
    let em = '';
    if (p.includes(' | email:')) {
      const pts = p.split(' | email:');
      p = pts[0];
      em = pts[1];
    }
    return { ...newClient, phone: p, email: em };
  },

  async updateClient(id: string, updates: any): Promise<any> {
    const updatedPayload = { ...updates };
    if ('email' in updates || 'phone' in updates) {
      const phone = 'phone' in updates ? updates.phone : '';
      const email = 'email' in updates ? updates.email : '';
      updatedPayload.phone = email ? `${phone} | email:${email}` : phone;
      delete updatedPayload.email;
    }

    if (supabase && id && !String(id).startsWith('local-')) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .update(updatedPayload)
          .eq('id', id)
          .select();
        if (!error && data && data[0]) {
          let p = data[0].phone || '';
          let em = '';
          if (p.includes(' | email:')) {
            const pts = p.split(' | email:');
            p = pts[0];
            em = pts[1];
          }
          return { ...data[0], phone: p, email: em };
        }
      } catch (e) {
        console.warn("Supabase update client error. Updating local copy instead:", e);
      }
    }

    // Update in local storage
    try {
      const saved = localStorage.getItem('copias_bellavista_local_clients');
      if (saved) {
        let localClients = JSON.parse(saved);
        localClients = localClients.map((c: any) => {
          if (c.id === id) {
            return { ...c, ...updatedPayload };
          }
          return c;
        });
        localStorage.setItem('copias_bellavista_local_clients', JSON.stringify(localClients));
        
        const found = localClients.find((c: any) => c.id === id);
        if (found) {
          let p = found.phone || '';
          let em = '';
          if (p.includes(' | email:')) {
            const pts = p.split(' | email:');
            p = pts[0];
            em = pts[1];
          }
          return { ...found, phone: p, email: em };
        }
      }
    } catch (e) {
      console.error("Failed to update client in localStorage:", e);
    }

    return null;
  },

  async deleteClient(id: string): Promise<boolean> {
    if (supabase && id && !String(id).startsWith('local-')) {
      try {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.warn("Supabase delete client failed. Deleting from local copy:", e);
      }
    }

    try {
      const saved = localStorage.getItem('copias_bellavista_local_clients');
      if (saved) {
        let localClients = JSON.parse(saved);
        localClients = localClients.filter((c: any) => c.id !== id);
        localStorage.setItem('copias_bellavista_local_clients', JSON.stringify(localClients));
      }
    } catch (e) {
      console.error("Failed to delete client from localStorage:", e);
    }
    return true;
  },

  // --- CASH REGISTER (CAJA) OPERATIONS ---
  async getCashSessions(): Promise<any[]> {
    try {
      const saved = localStorage.getItem('copias_bellavista_cash_sessions');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error reading cash sessions:", e);
    }
    // Seed default session matching Image 1
    const defaultSessions = [
      {
        id: "seed-session-1",
        apertura: "20/7/2026, 12:26:48 a. m.",
        cierre: "—",
        apertura_bs: 10.00,
        cierre_bs: null,
        diferencia_bs: null,
        estado: "abierta",
        apertura_usd: 0.22,
        cierre_usd: null,
        observaciones: "Fondo inicial de apertura"
      }
    ];
    localStorage.setItem('copias_bellavista_cash_sessions', JSON.stringify(defaultSessions));
    return defaultSessions;
  },

  async createCashSession(session: any): Promise<any> {
    try {
      const sessions = await this.getCashSessions();
      // Mark any other open sessions as closed just in case
      const updatedSessions = sessions.map(s => s.estado === 'abierta' ? { ...s, estado: 'cerrada', cierre: new Date().toLocaleString('es-VE') } : s);
      const newSession = {
        id: crypto.randomUUID(),
        apertura: new Date().toLocaleString('es-VE'),
        cierre: '—',
        apertura_bs: session.apertura_bs || 0,
        cierre_bs: null,
        diferencia_bs: null,
        estado: 'abierta',
        apertura_usd: session.apertura_usd || 0,
        cierre_usd: null,
        observaciones: session.observaciones || ''
      };
      updatedSessions.unshift(newSession); // New session at the top
      localStorage.setItem('copias_bellavista_cash_sessions', JSON.stringify(updatedSessions));
      return newSession;
    } catch (e) {
      console.error("Error creating cash session:", e);
      throw e;
    }
  },

  async updateCashSession(id: string, updates: any): Promise<any> {
    try {
      const sessions = await this.getCashSessions();
      const updatedSessions = sessions.map(s => {
        if (s.id === id) {
          return { ...s, ...updates };
        }
        return s;
      });
      localStorage.setItem('copias_bellavista_cash_sessions', JSON.stringify(updatedSessions));
      return updatedSessions.find(s => s.id === id);
    } catch (e) {
      console.error("Error updating cash session:", e);
      throw e;
    }
  },

  async getActiveCashSession(): Promise<any | null> {
    const sessions = await this.getCashSessions();
    return sessions.find(s => s.estado === 'abierta') || null;
  },

  async getCashOps(): Promise<any[]> {
    try {
      const saved = localStorage.getItem('copias_bellavista_cash_ops');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error reading cash operations:", e);
    }
    // Seed default operations corresponding to the open seed session
    const defaultOps = [
      { id: "1", type: "ingreso", concept: "Apertura de Caja - Fondo Inicial", amount: 0.22, amount_bs: 10.00, time: "12:26 a. m.", session_id: "seed-session-1", created_at: "2026-07-20T00:26:48.000Z" }
    ];
    localStorage.setItem('copias_bellavista_cash_ops', JSON.stringify(defaultOps));
    return defaultOps;
  },

  async addCashOp(op: any): Promise<any> {
    try {
      const ops = await this.getCashOps();
      const activeSession = await this.getActiveCashSession();
      const newOp = {
        id: String(ops.length + 1),
        type: op.type, // 'ingreso' | 'egreso'
        concept: op.concept,
        amount: op.amount || 0, // in USD
        amount_bs: op.amount_bs || 0, // in Bs
        time: op.time || new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true }),
        session_id: activeSession ? activeSession.id : null,
        created_at: new Date().toISOString()
      };
      ops.push(newOp);
      localStorage.setItem('copias_bellavista_cash_ops', JSON.stringify(ops));
      return newOp;
    } catch (e) {
      console.error("Error adding cash operation:", e);
      throw e;
    }
  },

  async syncClientFromOrder(customerName: string, phoneNumber: string, email: string = ''): Promise<any> {
    try {
      const cleanName = (customerName || '').trim();
      const cleanPhone = (phoneNumber || '').trim();
      const cleanEmail = (email || '').trim();
      if (!cleanName || cleanName === 'Consumidor final') return null;

      // Fetch all clients (from both Supabase and localStorage) to find matches
      const allClients = await this.getClients();
      
      // Look for match by exact/similar name or phone
      const existing = allClients.find(c => 
        (c.name && c.name.toLowerCase().includes(cleanName.toLowerCase())) || 
        (c.phone && c.phone === cleanPhone)
      );

      if (existing) {
        // Update client phone/email if changed
        let currentPhone = existing.phone || '';
        let currentEmail = existing.email || '';
        
        const finalEmail = cleanEmail || currentEmail;
        const finalPhone = cleanPhone || currentPhone;
        
        if (currentPhone !== finalPhone || currentEmail !== finalEmail) {
          await this.updateClient(existing.id, {
            phone: finalPhone,
            email: finalEmail
          });
        }
        return existing;
      }

      // Create new client
      const randomDocNum = Math.floor(Math.random() * 25000000) + 5000000;
      const nextCode = `CLI-${1001 + allClients.length}`;

      const newClient = {
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        document: `V-${randomDocNum}`,
        type: 'Natural',
        credit_usd: 0,
        code: nextCode
      };

      return await this.createClient(newClient);
    } catch (e) {
      console.error('Error in syncClientFromOrder:', e);
      return null;
    }
  },

  // --- PROVIDER OPERATIONS ---
  async getProviders(): Promise<Provider[]> {
    let apiProviders: Provider[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('providers')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          apiProviders = data as Provider[];
        }
      } catch (e) {
        console.warn('Error fetching providers from Supabase:', e);
      }
    }

    // Load from localStorage
    let localProviders: Provider[] = [];
    try {
      const saved = localStorage.getItem('copias_bellavista_local_providers');
      if (saved) {
        localProviders = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading local providers:', e);
    }

    // Merge lists
    const mergedMap = new Map<string, Provider>();
    localProviders.forEach(p => {
      mergedMap.set(p.id || p.rif || p.code, p);
    });
    apiProviders.forEach(p => {
      mergedMap.set(p.id || p.rif || p.code, p);
    });

    return Array.from(mergedMap.values()).sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  },

  async createProvider(provider: Omit<Provider, 'id'> & { id?: string }): Promise<Provider> {
    // Generate sequential code
    let calculatedCode = provider.code;
    if (!calculatedCode) {
      try {
        const allProviders = await this.getProviders();
        calculatedCode = `PROV-${1001 + allProviders.length}`;
      } catch (e) {
        calculatedCode = `PROV-${Math.floor(Math.random() * 9000) + 1000}`;
      }
    }

    const newProvider: Provider = {
      id: provider.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `local-${Math.floor(Math.random() * 1000000)}`),
      code: calculatedCode,
      rif: provider.rif,
      name: provider.name,
      type: provider.type || 'Jurídico',
      phone: provider.phone,
      bank_name: provider.bank_name || '',
      created_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('providers').insert([newProvider]).select();
        if (!error && data && data[0]) {
          return data[0] as Provider;
        } else {
          console.warn("Supabase insert provider failed (RLS/schema). Using local fallback:", error);
        }
      } catch (e) {
        console.warn("Supabase insert provider error. Using local fallback:", e);
      }
    }

    try {
      const saved = localStorage.getItem('copias_bellavista_local_providers');
      const localProviders = saved ? JSON.parse(saved) : [];
      localProviders.push(newProvider);
      localStorage.setItem('copias_bellavista_local_providers', JSON.stringify(localProviders));
    } catch (e) {
      console.error("Failed to save provider to localStorage:", e);
    }

    return newProvider;
  },

  async updateProvider(id: string, updates: Partial<Provider>): Promise<Provider | null> {
    if (supabase && id && !String(id).startsWith('local-')) {
      try {
        const { data, error } = await supabase
          .from('providers')
          .update(updates)
          .eq('id', id)
          .select();
        if (!error && data && data[0]) {
          return data[0] as Provider;
        }
      } catch (e) {
        console.warn("Supabase update provider error. Updating local copy instead:", e);
      }
    }

    try {
      const saved = localStorage.getItem('copias_bellavista_local_providers');
      if (saved) {
        let localProviders = JSON.parse(saved);
        localProviders = localProviders.map((p: any) => {
          if (p.id === id) {
            return { ...p, ...updates };
          }
          return p;
        });
        localStorage.setItem('copias_bellavista_local_providers', JSON.stringify(localProviders));
        return localProviders.find((p: any) => p.id === id) || null;
      }
    } catch (e) {
      console.error("Failed to update provider in localStorage:", e);
    }
    return null;
  },

  async deleteProvider(id: string): Promise<boolean> {
    if (supabase && id && !String(id).startsWith('local-')) {
      try {
        const { error } = await supabase.from('providers').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.warn("Supabase delete provider failed. Deleting from local copy:", e);
      }
    }

    try {
      const saved = localStorage.getItem('copias_bellavista_local_providers');
      if (saved) {
        let localProviders = JSON.parse(saved);
        localProviders = localProviders.filter((p: any) => p.id !== id);
        localStorage.setItem('copias_bellavista_local_providers', JSON.stringify(localProviders));
      }
    } catch (e) {
      console.error("Failed to delete provider from localStorage:", e);
    }
    return true;
  }
};
