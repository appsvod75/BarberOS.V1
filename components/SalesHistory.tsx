
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBarber } from '../context/BarberContext';
import { TicketContent } from './TicketContent';
import { printReceipt } from '../services/printService';
import { Search, Calendar, User, DollarSign, Printer, ArrowLeft, Filter, Trash2, Eye, X, Mail, Receipt, CheckCircle2, RefreshCw, ShoppingCart } from 'lucide-react';
import { Sale, PaymentMethod } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';

interface SalesHistoryProps {
    navigateView?: (view: string) => void;
    hideSummary?: boolean;
}

const paymentMethods: Partial<Record<PaymentMethod, string>> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transf.',
    bitcoin: 'Bitcoin'
};

export const SalesHistory = ({ navigateView, hideSummary = false }: SalesHistoryProps) => {
    const { sales, clients, users, catalog, config, sendInvoiceByEmail, showToast } = useBarber();
    const scroll = useDragScroll();
    const [search, setSearch] = useState('');

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 3);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [receiptEmail, setReceiptEmail] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (selectedSale) {
            const client = clients.find(c => c.id === selectedSale.clientId);
            setReceiptEmail(client?.email || '');
        }
    }, [selectedSale, clients]);

    const filteredSales = useMemo(() => {
        const safeSales = sales || [];
        const safeSearch = (search || '').toLowerCase();

        return safeSales.filter(sale => {
            let saleDate = '';
            try {
                if (sale.timestamp) {
                    saleDate = new Date(sale.timestamp).toISOString().split('T')[0];
                }
            } catch (e) {
                console.warn("Invalid date for sale:", sale.id);
            }

            const client = clients.find(c => c.id === sale.clientId);
            const clientName = (client?.name || 'Venta Directa').toLowerCase();
            const ticketId = (sale.id || '').toLowerCase();

            const matchesSearch = clientName.includes(safeSearch) || ticketId.includes(safeSearch);
            const matchesRange = saleDate >= startDate && saleDate <= endDate;

            return matchesSearch && matchesRange;
        }).sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeB - timeA;
        });
    }, [sales, clients, search, startDate, endDate]);

    const totalPeriod = filteredSales.reduce((acc, s) => acc + s.total, 0);

    const handlePrint = () => {
        printReceipt('printable-receipt');
    };

    const handleSendEmail = async () => {
        if (!receiptEmail || !selectedSale) {
            showToast('error', 'Faltan datos', 'Por favor ingresa un correo válido.');
            return;
        }
        setIsSending(true);
        const clientName = clients.find(c => c.id === selectedSale.clientId)?.name || "Cliente";
        const success = await sendInvoiceByEmail(selectedSale, clientName, receiptEmail);
        setIsSending(false);
        if (success) {
            showToast('success', 'Ticket Enviado', `¡El ticket ha sido enviado a ${receiptEmail} con éxito!`);
        } else {
            showToast('error', 'Error de Envío', 'No se pudo enviar el correo. Revisa la configuración del Webhook.');
        }
    };

    return (
        <div className="h-full flex flex-col bg-zinc-950 p-6 animate-in fade-in duration-300 font-inter">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    {hideSummary ? (
                        <button
                            onClick={() => navigateView?.('pos')}
                            className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] shadow-xl shadow-blue-900/20 active:scale-95 transition-all border-b-4 border-blue-800 active:border-b-0"
                        >
                            <ArrowLeft size={18} />
                            REGRESAR A CAJA
                        </button>
                    ) : (
                        <button
                            onClick={() => navigateView?.('menu')}
                            className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-2xl border border-zinc-800 text-zinc-400 hover:text-white transition-all shadow-lg active:scale-95"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div className={hideSummary ? "ml-2" : ""}>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">
                            {hideSummary ? 'Consulta de Tickets' : 'Reporte de Ventas'}
                        </h1>
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                            {hideSummary ? 'Reimpresión y Auditoría Rápida' : 'Análisis financiero corporativo'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto items-end">
                    <div className="relative flex-1 md:w-64">
                        <label className="text-[9px] font-black text-zinc-600 uppercase block mb-1 tracking-widest ml-1">Búsqueda rápida</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
                            <input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-blue-500 outline-none shadow-inner" placeholder="Cliente o folio..." />
                        </div>
                    </div>
                    <div className="relative">
                        <label className="text-[9px] font-black text-zinc-600 uppercase block mb-1 tracking-widest ml-1">Desde</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:border-blue-500 outline-none font-mono" />
                    </div>
                    <div className="relative">
                        <label className="text-[9px] font-black text-zinc-600 uppercase block mb-1 tracking-widest ml-1">Hasta</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-white focus:border-blue-500 outline-none font-mono" />
                    </div>
                </div>
            </div>

            {!hideSummary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 animate-in slide-in-from-top-2">
                    <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem] shadow-xl group hover:bg-blue-600/20 transition-all">
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Venta del Período</div>
                        <div className="text-4xl font-black text-white font-mono tracking-tighter">${totalPeriod.toFixed(2)}</div>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] shadow-xl group hover:border-zinc-700 transition-all">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Operaciones Realizadas</div>
                        <div className="text-4xl font-black text-white font-mono tracking-tighter">{filteredSales.length}</div>
                    </div>
                </div>
            )}

            <div
                ref={scroll.ref}
                {...scroll.props}
                className="flex-1 overflow-y-auto hide-scrollbar border border-zinc-900 rounded-[2.5rem] bg-black/20 shadow-2xl"
            >
                <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-950/80 backdrop-blur-md text-zinc-600 font-black uppercase text-[10px] sticky top-0 z-10 border-b border-zinc-900 tracking-[0.3em]">
                        <tr>
                            <th className="p-5 w-32">Cronología</th>
                            <th className="p-5">Cliente / Venta</th>
                            <th className="p-5">Barbero</th>
                            <th className="p-5">Detalle de Items</th>
                            <th className="p-5 text-right">Monto</th>
                            <th className="p-5 w-24 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                        {filteredSales.length === 0 ? (
                            <tr><td colSpan={6} className="p-32 text-center text-zinc-800 italic font-black uppercase tracking-[0.5em] opacity-20">Búsqueda sin registros</td></tr>
                        ) : (
                            filteredSales.map(sale => {
                                const client = clients.find(c => c.id === sale.clientId);
                                const barber = users.find(u => u.id === sale.barberId);
                                return (
                                    <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-5 text-zinc-500 font-mono text-[10px]">
                                            <div className="text-zinc-300 font-black">{new Date(sale.timestamp).toLocaleDateString()}</div>
                                            <div>{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td className="p-5">
                                            <div className="font-black text-white text-xs uppercase tracking-tight">{client?.name || 'Venta Directa'}</div>
                                            <div className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mt-1">Ticket: {(sale.id || '').split('-')[0].toUpperCase()}</div>
                                        </td>
                                        <td className="p-5"><span className="text-[10px] text-zinc-400 font-black uppercase bg-zinc-900 px-2 py-1 rounded border border-zinc-800">{barber?.name?.split(' ')[0] || '---'}</span></td>
                                        <td className="p-5"><div className="text-[9px] text-zinc-500 truncate max-w-xs uppercase font-bold leading-relaxed">{(sale.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ')}</div></td>
                                        <td className="p-5 text-right font-black text-emerald-500 font-mono text-lg tracking-tighter">${Number(sale.total || 0).toFixed(2)}</td>
                                        <td className="p-5 text-center">
                                            <button onClick={() => setSelectedSale(sale)} className="p-3 bg-zinc-800 hover:bg-blue-600 text-zinc-500 hover:text-white rounded-xl transition-all shadow-lg active:scale-95 group-hover:scale-110" title="Levantar Ticket">
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {selectedSale && (
                <div className="fixed inset-0 z-[600] bg-black/98 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-8 animate-in zoom-in duration-200">

                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-600/20 p-2 rounded-xl text-blue-500"><Receipt size={20} /></div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">Copia de Ticket</h3>
                            </div>
                            <button onClick={() => setSelectedSale(null)} className="text-zinc-600 hover:text-white"><X size={24} /></button>
                        </div>

                        <div className="transform hover:scale-[1.02] transition-transform mb-8">
                            <TicketContent sale={selectedSale} config={config} catalog={catalog} />
                        </div>

                        <div className="space-y-4 no-print">
                            <button
                                onClick={() => printReceipt('printable-receipt')}
                                className="w-full bg-black text-white py-4 font-black rounded-2xl uppercase text-xs flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all border-b-4 border-zinc-800 active:border-b-0 hover:bg-zinc-950"
                            >
                                <Printer size={18} /> Reimprimir Ticket
                            </button>

                            <div className={`p-4 rounded-3xl border space-y-3 shadow-lg transition-colors ${receiptEmail ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                <label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${receiptEmail ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {receiptEmail ? 'Reenviar Comprobante' : 'Falta Correo Electrónico'}
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 ${receiptEmail ? 'text-emerald-300' : 'text-red-300'}`} size={14} />
                                        <input type="email" value={receiptEmail} onChange={(e) => setReceiptEmail(e.target.value)} placeholder="cliente@correo.com" className={`w-full border rounded-xl py-2.5 pl-9 pr-2 text-xs font-bold outline-none focus:border-blue-300 transition-all ${receiptEmail ? 'bg-white border-emerald-200 text-emerald-900 focus:border-emerald-500' : 'bg-white border-red-200 text-red-900 focus:border-red-500'}`} />
                                    </div>
                                    <button onClick={handleSendEmail} disabled={isSending} className={`p-2.5 rounded-xl shadow-lg transition-all active:scale-95 ${isSending ? 'bg-zinc-200 text-zinc-400' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                                        {isSending ? <RefreshCw className="animate-spin" size={18} /> : <Mail size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button onClick={() => setSelectedSale(null)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-colors shadow-lg active:scale-95">
                                Finalizar Consulta
                            </button>
                        </div>
                    </div>

                    {/* PORTAL DE IMPRESIÓN EXTERNO AL MODAL */}
                    {createPortal(
                        <div id="printable-receipt" className="print-area hidden">
                            <TicketContent sale={selectedSale} config={config} catalog={catalog} />
                        </div>,
                        document.body
                    )}

                </div>
            )}

        </div>
    );
};
