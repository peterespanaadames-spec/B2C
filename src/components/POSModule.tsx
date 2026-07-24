import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Trash2, Search, Pause, Play, CheckCircle, 
  AlertCircle, FileText, X, Printer, Loader2, Plus, Minus, Eye, RefreshCw,
  User, Users, UserPlus
} from 'lucide-react';
import { Product } from '../types';
import { CurrencyCode, formatCurrency } from '../lib/currency';
import { dbService } from '../lib/supabase';

interface POSModuleProps {
  products: Product[];
  bcvRate: number;
  activeCurrency: CurrencyCode;
  currencyRates: Record<CurrencyCode, number>;
  onRefreshData?: () => void;
}

interface CartQtyInputProps {
  initialQty: number;
  stock: number;
  onQtyChange: (newQty: number) => void;
}

const CartQtyInput: React.FC<CartQtyInputProps> = ({ initialQty, stock, onQtyChange }) => {
  const [localVal, setLocalVal] = useState<string>(initialQty.toString());

  useEffect(() => {
    setLocalVal(initialQty.toString());
  }, [initialQty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (/^\d*$/.test(rawVal)) {
      setLocalVal(rawVal);
      const numericVal = parseInt(rawVal, 10);
      if (!isNaN(numericVal) && numericVal > 0) {
        if (numericVal <= stock) {
          onQtyChange(numericVal);
        } else {
          onQtyChange(stock);
        }
      }
    }
  };

  const handleBlur = () => {
    const numericVal = parseInt(localVal, 10);
    if (isNaN(numericVal) || numericVal <= 0) {
      setLocalVal("1");
      onQtyChange(1);
    } else if (numericVal > stock) {
      setLocalVal(stock.toString());
      onQtyChange(stock);
    } else {
      setLocalVal(numericVal.toString());
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      className="w-11 py-0.5 text-center font-extrabold text-gray-800 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005da9] focus:bg-white transition"
    />
  );
};

export default function POSModule({ 
  products, 
  bcvRate, 
  activeCurrency, 
  currencyRates,
  onRefreshData
}: POSModuleProps) {
  // Cart state
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('Consumidor final');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');

  // Clients database for autocomplete
  const [clients, setClients] = useState<any[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);

  const handleClientChange = (val: string) => {
    setSelectedClient(val);
    if (!val.trim()) {
      setFilteredClients([]);
      setShowClientSuggestions(false);
      return;
    }
    const filtered = clients.filter(c => 
      (c.name || '').toLowerCase().includes(val.toLowerCase()) ||
      (c.document || '').toLowerCase().includes(val.toLowerCase())
    );
    setFilteredClients(filtered);
    setShowClientSuggestions(filtered.length > 0);
  };

  // Database lists
  const [invoiceHistory, setInvoiceHistory] = useState<any[]>([]);
  const [draftInvoices, setDraftInvoices] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'drafts'>('history');
  
  // Loading & interactive UI states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftReference, setDraftReference] = useState('');
  
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [pendingDraftToResume, setPendingDraftToResume] = useState<any>(null);
  
  const [completedInvoice, setCompletedInvoice] = useState<any>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  // Search and quick add client modals
  const [showClientSearchModal, setShowClientSearchModal] = useState(false);
  const [showQuickClientModal, setShowQuickClientModal] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  
  // Quick client form states
  const [newClientName, setNewClientName] = useState('');
  const [newClientDocument, setNewClientDocument] = useState('');
  const [newClientType, setNewClientType] = useState<'Natural' | 'Jurídico'>('Natural');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCredit, setNewClientCredit] = useState('0');

  const handleQuickRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      showToast('error', 'El nombre es obligatorio.');
      return;
    }
    if (!newClientDocument.trim()) {
      showToast('error', 'El documento o C.I. / RIF es obligatorio.');
      return;
    }

    setIsLoading(true);
    try {
      const clientPayload = {
        name: newClientName.trim(),
        document: newClientDocument.trim(),
        type: newClientType,
        phone: newClientPhone.trim(),
        email: newClientEmail.trim(),
        credit_usd: parseFloat(newClientCredit) || 0
      };

      const created = await dbService.createClient(clientPayload);
      if (created) {
        showToast('success', '¡Cliente registrado y seleccionado exitosamente!');
        // Update client list
        setClients(prev => [created, ...prev]);
        setSelectedClient(created.name);
        // Reset states
        setNewClientName('');
        setNewClientDocument('');
        setNewClientType('Natural');
        setNewClientPhone('');
        setNewClientEmail('');
        setNewClientCredit('0');
        setShowQuickClientModal(false);
      } else {
        showToast('error', 'No se pudo crear el cliente.');
      }
    } catch (err: any) {
      console.error('Error in quick client creation:', err);
      showToast('error', `Error al registrar cliente: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load invoices and draft invoices from Supabase
  const loadInvoiceData = async () => {
    setIsLoadingData(true);
    try {
      const [invoices, drafts, dbClientsList] = await Promise.all([
        dbService.getInvoices(),
        dbService.getDraftInvoices(),
        dbService.getClients()
      ]);
      setInvoiceHistory(invoices);
      setDraftInvoices(drafts);
      setClients(dbClientsList);
    } catch (err) {
      console.error('Error loading invoices/drafts/clients data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadInvoiceData();
  }, [products]);

  // Display ephemeral toast notification
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  // Search filter
  const filteredProducts = searchTerm.trim() === ''
    ? products.filter(p => p.active).slice(0, 6) // default quick-select items
    : products.filter(p => 
        p.active && (
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      );

  // Cart operations
  const addToCart = (product: Product) => {
    // Check if item has stock
    if (product.stock <= 0) {
      showToast('error', `El producto "${product.name}" no tiene stock disponible.`);
      return;
    }

    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].qty;
      if (currentQty >= product.stock) {
        showToast('error', `No hay más stock disponible para "${product.name}" (${product.stock} unidades máx).`);
        return;
      }
      const newCart = [...cart];
      newCart[existingIndex].qty += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
    showToast('success', `Se agregó "${product.name}" al carrito.`);
  };

  const updateQty = (productId: string, newQty: number) => {
    const item = cart.find(item => item.product.id === productId);
    if (!item) return;

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > item.product.stock) {
      showToast('error', `Cantidad solicitada excede el stock disponible (${item.product.stock} unidades máx).`);
      return;
    }

    setCart(cart.map(item => 
      item.product.id === productId ? { ...item, qty: newQty } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
    showToast('success', 'Producto removido del carrito.');
  };

  // ⏸️ POSPONE SALE / PUT ON HOLD (AUTOMATIC)
  const handlePostponeSale = async () => {
    if (cart.length === 0) {
      showToast('error', 'Debe agregar al menos un producto al carrito para postergar la venta.');
      return;
    }

    setIsLoading(true);
    try {
      // Generate sequential draft reference
      let calculatedDraftRef = '';
      if (activeDraftId) {
        const existingDraft = draftInvoices.find(d => d.id === activeDraftId);
        if (existingDraft) {
          calculatedDraftRef = existingDraft.reference;
        }
      }

      if (!calculatedDraftRef) {
        const count = draftInvoices.length;
        calculatedDraftRef = `ESP-${1001 + count}`;
      }

      // Create draft details matching db structure
      const draftItems = cart.map(item => ({
        product_id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        qty: item.qty,
        price: item.product.price,
        total: item.product.price * item.qty
      }));

      // Delete the old draft before saving the updated one so we don't have duplicates
      if (activeDraftId) {
        await dbService.deleteDraftInvoice(activeDraftId);
      }

      await dbService.createDraftInvoice({
        reference: calculatedDraftRef,
        customer_name: selectedClient,
        payment_method: paymentMethod,
        subtotal: subtotal,
        iva: iva,
        total: total,
        items: draftItems
      });

      // Clear current sale
      setCart([]);
      setSelectedClient('Consumidor final');
      setPaymentMethod('Efectivo');
      setActiveDraftId(null);
      
      // Reload lists
      await loadInvoiceData();
      
      showToast('success', `Venta postergada en espera con código: ${calculatedDraftRef}`);
    } catch (err: any) {
      console.error('Error postponing sale:', err);
      showToast('error', `Error al postergar venta: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 🟢 RESUME POSTPONED SALE
  const handleResumeDraft = (draft: any) => {
    setPendingDraftToResume(draft);
    if (cart.length > 0) {
      setShowMergeModal(true);
    } else {
      executeResumeDraft(draft, 'replace');
    }
  };

  const executeResumeDraft = async (draft: any, mode: 'merge' | 'replace') => {
    try {
      setIsLoading(true);
      
      // Fetch full products list to ensure up-to-date prices and stock
      const updatedCart: { product: Product; qty: number }[] = mode === 'merge' ? [...cart] : [];

      for (const draftItem of draft.items) {
        const foundProduct = products.find(p => p.id === draftItem.product_id);
        if (!foundProduct) {
          // If the product doesn't exist in the catalog anymore, recreate a mock/fallback product
          continue;
        }

        const existingIndex = updatedCart.findIndex(item => item.product.id === foundProduct.id);
        if (existingIndex > -1) {
          // Merge mode: Add quantities up to available stock
          const newQty = updatedCart[existingIndex].qty + draftItem.qty;
          updatedCart[existingIndex].qty = Math.min(newQty, foundProduct.stock);
        } else {
          updatedCart.push({
            product: foundProduct,
            qty: Math.min(draftItem.qty, foundProduct.stock)
          });
        }
      }

      setCart(updatedCart);
      setSelectedClient(draft.customer_name);
      setPaymentMethod(draft.payment_method);
      
      // Keep draft in DB but mark as active draft being edited in POS
      setActiveDraftId(draft.id);
      
      // Hide dialogs and reload
      setShowMergeModal(false);
      setPendingDraftToResume(null);
      await loadInvoiceData();
      
      showToast('success', `Factura pospuesta de "${draft.reference}" cargada con éxito.`);
    } catch (err: any) {
      console.error('Error resuming draft:', err);
      showToast('error', `No se pudo retomar la factura: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDraft = async (id: string, ref: string) => {
    if (!confirm(`¿Está seguro de eliminar la factura en espera de "${ref}"?`)) return;
    
    setIsLoading(true);
    try {
      await dbService.deleteDraftInvoice(id);
      await loadInvoiceData();
      showToast('success', 'Factura en espera eliminada.');
    } catch (err: any) {
      console.error('Error deleting draft:', err);
      showToast('error', 'Error al eliminar factura en espera.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintInvoice = (invoice: any) => {
    if (!invoice) return;
    
    // Create hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      window.print();
      return;
    }
    
    // Build items HTML
    const itemsHtml = invoice.items?.map((item: any) => `
      <tr style="font-family: monospace; font-size: 11px;">
        <td style="padding: 4px 0; max-width: 150px; word-break: break-all; text-align: left;">
          <b>${item.name}</b><br/>
          <span style="font-size: 9px; color: #666;">Ref: ${item.sku || ''}</span>
        </td>
        <td style="text-align: center; padding: 4px 0; vertical-align: top;">${item.qty}</td>
        <td style="text-align: right; padding: 4px 0; vertical-align: top;">
          ${formatCurrency(item.total, activeCurrency, currencyRates)}
        </td>
      </tr>
    `).join('') || '';
    
    const subtotalFormatted = formatCurrency(invoice.subtotal, activeCurrency, currencyRates);
    const ivaFormatted = formatCurrency(invoice.iva, activeCurrency, currencyRates);
    const totalFormatted = formatCurrency(invoice.total, activeCurrency, currencyRates);
    const totalBs = `Bs. ${(invoice.total * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const bcvTasa = bcvRate.toFixed(2);
    const fecha = new Date(invoice.created_at).toLocaleString('es-VE');

    iframeDoc.open();
    iframeDoc.write(`
      <html>
        <head>
          <title>Recibo - ${invoice.control_number}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
              background: #fff;
              padding: 15px;
              width: 72mm;
              margin: 0 auto;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .dashed-line {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            .mb-5 { margin-bottom: 20px; }
            .mb-2 { margin-bottom: 8px; }
            .w-full { width: 100%; }
            table { width: 100%; border-collapse: collapse; }
            .header-info { margin-bottom: 15px; }
            .header-info p { margin: 2px 0; font-size: 10px; }
            .totals-table td { padding: 3px 0; }
            .equivalent-box {
              border: 1px dashed #000;
              padding: 8px;
              margin-top: 15px;
              text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="text-center mb-5">
            <h3 style="margin: 0 0 5px 0; font-size: 13px;">TIENDA & DISTRIBUIDORA DE CAJA</h3>
            <p style="margin: 2px 0; font-size: 10px;">RIF: J-40899124-1</p>
            <p style="margin: 2px 0; font-size: 9px;">Av. Principal, Edif. Central, Caracas, Venezuela</p>
            <p style="margin: 2px 0; font-size: 9px;">Telf: 0212-5551234</p>
          </div>
          
          <div class="dashed-line"></div>
          
          <div class="header-info">
            <table style="font-size: 10px;">
              <tr><td><b>CONTROL N&deg;:</b></td><td class="text-right"><b>${invoice.control_number}</b></td></tr>
              <tr><td>FECHA EMISI&Oacute;N:</td><td class="text-right">${fecha}</td></tr>
              <tr><td>CLIENTE:</td><td class="text-right"><b>${invoice.customer_name}</b></td></tr>
              <tr><td>M&Eacute;TODO PAGO:</td><td class="text-right"><b>${invoice.payment_method}</b></td></tr>
            </table>
          </div>
          
          <div class="dashed-line"></div>
          
          <table style="margin-bottom: 10px;">
            <thead>
              <tr style="font-size: 10px; font-weight: bold; border-bottom: 1px dashed #000;">
                <th style="text-align: left; padding-bottom: 4px;">DETALLE</th>
                <th style="text-align: center; padding-bottom: 4px;">CANT</th>
                <th style="text-align: right; padding-bottom: 4px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="dashed-line"></div>
          
          <table class="totals-table">
            <tr><td>SUBTOTAL:</td><td class="text-right">${subtotalFormatted}</td></tr>
            <tr><td>IVA (16.00%):</td><td class="text-right">${ivaFormatted}</td></tr>
            <tr style="font-size: 12px; font-weight: bold; border-top: 1px dashed #000;">
              <td style="padding-top: 5px;">TOTAL NETO:</td>
              <td class="text-right" style="padding-top: 5px;">${totalFormatted}</td>
            </tr>
          </table>
          
          <div class="equivalent-box">
            <span style="font-size: 8px; font-weight: bold; display: block; margin-bottom: 2px; text-transform: uppercase;">Pago en Divisas / Bs. BCV</span>
            <div style="font-size: 12px; font-weight: bold;">${totalBs}</div>
            <div style="font-size: 9px; color: #555;">Tasa Oficial BCV: 1 USD = Bs. ${bcvTasa}</div>
          </div>
          
          <div class="text-center" style="margin-top: 20px; font-size: 9px;">
            <p>*** GRACIAS POR SU COMPRA ***</p>
            <p>Este documento es una representación digital de la factura fiscal.</p>
          </div>
          
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() {
                window.frameElement.parentNode.removeChild(window.frameElement);
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    iframeDoc.close();
  };

  // 📝 + FACTURAR (FINALIZE SALE AND DECREASE STOCK)
  const handleFinalizeInvoice = async () => {
    if (cart.length === 0) {
      showToast('error', 'El carrito está vacío. Agregue productos para facturar.');
      return;
    }

    // Double check stock quantities before finalizing
    const stockErrors = cart.filter(item => item.qty > item.product.stock);
    if (stockErrors.length > 0) {
      showToast('error', `No hay suficiente inventario para los siguientes productos: ${stockErrors.map(e => e.product.name).join(', ')}`);
      return;
    }

    setIsLoading(true);
    try {
      // 1. REBAJAR EL INVENTARIO / DECREASE THE INVENTORY STOCK
      for (const item of cart) {
        const currentStock = item.product.stock;
        const newStock = Math.max(0, currentStock - item.qty);
        // Persist stock update in Products Table
        await dbService.updateProduct(item.product.id, { stock: newStock });
      }

      // 2. Structure invoice items
      const invoiceItems = cart.map(item => ({
        product_id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        qty: item.qty,
        price: item.product.price,
        total: item.product.price * item.qty
      }));

      // 3. Create the Invoice in Supabase
      const created = await dbService.createInvoice({
        customer_name: selectedClient,
        payment_method: paymentMethod,
        subtotal: subtotal,
        iva: iva,
        total: total,
        items: invoiceItems
      });

      // 3.5 Delete the draft from the wait list since it is now emitted/finalized
      if (activeDraftId) {
        try {
          await dbService.deleteDraftInvoice(activeDraftId);
        } catch (delErr) {
          console.error("Failed to delete draft after finalizing invoice:", delErr);
        }
        setActiveDraftId(null);
      }

      // 4. Trigger main product data refresh to sync stocks globally
      if (onRefreshData) {
        onRefreshData();
      }

      // 5. Open print receipt modal & clear states
      setCompletedInvoice(created);
      setCart([]);
      setSelectedClient('Consumidor final');
      setPaymentMethod('Efectivo');
      
      // 6. Reload history lists
      await loadInvoiceData();
      showToast('success', '¡Factura generada e inventario rebajado exitosamente!');
    } catch (err: any) {
      console.error('Error finalizing invoice:', err);
      showToast('error', `Error al procesar facturación: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const activeClientObj = clients.find(c => (c.name || '').toLowerCase() === selectedClient.toLowerCase());

  return (
    <div className="relative text-left p-4 md:p-6 bg-gray-50/50 min-h-screen">
      {/* Toast alert system */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* POS Top Header Grid */}
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* PANEL IZQUIERDO: BUSCADOR, CARRITO Y TABLA INFERIOR */}
        <div className="flex-1 space-y-6">
          
          {/* PANEL IZQUIERDO SUPERIOR: Buscador e Items agregados */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-xs p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-[#005da9] rounded-xl">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-800 uppercase tracking-tight">Caja Registradora</h2>
                  <p className="text-[10px] text-gray-400 font-bold">Módulo de ventas y facturación rápida</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={loadInvoiceData}
                  disabled={isLoadingData}
                  className="p-1.5 text-gray-400 hover:text-[#005da9] hover:bg-gray-50 rounded-lg transition"
                  title="Sincronizar Datos de Caja"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                </button>
                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-black uppercase">
                  Tasa BCV: Bs. {bcvRate.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Buscador de productos */}
            <div className="relative mb-5">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar por SKU, nombre, marca o categoría..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#005da9] focus:bg-white transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Resultados de búsqueda o productos rápidos */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">
                  {searchTerm ? 'Resultados de búsqueda' : 'Productos Rápidos / Sugeridos'}
                </span>
                {searchTerm && (
                  <span className="text-[9px] text-gray-400 font-bold">
                    {filteredProducts.length} coincidencias
                  </span>
                )}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-100 text-center text-xs text-gray-400 font-medium">
                  No se encontraron productos que coincidan con la búsqueda.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredProducts.map((p) => {
                    const isInCart = cart.some(item => item.product.id === p.id);
                    const isOutOfStock = p.stock <= 0;
                    
                    return (
                      <div 
                        key={p.id}
                        onClick={() => !isOutOfStock && addToCart(p)}
                        className={`p-3 border rounded-xl flex flex-col justify-between transition text-left relative overflow-hidden ${
                          isOutOfStock 
                            ? 'bg-gray-50/70 border-gray-100 opacity-60 cursor-not-allowed' 
                            : 'bg-white border-gray-200 hover:border-[#005da9] hover:shadow-xs cursor-pointer'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[11px] font-black text-gray-800 line-clamp-1 leading-snug">{p.name}</span>
                            {isInCart && (
                              <span className="bg-emerald-50 text-emerald-800 text-[8px] font-black uppercase px-1 rounded border border-emerald-200 shrink-0">
                                En caja
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-gray-400 font-mono font-bold block">{p.sku}</span>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-50">
                          <span className="text-xs font-extrabold text-[#005da9]">
                            {formatCurrency(p.price, activeCurrency, currencyRates)}
                          </span>
                          
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            p.stock > 10 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : p.stock > 0 
                                ? 'bg-amber-50 text-amber-700' 
                                : 'bg-rose-50 text-rose-700'
                          }`}>
                            {p.stock > 0 ? `${p.stock} disp.` : 'Agotado'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tabla de ítems en carrito */}
            <div>
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider block mb-2">
                Productos Agregados a la Venta ({cart.reduce((sum, item) => sum + item.qty, 0)} items)
              </span>

              {activeDraftId && (
                <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <Pause className="w-3.5 h-3.5 text-amber-700 fill-amber-700 animate-pulse shrink-0" />
                    <div>
                      <span className="font-extrabold text-amber-900">Retomando Factura en Espera</span>
                      <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100/80 border border-amber-300 text-amber-900 font-mono font-bold rounded text-[10px]">
                        {draftInvoices.find(d => d.id === activeDraftId)?.reference || 'ESP-XXXX'}
                      </span>
                      <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                        Esta factura se eliminará de la lista de espera automáticamente una vez que completes y emitas la factura.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCart([]);
                      setSelectedClient('Consumidor final');
                      setPaymentMethod('Efectivo');
                      setActiveDraftId(null);
                      showToast('success', 'Edición de factura en espera cancelada.');
                    }}
                    className="shrink-0 px-2.5 py-1 bg-amber-100 hover:bg-amber-200/80 text-amber-900 font-bold rounded-lg text-[10px] uppercase transition cursor-pointer"
                  >
                    Descartar Edición
                  </button>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="py-12 bg-gray-50/30 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                  <ShoppingCart className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-xs font-bold text-gray-500">La caja está vacía</p>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-[280px]">Seleccione productos arriba para comenzar a estructurar la venta.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase text-[9px]">
                      <tr>
                        <th className="p-3">Producto</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3 text-center">Cantidad</th>
                        <th className="p-3 text-right">Precio Unit.</th>
                        <th className="p-3 text-center">IVA</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {cart.map((item) => (
                        <tr key={item.product.id} className="hover:bg-gray-50/50">
                          <td className="p-3">
                            <span className="font-extrabold text-gray-800 block">{item.product.name}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-medium text-gray-400">{item.product.sku}</span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button 
                                onClick={() => updateQty(item.product.id, item.qty - 1)}
                                className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center transition shrink-0"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <CartQtyInput 
                                initialQty={item.qty}
                                stock={item.product.stock}
                                onQtyChange={(newQty) => updateQty(item.product.id, newQty)}
                              />
                              <button 
                                onClick={() => updateQty(item.product.id, item.qty + 1)}
                                className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center transition shrink-0"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-right font-extrabold text-gray-700">
                            {formatCurrency(item.product.price, activeCurrency, currencyRates)}
                          </td>
                          <td className="p-3 text-center text-gray-400 font-bold">16%</td>
                          <td className="p-3 text-right font-black text-gray-800">
                            {formatCurrency(item.product.price * item.qty, activeCurrency, currencyRates)}
                          </td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => removeFromCart(item.product.id)}
                              className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                              title="Eliminar de caja"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* PANEL IZQUIERDO INFERIOR: Tabla de facturas y ventas en espera */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-xs p-5">
            <div className="flex border-b border-gray-100 mb-4">
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 pb-2.5 px-4 text-xs font-black uppercase transition-all border-b-2 -mb-px ${
                  activeTab === 'history' 
                    ? 'border-[#005da9] text-[#005da9]' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Últimas Facturas</span>
              </button>
              <button
                onClick={() => setActiveTab('drafts')}
                className={`flex items-center gap-2 pb-2.5 px-4 text-xs font-black uppercase transition-all border-b-2 -mb-px ${
                  activeTab === 'drafts' 
                    ? 'border-[#005da9] text-[#005da9]' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Pause className="w-3.5 h-3.5" />
                <span>En Espera ({draftInvoices.length})</span>
              </button>
            </div>

            {/* CONTENIDO TAB 1: HISTORIAL DE FACTURAS */}
            {activeTab === 'history' && (
              <div>
                {invoiceHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400 font-medium">
                    No se han registrado facturas en el sistema todavía.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase text-[9px]">
                        <tr>
                          <th className="p-3">Factura N°</th>
                          <th className="p-3">Cliente</th>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Método</th>
                          <th className="p-3 text-right">Total</th>
                          <th className="p-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {invoiceHistory.slice(0, 8).map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50/50">
                            <td className="p-3 font-mono font-bold text-[#005da9]">{inv.control_number}</td>
                            <td className="p-3 font-semibold text-gray-700">{inv.customer_name}</td>
                            <td className="p-3 text-gray-400">
                              {new Date(inv.created_at).toLocaleString('es-VE', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: true
                              })}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-bold">
                                {inv.payment_method}
                              </span>
                            </td>
                            <td className="p-3 text-right font-black text-gray-800">
                              {formatCurrency(inv.total, activeCurrency, currencyRates)}
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => setCompletedInvoice(inv)}
                                className="p-1 bg-blue-50 text-[#005da9] hover:bg-blue-100 rounded transition inline-flex items-center gap-1 text-[10px] font-black"
                                title="Ver Factura Completa / Recibo"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CONTENIDO TAB 2: VENTAS EN ESPERA */}
            {activeTab === 'drafts' && (
              <div>
                {draftInvoices.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400 font-medium">
                    No hay facturas en espera. Utilice "Poner en espera" para pausar ventas.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase text-[9px]">
                        <tr>
                          <th className="p-3">Ref / Identificador</th>
                          <th className="p-3">Cliente</th>
                          <th className="p-3 text-center">Items</th>
                          <th className="p-3">Hora Creación</th>
                          <th className="p-3 text-right">Total</th>
                          <th className="p-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {draftInvoices.map((draft) => {
                          const totalItemsCount = draft.items?.reduce((sum: number, i: any) => sum + i.qty, 0) || 0;
                          return (
                            <tr key={draft.id} className="hover:bg-gray-50/50">
                              <td className="p-3">
                                <span className="font-extrabold text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                                  {draft.reference}
                                </span>
                              </td>
                              <td className="p-3 text-gray-700 font-semibold">{draft.customer_name}</td>
                              <td className="p-3 text-center font-bold text-gray-600">{totalItemsCount} u</td>
                              <td className="p-3 text-gray-400">
                                {new Date(draft.created_at).toLocaleTimeString('es-VE', {
                                  hour: '2-digit', minute: '2-digit', hour12: true
                                })}
                              </td>
                              <td className="p-3 text-right font-black text-gray-800">
                                {formatCurrency(draft.total, activeCurrency, currencyRates)}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button 
                                    onClick={() => handleResumeDraft(draft)}
                                    className="px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg transition text-[10px] font-black flex items-center gap-1"
                                    title="Retomar Factura"
                                  >
                                    <Play className="w-3 h-3 fill-emerald-800" />
                                    <span>Retomar</span>
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteDraft(draft.id, draft.reference)}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                    title="Eliminar factura en espera"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: DATOS DE FACTURA */}
        <div className="w-full xl:w-96 shrink-0">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-xs p-5 sticky top-4">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-tight mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span>Datos de Factura</span>
            </h2>

            {/* Datos de cliente */}
            <div className="mb-4">
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Nombre o Razón Social Cliente</label>
              <div className="flex gap-1.5 relative">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={selectedClient}
                    onChange={(e) => handleClientChange(e.target.value)}
                    onFocus={() => { if (selectedClient && selectedClient !== 'Consumidor final') setShowClientSuggestions(filteredClients.length > 0); }}
                    onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9] focus:bg-white transition"
                    placeholder="Consumidor final o nombre cliente"
                  />
                  {showClientSuggestions && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100 text-xs text-left">
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => {
                            setSelectedClient(c.name);
                            setShowClientSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 flex flex-col gap-0.5"
                        >
                          <span className="font-extrabold text-gray-900">{c.name}</span>
                          <span className="font-mono text-[9px] text-gray-400">{c.document} | {c.phone || 'Sin teléfono'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Search button */}
                <button
                  type="button"
                  onClick={() => {
                    setClientSearchQuery('');
                    setShowClientSearchModal(true);
                  }}
                  title="Buscar Cliente en Base de Datos"
                  className="p-2 bg-gray-100 hover:bg-[#005da9] hover:text-white text-gray-600 rounded-xl transition flex items-center justify-center shrink-0 w-9 h-9 border border-gray-200/50 hover:border-transparent"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Quick Register button */}
                <button
                  type="button"
                  onClick={() => {
                    setNewClientName(selectedClient !== 'Consumidor final' ? selectedClient : '');
                    setNewClientDocument('');
                    setNewClientPhone('');
                    setNewClientEmail('');
                    setNewClientType('Natural');
                    setNewClientCredit('0');
                    setShowQuickClientModal(true);
                  }}
                  title="Registrar Nuevo Cliente"
                  className="p-2 bg-gray-100 hover:bg-emerald-600 hover:text-white text-gray-600 rounded-xl transition flex items-center justify-center shrink-0 w-9 h-9 border border-gray-200/50 hover:border-transparent"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>

              {/* Client detailed info card or unregistered warning */}
              {selectedClient && selectedClient !== 'Consumidor final' && (
                activeClientObj ? (
                  <div className="mt-2.5 p-3.5 bg-[#005da9]/5 border border-[#005da9]/10 rounded-2xl space-y-1.5 text-xs text-gray-700 relative animate-fade-in">
                    <div className="flex justify-between items-center pb-1 border-b border-gray-100">
                      <span className="font-extrabold text-[#005da9] flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        <span>Cliente Registrado</span>
                      </span>
                      <button 
                        type="button"
                        onClick={() => setSelectedClient('Consumidor final')} 
                        className="text-red-500 hover:text-red-700 font-bold uppercase text-[9px] hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase font-black leading-none mb-0.5">Nombre</span>
                        <span className="font-bold text-gray-800 break-words">{activeClientObj.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase font-black leading-none mb-0.5">C.I. / RIF</span>
                        <span className="font-mono font-bold text-gray-800">{activeClientObj.document}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-gray-400 block text-[9px] uppercase font-black leading-none mb-0.5">Teléfono</span>
                        <span className="font-bold text-gray-800">{activeClientObj.phone || 'No registrado'}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-gray-400 block text-[9px] uppercase font-black leading-none mb-0.5">Saldo / Crédito</span>
                        <span className={`font-black ${activeClientObj.credit_usd > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                          ${Number(activeClientObj.credit_usd || 0).toFixed(2)}
                        </span>
                      </div>
                      {activeClientObj.email && (
                        <div className="col-span-2 mt-1">
                          <span className="text-gray-400 block text-[9px] uppercase font-black leading-none mb-0.5">Correo Electrónico</span>
                          <span className="font-bold text-gray-800 break-all">{activeClientObj.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 p-3 bg-amber-50 border border-amber-100 rounded-2xl space-y-1.5 text-xs text-amber-800">
                    <div className="flex items-center gap-1 font-bold text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Cliente no registrado</span>
                    </div>
                    <p className="text-[10px] text-amber-700 leading-snug">
                      Este cliente se guardará automáticamente en el sistema al finalizar la factura.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setNewClientName(selectedClient);
                        setNewClientDocument('');
                        setNewClientPhone('');
                        setNewClientEmail('');
                        setNewClientType('Natural');
                        setNewClientCredit('0');
                        setShowQuickClientModal(true);
                      }}
                      className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-950 font-black px-2.5 py-1.5 rounded-xl transition flex items-center justify-center gap-1 w-full"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Registrar Datos Completos</span>
                    </button>
                  </div>
                )
              )}
            </div>

            {/* Método de pago */}
            <div className="mb-5">
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Método de Pago</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)} 
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9] focus:bg-white transition"
              >
                <option value="Efectivo USD">💵 Efectivo Dólares (USD)</option>
                <option value="Efectivo VES">💵 Efectivo Bolívares (VES)</option>
                <option value="Pago Móvil">📱 Pago Móvil</option>
                <option value="Punto de Venta">💳 Punto de Venta (Tarjeta)</option>
                <option value="Euro">💶 Euro (EUR)</option>
                <option value="Pesos Colombianos">🇨🇴 Peso Colombiano (COP)</option>
              </select>
            </div>

            {/* Resumen de totales */}
            <div className="bg-gray-50/50 rounded-2xl p-4 space-y-2.5 border border-gray-100 mb-6">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-bold">Subtotal</span>
                <span className="font-extrabold text-gray-800">
                  {formatCurrency(subtotal, activeCurrency, currencyRates)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-bold">IVA (16%)</span>
                <span className="font-extrabold text-gray-800">
                  {formatCurrency(iva, activeCurrency, currencyRates)}
                </span>
              </div>
              
              <div className="border-t border-gray-200/50 my-2 pt-2.5 flex justify-between items-end">
                <div>
                  <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">Total Neto</span>
                  <span className="text-lg font-black text-[#131921] leading-none">
                    {formatCurrency(total, activeCurrency, currencyRates)}
                  </span>
                </div>
                {activeCurrency !== 'VES' && (
                  <div className="text-right">
                    <span className="text-[8px] text-gray-400 font-black uppercase tracking-wider block">Equiv. BCV</span>
                    <span className="text-xs font-bold text-gray-600 font-mono">
                      Bs. {(total * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* BOTONES DE ACCIÓN PRINCIPALES */}
            <div className="space-y-2">
              <button 
                onClick={handleFinalizeInvoice}
                disabled={isLoading}
                className="w-full py-3 bg-[#005da9] hover:bg-[#004b88] disabled:bg-gray-300 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Facturar e Imprmir</span>
                  </>
                )}
              </button>

              <button 
                onClick={handlePostponeSale}
                disabled={isLoading || cart.length === 0}
                className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 disabled:bg-gray-100 disabled:text-gray-300 text-amber-800 border border-amber-200/80 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Pause className="w-3.5 h-3.5 fill-amber-800" />
                <span>Poner en Espera</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------- MODAL: CONFIRMACIÓN FUSIONAR / REEMPLAZAR DRAFT -------------------- */}
      {showMergeModal && pendingDraftToResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-gray-100 w-full max-w-sm shadow-2xl p-5 relative text-left">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-black uppercase tracking-tight">Caja Ocupada</h3>
            </div>
            <p className="text-[11px] text-gray-500 font-medium mb-5 leading-normal">
              El carrito actual de la caja no está vacío. ¿Cómo desea cargar la factura postergada de <span className="font-bold text-gray-800">"{pendingDraftToResume.reference}"</span>?
            </p>

            <div className="space-y-2">
              <button
                onClick={() => executeResumeDraft(pendingDraftToResume, 'merge')}
                className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Fusionar con Carrito Actual</span>
              </button>
              
              <button
                onClick={() => executeResumeDraft(pendingDraftToResume, 'replace')}
                className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reemplazar Carrito Actual</span>
              </button>

              <button
                onClick={() => {
                  setShowMergeModal(false);
                  setPendingDraftToResume(null);
                }}
                className="w-full py-2 text-gray-400 hover:text-gray-600 font-bold text-xs rounded-xl text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: VISTA DE RECIBO / FACTURA COMPLETADA -------------------- */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-gray-100 w-full max-w-md shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]">
            {/* Header del modal */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
              <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <span>Vista Digital de Recibo</span>
              </span>
              <button 
                onClick={() => setCompletedInvoice(null)}
                className="p-1.5 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recibo de caja scrollable */}
            <div className="p-6 overflow-y-auto flex-1 font-mono text-[11px] leading-relaxed text-gray-800">
              <div className="text-center space-y-1 mb-5">
                <h4 className="text-sm font-black tracking-tight text-gray-900">TIENDA & DISTRIBUIDORA DE CAJA</h4>
                <p className="text-[10px] text-gray-500">RIF: J-40899124-1</p>
                <p className="text-[9px] text-gray-400 leading-tight">Av. Principal, Edif. Central, Caracas, Venezuela</p>
                <p className="text-[9px] text-gray-400">Telf: 0212-5551234</p>
              </div>

              <div className="border-t border-b border-dashed border-gray-300 py-3 my-3 space-y-1 text-gray-600">
                <div className="flex justify-between">
                  <span>CONTROL N°:</span>
                  <span className="font-bold text-gray-900">{completedInvoice.control_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>FECHA EMISIÓN:</span>
                  <span>{new Date(completedInvoice.created_at).toLocaleString('es-VE')}</span>
                </div>
                <div className="flex justify-between">
                  <span>CLIENTE:</span>
                  <span className="font-bold text-gray-900">{completedInvoice.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>MÉTODO PAGO:</span>
                  <span className="font-bold text-gray-900">{completedInvoice.payment_method}</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between font-bold text-gray-500 text-[10px] pb-1 border-b border-gray-100">
                  <span className="w-1/2">DETALLE</span>
                  <span className="w-1/6 text-center">CANT</span>
                  <span className="w-1/3 text-right">TOTAL</span>
                </div>
                {completedInvoice.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between leading-normal">
                    <div className="w-1/2">
                      <span className="font-bold block text-gray-900">{item.name}</span>
                      <span className="text-[9px] text-gray-400">Ref: {item.sku}</span>
                    </div>
                    <span className="w-1/6 text-center">{item.qty}</span>
                    <span className="w-1/3 text-right font-bold">
                      {formatCurrency(item.total, activeCurrency, currencyRates)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="border-t border-dashed border-gray-300 pt-3 space-y-1.5 text-gray-600">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span className="font-bold">{formatCurrency(completedInvoice.subtotal, activeCurrency, currencyRates)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (16.00%):</span>
                  <span className="font-bold">{formatCurrency(completedInvoice.iva, activeCurrency, currencyRates)}</span>
                </div>
                <div className="flex justify-between text-xs font-black text-gray-900 pt-1 border-t border-gray-100">
                  <span>TOTAL NETO:</span>
                  <span>{formatCurrency(completedInvoice.total, activeCurrency, currencyRates)}</span>
                </div>

                {/* Equivalentes para negocios en Venezuela */}
                <div className="bg-gray-50 rounded-xl p-2.5 mt-4 space-y-1 font-sans text-right shrink-0 border border-gray-100">
                  <span className="text-[8px] text-gray-400 font-black uppercase block tracking-wider">Pago en Divisas / Bs. BCV</span>
                  <div className="text-xs font-black text-gray-800">
                    Bs. {(completedInvoice.total * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[9px] font-bold text-gray-500">
                    Tasa Oficial BCV: 1 USD = Bs. {bcvRate.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="text-center text-[9px] text-gray-400 mt-6 space-y-1">
                <p className="font-black">*** GRACIAS POR SU COMPRA ***</p>
                <p>Este documento es una representación digital de la factura fiscal.</p>
              </div>
            </div>

            {/* Footer con controles */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2 shrink-0">
              <button
                onClick={() => {
                  handlePrintInvoice(completedInvoice);
                }}
                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
              <button
                onClick={() => setCompletedInvoice(null)}
                className="flex-1 py-2 bg-[#005da9] hover:bg-[#004b88] text-white font-black text-xs uppercase rounded-xl transition"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: BUSCAR Y SELECCIONAR CLIENTE -------------------- */}
      {showClientSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-gray-100 w-full max-w-lg shadow-2xl overflow-hidden text-left flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#005da9]" />
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Buscar Cliente Registrado</h3>
              </div>
              <button 
                onClick={() => setShowClientSearchModal(false)}
                className="p-1.5 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 bg-white border-b border-gray-50 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, cédula/RIF, teléfono o correo..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#005da9] focus:bg-white transition"
                  autoFocus
                />
              </div>
            </div>

            {/* Clients List */}
            <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50 space-y-2 max-h-[45vh]">
              {clients.filter(c => {
                const q = clientSearchQuery.toLowerCase();
                return (
                  (c.name || '').toLowerCase().includes(q) ||
                  (c.document || '').toLowerCase().includes(q) ||
                  (c.phone || '').toLowerCase().includes(q) ||
                  (c.email || '').toLowerCase().includes(q)
                );
              }).length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-xs text-gray-400 font-bold">No se encontraron clientes que coincidan con la búsqueda.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowClientSearchModal(false);
                      setNewClientName(clientSearchQuery);
                      setNewClientDocument('');
                      setNewClientPhone('');
                      setNewClientEmail('');
                      setNewClientType('Natural');
                      setNewClientCredit('0');
                      setShowQuickClientModal(true);
                    }}
                    className="mx-auto px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Registrar "{clientSearchQuery || 'Nuevo Cliente'}"</span>
                  </button>
                </div>
              ) : (
                clients.filter(c => {
                  const q = clientSearchQuery.toLowerCase();
                  return (
                    (c.name || '').toLowerCase().includes(q) ||
                    (c.document || '').toLowerCase().includes(q) ||
                    (c.phone || '').toLowerCase().includes(q) ||
                    (c.email || '').toLowerCase().includes(q)
                  );
                }).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedClient(c.name);
                      setShowClientSearchModal(false);
                    }}
                    className="w-full text-left p-3.5 bg-white border border-gray-100 hover:border-[#005da9] hover:bg-blue-50/30 rounded-2xl transition flex items-center justify-between gap-4 group"
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold text-gray-900 text-xs truncate group-hover:text-[#005da9] transition-colors">{c.name}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-gray-400 font-bold">
                        <span className="font-mono text-gray-500">Doc: {c.document}</span>
                        {c.phone && <span>Tel: {c.phone}</span>}
                        {c.email && <span className="truncate max-w-[150px]">Email: {c.email}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {c.credit_usd > 0 && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[9px] font-black border border-emerald-100">
                          Crédito: ${Number(c.credit_usd).toFixed(2)}
                        </span>
                      )}
                      <span className="text-[10px] text-[#005da9] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                        Seleccionar
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedClient('Consumidor final');
                  setShowClientSearchModal(false);
                }}
                className="py-2 px-3 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold text-xs rounded-xl transition"
              >
                Limpiar / Consumidor Final
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowClientSearchModal(false)}
                  className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-xl transition"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowClientSearchModal(false);
                    setNewClientName(clientSearchQuery);
                    setNewClientDocument('');
                    setNewClientPhone('');
                    setNewClientEmail('');
                    setNewClientType('Natural');
                    setNewClientCredit('0');
                    setShowQuickClientModal(true);
                  }}
                  className="py-2 px-4 bg-[#005da9] hover:bg-[#004b88] text-white font-black text-xs uppercase rounded-xl transition flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Nuevo Cliente</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: REGISTRO RÁPIDO DE CLIENTE -------------------- */}
      {showQuickClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
          <form 
            onSubmit={handleQuickRegisterClient}
            className="bg-white rounded-3xl border border-gray-100 w-full max-w-md shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-5 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Registro Rápido de Cliente</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowQuickClientModal(false)}
                className="p-1.5 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Nombre Completo / Razón Social *</label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ej: Juan Pérez o Inversiones Alfa C.A."
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              {/* Grid document + type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">C.I. / RIF / Documento *</label>
                  <input
                    type="text"
                    required
                    value={newClientDocument}
                    onChange={(e) => setNewClientDocument(e.target.value)}
                    placeholder="Ej: V-12345678 o J-98765432-1"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Tipo de Persona</label>
                  <select
                    value={newClientType}
                    onChange={(e) => setNewClientType(e.target.value as 'Natural' | 'Jurídico')}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  >
                    <option value="Natural">Natural</option>
                    <option value="Jurídico">Jurídico</option>
                  </select>
                </div>
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="Ej: 0412-5551234"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="Ej: cliente@correo.com"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Initial credit */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Saldo de Crédito Inicial ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newClientCredit}
                  onChange={(e) => setNewClientCredit(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2 justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowQuickClientModal(false)}
                className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                <span>Registrar y Seleccionar</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
