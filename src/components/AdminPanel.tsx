/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import POSModule from './POSModule';
import { 
  BarChart, Package, Tag, Layers, ToggleLeft, ToggleRight, 
  Plus, Edit3, Trash2, Check, AlertTriangle, Printer, Star, Search, Image as ImageIcon, FileText, X, Upload, Download,
  ClipboardList, RefreshCw, Eye, Coins, Truck, Store, Calendar, HelpCircle, Clock, Timer,
  LayoutDashboard, ShieldCheck, Settings, Activity, ArrowRight, Sparkles, TrendingUp, Users,
  Lock, Unlock, LogOut, Megaphone, ShoppingCart } from 'lucide-react';
import { Product, Category, Brand, ProductImage, Order, Provider } from '../types.ts';
import { dbService } from '../lib/supabase.ts';
import * as XLSX from 'xlsx';
import { CurrencyCode, CURRENCIES } from '../lib/currency';

const OrderTimer = ({ createdAt, status, currentTime }: { createdAt: string | undefined, status: string, currentTime: number }) => {
  const createdDate = createdAt ? new Date(createdAt) : new Date();
  const elapsedMs = currentTime - createdDate.getTime();
  const elapsedMins = Math.floor(Math.max(0, elapsedMs) / 60000);
  const elapsedSecs = Math.floor((Math.max(0, elapsedMs) % 60000) / 1000);
  
  const isOverdue = elapsedMins >= 45 && status.toLowerCase() !== 'entregado' && status.toLowerCase() !== 'cancelado';
  
  const timeString = `${String(elapsedMins).padStart(2, '0')}:${String(elapsedSecs).padStart(2, '0')} min`;
  const orderDateStr = createdDate.toLocaleString('es-VE', { 
    year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  }).replace(',', '');

  return (
    <div className="flex flex-col gap-1">
      <div className={`font-bold flex items-center gap-1 text-[12px] ${isOverdue ? 'text-red-500' : 'text-emerald-600'}`}>
        <Timer className="w-4 h-4" />
        {status.toLowerCase() === 'entregado' || status.toLowerCase() === 'cancelado' ? 'Finalizado' : timeString}
      </div>
      <div className="flex items-center gap-1 text-gray-500 text-[11px] font-mono font-medium">
        <Calendar className="w-3.5 h-3.5" />
        {orderDateStr}
      </div>
    </div>
  );
};

interface AdminPanelProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  productImages: ProductImage[];
  onRefreshData: () => void;
  activeRole: 'admin' | 'vendedor' | 'cliente';
  initialTab?: 'products' | 'categories' | 'brands' | 'orders';
  onTabChange?: (tab: 'products' | 'categories' | 'brands' | 'orders') => void;
  initialMenu?: 'orders' | 'products' | 'sales' | 'audit' | 'settings' | 'caja' | 'clientes' | 'marketing' | 'proveedores' | 'compras' | 'reportes';
  activeCurrency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  currencyRates: Record<CurrencyCode, number>;
  onUpdateCurrencyRate: (code: string, rate: number) => Promise<void>;
}

