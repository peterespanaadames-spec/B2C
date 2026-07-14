/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Save, Database, ShieldCheck, Terminal, Copy, Check } from 'lucide-react';
import { dbService, currentSettings } from '../lib/supabase.ts';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [supabaseUrl, setSupabaseUrl] = useState(currentSettings.supabaseUrl);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(currentSettings.supabaseAnonKey);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    dbService.saveSettings({
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      useSupabase: true
    });
  };

  const sqlQuery = `-- SQL PARA CREAR LAS TABLAS EN TU PROYECTO DE SUPABASE
-- Ejecuta este script en el editor SQL (SQL Editor) de tu consola de Supabase

-- 1. Tabla de Categorías
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  image_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Tabla de Marcas
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Tabla de Productos
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0.00,
  offer_price numeric(10,2),
  stock integer NOT NULL DEFAULT 0,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
  featured boolean DEFAULT false,
  active boolean DEFAULT true,
  technical_sheet_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Tabla de Imágenes Adicionales
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer DEFAULT 0
);

-- Habilitar RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir acceso completo (SELECT, INSERT, UPDATE, DELETE) a usuarios públicos/anon
CREATE POLICY "Acceso total para categorías" ON categories FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total para marcas" ON brands FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total para productos" ON products FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total para imágenes" ON product_images FOR ALL TO public USING (true) WITH CHECK (true);
`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlQuery).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs select-none overflow-y-auto">
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left"
        id="settings-modal"
      >
        {/* Header */}
        <div className="bg-[#131921] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#FF9900]" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Conectar Base de Datos Supabase</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <p className="text-xs text-gray-600 leading-relaxed">
            Introduce tus credenciales de Supabase a continuación.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Supabase URL */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wide mb-1">
                Supabase URL (NEXT_PUBLIC_SUPABASE_URL)
              </label>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs focus:ring-2 focus:ring-[#FF9900] focus:outline-none"
                id="input-supabase-url"
              />
            </div>

            {/* Supabase Anon Key */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wide mb-1">
                Supabase Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
              </label>
              <input
                type="text"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-[#FF9900] focus:outline-none"
                id="input-supabase-key"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#131921] font-black text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Save className="w-4 h-4" />
              Guardar Configuración y Reiniciar
            </button>
          </form>

          {/* DDL SQL block */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-[#131921] uppercase tracking-wide flex items-center gap-1">
                <Terminal className="w-4 h-4 text-[#FF9900]" />
                Script de Inicialización SQL
              </span>
              <button
                onClick={copySqlToClipboard}
                className="px-2.5 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1 cursor-pointer font-bold"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                    Copiar SQL
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">
              Para usar tu propia base de datos, copia este script SQL y ejecútalo en la pestaña "SQL Editor" de tu cuenta de Supabase. Esto creará automáticamente las tablas y configurará la seguridad a nivel de fila (RLS).
            </p>
            <pre className="bg-gray-900 text-green-400 text-[10px] font-mono p-3 rounded-lg max-h-[160px] overflow-y-auto leading-relaxed border border-gray-800">
              {sqlQuery}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
