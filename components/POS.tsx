import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBarber } from '../context/BarberContext';
import { TicketContent } from './TicketContent';
import { SaleItem, Sale, Payment, PaymentMethod, Client, CatalogItem, Promotion } from '../types';
import { printReceipt } from '../services/printService';
import {
  Trash2, ShoppingCart, Search, X, Clock, Check, Scissors,
  DollarSign, CreditCard, ArrowRightLeft, Bitcoin, LogOut, Eye, Coins, Plus,
  Lock, Printer, User, UserPlus, Info, Mail, Calendar, ArrowLeft, Package, CheckCircle2,
  Zap, Gift, Star, ChevronRight, History, RefreshCw, Receipt, FileText, Layers, Store
} from 'lucide-react';
import { useDragScroll } from '../hooks/useDragScroll';

interface POSProps {
  navigateView?: (view: string) => void;
}

const paymentMethods: Partial<Record<PaymentMethod, string>> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transf.',
  bitcoin: 'Bitcoin'
};

export const POS = ({ navigateView }: POSProps) => {
  const { catalog, tickets, users, processSale, currentUser, getBranchStock, branches, clients, config, logout, cashSession, openCashSession, sales, sendInvoiceByEmail, addClient, promotions, showToast } = useBarber();
  const catalogScroll = useDragScroll();
  const cartScroll = useDragScroll();
  const clientSearchScroll = useDragScroll();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const currentBranchId = useMemo(() => {
    return selectedBranchId || currentUser?.branchId || (branches.length > 0 ? branches[0].id : '');
  }, [selectedBranchId, currentUser?.branchId, branches]);

  const currentBranch = useMemo(() => branches.find(b => b.id === currentBranchId), [branches, currentBranchId]);

  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>(currentUser?.role === 'barber' ? currentUser.id : '');
  const [catalogSearch, setCatalogSearch] = useState('');

  // RELOJ INTERNO PARA VALIDACIÓN DE PROMOS EN TIEMPO REAL
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000); // Revisa cada 30 segs
    return () => clearInterval(timer);
  }, []);

  const [posMode, setPosMode] = useState<'ticket' | 'direct'>(() => {
    return currentBranch?.hasReception === false ? 'direct' : 'ticket';
  });

  useEffect(() => {
    if (currentBranch) {
      setPosMode(currentBranch.hasReception === false ? 'direct' : 'ticket');
    }
  }, [currentBranch?.hasReception, currentBranchId]);

  const [selectedDirectClient, setSelectedDirectClient] = useState<string>('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<string>('');
  const [usePoints, setUsePoints] = useState(false);

  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showComboModal, setShowComboModal] = useState<CatalogItem | null>(null);

  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientBirth, setNewClientBirth] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [newClientReferrerSearch, setNewClientReferrerSearch] = useState('');
  const [newClientSelectedReferrerId, setNewClientSelectedReferrerId] = useState<string | undefined>(undefined);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountInput, setAmountInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [openingAmount, setOpeningAmount] = useState('');

  const [receiptEmail, setReceiptEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Solo mostrar modal de apertura después de que los datos se hayan cargado
  useEffect(() => {
    if (branches.length > 0 && currentBranchId && !cashSession) {
      setShowOpenSessionModal(true);
    }
  }, [branches.length, currentBranchId, cashSession]);

  useEffect(() => {
    if (currentSale && currentSale.clientId) {
      const client = clients.find(c => c.id === currentSale.clientId);
      setReceiptEmail(client?.email || '');
    } else {
      setReceiptEmail('');
    }
  }, [currentSale, clients]);

  const activeClientId = posMode === 'direct' ? selectedDirectClient : (tickets.find(t => t.id === selectedTicket)?.clientId);
  const activeClient = useMemo(() => clients.find(c => c.id === activeClientId), [clients, activeClientId]);

  // LÓGICA DE PROMOCIÓN REFINADA (CON DEPENDENCIA DE TIEMPO)
  const activePromotion = useMemo(() => {
    const currentDay = currentTime.getDay();
    const currentH = currentTime.getHours();
    const currentM = currentTime.getMinutes();
    const currentVal = currentH * 60 + currentM;

    // Usar fecha local para evitar problemas de zona horaria (UTC vs Local)
    const todayStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')}`;

    const checkHours = (p: Promotion) => {
      if (!p.hourStart || !p.hourEnd) return true;
      const [sh, sm] = p.hourStart.split(':').map(Number);
      const [eh, em] = p.hourEnd.split(':').map(Number);
      const startVal = sh * 60 + sm;
      const endVal = eh * 60 + em;
      return currentVal >= startVal && currentVal <= endVal;
    };

    const eligiblePromos = (promotions || []).filter(p => {
      if (!p || !p.active) return false;

      const { trigger, daysActive, startDate, endDate } = p;

      if (trigger === 'always') return true;

      if (trigger === 'date_range') {
        if (!startDate || !endDate) return false;
        // Ya normalizado en el contexto, comparar YYYY-MM-DD
        const s = startDate.split('T')[0];
        const e = endDate.split('T')[0];
        return todayStr >= s && todayStr <= e;
      }

      if (trigger === 'happy_hour') return checkHours(p);

      if (trigger === 'days_of_week') {
        const days = Array.isArray(daysActive) ? daysActive : [];
        if (!days.includes(currentDay)) return false;
        return checkHours(p);
      }

      if (trigger === 'birthday' && activeClient?.birthDate) {
        const b = activeClient.birthDate.split('T')[0];
        const [, m, d] = b.split('-');
        return Number(m) === (currentTime.getMonth() + 1) && Number(d) === currentTime.getDate();
      }

      return false;
    });

    return eligiblePromos[0] || null;
  }, [promotions, activeClient, currentTime]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const discountFromPromo = useMemo(() => {
    if (!activePromotion) return 0;
    let base = 0;

    if (activePromotion.applyTo === 'all') {
      base = subtotal;
    } else if (activePromotion.applyTo === 'services') {
      base = cart.reduce((s, i) => {
        const catItem = catalog.find(c => c.id === i.itemId);
        return catItem?.type === 'service' ? s + (i.price * i.quantity) : s;
      }, 0);
    } else if (activePromotion.applyTo === 'products') {
      base = cart.reduce((s, i) => {
        const catItem = catalog.find(c => c.id === i.itemId);
        return catItem?.type === 'product' ? s + (i.price * i.quantity) : s;
      }, 0);
    } else if (activePromotion.applyTo === 'specific' && activePromotion.specificItemId) {
      base = cart.reduce((s, i) => i.itemId === activePromotion.specificItemId ? s + (i.price * i.quantity) : s, 0);
    }

    if (base === 0) return 0;
    return activePromotion.type === 'percentage' ? base * (activePromotion.value / 100) : Math.min(base, activePromotion.value);
  }, [activePromotion, subtotal, cart, catalog]);

  const discountFromPoints = useMemo(() => {
    const loyalty = config?.loyalty || { enabled: false, redemptionThreshold: 9999, redemptionValue: 0 };
    if (usePoints && activeClient && loyalty.enabled && (activeClient.points || 0) >= loyalty.redemptionThreshold) {
      return loyalty.redemptionValue;
    }
    return 0;
  }, [usePoints, activeClient, config]);

  const totalDiscount = discountFromPromo + discountFromPoints;
  const rawTotal = Math.max(0, subtotal - totalDiscount);
  const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const remainingBalance = Math.max(0, rawTotal - totalPaid);
  const displayChange = Math.max(0, totalPaid - rawTotal);

  const barbers = users.filter(u => u.role === 'barber' && u.active !== false && u.branchId === currentBranchId);
  const activeTickets = tickets.filter(t => (t.status === 'serving' || t.status === 'waiting') && t.branchId === currentBranchId);

  const filteredCatalog = catalog.filter(item => {
    if (!item || item.active === false) return false;
    const search = catalogSearch.toLowerCase();
    const nameMatch = (item.name || '').toLowerCase().includes(search);
    const catMatch = (item.category || '').toLowerCase().includes(search);
    return nameMatch || catMatch;
  });
  const filteredClients = clientSearch.length > 0 ? clients.filter(c => (c.name || '').toLowerCase().includes(clientSearch.toLowerCase())) : [];

  const filteredReferrersForNewClient = useMemo(() => {
    return newClientReferrerSearch.length > 1
      ? clients.filter(c => (c.name || '').toLowerCase().includes(newClientReferrerSearch.toLowerCase()))
      : [];
  }, [clients, newClientReferrerSearch]);

  const showAddClientButton = posMode === 'direct' && clientSearch.length > 2 && filteredClients.length === 0 && !selectedDirectClient;

  const getStock = (itemId: string) => getBranchStock(currentBranchId || '', itemId)?.stock || 0;

  const addToCart = (item: CatalogItem) => {
    if (item.type === 'product' && (getStock(item.id) - (cart.find(i => i.itemId === item.id)?.quantity || 0)) <= 0) {
      setErrorMsg("⚠️ Sin stock");
      setTimeout(() => setErrorMsg(''), 2000);
      return;
    }
    setCart(prev => {
      const exists = prev.find(i => i.itemId === item.id);
      if (exists) return prev.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { itemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => setCart(prev => prev.filter(i => i.itemId !== itemId));

  const handleTicketSelect = (ticketId: string) => {
    setSelectedTicket(ticketId); setUsePoints(false);
    const t = tickets.find(tick => tick.id === ticketId);
    if (t) {
      if (t.barberId) setSelectedBarber(t.barberId);
      let newItems: SaleItem[] = [];
      const map = config.ticketProductMap;
      const getSI = (id: string) => { const m = catalog.find(i => i.id === id); return m ? { itemId: m.id, name: m.name, price: m.price, quantity: 1 } : null; };
      if (t.type === 'C') { const i = getSI(map?.C || 's1'); if (i) newItems.push(i); }
      else if (t.type === 'B') { const i = getSI(map?.B || 's2'); if (i) newItems.push(i); }
      else if (t.type === 'D') {
        if (map?.D) { const i = getSI(map.D); if (i) newItems.push(i); }
        else { const iC = getSI('s1'); const iB = getSI('s2'); if (iC) newItems.push(iC); if (iB) newItems.push(iB); }
      }
      setCart(newItems);
    }
  };

  const addPayment = () => {
    const val = amountInput === '' ? remainingBalance : parseFloat(amountInput);
    if (isNaN(val) || val <= 0) return;
    setPayments([...payments, { method: currentPaymentMethod, amount: val }]);
    setAmountInput(''); setErrorMsg('');
  };

  // Fix: handleCheckout must be async to await the async processSale function
  const handleCheckout = async () => {
    if (cart.length === 0) { setErrorMsg("⚠️ Carrito vacío"); return; }
    if (!selectedBarber) { setErrorMsg("⚠️ SELECCIONAR BARBERO"); return; }
    if (totalPaid < rawTotal - 0.01) { setErrorMsg("⚠️ Pago incompleto"); return; }

    // Calcular puntos ganados (si aplica)
    const pointsEarned = activeClientId && config.loyalty?.enabled ? (config.loyalty.pointsPerVisit || 0) : 0;

    const sale: Sale = { id: crypto.randomUUID(), branchId: currentBranchId || '', ticketId: posMode === 'ticket' ? selectedTicket : undefined, clientId: activeClientId, barberId: selectedBarber, items: cart, subtotal: subtotal, discount: totalDiscount, total: rawTotal, payments: [...payments], timestamp: new Date().toISOString(), appliedPromotionId: activePromotion?.id, pointsUsed: usePoints ? config.loyalty?.redemptionThreshold : 0, pointsEarned };

    // Fix: processSale is async, must await to get the actual Sale object instead of a Promise
    const finalSale = await processSale(sale);
    if (finalSale) {
      setCurrentSale(finalSale);
      setShowReceiptModal(true);

      setCart([]);
      setPayments([]);
      setSelectedTicket('');
      setAmountInput('');
      setSelectedDirectClient('');
      setClientSearch('');
      setUsePoints(false);
      setErrorMsg('');
      setSelectedBarber(currentUser?.role === 'barber' ? currentUser.id : '');
    } else {
      setErrorMsg("❌ Error al procesar venta");
    }
  };

  const handleSendEmail = async () => {
    if (!receiptEmail || !currentSale) return;
    setIsSendingEmail(true);
    const clientName = clients.find(c => c.id === currentSale.clientId)?.name || "Cliente";
    const success = await sendInvoiceByEmail(currentSale, clientName, receiptEmail);
    setIsSendingEmail(false);
    if (success) {
      showToast('success', 'Ticket Enviado', `El comprobante ha sido enviado a ${receiptEmail}`);
    } else {
      showToast('error', 'Error de Envío', 'No se pudo enviar el correo. Revisa la configuración del Webhook.');
    }
  };

  const handleAddAndSelectClient = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = crypto.randomUUID();
    const newClient: Client = {
      id: newId,
      name: newClientName,
      phone: newClientPhone,
      email: newClientEmail,
      birthDate: newClientBirth || undefined,
      notes: newClientNotes,
      referredBy: newClientSelectedReferrerId,
      visits: 0,
      points: 0
    };

    addClient(newClient);
    setSelectedDirectClient(newId);
    setClientSearch(newClientName);
    setShowAddClientModal(false);
    setNewClientReferrerSearch('');
    setNewClientSelectedReferrerId(undefined);
  };

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100 overflow-hidden font-inter">
      <div className="flex-1 flex flex-col border-r border-zinc-900 min-w-0">
        <div className="p-4 border-b border-zinc-900 bg-zinc-900/40 flex justify-between items-center shrink-0">
          <div className="flex bg-black p-1 rounded-xl border border-zinc-800">
            <button onClick={() => { setPosMode('ticket'); setUsePoints(false); setSelectedDirectClient(''); setClientSearch(''); }} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${posMode === 'ticket' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}>Tickets</button>
            <button onClick={() => { setPosMode('direct'); setUsePoints(false); setSelectedTicket(''); }} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${posMode === 'direct' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}>Directa</button>
          </div>

          {currentUser?.role === 'admin' && branches.length > 1 && (
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl ml-4">
              <Store size={14} className="text-zinc-500" />
              <select
                value={currentBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent text-[10px] font-black uppercase text-white outline-none cursor-pointer"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id} className="bg-zinc-900">{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            {activePromotion && <div className="flex items-center gap-2 bg-yellow-600 text-black border border-yellow-400 px-4 py-2 rounded-xl animate-pulse mr-2 shadow-lg"><Zap size={14} className="fill-black" /><span className="text-[10px] font-black uppercase tracking-widest">ACTIVA: {activePromotion.name}</span></div>}
            <div className="flex items-center gap-2">
              <button onClick={() => navigateView?.('sales_pos')} className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-blue-500 rounded-xl border border-zinc-800 transition-all"><History size={18} /></button>
              <button onClick={() => navigateView?.('cash_cut')} className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-emerald-500 rounded-xl border border-zinc-800 transition-all"><DollarSign size={18} /></button>
              <div className="w-px h-6 bg-zinc-800 mx-1"></div>
              <button onClick={logout} className="p-2.5 bg-zinc-900 hover:bg-red-900/50 text-zinc-500 hover:text-red-500 rounded-xl border border-zinc-800 transition-all"><LogOut size={18} /></button>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6 shrink-0 bg-zinc-900/10 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="relative flex-1 w-full group">
              {posMode === 'direct' ? (
                <>
                  <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${selectedDirectClient ? 'text-emerald-500' : 'text-blue-500'}`} size={18} />
                  <input value={clientSearch} onChange={(e) => { setClientSearch(e.target.value); setSelectedDirectClient(''); setUsePoints(false); }} className={`w-full bg-black border rounded-2xl h-[48px] pl-12 pr-12 text-white font-bold outline-none shadow-xl transition-all text-sm ${selectedDirectClient ? 'border-emerald-500/50' : 'border-zinc-800 focus:border-blue-600'}`} placeholder="BUSCAR CLIENTE..." />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {selectedDirectClient ? <CheckCircle2 size={18} className="text-emerald-500 animate-in zoom-in" /> : showAddClientButton ? <button onClick={() => { setNewClientName(clientSearch); setShowAddClientModal(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg transition-all animate-in slide-in-from-right-2"><UserPlus size={14} /><span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Agregar</span></button> : null}
                    {clientSearch && <button onClick={() => { setClientSearch(''); setSelectedDirectClient(''); setUsePoints(false); }} className="text-zinc-600 hover:text-white"><X size={14} /></button>}
                  </div>
                  {clientSearch.length > 0 && !selectedDirectClient && filteredClients.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-zinc-800 border border-zinc-700 rounded-2xl mt-1 shadow-2xl z-[150] max-h-56 overflow-y-auto">{filteredClients.map(c => <button key={c.id} onClick={() => { setSelectedDirectClient(c.id); setClientSearch(c.name); }} className="w-full p-4 text-left text-xs font-bold text-white hover:bg-blue-600 border-b border-zinc-700 last:border-0 flex justify-between items-center"><div><div className="font-black uppercase">{c.name}</div><div className="text-[10px] text-zinc-400 font-mono mt-0.5">{c.phone}</div></div><ChevronRight size={16} /></button>)}</div>
                  )}
                </>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">{activeTickets.length === 0 ? <div className="text-zinc-700 italic text-[10px] font-bold uppercase tracking-widest p-1">No hay tickets activos...</div> : activeTickets.map(t => (<button key={t.id} onClick={() => handleTicketSelect(t.id)} className={`min-w-[140px] p-4 rounded-2xl border text-left transition-all relative ${selectedTicket === t.id ? 'bg-yellow-600/10 border-yellow-500 ring-2 ring-yellow-500/20 shadow-xl' : 'bg-sky-950/40 border-sky-800/50 hover:border-sky-500 shadow-md hover:bg-sky-900/30'}`}><div className={`font-black text-2xl tracking-tighter mb-1 ${selectedTicket === t.id ? 'text-white' : 'text-sky-100'}`}>{t.fullCode}</div><div className={`text-[10px] font-bold truncate uppercase ${selectedTicket === t.id ? 'text-zinc-400' : 'text-sky-400/80'}`}>{t.clientName}</div></button>))}</div>
              )}
            </div>
            {activeClient && (
              <div className={`flex items-center gap-2.5 px-4 rounded-[1.2rem] border transition-all h-[48px] animate-in slide-in-from-right-2 shrink-0 ${usePoints ? 'bg-yellow-600 border-yellow-400 text-black shadow-lg' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                <div className="flex flex-col min-w-fit"><div className="flex items-center gap-1"><Star size={12} className={usePoints ? 'text-black' : 'text-yellow-500'} /><span className="text-[8px] font-black uppercase tracking-widest">Lealtad</span></div><span className="font-mono font-black text-[12px] leading-none mt-0.5 whitespace-nowrap">{activeClient.points || 0} PUNTOS</span></div>
                <div className="h-6 w-px bg-zinc-800/50 mx-0.5"></div>
                {config?.loyalty?.enabled && (activeClient.points || 0) >= (config?.loyalty?.redemptionThreshold || 0) ? (
                  <button onClick={() => setUsePoints(!usePoints)} className={`px-3 py-1.5 rounded-lg font-black text-[8px] uppercase tracking-widest transition-all ${usePoints ? 'bg-black text-white' : 'bg-yellow-600 text-black shadow-md'}`}>
                    {usePoints ? 'Cancelar' : '¡Premio!'}
                  </button>
                ) : (
                  <div className="text-[9px] font-black uppercase opacity-70 w-[85px] leading-tight tracking-tighter">
                    Faltan <span className="text-yellow-400">{(config?.loyalty?.redemptionThreshold || 0) - (activeClient.points || 0)}</span> para regalo
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="relative"><Search className="absolute left-4 top-3 text-zinc-700" size={18} /><input value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-white outline-none focus:border-zinc-600 transition-all text-sm shadow-inner" placeholder="BUSCAR EN CATÁLOGO..." /></div>
        </div>

        <div
          ref={catalogScroll.ref}
          {...catalogScroll.props}
          className="flex-1 p-4 lg:p-6 overflow-y-auto hide-scrollbar bg-black/5"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4 pb-10">
            {filteredCatalog.map(item => (
              <div key={item.id} className={`border border-zinc-800 rounded-2xl p-3 transition-all flex flex-col justify-between h-24 hover:border-zinc-600 shadow-xl group relative ${item.type === 'combo' ? 'bg-indigo-900/30 border-indigo-500/30' : 'bg-zinc-900'}`}>
                <button onClick={() => addToCart(item)} className="absolute inset-0 z-0"></button>
                <div className="flex justify-between items-start relative z-10 pointer-events-none"><div className="w-full font-black text-zinc-300 text-[10px] uppercase truncate mb-0.5 group-hover:text-white transition-colors text-left">{item.name}</div></div>
                <div className="flex-1 flex items-center justify-center w-full relative z-10 pointer-events-none">
                  <div className="text-2xl font-black text-emerald-500 tracking-tighter font-mono leading-none">${item.price.toFixed(2)}</div>
                </div>
                <div className="w-full flex justify-between items-center mt-auto relative z-20 pointer-events-none"><span className={`text-[8px] font-black uppercase px-2 h-[18px] inline-flex items-center justify-center rounded-full leading-none pt-0.5 ${item.type === 'service' ? 'bg-blue-900/40 text-blue-400' : item.type === 'combo' ? 'bg-indigo-600 text-white' : 'bg-amber-900/40 text-amber-400'}`}>{item.type}</span>{item.type === 'combo' ? (<button onClick={(e) => { e.stopPropagation(); setShowComboModal(item); }} className="pointer-events-auto cursor-pointer bg-indigo-500 p-1.5 rounded-lg text-white shadow-lg shadow-indigo-900/40 hover:bg-indigo-400 transition-all z-50 hover:scale-110 active:scale-90"><Eye size={14} /></button>) : item.type === 'product' && (<span className="text-[10px] bg-black text-white font-black px-1.5 h-[18px] inline-flex items-center justify-center rounded border border-zinc-800 leading-none pt-0.5">{getStock(item.id)} UN</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-80 bg-zinc-900 flex flex-col shrink-0 border-l border-black shadow-2xl relative z-10">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <h2 className="text-zinc-600 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2"><ShoppingCart size={14} /> CARRITO</h2>
          {cart.length > 0 && (
            <button
              onClick={() => {
                setCart([]);
                setErrorMsg('');
                setPayments([]);
                setAmountInput('');
              }}
              className="text-red-900 hover:text-red-500 text-[10px] font-black uppercase transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
        <div
          ref={cartScroll.ref}
          {...cartScroll.props}
          className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-2 bg-black/10"
        >
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-800 opacity-20">
              <ShoppingCart strokeWidth={1} className="w-16 h-16" />
              <span className="text-[10px] font-black uppercase tracking-[0.5em] mt-4 text-center leading-relaxed">VACÍO</span>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={`${item.itemId}-${idx}`} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex justify-between items-center shadow-lg">
                <div className="min-w-0 flex-1">
                  <div className="font-black text-[12px] uppercase truncate text-white">{item.name}</div>
                  <div className="text-zinc-600 text-[10px] font-bold mt-0.5">{item.quantity} x ${item.price.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-3 ml-2">
                  <span className="font-mono font-black text-sm text-white">${(item.price * item.quantity).toFixed(2)}</span>
                  <button onClick={() => removeFromCart(item.itemId)} className="text-zinc-800 hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex-none bg-zinc-900 border-t border-black p-5 space-y-3 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="w-full"><label className="text-[9px] text-zinc-600 font-black uppercase mb-1 block tracking-widest ml-1">BARBERO</label><select value={selectedBarber} onChange={(e) => setSelectedBarber(e.target.value)} className={`w-full bg-black border text-white py-3 px-4 rounded-xl text-xs font-black outline-none transition-all ${errorMsg.includes('BARBERO') ? 'border-red-600' : 'border-zinc-800 focus:border-blue-600'}`}><option value="">ASIGNAR...</option>{barbers.map(b => <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>)}</select></div>
          <div className="space-y-1 border-t border-zinc-800/50 pt-2"><div className="flex justify-between text-zinc-600 text-[9px] font-black uppercase"><span>Subtotal</span><span className="font-mono text-xs">${subtotal.toFixed(2)}</span></div>{totalDiscount > 0 && <div className="flex justify-between text-yellow-500 text-[9px] font-black uppercase"><span>Descuentos</span><span className="font-mono text-xs">-${totalDiscount.toFixed(2)}</span></div>}<div className="flex justify-between text-white text-3xl font-black tracking-tighter pt-1"><span>Total</span><span className="font-mono">${rawTotal.toFixed(2)}</span></div></div>
          {payments.length > 0 && (<div className="bg-black/30 rounded-xl p-2 space-y-1 max-h-24 overflow-y-auto">{payments.map((p, idx) => (<div key={idx} className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-400"><span className="flex items-center gap-1">{p.method === 'cash' && <DollarSign size={10} />}{p.method === 'card' && <CreditCard size={10} />}{p.method === 'transfer' && <ArrowRightLeft size={10} />}{p.method === 'bitcoin' && <Bitcoin size={10} />}{paymentMethods[p.method]}</span><span className="font-mono">${p.amount.toFixed(2)}</span></div>))}</div>)}
          <div className="grid grid-cols-4 gap-1.5">{Object.entries(paymentMethods).map(([key, label]) => (<button key={key} onClick={() => setCurrentPaymentMethod(key as PaymentMethod)} className={`p-2 rounded-xl text-[8px] font-black uppercase border transition-all flex flex-col items-center gap-1 ${currentPaymentMethod === key ? 'bg-white text-black border-white scale-105 z-10 shadow-lg' : 'bg-zinc-950 text-zinc-600 border-zinc-800'}`}>{key === 'cash' && <DollarSign size={12} />}{key === 'card' && <CreditCard size={12} />}{key === 'transfer' && <ArrowRightLeft size={12} />}{key === 'bitcoin' && <Bitcoin size={12} />}{label}</button>))}</div>
          <div className="relative flex gap-2"><div className="relative flex-1 group"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700 font-mono font-black text-lg group-focus-within:text-emerald-500">$</span><input ref={amountInputRef} type="number" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addPayment(); }} placeholder={remainingBalance.toFixed(2)} className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-8 pr-3 text-white font-mono font-black text-xl outline-none focus:border-emerald-600 text-right shadow-inner" /></div><button onClick={addPayment} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 p-3 rounded-xl border border-zinc-700 shadow-md active:scale-95"><Plus size={18} /></button></div>
          <div className="flex justify-between items-center border-b border-zinc-800 pb-1"><span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">CAMBIO</span><span className="text-emerald-500 text-xl font-black font-mono tracking-tighter">${displayChange.toFixed(2)}</span></div>
          <div className="relative">{errorMsg && <div className="absolute -top-8 left-0 w-full text-center text-red-500 text-[9px] font-black uppercase tracking-widest bg-red-900/10 py-1 rounded-lg border border-red-900/20">{errorMsg}</div>}<button onClick={handleCheckout} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl font-black text-lg tracking-widest shadow-2xl transition-all active:scale-95 uppercase border-b-4 border-emerald-800 active:border-b-0">COBRAR</button></div>
        </div>
      </div>

      {showReceiptModal && currentSale && (
        <div className="fixed inset-0 z-[9999] bg-black/98 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-8 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600/20 p-2 rounded-xl text-blue-500"><Receipt size={20} /></div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Comprobante de Venta</h3>
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="text-zinc-600 hover:text-white"><X size={24} /></button>
            </div>

            <div className="transform hover:scale-[1.02] transition-transform mb-8">
              <TicketContent sale={currentSale} config={config} catalog={catalog} />
            </div>

            <div className="space-y-4 no-print">
              <button
                onClick={() => printReceipt('printable-receipt')}
                className="w-full bg-black text-white py-4 font-black rounded-2xl uppercase text-xs flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all border-b-4 border-zinc-800 active:border-b-0 hover:bg-zinc-950"
              >
                <Printer size={18} /> Imprimir Ticket
              </button>

              <div className={`p-4 rounded-3xl border space-y-3 shadow-lg transition-colors ${receiptEmail ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${receiptEmail ? 'text-emerald-600' : 'text-red-600'}`}>
                  {receiptEmail ? 'Correo Detectado' : 'Sin Correo Registrado'}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 ${receiptEmail ? 'text-emerald-300' : 'text-red-300'}`} size={14} />
                    <input type="email" value={receiptEmail} onChange={(e) => setReceiptEmail(e.target.value)} placeholder="cliente@correo.com" className={`w-full border rounded-xl py-2.5 pl-9 pr-2 text-xs font-bold outline-none transition-all ${receiptEmail ? 'bg-white border-emerald-200 text-emerald-900 focus:border-emerald-500' : 'bg-white border-red-200 text-red-900 focus:border-red-500'}`} />
                  </div>
                  <button onClick={handleSendEmail} disabled={isSendingEmail || !receiptEmail} className={`p-2.5 rounded-xl shadow-lg transition-all active:scale-95 ${isSendingEmail ? 'bg-zinc-200 text-zinc-400' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                    {isSendingEmail ? <RefreshCw className="animate-spin" size={18} /> : <Mail size={18} />}
                  </button>
                </div>
              </div>

              <button onClick={() => setShowReceiptModal(false)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-colors shadow-lg active:scale-95">
                Finalizar Consulta
              </button>
            </div>
          </div>

          {/* PORTAL DE IMPRESIÓN EXTERNO AL MODAL */}
          {createPortal(
            <div id="printable-receipt" className="print-area hidden">
              <TicketContent sale={currentSale} config={config} catalog={catalog} />
            </div>,
            document.body
          )}

        </div>
      )}

      {showComboModal && (<div className="fixed inset-0 z-[650] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in duration-200"><div className="flex justify-between items-center mb-6"><div className="flex items-center gap-3"><div className="bg-indigo-600/20 p-2 rounded-xl text-indigo-500"><Layers size={20} /></div><h3 className="text-lg font-black text-white uppercase tracking-tight">Pack: {showComboModal.name}</h3></div><button onClick={() => setShowComboModal(null)} className="text-zinc-600 hover:text-white"><X size={24} /></button></div><div className="space-y-2 mb-8"><p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-4">Este combo incluye:</p>{showComboModal.comboDefinition?.map(id => { const sub = catalog.find(x => x.id === id); return (<div key={id} className="flex items-center gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800"><div className="text-indigo-500">{sub?.type === 'service' ? <Scissors size={14} /> : <Package size={14} />}</div><span className="text-[10px] font-black text-zinc-300 uppercase truncate">{sub?.name || 'Item'}</span></div>); })}</div><button onClick={() => { addToCart(showComboModal); setShowComboModal(null); }} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Agregar al Carrito</button></div></div>)}
      {showAddClientModal && (<div className="fixed inset-0 z-[550] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200"><div className="p-6 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center"><div className="flex items-center gap-3"><div className="bg-blue-600/20 p-2 rounded-xl text-blue-500"><UserPlus size={24} /></div><h3 className="text-xl font-black text-white uppercase tracking-tight">Nuevo Registro Pro</h3></div><button onClick={() => { setShowAddClientModal(false); setNewClientReferrerSearch(''); setNewClientSelectedReferrerId(undefined); }} className="p-2 text-zinc-500 hover:text-white rounded-full transition-colors"><X size={20} /></button></div><form onSubmit={handleAddAndSelectClient} className="p-8 space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="md:col-span-2"><label className="text-[10px] font-black text-zinc-500 uppercase block mb-1.5 ml-1 flex items-center gap-1">Nombre Completo *</label><input required value={newClientName} onChange={e => setNewClientName(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-600 shadow-inner uppercase" placeholder="Ej: Juan Pérez" /></div><div><label className="text-[10px] font-black text-zinc-500 uppercase block mb-1.5 ml-1">Teléfono</label><input value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-teal-500 shadow-inner" placeholder="7777-8888" type="tel" /></div><div><label className="text-[10px] font-black text-blue-500 uppercase block mb-1.5 ml-1">Cumpleaños</label><input type="date" value={newClientBirth} onChange={e => setNewClientBirth(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-600 shadow-inner font-mono text-sm" /></div><div className="md:col-span-2"><label className="text-[10px] font-black text-zinc-500 uppercase block mb-1.5 ml-1">Email Principal</label><input value={newClientEmail} onChange={e => setNewClientEmail(e.target.value.toLowerCase())} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-600 shadow-inner lowercase" placeholder="cliente@correo.com" type="email" inputMode="email" autoCapitalize="none" /></div><div className="md:col-span-2 relative"><label className="text-[10px] font-black text-blue-500 uppercase block mb-1.5 ml-1 tracking-widest flex items-center gap-2"><Gift size={12} /> Referido Por (Padrino)</label><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={16} /><input value={newClientReferrerSearch} onChange={e => { setNewClientReferrerSearch(e.target.value); setNewClientSelectedReferrerId(undefined); }} className={`w-full bg-black border rounded-xl py-4 pl-12 pr-4 text-white font-bold outline-none shadow-inner transition-all text-xs ${newClientSelectedReferrerId ? 'border-emerald-500/50' : 'border-zinc-800 focus:border-blue-600'}`} placeholder="BUSCAR CLIENTE EXISTENTE..." />{newClientSelectedReferrerId && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />}</div>{newClientReferrerSearch.length > 0 && !newClientSelectedReferrerId && filteredReferrersForNewClient.length > 0 && (<div className="absolute bottom-full left-0 w-full bg-zinc-800 border border-zinc-700 rounded-xl mb-1 shadow-2xl z-[600] max-h-32 overflow-y-auto">{filteredReferrersForNewClient.map(c => (<button key={c.id} type="button" onClick={() => { setNewClientSelectedReferrerId(c.id); setNewClientReferrerSearch(c.name); }} className="w-full p-3 text-left text-[10px] font-bold text-white hover:bg-blue-600 border-b border-zinc-700 last:border-0 flex justify-between items-center transition-colors"><span>{c.name.toUpperCase()}</span><span className="text-[8px] text-zinc-400 font-mono">{c.phone}</span></button>))}</div>)}</div><div className="md:col-span-2"><label className="text-[10px] font-black text-zinc-500 uppercase block mb-1.5 ml-1 flex items-center gap-1"><FileText size={10} /> Notas / Observaciones</label><textarea value={newClientNotes} onChange={e => setNewClientNotes(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white outline-none focus:border-teal-500 shadow-inner h-24 resize-none text-xs" placeholder="Detalles extra..." /></div></div><div className="pt-4 flex gap-3"><button type="button" onClick={() => { setShowAddClientModal(false); setNewClientReferrerSearch(''); setNewClientSelectedReferrerId(undefined); }} className="flex-1 bg-zinc-800 text-zinc-400 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Cancelar</button><button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">Guardar y Seleccionar</button></div></form></div></div>)}
      {showOpenSessionModal && (<div className="fixed inset-0 z-[700] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"><div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-md shadow-2xl text-center"><div className="bg-emerald-600/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 border border-emerald-500/30"><Lock className="w-10 h-10" /></div><h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Apertura de Caja</h2><form onSubmit={async (e) => { e.preventDefault(); const success = await openCashSession(parseFloat(openingAmount), currentBranchId); if (success) setShowOpenSessionModal(false); }} className="space-y-6"><div className="relative"><span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 font-black text-2xl font-mono">$</span><input type="number" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl py-5 pl-12 pr-6 text-white font-mono font-black text-3xl outline-none focus:border-emerald-600 text-right shadow-inner" placeholder="0.00" autoFocus required /></div><button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black text-lg tracking-widest uppercase shadow-xl transition-all active:scale-95 border-b-4 border-emerald-800">Abrir Sesión</button></form></div></div>)}
    </div>
  );
};