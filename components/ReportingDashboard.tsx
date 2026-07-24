
import React, { useState, useMemo } from 'react';
import { useBarber } from '../context/BarberContext';
import {
    BarChart3, TrendingUp, Users, DollarSign, Calendar,
    Target, Scissors, Package, Layers, Store, Award,
    Download, Info, FileText, FileSpreadsheet, ChevronRight, Clock, Star, Zap, LayoutGrid,
    ShoppingBag
} from 'lucide-react';
import { useDragScroll } from '../hooks/useDragScroll';

export const ReportingDashboard = () => {
    const { sales, catalog, branches, users, monthlyPlans } = useBarber();
    const monitorScroll = useDragScroll();
    const staffScroll = useDragScroll();
    const exportScroll = useDragScroll();

    const [activeTab, setActiveTab] = useState<'dashboard' | 'exports'>('dashboard');
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const now = new Date();
    const currentDayOfMonth = now.getDate();
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();
    const lastDayOfMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

    const filteredSales = useMemo(() => {
        let start = new Date();
        if (dateRange === 'today') start.setHours(0, 0, 0, 0);
        else if (dateRange === 'week') start.setDate(now.getDate() - 7);
        else if (dateRange === 'month') start.setDate(1);
        else if (dateRange === 'custom' && customStart) start = new Date(customStart);

        return sales.filter(s => {
            const saleDate = new Date(s.timestamp);
            if (dateRange === 'custom' && customEnd) {
                const end = new Date(customEnd);
                end.setHours(23, 59, 59, 999);
                return saleDate >= start && saleDate <= end;
            }
            return saleDate >= start;
        });
    }, [sales, dateRange, customStart, customEnd]);

    const branchMetrics = useMemo(() => {
        return branches.map(b => {
            const branchSales = filteredSales.filter(s => s.branchId === b.id);
            const actualAmount = branchSales.reduce((acc, s) => acc + s.total, 0);

            const productSales = branchSales.reduce((acc, s) => {
                const prodTotal = s.items.reduce((sum, item) => {
                    const catItem = catalog.find(c => c.id === item.itemId);
                    return catItem?.type === 'product' ? sum + (item.price * item.quantity) : sum;
                }, 0);
                return acc + prodTotal;
            }, 0);

            // BÚSQUEDA DEL PLAN ESPECÍFICO DEL MES
            const plan = monthlyPlans.find(p => p.branchId === b.id && p.month === currentMonthIdx && p.year === currentYear);

            const goal = plan?.goal || b.defaultMonthlyGoal || 5000;
            const totalWorkingDays = plan?.workingDays || b.defaultWorkingDays || 26;
            const productGoalPercent = plan?.productGoalPercent || b.defaultProductGoalPercent || 10;
            const productGoalAmount = goal * (productGoalPercent / 100);

            const daysPassedCalendar = currentDayOfMonth;
            const workingDaysPassedEst = (daysPassedCalendar / lastDayOfMonth) * totalWorkingDays;

            const projection = workingDaysPassedEst > 0
                ? (actualAmount / workingDaysPassedEst) * totalWorkingDays
                : 0;

            const progressPercent = (actualAmount / goal) * 100;
            const projectionPercent = (projection / goal) * 100;
            const productProgressPercent = (productSales / productGoalAmount) * 100;

            return {
                ...b,
                actualAmount,
                productSales,
                productGoalAmount,
                goal,
                projection,
                progressPercent,
                projectionPercent,
                productProgressPercent,
                totalWorkingDays,
                productGoalPercent
            };
        }).sort((a, b) => b.actualAmount - a.actualAmount);
    }, [branches, filteredSales, catalog, currentDayOfMonth, lastDayOfMonth, monthlyPlans, currentMonthIdx, currentYear]);

    const stats = useMemo(() => {
        const total = filteredSales.reduce((acc, s) => acc + s.total, 0);
        const count = filteredSales.length;
        const avgTicket = count > 0 ? total / count : 0;

        const byBarber = users.filter(u => u.role === 'barber').map(u => {
            const barberSales = filteredSales.filter(s => s.barberId === u.id);
            const amount = barberSales.reduce((acc, s) => acc + s.total, 0);
            return { name: u.name, amount };
        }).sort((a, b) => b.amount - a.amount).slice(0, 4);

        return { total, count, avgTicket, byBarber };
    }, [filteredSales, users]);

    return (
        <div className="h-full flex flex-col bg-zinc-950 font-inter overflow-hidden">

            {/* HEADER CON TABS */}
            <div className="px-6 py-3 border-b border-zinc-900 bg-zinc-950 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 text-blue-500 rounded-xl border border-blue-500/20 shadow-lg shadow-blue-900/10">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-tight leading-none">Cerebro de Datos</h2>
                            <p className="text-[7px] font-black text-zinc-600 uppercase tracking-[0.4em] mt-1">Intelligence & Network Analytics</p>
                        </div>
                    </div>

                    <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                        >
                            <LayoutGrid size={12} /> Dashboard Pro
                        </button>
                        <button
                            onClick={() => setActiveTab('exports')}
                            className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'exports' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                        >
                            <FileSpreadsheet size={12} /> Exportación Gerencial
                        </button>
                    </div>
                </div>

                {activeTab === 'dashboard' && (
                    <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                        <FilterBtn active={dateRange === 'today'} onClick={() => setDateRange('today')} label="Hoy" />
                        <FilterBtn active={dateRange === 'week'} onClick={() => setDateRange('week')} label="7D" />
                        <FilterBtn active={dateRange === 'month'} onClick={() => setDateRange('month')} label="MES" />
                    </div>
                )}
            </div>

            {activeTab === 'dashboard' ? (
                <div className="flex-1 p-4 lg:p-6 flex flex-col gap-4 min-h-0 overflow-hidden">

                    {/* KPIs SUPERIORES */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                        <KPICard icon={<DollarSign size={16} />} label="Venta Bruta" value={`$${stats.total.toLocaleString()}`} sub="Mes en Curso" color="text-emerald-500" trend={`${((stats.total / 15000) * 100).toFixed(0)}% Cuota`} />
                        <KPICard icon={<Target size={16} />} label="Ticket Prom" value={`$${stats.avgTicket.toFixed(2)}`} sub="Eficiencia" color="text-blue-500" />
                        <KPICard icon={<ShoppingBag size={16} />} label="Venta Productos" value={`$${branchMetrics.reduce((a, b) => a + b.productSales, 0).toLocaleString()}`} sub="Retail" color="text-amber-500" />
                        <KPICard icon={<TrendingUp size={16} />} label="Forecasting Red" value={`$${branchMetrics.reduce((a, b) => a + b.projection, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="Cierre Estimado" color="text-purple-500" />
                    </div>

                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">

                        {/* MONITOR DE METAS Y PROYECCIÓN (CENTRO) */}
                        <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-900 rounded-[2rem] p-6 shadow-xl flex flex-col min-h-0">
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-tight">Monitor de Desempeño por Sede</h3>
                                    <p className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest">Cálculo basado en Plan Mensual específico</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div><span className="text-[7px] font-black text-zinc-500 uppercase">Real</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div><span className="text-[7px] font-black text-zinc-500 uppercase">Proyectado</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-600"></div><span className="text-[7px] font-black text-zinc-500 uppercase">Retail</span></div>
                                </div>
                            </div>

                            <div
                                ref={monitorScroll.ref}
                                {...monitorScroll.props}
                                className="flex-1 space-y-6 overflow-y-auto hide-scrollbar pr-2"
                            >
                                {branchMetrics.map((branch, idx) => (
                                    <div key={idx} className="bg-black/20 p-5 rounded-3xl border border-zinc-800/50 hover:border-zinc-700 transition-all group">
                                        <div className="flex justify-between items-end mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-zinc-900 rounded-xl text-zinc-500 border border-zinc-800 group-hover:text-blue-500 transition-colors"><Store size={18} /></div>
                                                <div>
                                                    <div className="text-xs font-black text-white uppercase tracking-tight">{branch.name}</div>
                                                    <div className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                                                        <span>Esquema: {branch.totalWorkingDays} Días/Mes</span>
                                                        <span className="text-zinc-800">•</span>
                                                        <span>Retail: {branch.productGoalPercent}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-baseline justify-end gap-2 mb-1">
                                                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Meta: ${branch.goal.toLocaleString()}</span>
                                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Est: ${branch.projection.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                </div>
                                                <div className="text-xl font-black text-white font-mono leading-none tracking-tighter">${branch.actualAmount.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        {/* Barras de Progreso Triple */}
                                        <div className="space-y-2">
                                            <div className="relative h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900 shadow-inner">
                                                <div
                                                    className="absolute inset-y-0 left-0 bg-purple-600/30 transition-all duration-1000"
                                                    style={{ width: `${Math.min(100, branch.projectionPercent)}%` }}
                                                />
                                                <div
                                                    className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                                                    style={{ width: `${Math.min(100, branch.progressPercent)}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-1 w-full bg-zinc-950 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-amber-600 transition-all duration-1000"
                                                        style={{ width: `${Math.min(100, branch.productProgressPercent)}%` }}
                                                    />
                                                </div>
                                                <span className={`text-[7px] font-black uppercase w-20 text-right ${branch.productProgressPercent >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    Retail: {branch.productProgressPercent.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* TOP STAFF PERFORMANCE (DERECHA) */}
                        <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-900 rounded-[2rem] p-6 shadow-xl flex flex-col min-h-0">
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-tight">Elite Staff</h3>
                                    <p className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest">Ranking del Mes</p>
                                </div>
                                <Award className="text-yellow-600" size={20} />
                            </div>

                            <div
                                ref={staffScroll.ref}
                                {...staffScroll.props}
                                className="flex-1 space-y-3 overflow-y-auto hide-scrollbar"
                            >
                                {stats.byBarber.map((barber, idx) => (
                                    <div key={idx} className="flex items-center gap-3 group p-3 bg-black/20 rounded-2xl border border-zinc-800/30 hover:border-zinc-700 transition-all">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${idx === 0 ? 'bg-yellow-600 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[9px] font-black text-white uppercase truncate">{barber.name}</div>
                                            <div className="text-[7px] font-bold text-zinc-600 uppercase tracking-tighter">Socio Estratégico</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-emerald-500 font-mono">${barber.amount.toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-4 border-t border-zinc-800 shrink-0">
                                <div className="bg-blue-600/10 p-3 rounded-xl border border-blue-500/20">
                                    <p className="text-[7px] text-zinc-400 font-bold uppercase leading-tight text-center">Fomenta la competencia sana basándote en la proyección de cada sede.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* TAB DE EXPORTACIÓN GERENCIAL */
                <div
                    ref={exportScroll.ref}
                    {...exportScroll.props}
                    className="flex-1 p-8 overflow-y-auto hide-scrollbar animate-in fade-in zoom-in duration-300"
                >
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center text-center group hover:border-blue-600/40 transition-all">
                                <div className="w-16 h-16 rounded-3xl bg-blue-600/20 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform"><FileText size={32} /></div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Reportería PDF</h3>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed mb-6">Informes visuales listos para imprimir o enviar a socios. Incluye gráficos y KPIs.</p>
                                <div className="w-full space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1 text-left"><label className="text-[7px] font-black text-zinc-600 uppercase tracking-widest ml-1">Desde</label><input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-white font-mono text-[10px] outline-none focus:border-blue-600" /></div>
                                        <div className="space-y-1 text-left"><label className="text-[7px] font-black text-zinc-600 uppercase tracking-widest ml-1">Hasta</label><input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-white font-mono text-[10px] outline-none focus:border-blue-600" /></div>
                                    </div>
                                    <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-95 transition-all border-b-4 border-blue-800 active:border-b-0 flex items-center justify-center gap-3"><Download size={16} /> Generar Reporte Gerencial</button>
                                </div>
                            </div>

                            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center text-center group hover:border-emerald-600/40 transition-all">
                                <div className="w-16 h-16 rounded-3xl bg-emerald-600/20 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform"><FileSpreadsheet size={32} /></div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Data Master Excel</h3>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed mb-6">Listado plano de todas las operaciones para auditoría profunda y contabilidad.</p>
                                <div className="w-full space-y-4">
                                    <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800/50 space-y-2">
                                        <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500"></div><span className="text-[8px] font-black text-zinc-400 uppercase">Incluye Detalle de Items</span></div>
                                        <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500"></div><span className="text-[8px] font-black text-zinc-400 uppercase">Desglose de Métodos de Pago</span></div>
                                    </div>
                                    <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-95 transition-all border-b-4 border-emerald-800 active:border-b-0 flex items-center justify-center gap-3"><Download size={16} /> Exportar Datos Crudos (.xlsx)</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FOOTER */}
            <div className="px-8 py-2 border-t border-zinc-900 flex justify-between items-center shrink-0 bg-black/40">
                <span className="text-[6px] text-zinc-800 font-black uppercase tracking-[0.5em]">BarberOS BI Engine v3.3 • AI Forecasting & Monthly Planning Active</span>
                <div className="flex gap-4">
                    <button className="flex items-center gap-1.5 text-zinc-700 hover:text-zinc-400 transition-all">
                        <Info size={10} />
                        <span className="text-[7px] font-black uppercase tracking-widest">¿Cómo funciona el Plan Mensual?</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ icon, label, value, sub, color, trend }: any) => (
    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-[1.5rem] shadow-xl relative overflow-hidden group">
        <div className="flex justify-between items-start">
            <div className={`p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 ${color}`}>{icon}</div>
            {trend && (
                <div className="text-[7px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/10">
                    {trend}
                </div>
            )}
        </div>
        <div className="mt-2">
            <div className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">{label}</div>
            <div className={`text-xl font-black font-mono tracking-tighter ${color} leading-none mt-1`}>{value}</div>
            <div className="text-[7px] font-bold text-zinc-700 uppercase tracking-widest mt-1">{sub}</div>
        </div>
    </div>
);

const FilterBtn = ({ active, onClick, label }: any) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white text-black shadow-md' : 'text-zinc-600 hover:text-zinc-400'}`}
    >
        {label}
    </button>
);