export default function AdminPanel({
  products,
  categories,
  brands,
  productImages,
  onRefreshData,
  activeRole,
  initialTab,
  onTabChange,
  initialMenu,
  activeCurrency,
  onCurrencyChange,
  currencyRates,
  onUpdateCurrencyRate
}: AdminPanelProps) {
  const [currentMenu, setCurrentMenu] = useState<'orders' | 'products' | 'sales' | 'audit' | 'settings' | 'caja' | 'clientes' | 'marketing' | 'proveedores' | 'compras' | 'reportes'>(initialMenu || 'orders');
  const [bcvRate, setBcvRate] = useState<number>(721.34);
  const [isEditingBcv, setIsEditingBcv] = useState<boolean>(false);
  const [bcvInputValue, setBcvInputValue] = useState<string>("721.34");
  const [eurInputValue, setEurInputValue] = useState<string>("0.92");
  const [copInputValue, setCopInputValue] = useState<string>("4000");
  const [bcvRatesHistory, setBcvRatesHistory] = useState<any[]>([]);

  useEffect(() => {
    if (currencyRates) {
      setEurInputValue(currencyRates.EUR.toString());
      setCopInputValue(currencyRates.COP.toString());
      if (currencyRates.VES) {
        setBcvInputValue(currencyRates.VES.toString());
        setBcvRate(currencyRates.VES);
      }
    }
  }, [currencyRates]);

  const fetchBcvRate = async () => {
    try {
      const latest = await dbService.getLatestBcvRate();
      if (latest && latest.rate !== undefined && latest.rate !== null) {
        setBcvRate(latest.rate);
        setBcvInputValue(latest.rate.toString());
      }
      const history = await dbService.getBcvRatesHistory();
      setBcvRatesHistory(history);
    } catch (err) {
      console.error("Error loading BCV rate:", err);
    }
  };

  const handleSaveBcvRate = async (rate: number) => {
    try {
      await dbService.updateBcvRate(rate, 'Pedro (Admin)');
      setBcvRate(rate);
      setBcvInputValue(rate.toString());
      const history = await dbService.getBcvRatesHistory();
      setBcvRatesHistory(history);
    } catch (err: any) {
      console.error("Error updating BCV rate:", err);
      alert("Error al guardar la tasa: " + err.message);
    }
  };

  // --- Interactive administrative modules states ---
  // POS States
  const [posProductId, setPosProductId] = useState<string>('');
  const [posQty, setPosQty] = useState<number>(1);
  const [posClientName, setPosClientName] = useState<string>('');
  const [posClientPhone, setPosClientPhone] = useState<string>('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<string>('Pago Móvil');
  const [posSales, setPosSales] = useState<any[]>([
    { id: 'FAC-2026-001', clientName: 'María Ramírez', totalUSD: 15.50, paymentMethod: 'Pago Móvil', date: 'Hace 2 horas', itemsCount: 3 },
    { id: 'FAC-2026-002', clientName: 'Juan Pérez', totalUSD: 45.00, paymentMethod: 'Zelle', date: 'Hace 4 horas', itemsCount: 1 }
  ]);
  const [posSuccessMsg, setPosSuccessMsg] = useState<string | null>(null);

  // Cash / Caja States
  const [cashOps, setCashOps] = useState<any[]>([]);
  const [cashSessions, setCashSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any | null>(null);

  const [showOpenCajaModal, setShowOpenCajaModal] = useState<boolean>(false);
  const [showCloseCajaModal, setShowCloseCajaModal] = useState<boolean>(false);
  const [openCajaAmountBs, setOpenCajaAmountBs] = useState<string>('10.00');
  const [closeCajaAmountBs, setCloseCajaAmountBs] = useState<string>('');
  const [cajaObservaciones, setCajaObservaciones] = useState<string>('');

  const [newOpConcept, setNewOpConcept] = useState<string>('');
  const [newOpAmount, setNewOpAmount] = useState<string>('');
  const [newOpType, setNewOpType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [cajaSuccessMsg, setCajaSuccessMsg] = useState<string | null>(null);

  const fetchCajaData = async () => {
    try {
      const sessions = await dbService.getCashSessions();
      const ops = await dbService.getCashOps();
      const active = await dbService.getActiveCashSession();
      setCashSessions(sessions);
      setCashOps(ops);
      setActiveSession(active);
    } catch (e) {
      console.error("Error fetching Caja data:", e);
    }
  };

  // Configuration States
  const [configStoreName, setConfigStoreName] = useState<string>('Papelería & Suministros Bella Vista, C.A.');
  const [configRif, setConfigRif] = useState<string>('J-50987654-3');
  const [configIva, setConfigIva] = useState<number>(16);
  const [configPhone, setConfigPhone] = useState<string>('+58 412-5551234');
  const [configSaved, setConfigSaved] = useState<boolean>(false);

  // Global Delivery & Payment methods disable configuration states
  const [disableDeliveryB2C, setDisableDeliveryB2C] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('copias_bellavista_disabled_settings');
      if (saved) return JSON.parse(saved).delivery_b2c === true;
    } catch (e) {}
    return false;
  });

  const [disableDeliveryRetiro, setDisableDeliveryRetiro] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('copias_bellavista_disabled_settings');
      if (saved) return JSON.parse(saved).delivery_retiro === true;
    } catch (e) {}
    return false;
  });

  const [disablePayPagomovil, setDisablePayPagomovil] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('copias_bellavista_disabled_settings');
      if (saved) return JSON.parse(saved).pay_pagomovil === true;
    } catch (e) {}
    return false;
  });

  const [disablePayEfectivo, setDisablePayEfectivo] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('copias_bellavista_disabled_settings');
      if (saved) return JSON.parse(saved).pay_efectivo === true;
    } catch (e) {}
    return false;
  });

  const [disablePayTransferencia, setDisablePayTransferencia] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('copias_bellavista_disabled_settings');
      if (saved) return JSON.parse(saved).pay_transferencia === true;
    } catch (e) {}
    return false;
  });

  const [disablePayPunto, setDisablePayPunto] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('copias_bellavista_disabled_settings');
      if (saved) return JSON.parse(saved).pay_punto === true;
    } catch (e) {}
    return false;
  });

  const [disablePayOtras, setDisablePayOtras] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('copias_bellavista_disabled_settings');
      if (saved) return JSON.parse(saved).pay_otras === true;
    } catch (e) {}
    return false;
  });

  const [chartView, setChartView] = useState<'days' | 'months'>('days');
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'brands' | 'orders'>(initialTab || 'products');
  const [settingsTab, setSettingsTab] = useState<'business' | 'bcv' | 'roles'>('business');

  useEffect(() => {
    if (initialMenu) {
        setCurrentMenu(initialMenu);
    } else if (initialTab) {
      setActiveTab(initialTab);
      if (initialTab === 'orders') {
        setCurrentMenu('orders');
      } else {
        setCurrentMenu('products');
      }
    }
  }, [initialTab, initialMenu]);

  useEffect(() => {
    fetchOrders();
    fetchBcvRate();
    fetchCajaData();
  }, []);

  const handleTabClick = (tab: 'products' | 'categories' | 'brands' | 'orders') => {
    setActiveTab(tab);
    setSearchQuery('');
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [waTemplate, setWaTemplate] = useState<'default' | 'availability' | 'validation' | 'issue'>('default');
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // --- Clientes con Identificación Venezolana State ---
  const [dbClients, setDbClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState<boolean>(false);
  const [clientSearch, setClientSearch] = useState<string>('');
  const [showClientModal, setShowClientModal] = useState<boolean>(false);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<any | null>(null);

  const filteredDbClients = dbClients.filter(c => {
    const q = clientSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.code || '').toLowerCase().includes(q) ||
      (c.document || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  });

  // Client modal form state
  const [clientFormName, setClientFormName] = useState<string>('');
  const [clientFormDocument, setClientFormDocument] = useState<string>('');
  const [clientFormType, setClientFormType] = useState<string>('Natural');
  const [clientFormPhone, setClientFormPhone] = useState<string>('');
  const [clientFormEmail, setClientFormEmail] = useState<string>('');
  const [clientFormCredit, setClientFormCredit] = useState<number>(0);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const data = await dbService.getClients();
      setDbClients(data);
    } catch (e) {
      console.error("Error loading clients:", e);
    } finally {
      setLoadingClients(false);
    }
  };

  // --- Providers State ---
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState<boolean>(false);
  const [providerSearch, setProviderSearch] = useState<string>('');
  const [showProviderModal, setShowProviderModal] = useState<boolean>(false);
  const [selectedProviderForEdit, setSelectedProviderForEdit] = useState<Provider | null>(null);

  // Form State
  const [providerFormCode, setProviderFormCode] = useState<string>('');
  const [providerFormName, setProviderFormName] = useState<string>('');
  const [providerFormRif, setProviderFormRif] = useState<string>('');
  const [providerFormType, setProviderFormType] = useState<string>('Jurídico');
  const [providerFormPhone, setProviderFormPhone] = useState<string>('');
  const [providerFormBankName, setProviderFormBankName] = useState<string>('');

  const filteredProviders = providers.filter(p => {
    const q = providerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.rif || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q) ||
      (p.bank_name || '').toLowerCase().includes(q)
    );
  });

  const fetchProviders = async () => {
    setLoadingProviders(true);
    try {
      const data = await dbService.getProviders();
      setProviders(data);
    } catch (e) {
      console.error("Error loading providers:", e);
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const generatedCode = providerFormCode.trim() || `PROV-${Math.floor(100 + Math.random() * 900)}`;
      const providerData = {
        code: generatedCode,
        name: providerFormName.trim(),
        rif: providerFormRif.trim(),
        type: providerFormType,
        phone: providerFormPhone.trim(),
        bank_name: providerFormBankName.trim()
      };

      if (selectedProviderForEdit) {
        await dbService.updateProvider(selectedProviderForEdit.id, providerData);
      } else {
        await dbService.createProvider(providerData);
      }

      setShowProviderModal(false);
      setSelectedProviderForEdit(null);
      fetchProviders();
    } catch (err: any) {
      console.error("Error saving provider:", err);
      alert("Error al guardar proveedor: " + err.message);
    }
  };

  const handleDeleteProvider = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro de eliminar al proveedor "${name}"?`)) return;
    try {
      await dbService.deleteProvider(id);
      fetchProviders();
    } catch (err: any) {
      console.error("Error deleting provider:", err);
      alert("Error al eliminar proveedor: " + err.message);
    }
  };

  const openAddProviderModal = () => {
    setSelectedProviderForEdit(null);
    setProviderFormCode(`PROV-${Math.floor(100 + Math.random() * 900)}`);
    setProviderFormName('');
    setProviderFormRif('');
    setProviderFormType('Jurídico');
    setProviderFormPhone('');
    setProviderFormBankName('');
    setShowProviderModal(true);
  };

  const openEditProviderModal = (provider: Provider) => {
    setSelectedProviderForEdit(provider);
    setProviderFormCode(provider.code || '');
    setProviderFormName(provider.name);
    setProviderFormRif(provider.rif);
    setProviderFormType(provider.type || 'Jurídico');
    setProviderFormPhone(provider.phone || '');
    setProviderFormBankName(provider.bank_name || '');
    setShowProviderModal(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const clientData = {
        name: clientFormName.trim(),
        document: clientFormDocument.trim(),
        type: clientFormType,
        phone: clientFormPhone.trim(),
        email: clientFormEmail.trim(),
        credit_usd: Number(clientFormCredit) || 0
      };

      if (selectedClientForEdit) {
        await dbService.updateClient(selectedClientForEdit.id, clientData);
      } else {
        await dbService.createClient(clientData);
      }

      setShowClientModal(false);
      setSelectedClientForEdit(null);
      fetchClients();
    } catch (err: any) {
      console.error("Error saving client:", err);
      alert("Error al guardar cliente: " + err.message);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro de eliminar al cliente "${name}"?`)) return;
    try {
      await dbService.deleteClient(id);
      fetchClients();
    } catch (err: any) {
      console.error("Error deleting client:", err);
      alert("Error al eliminar cliente: " + err.message);
    }
  };

  const openEditClientModal = (client: any) => {
    setSelectedClientForEdit(client);
    setClientFormName(client.name);
    setClientFormDocument(client.document);
    setClientFormType(client.type || 'Natural');
    setClientFormPhone(client.phone || '');
    setClientFormEmail(client.email || '');
    setClientFormCredit(client.credit_usd || 0);
    setShowClientModal(true);
  };

  const openAddClientModal = () => {
    setSelectedClientForEdit(null);
    setClientFormName('');
    setClientFormDocument('');
    setClientFormType('Natural');
    setClientFormPhone('');
    setClientFormEmail('');
    setClientFormCredit(0);
    setShowClientModal(true);
  };

  useEffect(() => {
    if (currentMenu === 'clientes') {
      fetchClients();
    }
    if (currentMenu === 'proveedores') {
      fetchProviders();
    }
  }, [currentMenu]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      setWaTemplate('default');
    }
  }, [selectedOrder]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      const data = await dbService.getOrders();
      setOrders(data);
    } catch (e: any) {
      console.error("Error loading orders inside AdminPanel:", e);
      setOrdersError(e.message || "No se pudieron cargar los pedidos de la base de datos.");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  // Pending changes for Status and Payment Status
  const [pendingChanges, setPendingChanges] = useState<Record<string, { status?: string; payment_status?: string }>>({});

  const handlePendingChange = (orderId: string, field: 'status' | 'payment_status', value: string) => {
    if (field === 'status') {
      const newStatus = value.toLowerCase();
      const currentPaymentStatus = (
        pendingChanges[orderId]?.payment_status ?? 
        (orders.find(o => o.id === orderId)?.payment_status || 'pendiente')
      ).toLowerCase();
      
      if (currentPaymentStatus === 'pendiente' && ['listo para retirar', 'en camino', 'entregado'].includes(newStatus)) {
        alert("🚨 ¡RESTRICCIÓN DE CONTROL DE PAGOS!\n\nNo se puede cambiar el estado de entrega a '" + value.toUpperCase() + "' si el estado de pago del pedido es 'PENDIENTE'.\n\nEl cliente debe registrar o confirmar su pago antes de proceder con el despacho o entrega. (Nota: Sí está permitido CANCELAR el pedido).");
        return;
      }
    }

    if (field === 'payment_status') {
      const newPaymentStatus = value.toLowerCase();
      const currentStatus = (
        pendingChanges[orderId]?.status ?? 
        (orders.find(o => o.id === orderId)?.status || 'recibido')
      ).toLowerCase();

      if (newPaymentStatus === 'pendiente' && ['listo para retirar', 'en camino', 'entregado'].includes(currentStatus)) {
        alert("🚨 ¡CONTRADICCIÓN DE ESTADO DE PAGO!\n\nNo se puede revertir el estado de pago a 'PENDIENTE' para un pedido que ya se encuentra en estado '" + currentStatus.toUpperCase() + "'. Un pedido en esta fase logística debe tener su pago asentado y verificado.");
        return;
      }
    }

    setPendingChanges(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value
      }
    }));
  };

  const handleConfirmOrderChanges = async (orderId: string) => {
    const changes = pendingChanges[orderId];
    if (!changes) return;

    const orderObj = orders.find(o => o.id === orderId);

    setUpdatingOrderId(orderId);
    try {
      const updates: any = {};
      if (changes.status !== undefined) updates.status = changes.status;
      if (changes.payment_status !== undefined) updates.payment_status = changes.payment_status;

      const oldStatus = (orderObj?.status || '').toLowerCase();
      const newStatus = (changes.status || '').toLowerCase();

      // If status transitions to 'entregado', subtract from inventory and register income in Cash register (Caja)
      if (changes.status !== undefined && newStatus === 'entregado' && oldStatus !== 'entregado' && orderObj && Array.isArray(orderObj.items)) {
        for (const item of orderObj.items) {
          const prod = products.find(p => p.id === item.product_id);
          if (prod) {
            const currentStock = prod.stock;
            const newStock = Math.max(0, currentStock - Number(item.quantity || 0));
            await dbService.updateProduct(prod.id, { stock: newStock });
          }
        }
        if (onRefreshData) {
          onRefreshData();
        }

        // Register income in cash register (Caja)
        try {
          const amountBs = (orderObj.total_price || 0) * bcvRate;
          await dbService.addCashOp({
            type: 'ingreso',
            concept: `Venta Online - Pedido #${String(orderObj.order_number || '').padStart(6, '0')} (${orderObj.customer_name})`,
            amount: orderObj.total_price || 0,
            amount_bs: amountBs
          });
          await fetchCajaData();
        } catch (cajaErr) {
          console.error("Failed to register online order income in cash register:", cajaErr);
        }
      }

      // If status transitions FROM 'entregado' to something else, restore to inventory
      if (changes.status !== undefined && oldStatus === 'entregado' && newStatus !== 'entregado' && orderObj && Array.isArray(orderObj.items)) {
        for (const item of orderObj.items) {
          const prod = products.find(p => p.id === item.product_id);
          if (prod) {
            const currentStock = prod.stock;
            const newStock = currentStock + Number(item.quantity || 0);
            await dbService.updateProduct(prod.id, { stock: newStock });
          }
        }
        if (onRefreshData) {
          onRefreshData();
        }
      }

      await dbService.updateOrder(orderId, updates);
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
      
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, ...updates } : null);
      }

      // Clear pending changes for this order
      setPendingChanges(prev => {
        const copy = { ...prev };
        delete copy[orderId];
        return copy;
      });

      alert("¡Estados confirmados y guardados en la base de datos exitosamente!");

      // Enviar notificación por WhatsApp si el pedido existe
      if (orderObj) {
        const statusChanged = changes.status !== undefined && changes.status.toLowerCase() !== (orderObj.status || '').toLowerCase();
        const paymentStatusChanged = changes.payment_status !== undefined && changes.payment_status.toLowerCase() !== (orderObj.payment_status || '').toLowerCase();

        if (statusChanged || paymentStatusChanged) {
          const formatStatusSpanish = (s?: string | null): string => {
            if (!s) return 'Pendiente';
            const val = s.toLowerCase().trim();
            if (val === 'pendiente' || val === 'recibido') return 'Recibido / Pendiente ⏳';
            if (val === 'preparacion' || val === 'en preparacion' || val === 'preparando') return 'En Preparación 🛠️';
            if (val === 'listo' || val === 'listo para retirar' || val === 'listo para retirar en tienda') return 'Listo para retirar en tienda 📦';
            if (val === 'en_camino' || val === 'en camino') return 'En camino a tu dirección 🛵';
            if (val === 'entregado') return 'Entregado con éxito ✅';
            if (val === 'cancelado') return 'Cancelado / Anulado ❌';
            return s;
          };

          const formatPaymentSpanish = (p?: string | null): string => {
            if (!p) return 'Pendiente ⏳';
            const val = p.toLowerCase().trim();
            if (val === 'pendiente') return 'Pendiente ⏳';
            if (val === 'pagado') return 'Pagado / Verificado 🟢';
            if (val === 'reembolsado') return 'Reembolsado 🔄';
            return p;
          };

          const orderNumberStr = String(orderObj.order_number || '').padStart(6, '0');
          const cleanPhone = orderObj.phone_number.replace(/\D/g, '');

          let text = `*Copias Bella Vista Barinitas 🖨️✨*\n`;
          text += `¡Hola, *${orderObj.customer_name}*! Te saludamos para informarte sobre la actualización en tiempo real de tu pedido *#${orderNumberStr}*:\n\n`;

          if (statusChanged) {
            text += `📦 *Estado de la Entrega:* ~${formatStatusSpanish(orderObj.status)}~ ➡️ *${formatStatusSpanish(changes.status)}*\n`;
          } else {
            text += `📦 *Estado de la Entrega:* *${formatStatusSpanish(orderObj.status)}*\n`;
          }

          if (paymentStatusChanged) {
            text += `💳 *Estado de Pago:* ~${formatPaymentSpanish(orderObj.payment_status)}~ ➡️ *${formatPaymentSpanish(changes.payment_status)}*\n`;
          } else {
            text += `💳 *Estado de Pago:* *${formatPaymentSpanish(orderObj.payment_status)}*\n`;
          }

          text += `\n💵 *Total del Pedido:* $${Number(orderObj.total_price || 0).toFixed(2)}\n`;
          text += `🛒 *Método de entrega:* ${orderObj.delivery_method === 'retiro' ? 'Retiro en Tienda' : 'Envío a Domicilio'}\n\n`;
          
          // Direct Live Tracking Link
          text += `🔗 *Sigue el estado en vivo de tu pedido aquí:*\n`;
          text += `${window.location.origin}/?pedido=${orderObj.id}\n\n`;
          
          text += `¡Muchas gracias por elegirnos! Si tienes dudas o comentarios adicionales, puedes responder a este chat. 😊`;

          // Ask if they want to send the message
          const confirmWhatsApp = window.confirm(
            `🔔 ¿DESEAS NOTIFICAR AL CLIENTE POR WHATSAPP?\n\nSe ha actualizado el estado de su pedido exitosamente.\n\nCliente: ${orderObj.customer_name}\nTeléfono: ${orderObj.phone_number}\n\nHaz clic en Aceptar para abrir WhatsApp con el mensaje preconfigurado.`
          );

          if (confirmWhatsApp) {
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
            window.open(whatsappUrl, '_blank');
          }
        }
      }
    } catch (e: any) {
      console.error("Error confirming order changes:", e);
      alert(`Error al actualizar la base de datos: ${e.message || e.toString()}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getWhatsAppMessageText = (order: Order, template: 'default' | 'availability' | 'validation' | 'issue') => {
    const orderNumberStr = String(order.order_number || '').padStart(6, '0');
    const totalPriceFormatted = Number(order.total_price || 0).toFixed(2);
    
    if (template === 'default') {
      let paymentDetails = '';
      const pm = (order.payment_method || '').toLowerCase().trim();
      
      if (pm === 'pagomovil') {
        paymentDetails = `📱 *Datos de Pago Móvil:*\n🏦 *Banco:* Banco Banesco\n🆔 *Cédula:* V-12.206.392\n📞 *Teléfono:* 0412-504.38.57\n\nPor favor, realiza tu pago y *envía el capture o comprobante de pago* por esta vía para proceder con la verificación de tu pedido.`;
      } else if (pm === 'transferencia') {
        paymentDetails = `🏦 *Datos de Transferencia Bancaria:*\n🏦 *Banco:* Banco Banesco\n🆔 *Cédula:* V-12.206.392\n📞 *Teléfono:* 0412-504.38.57\n\nPor favor, realiza tu transferencia y *envía el capture o comprobante de pago* por esta vía para proceder con la verificación de tu pedido.`;
      } else if (pm === 'efectivo') {
        const payWith = order.payment_amount_with ? ` (pagas con: US$ ${Number(order.payment_amount_with).toFixed(2)})` : '';
        paymentDetails = `💵 *Pago en Efectivo (USD / Bs):*\nEl método de pago seleccionado es efectivo en tienda${payWith}.\n\nPor favor, *envía un capture, foto o confirma por este medio* la hora estimada en la que pasarás a retirar y pagar tu pedido para tenerlo listo y agilizar tu atención.`;
      } else {
        paymentDetails = `💳 *Datos de Pago (Pago Móvil / Transferencia):*\n🏦 *Banco:* Banco Banesco\n🆔 *Cédula:* V-12.206.392\n📞 *Teléfono:* 0412-504.38.57\n\nPor favor, realiza tu pago por el método que prefieras y *envía el capture o comprobante de pago* por esta vía para proceder con la verificación de tu pedido.`;
      }

      return `*Copias Bella Vista Barinitas 🖨️✨*\n\nHola *${order.customer_name}*, te saludamos cordialmente. Referente a tu pedido *#${orderNumberStr}* por un total de *$${totalPriceFormatted}*:\n\n${paymentDetails}\n\n¡Muchas gracias por elegirnos! 😊`;
    }
    
    if (template === 'availability') {
      return `*Copias Bella Vista Barinitas 🖨️✨*\n\nHola *${order.customer_name}*, te saludamos cordialmente. Nos comunicamos referente a tu pedido *#${orderNumberStr}* para informarte que todos los artículos de tu solicitud se encuentran *totalmente disponibles y listos para procesar*.\n\nQuedamos atentos a tus comentarios para continuar con el pedido. ¡Muchas gracias! 👍`;
    }
    
    if (template === 'validation') {
      return `*Copias Bella Vista Barinitas 🖨️✨*\n\nHola *${order.customer_name}*, te saludamos cordialmente. Te informamos que hemos *verificado con éxito tu pago* para el pedido *#${orderNumberStr}* por un total de *$${totalPriceFormatted}*.\n\nTu pedido ha sido validado correctamente y ya se encuentra en fase de procesamiento. ¡Muchas gracias por tu confianza! 🟢`;
    }
    
    if (template === 'issue') {
      return `*Copias Bella Vista Barinitas 🖨️✨*\n\nHola *${order.customer_name}*, te saludamos cordialmente. Nos comunicamos contigo referente a tu pedido *#${orderNumberStr}* porque se ha presentado un *pequeño inconveniente o duda* con respecto a tu solicitud.\n\nPor favor, respóndenos por esta vía a la brevedad para poder aclarar la situación y continuar procesando tu pedido de la mejor manera. ¡Disculpa las molestias! 🙏`;
    }
    
    return '';
  };

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
  const [catActive, setCatActive] = useState(true);

  // Form states - Brands
  const [brandName, setBrandName] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [brandActive, setBrandActive] = useState(true);

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
      setProdCategoryId(prod.category_id || '');
      setProdBrandId(prod.brand_id || '');
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
    
    // Parse price and offer price with Spanish comma decimal safety
    const parseSpanishFloat = (val: any): number => {
      if (val === undefined || val === null) return 0;
      const str = String(val).trim().replace(',', '.');
      const parsed = parseFloat(str);
      return isNaN(parsed) ? 0 : parsed;
    };

    const parseSpanishFloatOptional = (val: any): number | null => {
      if (val === undefined || val === null) return null;
      const str = String(val).trim();
      if (str === '' || str.toLowerCase() === 'ninguno') return null;
      const cleaned = str.replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    };

    const finalPrice = parseSpanishFloat(prodPrice);
    const offerPriceNum = parseSpanishFloatOptional(prodOfferPrice);
    const slug = prodName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const payload = {
      sku: prodSku.trim(),
      name: prodName.trim(),
      slug: slug,
      description: prodDescription.trim(),
      price: finalPrice,
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
      alert(editingProduct ? "¡Producto actualizado exitosamente!" : "¡Nuevo producto creado exitosamente!");
    } catch (err: any) {
      console.error("Error saving product", err);
      alert(`Error al guardar el producto: ${err.message || err.toString()}`);
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

  const handleToggleActiveCategory = async (cat: Category) => {
    await dbService.updateCategory(cat.id, { active: !(cat.active ?? true) });
    onRefreshData();
  };

  const handleToggleActiveBrand = async (brand: Brand) => {
    await dbService.updateBrand(brand.id, { active: !(brand.active ?? true) });
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
      setCatActive(cat.active ?? true);
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatSlug('');
      setCatImageUrl('');
      setCatActive(true);
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
      image_url: catImageUrl.trim() || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&q=80&w=400',
      active: catActive
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
      setBrandActive(b.active ?? true);
    } else {
      setEditingBrand(null);
      setBrandName('');
      setBrandLogoUrl('');
      setBrandActive(true);
    }
    setShowBrandModal(true);
  };

  // Handle save Brand
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: brandName.trim(),
      logo_url: brandLogoUrl.trim() || 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?auto=format&fit=crop&q=80&w=200',
      active: brandActive
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

  const filteredOrders = orders.filter(order => {
    const formattedNum = String(order.order_number || '').padStart(7, '0');
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = searchQuery === '' || 
      formattedNum.includes(searchLower) ||
      String(order.order_number || '').includes(searchLower) ||
      order.customer_name.toLowerCase().includes(searchLower) ||
      order.phone_number.includes(searchLower) ||
      (order.address_text && order.address_text.toLowerCase().includes(searchLower));

    const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesPaymentStatus = paymentStatusFilter === 'all' || (order.payment_status || 'pendiente').toLowerCase() === paymentStatusFilter.toLowerCase();
    const matchesDeliveryMethod = deliveryMethodFilter === 'all' || (order.delivery_method || '').toLowerCase() === deliveryMethodFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPaymentStatus && matchesDeliveryMethod;
  });

  const handleExportOrdersExcel = () => {
    try {
      const dataToExport = orders.map(o => ({
        'Número de Pedido': String(o.order_number || '').padStart(7, '0'),
        'Cliente': o.customer_name,
        'Teléfono': o.phone_number,
        'Método de Entrega': o.delivery_method === 'retiro' ? 'Retiro en Tienda' : 'Envío a Domicilio',
        'Dirección': o.address_text || 'N/A',
        'Puntos': o.points || 0,
        'Método de Pago': o.payment_method || 'N/A',
        'Total USD': o.total_price,
        'Estado': o.status.toUpperCase(),
        'Estado de Pago': (o.payment_status || 'pendiente').toUpperCase(),
        'Fecha de Creación': o.created_at ? new Date(o.created_at).toLocaleString() : 'N/A',
        'Comentarios': o.comments || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');
      XLSX.writeFile(workbook, `Copias_Bella_Vista_Pedidos_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error("Error exporting orders to excel:", e);
      alert("No se pudieron exportar los pedidos.");
    }
  };

  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter(o => o.status.toLowerCase() !== 'entregado' && o.status.toLowerCase() !== 'cancelado').length;
  const completedOrdersCount = orders.filter(o => o.status.toLowerCase() === 'entregado').length;
  const totalRevenue = orders
    .filter(o => o.status.toLowerCase() !== 'cancelado')
    .reduce((sum, o) => sum + Number(o.total_price || 0), 0);

  // Dashboard Helpers
  const getSalesByDays = () => {
    const daysData = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
      
      const dayOrders = orders.filter(o => {
        if (o.status.toLowerCase() === 'cancelado') return false;
        if (!o.created_at) return false;
        const oDate = o.created_at.split('T')[0];
        return oDate === dateStr;
      });
      
      const daySum = dayOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
      daysData.push({ label: dayLabel, amount: daySum, count: dayOrders.length });
    }
    return daysData;
  };

  const getSalesByMonths = () => {
    const monthsData = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const currentYear = now.getFullYear();
    
    for (let m = 0; m < 12; m++) {
      const monthOrders = orders.filter(o => {
        if (o.status.toLowerCase() === 'cancelado') return false;
        if (!o.created_at) return false;
        const oDate = new Date(o.created_at);
        return oDate.getFullYear() === currentYear && oDate.getMonth() === m;
      });
      
      const monthSum = monthOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
      monthsData.push({ label: monthNames[m], amount: monthSum, count: monthOrders.length });
    }
    return monthsData;
  };

  const getBestSellers = () => {
    const counts: Record<string, { name: string; sku: string; qty: number; revenue: number }> = {};
    orders.forEach(order => {
      if (order.status.toLowerCase() === 'cancelado') return;
      if (Array.isArray(order.items)) {
        order.items.forEach(item => {
          const key = item.product_id || item.sku || item.name;
          if (!key) return;
          if (!counts[key]) {
            counts[key] = {
              name: item.name || 'Producto sin nombre',
              sku: item.sku || 'N/A',
              qty: 0,
              revenue: 0
            };
          }
          counts[key].qty += Number(item.quantity || 0);
          counts[key].revenue += Number(item.quantity || 0) * Number(item.price || 0);
        });
      }
    });
    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  };

  const getTopCustomers = () => {
    const clients: Record<string, { name: string; phone: string; count: number; totalSpent: number }> = {};
    orders.forEach(order => {
      if (order.status.toLowerCase() === 'cancelado') return;
      const key = order.customer_name.trim().toLowerCase();
      if (!key) return;
      if (!clients[key]) {
        clients[key] = {
          name: order.customer_name,
          phone: order.phone_number,
          count: 0,
          totalSpent: 0
        };
      }
      clients[key].count += 1;
      clients[key].totalSpent += Number(order.total_price || 0);
    });
    return Object.values(clients)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const renderSalesChart = () => {
    const chartData = chartView === 'days' ? getSalesByDays() : getSalesByMonths();
    const maxAmount = Math.max(...chartData.map(d => d.amount), 50);
    
    const width = 500;
    const height = 180;
    const paddingLeft = 40;
    const paddingRight = 10;
    const paddingTop = 15;
    const paddingBottom = 25;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    
    const points = chartData.map((d, index) => {
      const x = paddingLeft + (index / (chartData.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.amount / maxAmount) * chartHeight;
      return { x, y, label: d.label, amount: d.amount, count: d.count };
    });
    
    let linePath = '';
    let areaPath = '';
    
    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
      areaPath = linePath + ` L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
    }
    
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm text-left">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#131921] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Curva de Ventas ({chartView === 'days' ? 'Últimos 7 Días' : 'Desempeño Mensual'})
            </h4>
            <p className="text-[10px] text-gray-400 font-semibold uppercase">Estadísticas en tiempo real de facturación</p>
          </div>
          
          <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button
              onClick={() => setChartView('days')}
              className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all cursor-pointer ${
                chartView === 'days' ? 'bg-[#FF9900] text-[#131921] shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Días
            </button>
            <button
              onClick={() => setChartView('months')}
              className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all cursor-pointer ${
                chartView === 'months' ? 'bg-[#FF9900] text-[#131921] shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Año / Meses
            </button>
          </div>
        </div>
        
        <div className="relative w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#25D366" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#25D366" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = paddingTop + ratio * chartHeight;
              const value = (maxAmount * (1 - ratio)).toFixed(0);
              return (
                <g key={idx} className="opacity-10">
                  <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#000" strokeWidth="1" strokeDasharray="3,3" />
                  <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[8px] font-mono font-bold fill-black">$ {value}</text>
                </g>
              );
            })}
            
            {areaPath && <path d={areaPath} fill="url(#chartGradient)" className="transition-all duration-500" />}
            
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-500"
              />
            )}
            
            {points.map((p, idx) => (
              <g key={idx} className="group cursor-pointer">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#ffffff"
                  stroke="#10B981"
                  strokeWidth="2"
                  className="transition-all hover:r-6 hover:fill-[#10B981]"
                />
                <text
                  x={p.x}
                  y={p.y - 8}
                  textAnchor="middle"
                  className="text-[8px] font-extrabold fill-emerald-800 bg-white opacity-0 group-hover:opacity-100 transition-opacity font-mono pointer-events-none"
                >
                  ${p.amount.toFixed(1)}
                </text>
                <text
                  x={p.x}
                  y={height - 6}
                  textAnchor="middle"
                  className="text-[8px] font-bold text-gray-400 fill-gray-400"
                >
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full select-none text-[#0F1111]">
      {/* Top Header - Admin */}
      <div className="h-[60px] bg-white border border-gray-200 rounded-lg shadow-sm mb-6 px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 bg-[#131921] rounded flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-black text-[#131921] text-sm uppercase tracking-widest hidden md:block">
            Administración
          </h1>
        </div>
        
        {/* Simplified Dashboard Metrics */}
        <div className="hidden lg:flex items-center gap-6 px-4 border-l border-r border-gray-200 h-10">
          {pendingOrdersCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase">
                {pendingOrdersCount} {pendingOrdersCount === 1 ? 'Pedido Pendiente' : 'Pedidos Pendientes'}
              </span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 font-bold uppercase">Facturación (USD)</span>
            <span className="text-sm font-black text-emerald-600">${totalRevenue.toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 font-bold uppercase">Pedidos Activos</span>
            <span className="text-sm font-black text-blue-600">{totalOrdersCount}</span>
          </div>
        </div>

        <div className="flex-1 max-w-sm relative h-[38px] shrink-0">
          {(currentMenu === 'products' || currentMenu === 'orders') && (
            <>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Buscar en la lista actual...`}
                className="w-full h-full pl-10 pr-4 py-1 bg-gray-50 border border-gray-300 rounded focus:ring-2 focus:ring-[#FF9900] focus:border-transparent focus:outline-none font-medium text-sm transition-all shadow-inner"
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            </>
          )}
        </div>
        
        <div className="flex items-center gap-3">
           <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">Rol: {activeRole === 'admin' ? 'Administrador' : 'Vendedor'}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar Navigation */}
        <aside className="w-full lg:w-64 bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-xs shrink-0 flex flex-col justify-between h-fit self-start">
          <div>
            {/* Tasa BCV Widget (from image mockup) */}
            <div className="flex items-center justify-between p-2.5 mb-4 bg-emerald-50/40 border border-emerald-100 rounded-xl">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-[10px] font-bold text-gray-500">Tasa BCV:</span>
              </div>
              {isEditingBcv ? (
                <input
                  type="text"
                  value={bcvInputValue}
                  onChange={(e) => setBcvInputValue(e.target.value)}
                  onBlur={() => {
                    const val = parseFloat(bcvInputValue);
                    if (!isNaN(val) && val > 0) {
                      handleSaveBcvRate(val);
                    }
                    setIsEditingBcv(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseFloat(bcvInputValue);
                      if (!isNaN(val) && val > 0) {
                        handleSaveBcvRate(val);
                      }
                      setIsEditingBcv(false);
                    }
                  }}
                  className="w-20 px-1 py-0.5 text-xs border border-gray-300 rounded font-bold text-right text-gray-800"
                  autoFocus
                />
              ) : (
                <span 
                  onDoubleClick={() => {
                    setBcvInputValue(bcvRate.toString());
                    setIsEditingBcv(true);
                  }}
                  className="text-xs font-black text-[#131921] cursor-pointer hover:bg-gray-100 px-1.5 py-0.5 rounded transition"
                  title="Doble clic para editar tasa"
                >
                  Bs. {bcvRate.toFixed(2)}
                </span>
              )}
            </div>

            {/* Navigation Menu (the 10 items) */}
            <nav className="space-y-1">
              {[
                { id: 'orders', label: 'Pedidos de Cliente', icon: ClipboardList },
                { id: 'sales', label: 'Facturación / POS', icon: BarChart },
                { id: 'products', label: 'Productos', icon: Package },
                { id: 'caja', label: 'Caja y Arqueo', icon: Store },
                { id: 'marketing', label: 'Marketing', icon: Megaphone },
                { id: 'clientes', label: 'Clientes', icon: Users },
                { id: 'proveedores', label: 'Proveedores', icon: Truck },
                { id: 'compras', label: 'Compras', icon: ClipboardList },
                { id: 'reportes', label: 'Reportes', icon: FileText },
                { id: 'settings', label: 'Configuración', icon: Settings }
              ].map((item) => {
                const IconComponent = item.icon;
                const isActive = currentMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentMenu(item.id as any);
                      if (item.id === 'orders') {
                        setActiveTab('orders');
                        fetchOrders();
                      } else if (item.id === 'products') {
                        setActiveTab('products');
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all text-left cursor-pointer ${
                      isActive 
                        ? 'bg-[#005da9] text-white font-extrabold shadow-xs' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom elements from image mockup */}
          <div className="space-y-4 mt-6">
            {/* ESTADO DE CAJA panel */}
            <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 text-left">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black tracking-wider text-[#A16207] uppercase">Estado de Caja</span>
                <div className="flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-tight">Abierta</span>
                </div>
              </div>
              <div className="space-y-0.5 text-[10px] font-semibold text-gray-600">
                <p>Operador: <span className="font-bold text-gray-800">Pedro</span></p>
                <p>Desde: <span className="font-mono text-gray-500">12:47 a.m.</span></p>
              </div>
              <div className="mt-2 p-1.5 bg-white/80 border border-amber-200/80 rounded text-[9px] text-amber-800 font-medium leading-normal flex gap-1">
                <span>⚠️</span>
                <span>La caja tiene más de 24 horas abierta. Debe cerrarla.</span>
              </div>
            </div>

            {/* Operator badge */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-left">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center font-bold text-xs text-[#005da9] border border-gray-200">
                  {activeRole === 'admin' ? 'A' : 'V'}
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-gray-800 leading-tight">Sesión Actual</span>
                  <span className="text-[8px] font-black uppercase tracking-wider text-gray-400">{activeRole === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  className="p-1.5 text-gray-400 hover:text-[#005da9] hover:bg-gray-50 rounded-lg transition cursor-pointer"
                  title="Sincronizar Datos"
                  onClick={() => {
                    onRefreshData();
                    fetchOrders();
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button 
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  title="Cerrar Sesión"
                  onClick={() => {
                    alert("Cerrando sesión...");
                    window.location.reload();
                  }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">

          {/* VIEW: SALES (FACTURACIÓN / POS) */}
          {currentMenu === 'sales' && (
            <POSModule 
              products={products} 
              bcvRate={bcvRate} 
              activeCurrency={activeCurrency} 
              currencyRates={currencyRates} 
              onRefreshData={onRefreshData} 
            />
          )}

          {/* VIEW: CAJA Y ARQUEO */}
          {currentMenu === 'caja' && (
            <div className="space-y-6 text-left">
              {/* Calculations Helpers */}
              {(() => {
                const formatBs = (num: number | null | undefined) => {
                  if (num === null || num === undefined) return '—';
                  return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' Bs.';
                };

                const formatUSD = (num: number | null | undefined) => {
                  if (num === null || num === undefined) return '—';
                  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
                };

                // Filter operations for current session
                const activeSessionOps = activeSession 
                  ? cashOps.filter((op: any) => op.session_id === activeSession.id) 
                  : [];

                const initialFondoBs = activeSession ? activeSession.apertura_bs : 0;
                const initialFondoUsd = activeSession ? activeSession.apertura_usd : 0;

                // Ingresses belonging to active session
                const sessionIngressesOps = activeSessionOps.filter((op: any) => op.type === 'ingreso' && op.concept !== 'Apertura de Caja - Fondo Inicial');
                const sessionIngressesBs = sessionIngressesOps.reduce((acc: number, curr: any) => acc + (curr.amount_bs || (curr.amount * bcvRate)), 0);
                const sessionIngressesUsd = sessionIngressesOps.reduce((acc: number, curr: any) => acc + curr.amount, 0);

                // Egresses belonging to active session
                const sessionEgressesOps = activeSessionOps.filter((op: any) => op.type === 'egreso');
                const sessionEgressesBs = sessionEgressesOps.reduce((acc: number, curr: any) => acc + (curr.amount_bs || (curr.amount * bcvRate)), 0);
                const sessionEgressesUsd = sessionEgressesOps.reduce((acc: number, curr: any) => acc + curr.amount, 0);

                // Expected Net balance
                const esperadoSessionBs = initialFondoBs + sessionIngressesBs - sessionEgressesBs;
                const esperadoSessionUsd = initialFondoUsd + sessionIngressesUsd - sessionEgressesUsd;

                const startSession = async (aperturaBs: number, observaciones: string) => {
                  const openingUsd = aperturaBs / bcvRate;
                  const newSession = await dbService.createCashSession({
                    apertura_bs: aperturaBs,
                    apertura_usd: openingUsd,
                    observaciones: observaciones
                  });
                  
                  // Create starting cash movement
                  await dbService.addCashOp({
                    type: 'ingreso',
                    concept: 'Apertura de Caja - Fondo Inicial',
                    amount: openingUsd,
                    amount_bs: aperturaBs
                  });

                  await fetchCajaData();
                  setShowOpenCajaModal(false);
                  setOpenCajaAmountBs('10.00');
                  setCajaObservaciones('');
                  alert("¡Caja aperturada con éxito!");
                };

                const closeSession = async (cierreBs: number, observaciones: string) => {
                  if (!activeSession) return;
                  
                  const diferenciaBs = cierreBs - esperadoSessionBs;
                  const cierreUsd = cierreBs / bcvRate;
                  const diferenciaUsd = cierreUsd - esperadoSessionUsd;

                  await dbService.updateCashSession(activeSession.id, {
                    cierre: new Date().toLocaleString('es-VE'),
                    cierre_bs: cierreBs,
                    cierre_usd: cierreUsd,
                    esperado_bs: esperadoSessionBs,
                    esperado_usd: esperadoSessionUsd,
                    diferencia_bs: diferenciaBs,
                    diferencia_usd: diferenciaUsd,
                    estado: 'cerrada',
                    observaciones: observaciones
                  });

                  // Add closing movement
                  await dbService.addCashOp({
                    type: 'egreso',
                    concept: `Cierre de Caja - Entrega de Efectivo (Arqueo)`,
                    amount: cierreUsd,
                    amount_bs: cierreBs
                  });

                  await fetchCajaData();
                  setShowCloseCajaModal(false);
                  setCloseCajaAmountBs('');
                  setCajaObservaciones('');
                  alert("¡Caja cerrada y arqueada exitosamente!");
                };

                const handleRegisterManualMovement = async () => {
                  const amountNum = parseFloat(newOpAmount);
                  if (!newOpConcept.trim() || isNaN(amountNum) || amountNum <= 0) {
                    alert('Por favor ingrese un concepto válido y un monto mayor a cero.');
                    return;
                  }
                  
                  if (!activeSession) {
                    alert('Debe aperturar la caja antes de registrar movimientos manuales.');
                    return;
                  }

                  try {
                    const amountBs = amountNum * bcvRate;
                    await dbService.addCashOp({
                      type: newOpType,
                      concept: newOpConcept.trim(),
                      amount: amountNum,
                      amount_bs: amountBs
                    });
                    
                    setCajaSuccessMsg(`¡Movimiento registrado con éxito!`);
                    setNewOpConcept('');
                    setNewOpAmount('');
                    fetchCajaData();
                    setTimeout(() => setCajaSuccessMsg(null), 3000);
                  } catch (e) {
                    console.error("Error saving manual movement:", e);
                    alert("Error al registrar movimiento en base de datos.");
                  }
                };

                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150 pb-4">
                      <div>
                        <h2 className="text-xl font-black text-[#131921] uppercase tracking-tight flex items-center gap-2">
                          <Store className="w-6 h-6 text-amber-600" />
                          <span>Control de Caja y Arqueo</span>
                        </h2>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                          Monitoreo de ingresos y egresos diarios, control de fondo fijo, y verificación de balances en bolívares y dólares.
                        </p>
                      </div>

                      {/* Header Session Action Controls */}
                      <div className="flex items-center gap-3">
                        {activeSession ? (
                          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl">
                            <div className="text-right">
                              <p className="text-[9px] text-emerald-800 font-black uppercase tracking-wider">Caja Abierta</p>
                              <p className="text-[11px] text-emerald-600 font-mono font-bold leading-none mt-0.5">{activeSession.apertura}</p>
                            </div>
                            <button
                              onClick={() => {
                                setCloseCajaAmountBs('');
                                setCajaObservaciones('');
                                setShowCloseCajaModal(true);
                              }}
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Cerrar Caja</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 px-4 py-2 rounded-xl">
                            <div>
                              <p className="text-[9px] text-rose-800 font-black uppercase tracking-wider">Caja Cerrada</p>
                              <p className="text-[10px] text-rose-500 font-semibold leading-none mt-0.5">Debe abrir caja para facturar</p>
                            </div>
                            <button
                              onClick={() => {
                                setOpenCajaAmountBs('10.00');
                                setCajaObservaciones('');
                                setShowOpenCajaModal(true);
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Aperturar Caja</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cash balance metrics widgets */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Fondo de Apertura</p>
                        <p className="text-lg font-black text-emerald-800 mt-1">{formatBs(initialFondoBs)}</p>
                        <p className="text-[10px] text-emerald-600 font-bold mt-0.5">({formatUSD(initialFondoUsd)})</p>
                      </div>
                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Ingresos del Turno</p>
                        <p className="text-lg font-black text-blue-800 mt-1">+{formatBs(sessionIngressesBs)}</p>
                        <p className="text-[10px] text-blue-600 font-bold mt-0.5">(+{formatUSD(sessionIngressesUsd)})</p>
                      </div>
                      <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Egresos del Turno</p>
                        <p className="text-lg font-black text-rose-800 mt-1">-{formatBs(sessionEgressesBs)}</p>
                        <p className="text-[10px] text-rose-600 font-bold mt-0.5">(-{formatUSD(sessionEgressesUsd)})</p>
                      </div>
                      <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Saldo Esperado</p>
                        <p className="text-lg font-black text-amber-800 mt-1">{formatBs(esperadoSessionBs)}</p>
                        <p className="text-[10px] text-amber-600 font-bold mt-0.5">({formatUSD(esperadoSessionUsd)})</p>
                      </div>
                    </div>

                    {/* Manual Cash Movement Form */}
                    <div className="bg-gray-50 border border-gray-150 rounded-2xl p-5 relative overflow-hidden">
                      {!activeSession && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10 p-6 text-center select-none">
                          <div className="max-w-xs space-y-2">
                            <Lock className="w-8 h-8 text-rose-500 mx-auto" />
                            <p className="text-xs font-black uppercase text-gray-800 tracking-tight">Formulario Bloqueado</p>
                            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">Debe aperturar la caja diaria para registrar ingresos o egresos manuales de caja.</p>
                          </div>
                        </div>
                      )}
                      
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800 mb-3">Registrar Movimiento de Caja Manual</h3>
                      
                      {cajaSuccessMsg && (
                        <div className="mb-4 p-3 bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2">
                          <Check className="w-4 h-4 shrink-0" />
                          <span>{cajaSuccessMsg}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Concepto o Descripción</label>
                          <input
                            type="text"
                            placeholder="Ej. Pago de Delivery / Repuestos"
                            value={newOpConcept}
                            onChange={(e) => setNewOpConcept(e.target.value)}
                            disabled={!activeSession}
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-[#005da9] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Monto ($ USD)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Monto USD"
                            value={newOpAmount}
                            onChange={(e) => setNewOpAmount(e.target.value)}
                            disabled={!activeSession}
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-[#005da9] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                          />
                          {newOpAmount && !isNaN(parseFloat(newOpAmount)) && (
                            <span className="text-[9px] text-gray-400 font-bold mt-1 block">
                              Equivale a: <span className="text-gray-600">{(parseFloat(newOpAmount) * bcvRate).toFixed(2)} Bs.</span>
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo de Movimiento</label>
                          <select
                            value={newOpType}
                            onChange={(e) => setNewOpType(e.target.value as any)}
                            disabled={!activeSession}
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-[#005da9] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                          >
                            <option value="ingreso">Ingreso (+)</option>
                            <option value="egreso">Egreso (-)</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={handleRegisterManualMovement}
                          disabled={!activeSession}
                          className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          Registrar Movimiento
                        </button>
                      </div>
                    </div>

                    {/* Cash Movements Table for current open session */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                      <div className="p-4 bg-gray-50 border-b border-gray-150">
                        <h3 className="text-xs font-black uppercase text-gray-800 tracking-wider">Detalle de Operaciones de la Sesión Activa</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#005da9] text-white">
                              <th className="p-3 font-bold">ID</th>
                              <th className="p-3 font-bold">Concepto</th>
                              <th className="p-3 font-bold">Hora</th>
                              <th className="p-3 font-bold text-right">Ingreso (Bs. / $)</th>
                              <th className="p-3 font-bold text-right">Egreso (Bs. / $)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                            {activeSessionOps.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400 font-semibold italic">
                                  No hay movimientos registrados en la sesión actual. Las ventas o ingresos manuales aparecerán aquí.
                                </td>
                              </tr>
                            ) : (
                              activeSessionOps.map((op: any) => (
                                <tr key={op.id} className="hover:bg-gray-50">
                                  <td className="p-3 text-gray-400 font-mono">#{op.id}</td>
                                  <td className="p-3 font-bold text-gray-800">{op.concept}</td>
                                  <td className="p-3 text-gray-400 font-mono">{op.time}</td>
                                  <td className="p-3 text-right text-emerald-600 font-black">
                                    {op.type === 'ingreso' ? (
                                      <div className="flex flex-col items-end">
                                        <span>+{formatBs(op.amount_bs || (op.amount * bcvRate))}</span>
                                        <span className="text-[10px] text-emerald-500 font-semibold">({formatUSD(op.amount)})</span>
                                      </div>
                                    ) : ''}
                                  </td>
                                  <td className="p-3 text-right text-rose-600 font-black">
                                    {op.type === 'egreso' ? (
                                      <div className="flex flex-col items-end">
                                        <span>-{formatBs(op.amount_bs || (op.amount * bcvRate))}</span>
                                        <span className="text-[10px] text-rose-500 font-semibold">({formatUSD(op.amount)})</span>
                                      </div>
                                    ) : ''}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* REPORT: RECENT SESSIONS HISTORY (As requested in 2. - Imagen 1) */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden mt-6">
                      <div className="p-4 bg-gray-50 border-b border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="text-xs font-black uppercase text-gray-800 tracking-wider">Historial Reciente de Sesiones y Arqueo (Reporte)</h3>
                          <p className="text-[10px] text-gray-400 font-medium">Consulte el registro histórico de cierres de caja, balances esperados y diferencias detectadas.</p>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-800 text-white">
                              <th className="p-3 font-bold">Apertura</th>
                              <th className="p-3 font-bold">Cierre</th>
                              <th className="p-3 font-bold text-right">Apertura Bs.</th>
                              <th className="p-3 font-bold text-right">Cierre Bs.</th>
                              <th className="p-3 font-bold text-right">Diferencia</th>
                              <th className="p-3 font-bold text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                            {cashSessions.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-400 font-semibold italic">
                                  No hay historial de cierres de caja registrado.
                                </td>
                              </tr>
                            ) : (
                              cashSessions.map((session: any) => (
                                <tr key={session.id} className="hover:bg-gray-50">
                                  <td className="p-3 font-bold text-gray-800">{session.apertura}</td>
                                  <td className="p-3 text-gray-500 font-semibold">{session.cierre || '—'}</td>
                                  <td className="p-3 text-right text-gray-700 font-mono font-bold">
                                    {formatBs(session.apertura_bs)}
                                  </td>
                                  <td className="p-3 text-right text-gray-700 font-mono font-bold">
                                    {formatBs(session.cierre_bs)}
                                  </td>
                                  <td className="p-3 text-right font-mono font-black">
                                    {session.diferencia_bs !== null && session.diferencia_bs !== undefined ? (
                                      <span className={session.diferencia_bs === 0 ? 'text-gray-500' : session.diferencia_bs > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                        {session.diferencia_bs > 0 ? '+' : ''}{formatBs(session.diferencia_bs)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    {session.estado === 'abierta' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-blue-50 text-blue-800 border border-blue-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                        <span>Abierta</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-gray-50 text-gray-600 border border-gray-150">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                        <span>Cerrada</span>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* MODAL: APERTURAR CAJA */}
                    {showOpenCajaModal && (
                      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
                        <div className="bg-white rounded-2xl border border-gray-150 max-w-md w-full shadow-2xl p-6 text-left">
                          <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                            <h3 className="text-sm font-black uppercase text-gray-800 flex items-center gap-2">
                              <Unlock className="w-5 h-5 text-emerald-600" />
                              <span>Aperturar Caja Diaria</span>
                            </h3>
                            <button onClick={() => setShowOpenCajaModal(false)} className="text-gray-400 hover:text-gray-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Monto de Apertura (Bs. - Fondo Inicial)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={openCajaAmountBs}
                                onChange={(e) => setOpenCajaAmountBs(e.target.value)}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 font-mono"
                              />
                              <p className="text-[10px] text-gray-400 mt-1">
                                Equivale aproximadamente a: <span className="font-bold text-gray-700">{formatUSD(parseFloat(openCajaAmountBs) / bcvRate)}</span> (Tasa BCV: {bcvRate.toFixed(2)})
                              </p>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Observaciones / Comentarios</label>
                              <textarea
                                rows={2}
                                placeholder="Ej. Fondo inicial para dar cambio."
                                value={cajaObservaciones}
                                onChange={(e) => setCajaObservaciones(e.target.value)}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700"
                              />
                            </div>
                          </div>

                          <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-3">
                            <button
                              onClick={() => setShowOpenCajaModal(false)}
                              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-lg transition"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => {
                                const bs = parseFloat(openCajaAmountBs);
                                if (isNaN(bs) || bs < 0) {
                                  alert("Por favor, ingrese un monto de apertura válido.");
                                  return;
                                }
                                startSession(bs, cajaObservaciones.trim());
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition"
                            >
                              Confirmar Apertura
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MODAL: CERRAR CAJA / ARQUEO */}
                    {showCloseCajaModal && (
                      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
                        <div className="bg-white rounded-2xl border border-gray-150 max-w-md w-full shadow-2xl p-6 text-left">
                          <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                            <h3 className="text-sm font-black uppercase text-gray-800 flex items-center gap-2">
                              <Lock className="w-5 h-5 text-rose-600" />
                              <span>Cerrar Caja y Arqueo</span>
                            </h3>
                            <button onClick={() => setShowCloseCajaModal(false)} className="text-gray-400 hover:text-gray-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1 text-xs font-mono">
                              <div className="flex justify-between text-gray-500 font-bold">
                                <span>Fondo Inicial:</span>
                                <span className="text-gray-800 font-black">{formatBs(initialFondoBs)}</span>
                              </div>
                              <div className="flex justify-between text-gray-500 font-bold">
                                <span>(+) Ingresos del Turno:</span>
                                <span className="text-emerald-600 font-black">+{formatBs(sessionIngressesBs)}</span>
                              </div>
                              <div className="flex justify-between text-gray-500 font-bold">
                                <span>(-) Egresos del Turno:</span>
                                <span className="text-rose-600 font-black">-{formatBs(sessionEgressesBs)}</span>
                              </div>
                              <hr className="border-gray-200 my-1 font-sans" />
                              <div className="flex justify-between text-gray-700 font-black text-sm">
                                <span>Saldo Esperado en Caja:</span>
                                <span className="text-blue-800">{formatBs(esperadoSessionBs)}</span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Monto Real Contado en Caja (Bs.)</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Monto contado físicamente"
                                value={closeCajaAmountBs}
                                onChange={(e) => setCloseCajaAmountBs(e.target.value)}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 font-mono"
                              />
                              {closeCajaAmountBs && !isNaN(parseFloat(closeCajaAmountBs)) && (
                                <div className="mt-2 p-2 rounded-lg text-[11px] font-bold">
                                  {(() => {
                                    const contado = parseFloat(closeCajaAmountBs);
                                    const dif = contado - esperadoSessionBs;
                                    if (dif === 0) {
                                      return (
                                        <div className="text-emerald-700 bg-emerald-50 border border-emerald-100 p-1.5 rounded flex items-center gap-1">
                                          <Check className="w-3.5 h-3.5" />
                                          <span>La caja cuadra perfectamente (Diferencia: 0,00 Bs.)</span>
                                        </div>
                                      );
                                    } else if (dif > 0) {
                                      return (
                                        <div className="text-blue-700 bg-blue-50 border border-blue-100 p-1.5 rounded flex items-center gap-1">
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Sobrante en Caja: +{formatBs(dif)}</span>
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="text-rose-700 bg-rose-50 border border-rose-100 p-1.5 rounded flex items-center gap-1">
                                          <AlertTriangle className="w-3.5 h-3.5" />
                                          <span>Faltante en Caja: {formatBs(dif)}</span>
                                        </div>
                                      );
                                    }
                                  })()}
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Observaciones de Cierre</label>
                              <textarea
                                rows={2}
                                placeholder="Ej. Todo en orden. Caja cuadrada."
                                value={cajaObservaciones}
                                onChange={(e) => setCajaObservaciones(e.target.value)}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700"
                              />
                            </div>
                          </div>

                          <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-3">
                            <button
                              onClick={() => setShowCloseCajaModal(false)}
                              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-lg transition"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => {
                                const bs = parseFloat(closeCajaAmountBs);
                                if (isNaN(bs) || bs < 0) {
                                  alert("Por favor, ingrese el monto real contado en caja.");
                                  return;
                                }
                                closeSession(bs, cajaObservaciones.trim());
                              }}
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-lg transition"
                            >
                              Confirmar Cierre de Caja
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* VIEW: CLIENTES CON IDENTIFICACIÓN VENEZOLANA */}
          {currentMenu === 'clientes' && (
            <div className="space-y-6 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#131921] uppercase tracking-tight flex items-center gap-2">
                    <Users className="w-6 h-6 text-[#005da9]" />
                    <span>Clientes</span>
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">
                    Gestión de clientes con identificación venezolana
                  </p>
                </div>
                <button
                  onClick={openAddClientModal}
                  className="px-4 py-2.5 bg-[#005da9] hover:bg-[#004b88] text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xs flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo cliente</span>
                </button>
              </div>

              {/* Search & Filter bar */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por nombre, código o documento..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9] focus:bg-white transition"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                  {clientSearch && (
                    <button 
                      onClick={() => setClientSearch('')} 
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-[10px] text-gray-400 font-bold uppercase shrink-0">
                  Total en directorio: <span className="text-gray-800 font-black">{dbClients.length} clientes</span>
                </div>
              </div>

              {/* Table of Clientes */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b border-gray-200">
                        <th className="p-4">Código</th>
                        <th className="p-4">Documento</th>
                        <th className="p-4">Nombre</th>
                        <th className="p-4">Tipo</th>
                        <th className="p-4">Teléfono</th>
                        <th className="p-4">Correo</th>
                        <th className="p-4">Crédito USD</th>
                        <th className="p-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700 font-semibold">
                      {loadingClients ? (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-gray-400 font-semibold">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-gray-400" />
                            Cargando directorio de clientes...
                          </td>
                        </tr>
                      ) : filteredDbClients.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-gray-400 font-semibold">
                            Sin clientes registrados
                          </td>
                        </tr>
                      ) : (
                        filteredDbClients.map((client) => (
                          <tr key={client.id} className="hover:bg-gray-50/50">
                            <td className="p-4">
                              <span className="bg-blue-50 text-[#005da9] text-[10px] font-black uppercase px-2 py-1 rounded-lg border border-blue-100 font-mono">
                                {client.code}
                              </span>
                            </td>
                            <td className="p-4 font-mono font-bold text-gray-600">{client.document}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-black flex items-center justify-center text-[10px] shrink-0 uppercase border border-gray-200">
                                  {(client.name || '').substring(0, 2).toUpperCase()}
                                </span>
                                <span className="font-extrabold text-gray-900">{client.name}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                client.type === 'Jurídico' 
                                  ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}>
                                {client.type || 'Natural'}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-gray-500">{client.phone || 'Sin teléfono'}</td>
                            <td className="p-4 font-mono text-gray-500 max-w-[150px] truncate" title={client.email}>
                              {client.email || <span className="text-gray-350 italic text-[11px]">Sin correo</span>}
                            </td>
                            <td className="p-4 font-black text-gray-900">
                              ${(client.credit_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => openEditClientModal(client)}
                                  className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                                  title="Editar Cliente"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClient(client.id, client.name)}
                                  className="p-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition"
                                  title="Eliminar Cliente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* -------------------- MODAL: NUEVO / EDITAR CLIENTE -------------------- */}
              {showClientModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-3xl border border-gray-150 w-full max-w-md shadow-2xl overflow-hidden text-left flex flex-col">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                      <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span>{selectedClientForEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</span>
                      </span>
                      <button 
                        onClick={() => setShowClientModal(false)}
                        className="p-1.5 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-lg transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveClient} className="p-5 space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Nombre Completo / Razón Social *</label>
                        <input
                          type="text"
                          required
                          value={clientFormName}
                          onChange={(e) => setClientFormName(e.target.value)}
                          placeholder="Ej: Inversiones Pérez C.A., María Gómez"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Tipo Identificación *</label>
                          <select
                            value={clientFormType}
                            onChange={(e) => setClientFormType(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                          >
                            <option value="Natural">Natural (V / E)</option>
                            <option value="Jurídico">Jurídico (J / G)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Cédula o RIF *</label>
                          <input
                            type="text"
                            required
                            value={clientFormDocument}
                            onChange={(e) => setClientFormDocument(e.target.value)}
                            placeholder="Ej: V-12345678 o J-31456987-0"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Teléfono / WhatsApp</label>
                          <input
                            type="text"
                            value={clientFormPhone}
                            onChange={(e) => setClientFormPhone(e.target.value)}
                            placeholder="Ej: 0412-5551234"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Límite de Crédito (USD)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={clientFormCredit}
                            onChange={(e) => setClientFormCredit(Number(e.target.value))}
                            placeholder="Ej: 100.00"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Correo Electrónico</label>
                        <input
                          type="email"
                          value={clientFormEmail}
                          onChange={(e) => setClientFormEmail(e.target.value)}
                          placeholder="Ej: cliente@ejemplo.com"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                        />
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setShowClientModal(false)}
                          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-xl transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-[#005da9] hover:bg-[#004b88] text-white font-black text-xs uppercase rounded-xl transition"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: LIBROS Y REPORTES */}
          {currentMenu === 'reportes' && (
            <div className="space-y-6 text-left">
              <div>
                <h2 className="text-xl font-black text-[#131921] uppercase tracking-tight flex items-center gap-2">
                  <FileText className="w-6 h-6 text-teal-600" />
                  <span>Libros y Reportes de Gestión</span>
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  Información estadística consolidada del inventario, valor de almacén, y exportación de datos contables para auditoría fiscal.
                </p>
              </div>

              {/* Global inventory value stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-4">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Valor Total del Almacén</p>
                  <p className="text-2xl font-black text-teal-700">
                    ${products.reduce((acc, curr) => acc + (curr.price * curr.stock), 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">
                    Bs. {(products.reduce((acc, curr) => acc + (curr.price * curr.stock), 0) * bcvRate).toLocaleString(undefined, {maximumFractionDigits: 2})}
                  </p>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Artículos sin Existencias</p>
                  <p className="text-2xl font-black text-blue-700">
                    {products.filter(p => p.stock === 0).length} items
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">Requieren reposición urgente</p>
                </div>

                <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Promedio de Ventas por Pedido</p>
                  <p className="text-2xl font-black text-purple-700">
                    ${orders.length > 0 ? (orders.reduce((acc, curr) => acc + curr.totalUSD, 0) / orders.length).toFixed(2) : '0.00'}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">Consumo promedio en tienda</p>
                </div>
              </div>

              {/* Fiscal reporting shortcuts */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-xs font-black uppercase text-gray-800 tracking-wider mb-3">Generación de Reportes Formales</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-gray-800">Libro de Ventas SENIAT (Excel)</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Consolidado mensual con IVA desglosado al 16%.</p>
                    </div>
                    <button
                      onClick={handleExportOrdersExcel}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-lg shadow-xs cursor-pointer"
                    >
                      Descargar
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-gray-800">Reporte de Stock Crítico (PDF)</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Listado detallado de productos próximos a agotarse.</p>
                    </div>
                    <button
                      onClick={handlePrintInventoryReport}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white font-black text-[10px] uppercase rounded-lg shadow-xs cursor-pointer"
                    >
                      Imprimir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: AUDITORÍA */}
          {currentMenu === 'audit' && (
            <div className="space-y-6 text-left">
              <div>
                <h2 className="text-xl font-black text-[#131921] uppercase tracking-tight flex items-center gap-2">
                  <Activity className="w-6 h-6 text-rose-600" />
                  <span>Bitácora de Auditoría de Sistemas</span>
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  Registro histórico de operaciones realizadas por los administradores y operadores autorizados.
                </p>
              </div>

              {/* Logs Timeline list */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-150 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase text-gray-800 tracking-wider">Historial de Operaciones Administrativas</h3>
                  <span className="text-[9px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-100 font-bold">SEGURIDAD ALTA</span>
                </div>
                <div className="p-4 space-y-4">
                  {[
                    { id: 1, action: 'Modificación de Tasa Cambiaria', desc: `Tasa BCV actualizada a Bs. ${bcvRate.toFixed(2)} por operador Pedro España.`, date: 'Hace unos instantes', ip: '190.120.45.18', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                    { id: 2, action: 'Inicio de Sesión Exitoso', desc: 'Acceso correcto del usuario Pedro España con rol GERENTE.', date: 'Hace 30 minutos', ip: '190.120.45.18', badge: 'bg-blue-50 text-blue-700 border-blue-100' },
                    { id: 3, action: 'Consulta de Facturación POS', desc: 'Descarga del consolidado de ventas del mes en formato XLSX.', date: 'Hace 1 hora', ip: '190.120.45.18', badge: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                    { id: 4, action: 'Sincronización de Base de Datos', desc: 'Actualización y refresco completo de la tabla de artículos de catálogo y pedidos de clientes.', date: 'Hace 2 horas', ip: 'Servidor Interno', badge: 'bg-purple-50 text-purple-700 border-purple-100' }
                  ].map((log) => (
                    <div key={log.id} className="p-3 bg-gray-50 border border-gray-150 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-900">{log.action}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded border ${log.badge} font-bold`}>{log.ip}</span>
                        </div>
                        <p className="text-gray-500 font-medium leading-relaxed">{log.desc}</p>
                      </div>
                      <div className="text-right text-[10px] text-gray-400 font-mono font-semibold shrink-0">
                        {log.date}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: MARKETING */}
          {currentMenu === 'marketing' && (
            <div className="space-y-6 text-left">
              <div>
                <h2 className="text-xl font-black text-[#131921] uppercase tracking-tight flex items-center gap-2">
                  <Megaphone className="w-6 h-6 text-pink-600" />
                  <span>Marketing y Promociones</span>
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Módulo en desarrollo para campañas de marketing.
                </p>
              </div>
            </div>
          )}

          {/* VIEW: PROVEEDORES */}
          {currentMenu === 'proveedores' && (
            <div className="space-y-6 text-left" id="module-proveedores">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#131921] uppercase tracking-tight flex items-center gap-2">
                    <Truck className="w-6 h-6 text-[#005da9]" />
                    <span>Proveedores</span>
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">
                    Gestión de proveedores con datos fiscales venezolanos
                  </p>
                </div>
                <button
                  onClick={openAddProviderModal}
                  className="px-4 py-2.5 bg-[#005da9] hover:bg-[#004b88] text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xs flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo proveedor</span>
                </button>
              </div>

              {/* Search & Filter bar */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por razón social, RIF o código..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9] focus:bg-white transition"
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                  />
                  {providerSearch && (
                    <button 
                      onClick={() => setProviderSearch('')} 
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-[10px] text-gray-400 font-bold uppercase shrink-0">
                  Total proveedores: <span className="text-gray-800 font-black">{providers.length}</span>
                </div>
              </div>

              {/* Table of Proveedores */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b border-gray-200">
                        <th className="p-4">Código</th>
                        <th className="p-4">RIF</th>
                        <th className="p-4">Razón social</th>
                        <th className="p-4">Tipo</th>
                        <th className="p-4">Teléfono</th>
                        <th className="p-4">Banco</th>
                        <th className="p-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700 font-semibold">
                      {loadingProviders ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-gray-400 font-semibold">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-gray-400" />
                            Cargando proveedores...
                          </td>
                        </tr>
                      ) : filteredProviders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-16 text-center text-gray-400 font-medium text-sm">
                            Sin proveedores registrados
                          </td>
                        </tr>
                      ) : (
                        filteredProviders.map((prov) => (
                          <tr key={prov.id} className="hover:bg-gray-50/50">
                            <td className="p-4">
                              <span className="bg-orange-50 text-orange-700 text-[10px] font-black uppercase px-2 py-1 rounded-lg border border-orange-100 font-mono">
                                {prov.code}
                              </span>
                            </td>
                            <td className="p-4 font-mono font-bold text-gray-600">{prov.rif}</td>
                            <td className="p-4 font-extrabold text-gray-900">{prov.name}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                prov.type === 'Jurídico' 
                                  ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}>
                                {prov.type || 'Jurídico'}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-gray-500">{prov.phone || 'Sin teléfono'}</td>
                            <td className="p-4 text-gray-600">{prov.bank_name || 'No especificado'}</td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => openEditProviderModal(prov)}
                                  className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                                  title="Editar Proveedor"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProvider(prov.id, prov.name)}
                                  className="p-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition"
                                  title="Eliminar Proveedor"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* -------------------- MODAL: NUEVO / EDITAR PROVEEDOR -------------------- */}
              {showProviderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-3xl border border-gray-150 w-full max-w-md shadow-2xl overflow-hidden text-left flex flex-col">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                      <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-500" />
                        <span>{selectedProviderForEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}</span>
                      </span>
                      <button 
                        onClick={() => setShowProviderModal(false)}
                        className="p-1.5 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-lg transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveProvider} className="p-5 space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Código *</label>
                          <input
                            type="text"
                            required
                            value={providerFormCode}
                            onChange={(e) => setProviderFormCode(e.target.value)}
                            placeholder="PROV-001"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Razón Social *</label>
                          <input
                            type="text"
                            required
                            value={providerFormName}
                            onChange={(e) => setProviderFormName(e.target.value)}
                            placeholder="Ej: Distribuidora Bella Vista C.A."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Tipo de Firma *</label>
                          <select
                            value={providerFormType}
                            onChange={(e) => setProviderFormType(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                          >
                            <option value="Jurídico">Jurídico (J / G)</option>
                            <option value="Natural">Natural (V / E)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">RIF / Cédula *</label>
                          <input
                            type="text"
                            required
                            value={providerFormRif}
                            onChange={(e) => setProviderFormRif(e.target.value)}
                            placeholder="Ej: J-12345678-9"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Teléfono</label>
                          <input
                            type="text"
                            value={providerFormPhone}
                            onChange={(e) => setProviderFormPhone(e.target.value)}
                            placeholder="Ej: 0261-7000123"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Banco Receptor</label>
                          <input
                            type="text"
                            value={providerFormBankName}
                            onChange={(e) => setProviderFormBankName(e.target.value)}
                            placeholder="Ej: Banesco, Banco de Venezuela"
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setShowProviderModal(false)}
                          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-[#005da9] hover:bg-[#004b88] text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xs"
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: COMPRAS */}
          {currentMenu === 'compras' && (
            <div className="space-y-6 text-left">
              <div>
                <h2 className="text-xl font-black text-[#131921] uppercase tracking-tight flex items-center gap-2">
                  <ClipboardList className="w-6 h-6 text-blue-600" />
                  <span>Compras e Inventario</span>
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Módulo en desarrollo para gestión de órdenes de compra.
                </p>
              </div>
            </div>
          )}

          {/* VIEW: CONFIGURACIÓN */}
          {currentMenu === 'settings' && (
            <div className="space-y-6 text-left">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#131921] uppercase tracking-tight flex items-center gap-2">
                    <Settings className="w-6 h-6 text-gray-600" />
                    <span>Configuración General</span>
                  </h2>
                </div>
                
                <button 
                  onClick={() => setCurrentMenu('audit')}
                  className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition cursor-pointer"
                >
                  <Activity className="w-4 h-4" />
                  Registro de Auditoría
                </button>
              </div>

              <div className="flex border-b border-gray-200">
                <button
                  className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    settingsTab === 'business'
                      ? 'border-[#005da9] text-[#005da9]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setSettingsTab('business')}
                >
                  Configura del Negocios
                </button>
                <button
                  className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    settingsTab === 'bcv'
                      ? 'border-[#005da9] text-[#005da9]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setSettingsTab('bcv')}
                >
                  Tasas de Cambio
                </button>
                <button
                  className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    settingsTab === 'roles'
                      ? 'border-[#005da9] text-[#005da9]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setSettingsTab('roles')}
                >
                  Equipos y Roles
                </button>
              </div>

              {settingsTab === 'business' && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                  {configSaved && (
                    <div className="mb-4 p-3 bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2 animate-bounce">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>¡Configuración del negocio guardada exitosamente en la base de datos!</span>
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Razón Social del Negocio</label>
                        <input
                          type="text"
                          value={configStoreName}
                          onChange={(e) => setConfigStoreName(e.target.value)}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-[#005da9]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">RIF de la Empresa</label>
                        <input
                          type="text"
                          value={configRif}
                          onChange={(e) => setConfigRif(e.target.value)}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-[#005da9]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Impuesto de Ley (IVA %)</label>
                        <input
                          type="number"
                          value={configIva}
                          onChange={(e) => setConfigIva(parseInt(e.target.value) || 0)}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-[#005da9]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">WhatsApp del Administrador (Notificaciones)</label>
                        <input
                          type="text"
                          value={configPhone}
                          onChange={(e) => setConfigPhone(e.target.value)}
                          className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-[#005da9]"
                        />
                      </div>
                    </div>
                    {/* Habilitar / Deshabilitar Métodos */}
                    <div className="pt-6 border-t border-gray-100">
                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <ToggleRight className="w-4 h-4 text-[#005da9]" />
                        <span>Habilitar / Deshabilitar Métodos de Entrega y Pago</span>
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Métodos de Entrega */}
                        <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-150">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Métodos de Entrega</span>
                          
                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <div>
                              <span className="text-xs font-bold text-gray-800 block">Envío a Domicilio</span>
                              <span className="text-[10px] text-gray-400 font-medium">Habilitar despacho motorizado para clientes</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDisableDeliveryB2C(!disableDeliveryB2C)}
                              className="focus:outline-none cursor-pointer"
                            >
                              {disableDeliveryB2C ? (
                                <ToggleLeft className="w-10 h-10 text-gray-300 transition" />
                              ) : (
                                <ToggleRight className="w-10 h-10 text-[#005da9] transition" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <div>
                              <span className="text-xs font-bold text-gray-800 block">Retiro en Tienda</span>
                              <span className="text-[10px] text-gray-400 font-medium">Habilitar que el cliente busque en sucursal</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDisableDeliveryRetiro(!disableDeliveryRetiro)}
                              className="focus:outline-none cursor-pointer"
                            >
                              {disableDeliveryRetiro ? (
                                <ToggleLeft className="w-10 h-10 text-gray-300 transition" />
                              ) : (
                                <ToggleRight className="w-10 h-10 text-[#005da9] transition" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Métodos de Pago */}
                        <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-150">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Métodos de Pago</span>
                          
                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <div>
                              <span className="text-xs font-bold text-gray-800 block">Pago Móvil</span>
                              <span className="text-[10px] text-gray-400 font-medium">Pago móvil interbancario venezolano</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDisablePayPagomovil(!disablePayPagomovil)}
                              className="focus:outline-none cursor-pointer"
                            >
                              {disablePayPagomovil ? (
                                <ToggleLeft className="w-10 h-10 text-gray-300 transition" />
                              ) : (
                                <ToggleRight className="w-10 h-10 text-[#005da9] transition" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <div>
                              <span className="text-xs font-bold text-gray-800 block">Efectivo (Divisas / Bs)</span>
                              <span className="text-[10px] text-gray-400 font-medium">Pago físico en dólares o bolívares</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDisablePayEfectivo(!disablePayEfectivo)}
                              className="focus:outline-none cursor-pointer"
                            >
                              {disablePayEfectivo ? (
                                <ToggleLeft className="w-10 h-10 text-gray-300 transition" />
                              ) : (
                                <ToggleRight className="w-10 h-10 text-[#005da9] transition" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <div>
                              <span className="text-xs font-bold text-gray-800 block">Transferencia Bancaria</span>
                              <span className="text-[10px] text-gray-400 font-medium">Transferencias directas diferidas</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDisablePayTransferencia(!disablePayTransferencia)}
                              className="focus:outline-none cursor-pointer"
                            >
                              {disablePayTransferencia ? (
                                <ToggleLeft className="w-10 h-10 text-gray-300 transition" />
                              ) : (
                                <ToggleRight className="w-10 h-10 text-[#005da9] transition" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <div>
                              <span className="text-xs font-bold text-gray-800 block">Punto de Venta</span>
                              <span className="text-[10px] text-gray-400 font-medium">Tarjetas de débito o crédito en local</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDisablePayPunto(!disablePayPunto)}
                              className="focus:outline-none cursor-pointer"
                            >
                              {disablePayPunto ? (
                                <ToggleLeft className="w-10 h-10 text-gray-300 transition" />
                              ) : (
                                <ToggleRight className="w-10 h-10 text-[#005da9] transition" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                            <div>
                              <span className="text-xs font-bold text-gray-800 block">Otras Divisas (Euros, Pesos)</span>
                              <span className="text-[10px] text-gray-400 font-medium">Soporte para EUR o COP en efectivo</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDisablePayOtras(!disablePayOtras)}
                              className="focus:outline-none cursor-pointer"
                            >
                              {disablePayOtras ? (
                                <ToggleLeft className="w-10 h-10 text-gray-300 transition" />
                              ) : (
                                <ToggleRight className="w-10 h-10 text-[#005da9] transition" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => {
                          const disabledObj = {
                            delivery_b2c: disableDeliveryB2C,
                            delivery_retiro: disableDeliveryRetiro,
                            pay_pagomovil: disablePayPagomovil,
                            pay_efectivo: disablePayEfectivo,
                            pay_transferencia: disablePayTransferencia,
                            pay_punto: disablePayPunto,
                            pay_otras: disablePayOtras
                          };
                          localStorage.setItem('copias_bellavista_disabled_settings', JSON.stringify(disabledObj));
                          
                          // Dispatch a storage event so other components (CartDrawer, POSModule) react instantly!
                          window.dispatchEvent(new Event('storage'));
                          
                          setConfigSaved(true);
                          setTimeout(() => setConfigSaved(false), 4000);
                        }}
                        className="px-5 py-2.5 bg-[#005da9] hover:bg-[#004b88] text-white text-xs font-black rounded-xl transition cursor-pointer shadow-xs"
                      >
                        Guardar Configuración Comercial
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'bcv' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">GESTIÓN MULTI-MONEDA Y CONFIGURACIÓN DE TASAS DE CAMBIO</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* VES CARD */}
                      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">🇻🇪</span>
                            <span className="font-bold text-sm text-gray-800">Bolívar Digital (VES)</span>
                          </div>
                          <p className="text-xs text-gray-400 mb-4 font-medium">Tasa oficial del BCV para conversión local.</p>
                          
                          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Tasa VES por USD</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-400 font-extrabold text-xs">Bs.</span>
                            </div>
                            <input
                              type="text"
                              value={bcvInputValue}
                              onChange={(e) => setBcvInputValue(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                            />
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const val = parseFloat(bcvInputValue);
                            if (!isNaN(val) && val > 0) {
                              await onUpdateCurrencyRate('VES', val);
                              alert(`Tasa VES/USD actualizada a Bs. ${val.toFixed(2)} correctamente.`);
                            } else {
                              alert("Por favor ingrese un valor numérico válido.");
                            }
                          }}
                          className="mt-4 w-full py-2 bg-[#005da9] hover:bg-[#004b88] text-white text-xs font-black rounded-lg transition"
                        >
                          Actualizar VES (BCV)
                        </button>
                      </div>

                      {/* EUR CARD */}
                      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">🇪🇺</span>
                            <span className="font-bold text-sm text-gray-800">Euro (EUR)</span>
                          </div>
                          <p className="text-xs text-gray-400 mb-4 font-medium">Factor de conversión del Euro con respecto al Dólar.</p>
                          
                          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Euros por USD</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-400 font-extrabold text-xs">€</span>
                            </div>
                            <input
                              type="text"
                              value={eurInputValue}
                              onChange={(e) => setEurInputValue(e.target.value)}
                              className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                            />
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const val = parseFloat(eurInputValue);
                            if (!isNaN(val) && val > 0) {
                              await onUpdateCurrencyRate('EUR', val);
                              alert(`Tasa EUR/USD actualizada a ${val.toFixed(4)} € correctamente.`);
                            } else {
                              alert("Por favor ingrese un valor numérico válido.");
                            }
                          }}
                          className="mt-4 w-full py-2 bg-[#005da9] hover:bg-[#004b88] text-white text-xs font-black rounded-lg transition"
                        >
                          Actualizar EUR
                        </button>
                      </div>

                      {/* COP CARD */}
                      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">🇨🇴</span>
                            <span className="font-bold text-sm text-gray-800">Peso Colombiano (COP)</span>
                          </div>
                          <p className="text-xs text-gray-400 mb-4 font-medium">Factor de conversión de Pesos Colombianos con respecto al Dólar.</p>
                          
                          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Pesos por USD</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-400 font-extrabold text-xs">COP$</span>
                            </div>
                            <input
                              type="text"
                              value={copInputValue}
                              onChange={(e) => setCopInputValue(e.target.value)}
                              className="w-full pl-12 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9]"
                            />
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const val = parseFloat(copInputValue);
                            if (!isNaN(val) && val > 0) {
                              await onUpdateCurrencyRate('COP', val);
                              alert(`Tasa COP/USD actualizada a COP$ ${val.toFixed(0)} correctamente.`);
                            } else {
                              alert("Por favor ingrese un valor numérico válido.");
                            }
                          }}
                          className="mt-4 w-full py-2 bg-[#005da9] hover:bg-[#004b88] text-white text-xs font-black rounded-lg transition"
                        >
                          Actualizar COP
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-[#131921] mb-4">Historial de Tasas de Referencia (VES)</h3>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
                          <tr>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Tasa (Bs.)</th>
                            <th className="px-4 py-3">Usuario</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                          {bcvRatesHistory.length > 0 ? (
                            bcvRatesHistory.map((rateRecord) => (
                              <tr key={rateRecord.id}>
                                <td className="px-4 py-3 font-mono">
                                  {new Date(rateRecord.created_at).toLocaleString('es-VE', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true
                                  })}
                                </td>
                                <td className="px-4 py-3 font-bold text-[#131921]">
                                  {rateRecord.rate.toFixed(2)}
                                </td>
                                <td className="px-4 py-3">{rateRecord.created_by}</td>
                              </tr>
                            ))
                          ) : (
                            <>
                              <tr>
                                <td className="px-4 py-3 font-mono">11/7/2026, 5:22:14 p. m.</td>
                                <td className="px-4 py-3 font-bold text-[#131921]">721.34</td>
                                <td className="px-4 py-3">Pedro (Admin)</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 font-mono">10/7/2026, 4:10:00 p. m.</td>
                                <td className="px-4 py-3 font-bold text-[#131921]">718.50</td>
                                <td className="px-4 py-3">Pedro (Admin)</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3 font-mono">09/7/2026, 3:30:15 p. m.</td>
                                <td className="px-4 py-3 font-bold text-[#131921]">715.20</td>
                                <td className="px-4 py-3">Sistema</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'roles' && (
                <div className="space-y-6 text-[#131921]">
                  <h1 className="text-3xl font-black mb-6">Gestionar mi equipo</h1>

                  {/* Matriz de Permisos */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 cursor-pointer">
                      <h3 className="text-sm font-black text-gray-800">Saber más de los roles</h3>
                      <button className="text-gray-400 hover:text-gray-600 transition">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                      </button>
                    </div>
                    
                    <div className="p-0 overflow-x-auto custom-scrollbar">
                      <div className="min-w-[1000px]">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-white border-b border-gray-200 text-gray-600 font-bold">
                            <tr>
                              {['Nombre', 'Pedidos', 'Facturacion', 'Productos', 'Caja', 'Marketing', 'Clientes', 'Proveedores', 'Compras', 'Reportes', 'Configuraciones', 'Repartidor'].map(h => (
                                <th key={h} className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span>{h}</span>
                                    <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {[
                              { name: 'Admin', checks: [true, true, true, true, true, true, true, true, true, true, false] },
                              { name: 'Gerente', checks: [true, true, true, true, true, true, true, true, true, false, false] },
                              { name: 'Cajero', checks: [true, true, false, true, false, true, false, false, false, false, false] },
                              { name: 'Despachador', checks: [true, false, false, false, false, false, false, false, false, false, false] },
                              { name: 'Repartidor', checks: [true, false, false, false, false, false, false, false, false, false, true] },
                            ].map((role, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span>{role.name}</span>
                                    <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                                  </div>
                                </td>
                                {role.checks.map((checked, i) => (
                                  <td key={i} className="px-4 py-3 text-center">
                                    {checked ? (
                                      <Check className="w-4 h-4 text-emerald-500 inline-block mx-auto" strokeWidth={3} />
                                    ) : (
                                      <Check className="w-4 h-4 text-gray-200 inline-block mx-auto" />
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Explicit Horizontal Scroll Indicator */}
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/50 border-t border-gray-100 text-gray-400">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Desplazar para ver más</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Listado de Usuarios Registrados */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 relative pb-16">
                    <h3 className="text-sm font-black text-gray-800 mb-4">Roles creados:</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
                          <tr>
                            <th className="px-4 py-3">Nombre</th>
                            <th className="px-4 py-3">Correo Electrónico</th>
                            <th className="px-4 py-3">Local</th>
                            <th className="px-4 py-3">Rol</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          <tr>
                            <td className="px-4 py-3 font-bold text-[#131921]">Copias Bella Vista</td>
                            <td className="px-4 py-3 text-gray-600">copiasbellavistafp@gmail.com</td>
                            <td className="px-4 py-3 font-mono text-gray-500">Copias-Bella-Vista</td>
                            <td className="px-4 py-3">
                              <span className="inline-block px-2.5 py-1 rounded-full border border-blue-200 text-blue-600 bg-blue-50 font-black text-[10px] uppercase tracking-wider">
                                Admin
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <a href="#" className="text-blue-600 font-bold hover:underline">Gestionar mi perfil</a>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button className="text-gray-400 hover:text-gray-800 p-1">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="absolute bottom-4 left-4">
                      <button className="px-5 py-2.5 bg-[#28a745] hover:bg-[#218838] text-white text-xs font-black rounded-lg transition shadow-sm uppercase tracking-wider flex items-center gap-2">
                        + Agregar Usuario
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
          {currentMenu === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
                <div>
                  <h2 className="text-xl font-black text-[#131921] uppercase tracking-tight flex items-center gap-2">
                    <Package className="w-6 h-6 text-[#FF9900]" />
                    <span>Productos</span>
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
                    Imprimir Reporte
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4 text-left">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Total Artículos</p>
                    <p className="text-2xl font-black text-[#131921]">{totalProducts}</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4 text-left">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Categorías</p>
                    <p className="text-2xl font-black text-[#131921]">{totalCategories}</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-4 text-left">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
                    <Tag className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Marcas</p>
                    <p className="text-2xl font-black text-[#131921]">{totalBrands}</p>
                  </div>
                </div>

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
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => handleTabClick('products')}
                  className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
                    activeTab === 'products'
                      ? 'border-[#FF9900] text-[#131921]'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Artículos del Catálogo ({totalProducts})
                </button>
                <button
                  onClick={() => handleTabClick('categories')}
                  className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
                    activeTab === 'categories'
                      ? 'border-[#FF9900] text-[#131921]'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Categorías ({totalCategories})
                </button>
                <button
                  onClick={() => handleTabClick('brands')}
                  className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
                    activeTab === 'brands'
                      ? 'border-[#FF9900] text-[#131921]'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                >
                  Marcas ({totalBrands})
                </button>
              </div>
            </div>
          )}

          {/* VIEW: ORDERS */}
          {currentMenu === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
                <div>
                  <h2 className="text-xl font-black text-[#131921] uppercase tracking-tight flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-[#008296]" />
                    <span>Control de Pedidos</span>
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">
                    Validación de pagos, despachos, estados de entrega y notificaciones en tiempo real al cliente.
                  </p>
                </div>

                {/* Orders top actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={fetchOrders}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shadow"
                    id="btn-refresh-orders"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin' : ''}`} />
                    Actualizar Pedidos
                  </button>
                  <button
                    onClick={handleExportOrdersExcel}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shadow"
                    id="btn-export-orders"
                  >
                    <Download className="w-4 h-4" />
                    Exportar Pedidos
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conditional rendering of table views */}
          {(currentMenu === 'products' || currentMenu === 'orders') && (
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
                <th className="p-3 font-extrabold text-right sticky right-0 bg-[#131921] z-10">Acciones</th>
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
                          type="button" onClick={(e) => { e.stopPropagation(); handleToggleFeaturedProduct(prod); }}
                          className="text-gray-400 hover:text-amber-500 transition focus:outline-none"
                        >
                          <Star className={`w-4 h-4 mx-auto ${prod.featured ? 'fill-[#FF9900] text-[#FF9900]' : 'text-gray-300'}`} />
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button" onClick={(e) => { e.stopPropagation(); handleToggleActiveProduct(prod); }}
                          className="text-gray-400 hover:text-[#007185] transition"
                        >
                          {prod.active ? (
                            <ToggleRight className="w-6 h-6 mx-auto text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 mx-auto text-gray-300" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap sticky right-0 bg-white z-10">
                        <button
                          type="button" onClick={(e) => { e.stopPropagation(); handleOpenProductForm(prod); }}
                          className="p-1 text-sky-600 hover:bg-sky-50 rounded border border-transparent hover:border-sky-200 transition cursor-pointer inline-flex items-center"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button" onClick={(e) => { e.stopPropagation(); handleDeleteProduct(prod.id); }}
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
                <th className="p-3 font-extrabold text-center">Visible</th>
                <th className="p-3 font-extrabold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 font-semibold">
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
                    <td className="p-3 text-center">
                      <button
                        type="button" onClick={(e) => { e.stopPropagation(); handleToggleActiveCategory(cat); }}
                        className="text-gray-400 hover:text-[#007185] transition"
                        title={cat.active ?? true ? "Ocultar Categoría" : "Mostrar Categoría"}
                      >
                        {cat.active ?? true ? (
                          <ToggleRight className="w-6 h-6 mx-auto text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 mx-auto text-gray-300" />
                        )}
                      </button>
                    </td>
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
                <th className="p-3 font-extrabold text-center">Visible</th>
                <th className="p-3 font-extrabold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400 font-semibold">
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
                    <td className="p-3 text-center">
                      <button
                        type="button" onClick={(e) => { e.stopPropagation(); handleToggleActiveBrand(b); }}
                        className="text-gray-400 hover:text-[#007185] transition"
                        title={b.active ?? true ? "Ocultar Marca" : "Mostrar Marca"}
                      >
                        {b.active ?? true ? (
                          <ToggleRight className="w-6 h-6 mx-auto text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 mx-auto text-gray-300" />
                        )}
                      </button>
                    </td>
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

        {/* Orders Table & Panel */}
        {activeTab === 'orders' && (
          <div className="p-4 bg-gray-50/50 space-y-4">
            
            {/* Header for Orders */}
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="font-black text-[#131921] uppercase text-sm">Control de Pedidos</h3>
                <p className="text-[10px] text-gray-500 font-medium">Gestión de pedidos en curso y finalizados.</p>
              </div>
              <button
                onClick={() => {
                  if (typeof setCurrentMenu === 'function') setCurrentMenu('sales');
                  if (typeof setActiveTab === 'function') setActiveTab('sales');
                }}
                className="px-4 py-2 bg-[#008296] hover:bg-[#007285] text-white text-xs font-bold rounded flex items-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nuevo Pedido
              </button>
            </div>

            {/* Orders Tab Subheader Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-xs flex items-center gap-3 text-left">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Total Pedidos</p>
                  <p className="text-lg font-black text-[#131921]">{totalOrdersCount}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-xs flex items-center gap-3 text-left">
                <div className="p-2 bg-amber-50 text-amber-500 rounded-full">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Pendientes</p>
                  <p className="text-lg font-black text-amber-600">{pendingOrdersCount}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-xs flex items-center gap-3 text-left">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Completados</p>
                  <p className="text-lg font-black text-emerald-600">{completedOrdersCount}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-xs flex items-center gap-3 text-left">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-full">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Facturación Activa</p>
                  <p className="text-lg font-black text-purple-700">${totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Sub-filters row */}
            <div className="bg-white p-3 border border-gray-200 rounded-lg flex flex-wrap gap-4 items-center justify-between text-xs text-left">
              <div className="flex flex-wrap gap-3 items-center">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Estado de Entrega</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-[#008296] focus:outline-none font-semibold text-gray-700"
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="recibido">Recibido</option>
                    <option value="preparando">Preparando</option>
                    <option value="listo para retirar">Listo para Retirar</option>
                    <option value="en camino">En Camino</option>
                    <option value="entregado">Entregado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Estado de Pago</label>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-[#008296] focus:outline-none font-semibold text-gray-700"
                  >
                    <option value="all">Todos los Pagos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                    <option value="reembolsado">Reembolsado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Método de Entrega</label>
                  <select
                    value={deliveryMethodFilter}
                    onChange={(e) => setDeliveryMethodFilter(e.target.value)}
                    className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-[#008296] focus:outline-none font-semibold text-gray-700"
                  >
                    <option value="all">Todos</option>
                    <option value="retiro">Retiro en Tienda</option>
                    <option value="b2c">Envío a Domicilio</option>
                  </select>
                </div>
              </div>

              <div className="text-[11px] text-gray-400 font-bold">
                Mostrando {filteredOrders.length} de {orders.length} pedidos
              </div>
            </div>

            {/* Orders Table Grid */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs">
              {loadingOrders ? (
                <div className="p-12 text-center text-gray-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#008296]" />
                  <p className="font-semibold text-xs">Cargando lista de pedidos desde la base de datos...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-semibold text-xs">No se encontraron pedidos que coincidan con la búsqueda o filtros.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#131921] text-white">
                      <th className="p-3 font-extrabold">Pedido N°</th>
                      <th className="p-3 font-extrabold">Cliente / Contacto</th>
                      <th className="p-3 font-extrabold">Método Entrega</th>
                      <th className="p-3 font-extrabold">Método Pago</th>
                      <th className="p-3 font-extrabold text-right">Total (USD)</th>
                      <th className="p-3 font-extrabold text-left">Tiempo / Inicio</th>
                      <th className="p-3 font-extrabold text-center">Estado de la Entrega</th>
                      <th className="p-3 font-extrabold text-center">Estado del Pago</th>
                      <th className="p-3 font-extrabold text-right">Detalles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredOrders.map((order) => {
                      const formattedNum = String(order.order_number || '').padStart(7, '0');
                      const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A';
                      const isUpdating = updatingOrderId === order.id;

                      const currentStatus = pendingChanges[order.id]?.status ?? order.status;
                      const currentPaymentStatus = pendingChanges[order.id]?.payment_status ?? (order.payment_status || 'pendiente');
                      const hasPendingChanges = !!pendingChanges[order.id];

                      return (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition">
                          {/* Order number with padding */}
                          <td className="p-3 font-mono font-black text-[#008296] text-[13px]">
                            {formattedNum}
                          </td>

                          {/* Customer contact info */}
                          <td className="p-3 text-left">
                            <div className="font-bold text-gray-900">{order.customer_name}</div>
                            <div className="text-gray-400 text-[10px] font-mono">{order.phone_number}</div>
                          </td>

                          {/* Delivery info */}
                          <td className="p-3 whitespace-nowrap text-left">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              order.delivery_method === 'retiro' 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                : 'bg-sky-50 text-sky-700 border border-sky-200'
                            }`}>
                              {order.delivery_method === 'retiro' ? (
                                <Store className="w-3 h-3" />
                              ) : (
                                <Truck className="w-3 h-3" />
                              )}
                              {order.delivery_method === 'retiro' ? 'Retiro' : 'Envío'}
                            </span>
                          </td>

                          {/* Payment method */}
                          <td className="p-3 font-semibold text-gray-600 truncate max-w-[120px] text-left">
                            {order.payment_method || 'No especificado'}
                          </td>

                          {/* Total Price */}
                          <td className="p-3 text-right font-black text-gray-900 text-sm">
                            ${Number(order.total_price || 0).toFixed(2)}
                          </td>

                          {/* Creation Date / Timer */}
                          <td className="p-3 whitespace-nowrap text-left">
                            <OrderTimer createdAt={order.created_at} status={order.status} currentTime={currentTime} />
                          </td>

                          {/* Interactive Delivery Status select */}
                          <td className="p-3 text-center">
                            <div className="relative inline-block">
                              <select
                                disabled={isUpdating}
                                value={currentStatus.toLowerCase()}
                                onChange={(e) => handlePendingChange(order.id, 'status', e.target.value)}
                                className={`text-[11px] font-black rounded-lg border px-2 py-1 focus:ring-1 focus:ring-[#008296] focus:outline-none font-bold select-none cursor-pointer text-center ${
                                  currentStatus.toLowerCase() === 'recibido' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                                  currentStatus.toLowerCase() === 'preparando' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                                  currentStatus.toLowerCase() === 'listo para retirar' ? 'bg-indigo-50 text-indigo-700 border-indigo-300' :
                                  currentStatus.toLowerCase() === 'en camino' ? 'bg-sky-50 text-sky-700 border-sky-300' :
                                  currentStatus.toLowerCase() === 'entregado' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                  'bg-red-50 text-red-700 border-red-300'
                                } ${pendingChanges[order.id]?.status ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}`}
                              >
                                <option value="recibido">Recibido</option>
                                <option value="preparando">Preparando</option>
                                <option value="listo para retirar">Listo para Retirar</option>
                                <option value="en camino">En Camino</option>
                                <option value="entregado">Entregado</option>
                                <option value="cancelado">Cancelado</option>
                              </select>
                              {isUpdating && (
                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded">
                                  <RefreshCw className="w-3 h-3 animate-spin text-gray-500" />
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Interactive Payment Status select */}
                          <td className="p-3 text-center">
                            <div className="relative inline-block">
                              <select
                                disabled={isUpdating}
                                value={currentPaymentStatus.toLowerCase()}
                                onChange={(e) => handlePendingChange(order.id, 'payment_status', e.target.value)}
                                className={`text-[11px] font-black rounded-lg border px-2.5 py-1 focus:ring-1 focus:ring-[#008296] focus:outline-none font-bold select-none cursor-pointer text-center ${
                                  currentPaymentStatus.toLowerCase() === 'pendiente' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                  currentPaymentStatus.toLowerCase() === 'pagado' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                  'bg-red-100 text-red-800 border-red-300'
                                } ${pendingChanges[order.id]?.payment_status ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}`}
                              >
                                <option value="pendiente">Pendiente</option>
                                <option value="pagado">Pagado</option>
                                <option value="reembolsado">Reembolsado</option>
                              </select>
                              {isUpdating && (
                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded">
                                  <RefreshCw className="w-3 h-3 animate-spin text-gray-500" />
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Actions - View Detail and Confirm Changes */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {hasPendingChanges && (
                                <button
                                  onClick={() => handleConfirmOrderChanges(order.id)}
                                  disabled={isUpdating}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded text-[10px] uppercase tracking-wide flex items-center gap-1 cursor-pointer shadow-xs transition animate-pulse"
                                  title="Confirmar cambios de estado en la base de datos"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Confirmar</span>
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="p-1.5 text-[#008296] hover:bg-sky-50 rounded-lg border border-transparent hover:border-sky-100 transition cursor-pointer"
                                title="Ver Detalle"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}

      </div>
      )}

        </div> {/* End Right Content Pane */}
      </div> {/* End Left Sidebar flex-row container */}

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
                  {editingProduct ? 'Guardar Modificaciones' : 'Guardar Producto'}
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

              {/* Active Toggle */}
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer mt-4">
                <input
                  type="checkbox"
                  checked={catActive}
                  onChange={(e) => setCatActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FF9900] focus:ring-[#FF9900] accent-[#FF9900]"
                />
                <span>Activo y Visible en Catálogo Público</span>
              </label>

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
                  {editingCategory ? 'Guardar Modificaciones' : 'Guardar Categoría'}
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

              {/* Active Toggle */}
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer mt-4">
                <input
                  type="checkbox"
                  checked={brandActive}
                  onChange={(e) => setBrandActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FF9900] focus:ring-[#FF9900] accent-[#FF9900]"
                />
                <span>Activo y Visible en Catálogo Público</span>
              </label>

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
                  {editingBrand ? 'Guardar Modificaciones' : 'Guardar Marca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left border border-gray-200">
            {/* Header */}
            <div className="bg-[#131921] text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[#008296]" />
                  <span>Detalle de Pedido #{String(selectedOrder.order_number || '').padStart(7, '0')}</span>
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                  ID: {selectedOrder.id || 'N/A'} • Recibido: {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : 'N/A'}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content (Scrollable Grid) */}
            <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 leading-normal text-xs text-gray-700">
              
              {/* Left Column: Customer and Payment details (col-span-5) */}
              <div className="md:col-span-5 space-y-4">
                
                {/* Section: Customer Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 space-y-2.5">
                  <h4 className="font-extrabold text-[#131921] uppercase tracking-wider text-[10px] border-b border-gray-200 pb-1.5 flex items-center gap-1.5">
                    Cliente / Contacto
                  </h4>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wide text-[9px]">Nombre completo</p>
                    <p className="font-black text-gray-950 text-sm">{selectedOrder.customer_name}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wide text-[9px]">Teléfono de contacto</p>
                    <p className="font-black text-gray-900 font-mono text-xs">{selectedOrder.phone_number}</p>
                  </div>

                  {/* WhatsApp contact template selector */}
                  <div className="pt-2 border-t border-gray-200 mt-2 space-y-2">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">
                      Plantilla de Mensaje (WhatsApp)
                    </label>
                    <select
                      value={waTemplate}
                      onChange={(e) => setWaTemplate(e.target.value as any)}
                      className="w-full text-xs font-bold bg-white border border-gray-300 rounded p-1.5 text-[#0F1111] focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="default">1. Predeterminado (Datos + Capture)</option>
                      <option value="availability">2. Disponibilidad de Producto</option>
                      <option value="validation">3. Validación de Pago Exitoso</option>
                      <option value="issue">4. Reportar Inconveniente</option>
                    </select>

                    {/* Simple Message Preview */}
                    <div className="bg-emerald-50 border border-emerald-100 p-2 rounded text-[10px] text-gray-700 max-h-24 overflow-y-auto whitespace-pre-line font-medium leading-relaxed">
                      <span className="font-bold text-emerald-800 text-[9px] block mb-1 uppercase tracking-wide">Vista previa del mensaje:</span>
                      {getWhatsAppMessageText(selectedOrder, waTemplate)}
                    </div>

                    <a
                      href={`https://wa.me/${selectedOrder.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent(
                        getWhatsAppMessageText(selectedOrder, waTemplate)
                      )}`}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-[#25D366] hover:bg-[#128C7E] text-white font-black rounded text-[11px] transition shadow cursor-pointer text-center uppercase tracking-wider"
                    >
                      <span>💬 Contactar por WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Section: Delivery info */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 space-y-2.5">
                  <h4 className="font-extrabold text-[#131921] uppercase tracking-wider text-[10px] border-b border-gray-200 pb-1.5 flex items-center gap-1.5">
                    Método de Entrega
                  </h4>

                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wide text-[9px]">Tipo de entrega</p>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      selectedOrder.delivery_method === 'retiro' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-sky-100 text-sky-800'
                    }`}>
                      {selectedOrder.delivery_method === 'retiro' ? <Store className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                      {selectedOrder.delivery_method === 'retiro' ? 'Retiro en Tienda' : 'Envío a Domicilio'}
                    </span>
                  </div>

                  {selectedOrder.delivery_method !== 'retiro' && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wide text-[9px]">Dirección de Envío</p>
                      <p className="font-bold text-gray-800 text-xs bg-white border border-gray-150 p-2 rounded leading-relaxed">
                        {selectedOrder.address_text || 'No proporcionada'}
                      </p>
                    </div>
                  )}

                  {selectedOrder.comments && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wide text-[9px]">Comentarios / Observaciones</p>
                      <p className="text-xs text-gray-600 bg-amber-50 border border-amber-100 p-2 rounded leading-relaxed italic">
                        "{selectedOrder.comments}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Section: Payment Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 space-y-2.5">
                  <h4 className="font-extrabold text-[#131921] uppercase tracking-wider text-[10px] border-b border-gray-200 pb-1.5 flex items-center gap-1.5">
                    Información de Pago
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wide text-[9px]">Método</p>
                      <p className="font-black text-gray-900 capitalize text-xs">
                        {selectedOrder.payment_method || 'N/A'}
                      </p>
                    </div>

                    {selectedOrder.payment_amount_with && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wide text-[9px]">Paga con</p>
                        <p className="font-black text-gray-900 text-xs">
                          ${selectedOrder.payment_amount_with.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedOrder.points && (
                    <div className="bg-sky-50 border border-sky-100 p-2 rounded text-sky-800 text-[11px] font-bold flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-[#FF9900] fill-[#FF9900]" />
                      <span>Generó {selectedOrder.points} puntos de fidelidad.</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Ordered Items Table (col-span-7) */}
              <div className="md:col-span-7 border border-gray-200 rounded-xl overflow-hidden flex flex-col h-full bg-white">
                <div className="bg-[#131921] text-white py-2 px-3 font-extrabold uppercase tracking-wide text-[10px]">
                  Artículos del Pedido
                </div>
                
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-[300px]">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item, index) => (
                      <div key={index} className="p-3 flex justify-between items-center hover:bg-gray-50/50 transition gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 text-xs truncate" title={item.name}>{item.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono font-bold mt-0.5">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right flex-shrink-0 font-bold text-xs font-semibold">
                          <span className="text-gray-400 font-semibold">{item.quantity} x </span>
                          <span className="text-gray-900 font-bold">${item.price.toFixed(2)}</span>
                          <p className="text-[#008296] font-black text-xs mt-0.5">
                            ${(item.quantity * item.price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-gray-400">
                      No hay artículos detallados en este registro.
                    </div>
                  )}
                </div>

                {/* Subtotal & Total summaries */}
                <div className="bg-gray-50 p-4 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between font-semibold text-gray-500">
                    <span>Subtotal</span>
                    <span>${Number(selectedOrder.total_price || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-500">
                    <span>Cargos de Envío</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between font-black text-gray-950 text-sm border-t border-gray-200 pt-2">
                    <span>TOTAL GENERAL</span>
                    <span className="text-[#008296] text-base">${Number(selectedOrder.total_price || 0).toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Quick States Updates in Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs">
              
              {/* Quick Status Selects inside modal */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-500">Estado de la Entrega:</span>
                  <select
                    value={(pendingChanges[selectedOrder.id]?.status ?? selectedOrder.status).toLowerCase()}
                    onChange={(e) => handlePendingChange(selectedOrder.id, 'status', e.target.value)}
                    className={`font-black rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-[#008296] border cursor-pointer ${
                      (pendingChanges[selectedOrder.id]?.status ?? selectedOrder.status).toLowerCase() === 'recibido' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                      (pendingChanges[selectedOrder.id]?.status ?? selectedOrder.status).toLowerCase() === 'preparando' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                      (pendingChanges[selectedOrder.id]?.status ?? selectedOrder.status).toLowerCase() === 'listo para retirar' ? 'bg-indigo-50 text-indigo-700 border-indigo-300' :
                      (pendingChanges[selectedOrder.id]?.status ?? selectedOrder.status).toLowerCase() === 'en camino' ? 'bg-sky-50 text-sky-700 border-sky-300' :
                      (pendingChanges[selectedOrder.id]?.status ?? selectedOrder.status).toLowerCase() === 'entregado' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                      'bg-red-50 text-red-700 border-red-300'
                    } ${(pendingChanges[selectedOrder.id]?.status) ? 'ring-2 ring-emerald-500' : ''}`}
                  >
                    <option value="recibido">Recibido</option>
                    <option value="preparando">Preparando</option>
                    <option value="listo para retirar">Listo para Retirar</option>
                    <option value="en camino">En Camino</option>
                    <option value="entregado">Entregado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-500">Estado del Pago:</span>
                  <select
                    value={(pendingChanges[selectedOrder.id]?.payment_status ?? (selectedOrder.payment_status || 'pendiente')).toLowerCase()}
                    onChange={(e) => handlePendingChange(selectedOrder.id, 'payment_status', e.target.value)}
                    className={`font-black rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-[#008296] border cursor-pointer ${
                      (pendingChanges[selectedOrder.id]?.payment_status ?? (selectedOrder.payment_status || 'pendiente')).toLowerCase() === 'pendiente' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                      (pendingChanges[selectedOrder.id]?.payment_status ?? (selectedOrder.payment_status || 'pendiente')).toLowerCase() === 'pagado' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      'bg-red-100 text-red-800 border-red-300'
                    } ${(pendingChanges[selectedOrder.id]?.payment_status) ? 'ring-2 ring-emerald-500' : ''}`}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                    <option value="reembolsado">Reembolsado</option>
                  </select>
                </div>

                {pendingChanges[selectedOrder.id] && (
                  <button
                    type="button"
                    onClick={() => handleConfirmOrderChanges(selectedOrder.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded text-xs cursor-pointer shadow flex items-center gap-1 transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirmar Cambios</span>
                  </button>
                )}
              </div>

              {/* Close Button */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white font-black rounded text-xs cursor-pointer shadow-md"
                >
                  Cerrar Detalles
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
