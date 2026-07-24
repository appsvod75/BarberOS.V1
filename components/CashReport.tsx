import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBarber } from '../context/BarberContext';
import { CashReportContent } from './CashReportContent';
import { printReceipt } from '../services/printService';
import {
    DollarSign, CreditCard, ArrowRightLeft, Printer, Mail, Bitcoin, Lock,
    TrendingUp, Clock, ShieldCheck, Smartphone, BarChart3, Scissors, Package, Layers, Receipt, Power, ArrowLeft,
    History, Calendar, CheckCircle2, ChevronRight, Eye, AlertTriangle, X
} from 'lucide-react';
import { CashClosure } from '../types';

interface CashReportProps {
    navigateView?: (view: string) => void;
}

export const CashReport = ({ navigateView }: CashReportProps) => {
    const { sales, catalog, cashSession, cashClosures, config, closeCashSession, currentUser } = useBarber();

    const [tab, setTab] = useState<'current' | 'history'>('current');
    const [viewingClosureId, setViewingClosureId] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

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
                const totalPaid = s.payments.reduce((sum, p) => sum + p.amount, 0);
                const change = Math.max(0, totalPaid - s.total);
                s.payments.forEach(p => {
                    if (p.method === 'cash') cash += (p.amount - change);
                    if (p.method === 'card') card += p.amount;
                    if (p.method === 'transfer') transfer += p.amount;
                    if (p.method === 'bitcoin') bitcoin += p.amount;
                });

                s.items.forEach(item => {
                    const cat = catalog.find(c => c.id === item.itemId);
                    if (cat?.type === 'service') {
                        servicesCount += item.quantity;
                        servicesTotal += (item.price * item.quantity);
                    }
                    else if (cat?.type === 'product') {
                        productsCount += item.quantity;
                        productsTotal += (item.price * item.quantity);
                    }
                    else if (cat?.type === 'combo') {
                        combosCount += item.quantity;
                        combosTotal += (item.price * item.quantity);
                    }
                });
            });

            return {
                opening: session.openingAmount,
                cash, card, transfer, bitcoin,
                totalSales: sessionSales.reduce((a, b) => a + b.total, 0),
                totalInDrawer: session.openingAmount + cash,
                count: sessionSales.length,
                servicesCount, servicesTotal,
                productsCount, productsTotal,
                combosCount, combosTotal,
                openedAt: session.openedAt,
                openedBy: session.openedBy,
                branchId: session.branchId,
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
                openedBy: c.openedBy,
                branchId: c.branchId
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

    if (tab === 'history' && !viewingClosureId) {
        return (
            <div className="h-full w-full bg-zinc-950 flex flex-col p-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-8 shrink-0">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigateView && navigateView('pos')} className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"><ArrowLeft size={18} /> REGRESAR</button>
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
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-900/20 border border-zinc-900 rounded-[2rem]">
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
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 shrink-0">
                        <div className="flex items-center gap-6">
                            <button onClick={() => navigateView && navigateView('pos')} className="bg-zinc-900 hover:bg-zinc-800 p-4 rounded-2xl border border-zinc-800 text-zinc-400 hover:text-white transition-all shadow-lg active:scale-95"><ArrowLeft size={24} /></button>
                            <div>
                                <h1 className="text-3xl font-black text-white uppercase tracking-tight">{viewingClosureId ? 'Auditoría de Cierre' : 'Reporte de Corte Z'}</h1>
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
                            <div className="xl:col-span-3 space-y-6 overflow-y-auto custom-scrollbar pb-6">
                                <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-900/20 relative overflow-hidden group">
                                    <div className="absolute -right-6 -top-6 opacity-10 group-hover:scale-110 transition-transform"><DollarSign size={160} /></div>
                                    <div className="relative z-10">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Efectivo en Caja</span>
                                        <div className="text-5xl font-black font-mono tracking-tighter mt-2">${stats.totalInDrawer.toFixed(2)}</div>
                                        <div className="mt-6 pt-6 border-t border-white/20 flex justify-between items-center">
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

                                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:rotate-12 transition-transform"><Clock size={60} /></div>
                                    <h3 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3"><ShieldCheck size={16} className="text-emerald-500" /> Registro de Sesión</h3>
                                    <div className="space-y-6">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Cajero Responsable</span>
                                            <span className="text-sm font-black text-white uppercase truncate">{stats.openedBy}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Inicio de Jornada</span>
                                            <span className="text-sm font-black text-white uppercase font-mono">{new Date(stats.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">ID Sucursal</span>
                                            <span className="text-xs font-black text-zinc-400 uppercase font-mono">{stats.branchId.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* NUEVA CARD: EFICIENCIA OPERATIVA */}
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={60} /></div>
                                    <h3 className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3 mb-6"><BarChart3 size={16} className="text-blue-500" /> Rendimiento</h3>
                                    <div className="space-y-6">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Ticket Promedio</span>
                                            <span className="text-xl font-black text-white font-mono tracking-tighter">${(stats.totalSales / (stats.count || 1)).toFixed(2)}</span>
                                            <span className="text-[7px] font-bold text-zinc-500 uppercase mt-1">Gasto medio por cliente</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2">Mix de Venta</span>
                                            <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-zinc-800">
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

                                    <div className="bg-white shadow-2xl cursor-default select-none flex-1 flex flex-col justify-between max-w-[280px] border border-zinc-200 overflow-hidden">
                                        <CashReportContent stats={stats} config={config} />
                                    </div>
                                </div>

                                {/* BOTONERÍA HORIZONTAL AJUSTADA */}
                                <div className="flex gap-2 shrink-0 mt-4">
                                    <button
                                        onClick={() => printReceipt('printable-report-z')}
                                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-4 rounded-2xl font-black uppercase text-[10px] tracking-tight shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                                    >
                                        <Printer size={18} /> <span className="hidden xl:inline">Imprimir</span>
                                    </button>
                                    <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-4 rounded-2xl font-black uppercase text-[10px] tracking-tight shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all opacity-40 cursor-not-allowed">
                                        <Mail size={18} /> <span className="hidden xl:inline">Correo</span>
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

                    {/* PORTAL DE IMPRESIÓN EXTERNO AL FLUJO NORMAL */}
                    {createPortal(
                        <div id="printable-report-z" className="print-area hidden">
                            <CashReportContent stats={stats} config={config} />
                        </div>,
                        document.body
                    )}

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
        <div className={`text-lg font-black font-mono tracking-tighter ${color}`}>${amount.toFixed(2)}</div>
    </div>
);

const InfoItem = ({ label, value }: any) => (
    <div className="flex flex-col">
        <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">{label}</span>
        <span className="text-xs font-black text-white uppercase truncate">{value}</span>
    </div>
);
