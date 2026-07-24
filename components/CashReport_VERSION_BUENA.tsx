import React, { useMemo, useState } from 'react';
import { useBarber } from '../context/BarberContext';
import { printReceipt } from '../services/printService';
import {
    DollarSign, CreditCard, ArrowRightLeft, Printer, Mail, Bitcoin, Lock,
    TrendingUp, Clock, ShieldCheck, Smartphone, BarChart3, Scissors, Package, Layers, Receipt, Power, ArrowLeft,
    History, Calendar, CheckCircle2, ChevronRight, Eye, AlertTriangle, X
} from 'lucide-react';
import { useDragScroll } from '../hooks/useDragScroll';
import { CashClosure } from '../types';

interface CashReportProps {
    navigateView?: (view: string) => void;
}

export const CashReport = ({ navigateView }: CashReportProps) => {
    const { sales, catalog, users, cashSession, cashClosures, config, closeCashSession, currentUser, branches, currentBranchId } = useBarber();
    const historyScroll = useDragScroll();

    const [tab, setTab] = useState<'current' | 'history'>('current');
    const [viewingClosureId, setViewingClosureId] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    const stats = useMemo(() => {
        const computeReport = (session: { branchId: string, openedAt: string, openingAmount: number, openedBy: string }) => {
            const sessionSales = sales.filter(s =>
                s.branchId === session.branchId &&
                new Date(s.timestamp) >= new Date(session.openedAt)
            );
            let cash = 0, card = 0, transfer = 0, bitcoin = 0;
            let servicesTotal = 0, productsTotal = 0, combosTotal = 0;
            let servicesCount = 0, productsCount = 0, combosCount = 0;

            sessionSales.forEach(s => {
                const totalPaid = (s.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
                const saleTotal = Number(s.total || 0);
                const change = Math.max(0, totalPaid - saleTotal);
                (s.payments || []).forEach(p => {
                    const amt = Number(p.amount || 0);
                    if (p.method === 'cash') cash += (amt - change);
                    if (p.method === 'card') card += amt;
                    if (p.method === 'transfer') transfer += amt;
                    if (p.method === 'bitcoin') bitcoin += amt;
                });

                (s.items || []).forEach(item => {
                    const price = Number(item.price || 0);
                    const qty = Number(item.quantity || 1);
                    const cat = catalog.find(c => c.id === item.itemId);
                    if (cat?.type === 'service') {
                        servicesCount += qty;
                        servicesTotal += (price * qty);
                    }
                    else if (cat?.type === 'product') {
                        productsCount += qty;
                        productsTotal += (price * qty);
                    }
                    else if (cat?.type === 'combo') {
                        combosCount += qty;
                        combosTotal += (price * qty);
                    }
                });
            });

            return {
                opening: Number(session.openingAmount || 0),
                cash, card, transfer, bitcoin,
                totalSales: sessionSales.reduce((a, b) => a + Number(b.total || 0), 0),
                totalInDrawer: Number(session.openingAmount || 0) + cash,
                count: sessionSales.length,
                servicesCount, servicesTotal,
                productsCount, productsTotal,
                combosCount, combosTotal,
                openedAt: session.openedAt,
                openedBy: users.find(u => String(u.id) === String(session.openedBy))?.name || session.openedBy,
                branchId: session.branchId,
                branchName: branches.find(b => b.id === session.branchId)?.name || 'Sede Central',
                // Added closedAt as undefined to match CashClosure structure and fix TS union error
                closedAt: undefined as string | undefined
            };
        };

        if (viewingClosureId) {
            const c = cashClosures.find(x => x.id === viewingClosureId);
            if (c) return {
                opening: c.openingAmount,
                cash: c.totalCash,
                card: c.totalCard,
                transfer: c.totalTransfer,
                bitcoin: c.totalBitcoin,
                totalSales: c.totalSales,
                totalInDrawer: c.openingAmount + c.totalCash,
                count: c.operationsCount,
                servicesCount: 0,
                servicesTotal: c.servicesTotal,
                productsCount: 0,
                productsTotal: c.productsTotal,
                combosCount: c.operationsCount > 0 ? 1 : 0,
                combosTotal: c.combosTotal,
                openedAt: c.openedAt,
                closedAt: c.closedAt,
                openedBy: users.find(u => String(u.id) === String(c.openedBy))?.name || c.openedBy,
                branchId: c.branchId,
                branchName: branches.find(b => b.id === c.branchId)?.name || 'Sede Central'
            };
        }

        if (!cashSession) return null;
        return computeReport(cashSession);
    }, [cashSession, sales, catalog, viewingClosureId, cashClosures]);

    const handleExecuteClosure = () => {
        if (!stats) return;

        closeCashSession({
            branchId: stats.branchId,
            openedAt: stats.openedAt,
            openedBy: stats.openedBy,
            openingAmount: stats.opening,
            totalSales: stats.totalSales,
            totalCash: stats.cash,
            totalCard: stats.card,
            totalTransfer: stats.transfer,
            totalBitcoin: stats.bitcoin,
            servicesTotal: stats.servicesTotal,
            productsTotal: stats.productsTotal,
            combosTotal: stats.combosTotal,
            operationsCount: stats.count
        });

        setShowConfirmModal(false);
        if (navigateView) navigateView('pos');
    };

    const handleSendEmail = async () => {
        if (!stats || !currentBranchId) return;

        const currentBranch = branches.find(b => b.id === currentBranchId);
        if (!currentBranch?.reportEmail) {
            alert('⚠️ No hay correo configurado para esta sucursal.\nConfigúralo en Gestión de Sucursales.');
            return;
        }

        if (!currentBranch?.webhookUrl) {
            alert('⚠️ No hay webhook configurado para esta sucursal.\nConfigúralo en Gestión de Sucursales.');
            return;
        }

        setIsSendingEmail(true);

        try {
            const reportData = {
                date: new Date(stats.openedAt).toLocaleDateString('es-ES'),
                cashier: currentUser?.name || 'N/A',
                openTime: new Date(stats.openedAt).toLocaleTimeString('es-ES'),
                closeTime: new Date().toLocaleTimeString('es-ES'),
                openingAmount: stats.opening,
                totalSales: stats.totalSales,
                expectedTotal: stats.opening + stats.totalSales,
                paymentMethods: {
                    'Efectivo': stats.cash,
                    'Tarjeta': stats.card,
                    'Transferencia': stats.transfer,
                    'Bitcoin': stats.bitcoin
                }
            };

            const res = await fetch('/api/send-cash-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branchId: currentBranchId,
                    reportData
                })
            });

            const data = await res.json();

            if (data.success) {
                alert('✅ Reporte enviado correctamente a ' + currentBranch.reportEmail);
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (e: any) {
            alert('❌ Error al enviar el reporte: ' + e.message);
        } finally {
            setIsSendingEmail(false);
        }
    };

    if (tab === 'history' && !viewingClosureId) {
        return (
            <div className="h-full w-full bg-zinc-950 flex flex-col p-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-8 shrink-0">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigateView?.('pos')}
                            className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-b-4 border-zinc-950 active:border-b-0 active:translate-y-1 shadow-lg active:scale-95"
                        >
                            <ArrowLeft size={18} /> REGRESAR
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Archivo de Auditoría</h1>
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Historial de Reportes Z</p>
                        </div>
                    </div>
                    <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 shadow-xl">
                        <button onClick={() => { setTab('current'); setViewingClosureId(null); }} className="px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-zinc-600 hover:text-zinc-400">Reporte Actual</button>
                        <button className="px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all bg-amber-500 text-black shadow-lg">Historial</button>
                    </div>
                </div>
                <div
                    ref={historyScroll.ref}
                    {...historyScroll.props}
                    className="flex-1 overflow-y-auto hide-scrollbar bg-zinc-900/20 border border-zinc-900 rounded-[2rem]"
                >
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-zinc-950/80 text-zinc-600 font-black uppercase text-[10px] border-b border-zinc-900 tracking-widest sticky top-0">
                            <tr>
                                <th className="p-5">Fecha Cierre</th>
                                <th className="p-5">Cajero</th>
                                <th className="p-5 text-right">Efectivo Total</th>
                                <th className="p-5 text-right">Venta Total</th>
                                <th className="p-5 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                            {cashClosures.map(c => (
                                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-5"><div className="font-black text-white text-sm uppercase">{new Date(c.closedAt!).toLocaleDateString()}</div><div className="text-[10px] text-zinc-500 font-bold uppercase">{new Date(c.closedAt!).toLocaleTimeString()}</div></td>
                                    <td className="p-5 text-zinc-400 font-black text-[11px] uppercase">{c.openedBy}</td>
                                    <td className="p-5 text-right font-black text-emerald-500 font-mono">${(c.openingAmount + c.totalCash).toFixed(2)}</td>
                                    <td className="p-5 text-right font-black text-white font-mono text-lg">${c.totalSales.toFixed(2)}</td>
                                    <td className="p-5 text-center"><button onClick={() => { setViewingClosureId(c.id); setTab('current'); }} className="p-2 bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white rounded-xl transition-all shadow-md"><Eye size={18} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-zinc-950 overflow-hidden flex flex-col p-4 lg:p-8 animate-in fade-in duration-300">
            {stats ? (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-6 shrink-0">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => navigateView?.('pos')}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-[11px] tracking-[0.1em] shadow-xl shadow-blue-900/20 active:scale-95 transition-all flex items-center gap-3 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
                            >
                                <ArrowLeft size={18} /> REGRESAR AL POS
                            </button>
                            <div>
                                <h1 className="text-2xl font-black text-white uppercase tracking-tight">{viewingClosureId ? 'Auditoría de Cierre' : 'Reporte de Corte Z'}</h1>
                                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Control de Efectivo e Ingresos por Sucursal</p>
                            </div>
                        </div>
                        {!viewingClosureId && (
                            <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 shadow-xl">
                                <button className="px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all bg-emerald-600 text-white shadow-lg">Corte Actual</button>
                                <button onClick={() => setTab('history')} className="px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all text-zinc-600 hover:text-zinc-400">Ver Historial</button>
                            </div>
                        )}
                        {viewingClosureId && (
                            <button onClick={() => { setViewingClosureId(null); setTab('history'); }} className="bg-amber-600 hover:bg-amber-500 text-black px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95">Regresar al Archivo</button>
                        )}
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full">
                            {/* COLUMNA IZQUIERDA: RESUMEN FINANCIERO Y AUDITORÍA (Span 3) */}
                            <div className="xl:col-span-3 flex flex-col justify-between h-full gap-4 pb-4"> {/* Distributed items to match total height */}
                                <div className="flex-1 bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 rounded-[2rem] text-white shadow-2xl shadow-emerald-900/20 relative overflow-hidden group flex flex-col justify-center">
                                    <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform"><DollarSign size={100} /></div>
                                    <div className="relative z-10">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Efectivo en Caja</span>
                                        <div className="text-4xl font-black font-mono tracking-tighter mt-1">${stats.totalInDrawer.toFixed(2)}</div>
                                        <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center">
                                            <div>
                                                <div className="text-[9px] font-black uppercase opacity-60">Base Apertura</div>
                                                <div className="text-lg font-black font-mono">${stats.opening.toFixed(2)}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[9px] font-black uppercase opacity-60">Ventas Cash</div>
                                                <div className="text-lg font-black font-mono">+${stats.cash.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group flex flex-col justify-center">
                                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:rotate-12 transition-transform"><Clock size={40} /></div>
                                    <h3 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 mb-4"><ShieldCheck size={14} className="text-emerald-500" /> Registro de Sesión</h3>
                                    <div className="space-y-4">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">Cajero Responsable</span>
                                            <span className="text-xs font-black text-white uppercase truncate">{stats.openedBy}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">Inicio de Jornada</span>
                                            <span className="text-xs font-black text-white uppercase font-mono">{new Date(stats.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">Sucursal</span>
                                            <span className="text-xs font-black text-white uppercase truncate">{stats.branchName}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group flex flex-col justify-center">
                                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={40} /></div>
                                    <h3 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 mb-4"><BarChart3 size={14} className="text-blue-500" /> Rendimiento</h3>
                                    <div className="space-y-4">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">Ticket Promedio</span>
                                            <span className="text-xl font-black text-white font-mono tracking-tighter">${(stats.totalSales / (stats.count || 1)).toFixed(2)}</span>
                                            <span className="text-[7px] font-bold text-zinc-500 uppercase mt-0.5">Gasto medio por cliente</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2">Mix de Venta</span>
                                            <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-zinc-800">
                                                <div className="bg-blue-500" style={{ width: `${(stats.servicesTotal / (stats.totalSales || 1)) * 100}%` }}></div>
                                                <div className="bg-amber-500" style={{ width: `${(stats.productsTotal / (stats.totalSales || 1)) * 100}%` }}></div>
                                                <div className="bg-indigo-500" style={{ width: `${(stats.combosTotal / (stats.totalSales || 1)) * 100}%` }}></div>
                                            </div>
                                            <div className="flex justify-between mt-2 text-[7px] font-black uppercase tracking-tighter">
                                                <span className="text-blue-400">Serv</span>
                                                <span className="text-amber-400">Prod</span>
                                                <span className="text-indigo-400">Comb</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* COLUMNA CENTRAL: FORMAS DE PAGO Y COMBOS (Span 6) */}
                            <div className="xl:col-span-6 flex flex-col gap-4 overflow-hidden pb-4">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-xl shrink-0">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3"><BarChart3 size={16} className="text-blue-500" /> Métodos de Pago</h3>
                                        <div className="text-right">
                                            <span className="text-[9px] font-black text-zinc-600 uppercase block leading-none">Venta Bruta</span>
                                            <span className="text-2xl font-black text-white font-mono tracking-tighter">${stats.totalSales.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                                            <MethodItem icon={<CreditCard size={18} />} label="Tarjetas" amount={stats.card} color="text-blue-400" />
                                        </div>
                                        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                                            <MethodItem icon={<ArrowRightLeft size={18} />} label="Transf." amount={stats.transfer} color="text-violet-400" />
                                        </div>
                                        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                                            <MethodItem icon={<Bitcoin size={18} />} label="Bitcoin" amount={stats.bitcoin} color="text-orange-400" />
                                        </div>
                                        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                                            <MethodItem icon={<DollarSign size={18} />} label="Efectivo" amount={stats.cash} color="text-emerald-400" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-6 flex-1 shadow-inner relative flex flex-col">
                                    <h3 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3 mb-4"><Layers size={16} className="text-indigo-500" /> Desempeño y Combos</h3>
                                    <div className="grid grid-cols-3 gap-4 flex-1 items-center">
                                        <MetricCard icon={<Scissors size={20} />} label="Servicios" value={`$${stats.servicesTotal.toFixed(2)}`} sub={`${stats.servicesCount} un`} color="bg-blue-600/20 text-blue-500" />
                                        <MetricCard icon={<Package size={20} />} label="Productos" value={`$${stats.productsTotal.toFixed(2)}`} sub={`${stats.productsCount} un`} color="bg-amber-600/20 text-amber-500" />
                                        <MetricCard icon={<Layers size={20} />} label="Combos" value={`$${stats.combosTotal.toFixed(2)}`} sub={`${stats.combosCount} un`} color="bg-indigo-600/20 text-indigo-500" />
                                    </div>
                                    <div className="mt-4 p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex justify-between items-center text-zinc-500 font-black uppercase text-[9px] tracking-widest shrink-0">
                                        <span>Total Operaciones</span>
                                        <span className="text-white text-lg font-mono">{stats.count}</span>
                                    </div>
                                </div>
                            </div>

                            {/* COLUMNA DERECHA: TICKET Y BOTONERÍA (Span 3) */}
                            <div className="xl:col-span-3 flex flex-col gap-4 overflow-hidden no-print pb-4">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-5 shadow-xl flex flex-col items-center flex-1 relative overflow-hidden group">
                                    <h3 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4 shrink-0">Reporte Final</h3>

                                    <div id="printable-report-z" className="bg-white text-black p-8 w-full shadow-2xl font-mono text-[10px] leading-tight cursor-default select-none flex-1 flex flex-col justify-between max-w-[280px] border border-zinc-200">
                                        <div>
                                            <div className="border-b-2 border-black border-dashed pb-4 mb-4 text-center">
                                                {config.logoUrl && <img src={config.logoUrl} alt="Logo" className="h-10 mx-auto mb-2 grayscale" />}
                                                <div className="text-[11px] font-black uppercase leading-none">{config.salonName}</div>
                                                <div className="text-[8px] opacity-70 mt-1 uppercase tracking-tighter">FINANZAS CORTE Z</div>
                                                <div className="text-[8px] opacity-70 uppercase">{new Date().toLocaleString()}</div>
                                            </div>

                                            <div className="space-y-1.5 mb-6 text-[11px]">
                                                <div className="flex justify-between font-black border-b border-black pb-1 mb-1"><span>CONCEPTO</span><span>VALOR</span></div>
                                                <div className="flex justify-between"><span>BASE INICIAL</span><span>${stats.opening.toFixed(2)}</span></div>
                                                <div className="flex justify-between"><span>VENTAS CASH</span><span>${stats.cash.toFixed(2)}</span></div>
                                                <div className="flex justify-between"><span>V. TARjeta</span><span>${stats.card.toFixed(2)}</span></div>
                                                <div className="flex justify-between font-black pt-1 border-t border-black"><span>BRUTO TOTAL</span><span>${stats.totalSales.toFixed(2)}</span></div>
                                                <div className="flex justify-between font-black text-[12px] pt-1 border-t-2 border-black border-double uppercase italic"><span>CAJA TOTAL</span><span>${stats.totalInDrawer.toFixed(2)}</span></div>
                                            </div>

                                            <div className="space-y-1.5 mb-6 text-[10px]">
                                                <div className="flex justify-between font-black border-b border-black/10 pb-1 mb-1"><span>CONTROLES</span></div>
                                                <div className="flex justify-between"><span>CORTE ({stats.servicesCount})</span><span>${stats.servicesTotal.toFixed(2)}</span></div>
                                                <div className="flex justify-between"><span>RETAIL ({stats.productsCount})</span><span>${stats.productsTotal.toFixed(2)}</span></div>
                                                <div className="flex justify-between font-bold"><span>COMBOS ({stats.combosCount})</span><span>${stats.combosTotal.toFixed(2)}</span></div>
                                            </div>
                                        </div>

                                        <div className="border-t-2 border-black border-dashed pt-4 text-center shrink-0">
                                            <div className="text-[8px] font-black uppercase mb-1">AUDIT: {stats.openedBy?.split(' ')[0] || 'N/A'}</div>
                                            <div className="text-[7px] opacity-40 uppercase tracking-tighter italic">Validado BarberOS v4.0</div>
                                        </div>
                                    </div>
                                </div>

                                {/* BOTONERÍA HORIZONTAL AJUSTADA */}
                                <div className="flex gap-2 shrink-0 mt-4">
                                    <button onClick={() => printReceipt('printable-report-z')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-4 rounded-2xl font-black uppercase text-[10px] tracking-tight shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                                        <Printer size={18} /> <span className="hidden xl:inline">Imprimir</span>
                                    </button>
                                    <button
                                        onClick={handleSendEmail}
                                        disabled={isSendingEmail}
                                        className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-tight shadow-xl flex items-center justify-center gap-2 transition-all ${isSendingEmail
                                            ? 'bg-zinc-700 text-zinc-500 cursor-wait'
                                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:scale-95'
                                            }`}
                                    >
                                        <Mail size={18} /> <span className="hidden xl:inline">{isSendingEmail ? 'Enviando...' : 'Correo'}</span>
                                    </button>
                                    {!viewingClosureId && (
                                        <button onClick={() => setShowConfirmModal(true)} className="flex-2 bg-red-600 hover:bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-tight shadow-xl shadow-red-900/20 flex items-center justify-center gap-2 border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all">
                                            <Power size={18} /> <span className="hidden xl:inline">Cerrar Caja Z</span>
                                        </button>
                                    )}
                                    {viewingClosureId && (
                                        <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-2xl text-center">
                                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Documento Archivado de Auditoría</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-700 space-y-6">
                    <div className="w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center animate-pulse"><DollarSign size={40} className="opacity-20" /></div>
                    <div className="text-center"><h2 className="text-xl font-black text-white uppercase tracking-widest">Esperando Sesión</h2><p className="text-sm font-bold text-zinc-600 uppercase tracking-widest mt-2">Abre caja en el POS para ver el reporte operativo</p></div>
                    <button onClick={() => navigateView && navigateView('pos')} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Ir a Terminal POS</button>
                </div>
            )}

            {showConfirmModal && (
                <div className="fixed inset-0 z-[1000] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-zinc-900 border border-red-900/50 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center text-center animate-in zoom-in duration-200">
                        <div className="w-20 h-20 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 border border-red-500/30 mb-6"><AlertTriangle size={40} /></div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Confirmar Cierre Z</h2>
                        <p className="text-zinc-500 text-sm mb-8 leading-relaxed">Esta acción registrará el cierre contable definitivo, enviará el reporte por email y bloqueará el POS hasta una nueva apertura. ¿Deseas continuar?</p>
                        <div className="w-full flex gap-4">
                            <button onClick={() => setShowConfirmModal(false)} className="flex-1 bg-zinc-800 text-zinc-400 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Cancelar</button>
                            <button onClick={handleExecuteClosure} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all border-b-4 border-red-800 active:border-b-0">Confirmar Cierre</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const MetricCard = ({ icon, label, value, sub, color }: any) => (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl group hover:border-zinc-700 transition-all">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${color}`}>{icon}</div>
        <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">{label}</div>
        <div className="text-2xl font-black text-white font-mono tracking-tighter leading-none mb-1">{value}</div>
        <div className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest">{sub}</div>
    </div>
);

const MethodItem = ({ icon, label, amount, color }: any) => (
    <div className="flex justify-between items-center group">
        <div className="flex items-center gap-3 text-zinc-500 group-hover:text-zinc-300 transition-colors">
            {icon}
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <div className={`text-lg font-black font-mono tracking-tighter ${color}`}>${Number(amount || 0).toFixed(2)}</div>
    </div>
);

const InfoItem = ({ label, value }: any) => (
    <div className="flex flex-col">
        <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
        <span className="text-xs font-black text-white uppercase truncate">{value}</span>
    </div>
);
