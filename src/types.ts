/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  created_at?: string;
}

export interface Brand {
  id: string;
  name: string;
  logo_url: string;
  created_at?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  offer_price: number | null;
  stock: number;
  category_id: string;
  brand_id: string;
  featured: boolean;
  active: boolean;
  technical_sheet_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'vendedor' | 'cliente';
}

export interface SystemSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  useSupabase: boolean;
}
