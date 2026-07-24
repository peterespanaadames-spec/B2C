/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Product, ProductImage, Category } from '../types';

interface BannerProps {
  onSelectCategoryByName: (keyword: string) => void;
  setOnlyOffers: (val: boolean) => void;
  products: Product[];
  productImages: ProductImage[];
  categories: Category[];
  onViewProduct: (product: Product) => void;
}

export default function Banner() {
  return (
    <div className="relative w-full select-none -mb-40 md:-mb-64">
      {/* 1500x600 Hero Image with gradient overlay fading into #EAEDED */}
      <div className="relative w-full max-w-[1500px] mx-auto aspect-[2.5/1]">
        <img 
          src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=1500&h=600" 
          alt="Promoción Especial" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#EAEDED]"></div>
      </div>
    </div>
  );
}
