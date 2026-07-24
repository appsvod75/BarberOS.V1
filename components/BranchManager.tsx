
import React, { useState, useMemo } from 'react';
import { useBarber } from '../context/BarberContext';
import {
    Store, Plus, Edit, MapPin, Phone, Link2,
    CheckCircle2, Zap, Save, RefreshCw,
    AlertCircle, ShieldCheck, Globe, Target, Calendar,
    Percent, Ticket, ArrowRightLeft, Mail, ChevronRight, LayoutList,
    TrendingUp, Activity
} from 'lucide-react';
import { Branch, MonthlyPlan } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';

export const BranchManager = () => {
    const { branches, addBranch, updateBranch, monthlyPlans, upsertMonthlyPlan } = useBarber();
    const branchScroll = useDragScroll();

    const [activeTab, setActiveTab] = useState<'config' | 'plan'>('config');

    // Branch Form State
    const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [reportEmail, setReportEmail] = useState('');
    const [active, setActive] = useState(true);
    const [hasReception, setHasReception] = useState(true);
    const [defaultGoal, setDefaultGoal] = useState('5000');
    const [defaultDays, setDefaultDays] = useState('26');
    const [defaultProdPct, setDefaultProdPct] = useState('10');
    const [autoCloseTime, setAutoCloseTime] = useState('22:00:00');
    const [autoCloseEnabled, setAutoCloseEnabled] = useState(false);

    // Monthly Plan Form State
    const [planBranchId, setPlanBranchId] = useState('');
    const [planMonth, setPlanMonth] = useState(new Date().getMonth());
    const [planYear, setPlanYear] = useState(new Date().getFullYear());
    const [planGoal, setPlanGoal] = useState('');
    const [planDays, setPlanDays] = useState('');
    const [planProdPct, setPlanProdPct] = useState('10');

    const [notify, setNotify] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const showNotify = (type: 'success' | 'error', msg: string) => {
        setNotify({ type, msg });
        setTimeout(() => setNotify(null), 3000);
    };

    const handleEditBranch = (branch: Branch) => {
        setEditingBranchId(branch.id);
        setName(branch.name);
        setAddress(branch.address || '');
        setPhone(branch.phone || '');
        setEmail(branch.email || '');
        setWebhookUrl(branch.webhookUrl || '');
        setReportEmail(branch.reportEmail || '');
        setActive(branch.active);
        setHasReception(branch.hasReception || false);
        setDefaultGoal((branch.defaultMonthlyGoal || 5000).toString());
        setDefaultDays((branch.defaultWorkingDays || 26).toString());
        setDefaultProdPct((branch.defaultProductGoalPercent || 10).toString());
        setAutoCloseTime(branch.autoCloseTime || '22:00:00');
        setAutoCloseEnabled(branch.autoCloseEnabled || false);
        setActiveTab('config');
    };

    const handleSaveBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: Branch = {
            id: editingBranchId || crypto.randomUUID(),
            name, address, phone, email, webhookUrl, reportEmail, active, hasReception,
            defaultMonthlyGoal: parseFloat(defaultGoal),
            defaultWorkingDays: parseInt(defaultDays),
            defaultProductGoalPercent: parseFloat(defaultProdPct),
            autoCloseTime,
            autoCloseEnabled
        };

        let success = false;
        if (editingBranchId) {
            success = await updateBranch(payload);
        } else {
            success = await addBranch(payload);
        }

        if (success) {
            showNotify('success', editingBranchId ? 'Sucursal actualizada' : 'Sucursal creada');
            resetBranchForm();
        } else {
            showNotify('error', 'Error al sincronizar con el VPS');
        }
    };

    const resetBranchForm = () => {
        setEditingBranchId(null);
        setName('');
        setAddress('');
        setPhone('');
        setEmail('');
        setWebhookUrl('');
        setReportEmail('');
        setActive(true);
        setHasReception(true);
        setDefaultGoal('5000');
        setDefaultDays('26');
        setDefaultProdPct('10');
        setAutoCloseTime('22:00:00');
        setAutoCloseEnabled(false);
        // Limpiamos la selección del plan mensual al resetear el formulario de sucursal
        setPlanBranchId('');
    };

    const handleSavePlan = (e: React.FormEvent) => {
        e.preventDefault();
        if (!planBranchId) return showNotify('error', 'Selecciona una sucursal');
        const payload: MonthlyPlan = {
            id: crypto.randomUUID(),
            branchId: planBranchId,
            month: planMonth,
            year: planYear,
            goal: parseFloat(planGoal),
            workingDays: parseInt(planDays),
            productGoalPercent: parseFloat(planProdPct)
        };
        upsertMonthlyPlan(payload);
        showNotify('success', 'Plan mensual guardado');

        // RESET DE CAMPOS TRAS GUARDAR ESTRATEGIA
        setPlanGoal('');
        setPlanDays('');
        setPlanBranchId(''); // Esta es la línea clave que limpia la selección
    };

    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const years = [2024, 2025, 2026];

    return (
        <div className="h-full flex flex-col md:flex-row bg-zinc-950 animate-in fade-in duration-500 overflow-hidden font-inter">

            {notify && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold border ${notify.type === 'success' ? 'bg-emerald-600/90 text-white border-emerald-400' : 'bg-red-600/90 text-white border-red-400'}`}>
                    {notify.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {notify.msg}
                </div>
            )}

            {/* COLUMNA IZQUIERDA: GESTIÓN (ANCLADA) */}
            <div className="w-full md:w-[420px] border-r border-zinc-900 bg-black/20 overflow-hidden flex flex-col shrink-0 h-full">

                {/* TABS (Fijas arriba) */}
                <div className="p-4 border-b border-zinc-900 bg-zinc-950 shrink-0">
                    <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 shadow-xl">
                        <button
                            onClick={() => setActiveTab('config')}
                            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'config' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            Configuración
                        </button>
                        <button
                            onClick={() => setActiveTab('plan')}
                            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'plan' ? 'bg-yellow-600 text-black shadow-lg shadow-yellow-900/20' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            Plan Mensual
                        </button>
                    </div>
                </div>

                {/* FORMULARIO (Contenedor flexible) */}
                <div className="flex-1 p-5 overflow-hidden">
                    {activeTab === 'config' ? (
                        <form onSubmit={handleSaveBranch} className="h-full flex flex-col animate-in slide-in-from-left-2 duration-300">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1.5 ml-1 tracking-widest">Nombre Comercial</label>
                                    <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white font-bold text-sm outline-none focus:border-cyan-600 uppercase shadow-inner" placeholder="EJ: SUCURSAL CENTRO" />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-emerald-500 uppercase block mb-1.5 ml-1 tracking-widest flex items-center gap-2"><Mail size={12} /> Webhook GAS (Emails)</label>
                                    <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white font-mono text-[10px] outline-none focus:border-emerald-500 shadow-inner" placeholder="https://script.google.com/..." />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-blue-500 uppercase block mb-1.5 ml-1 tracking-widest flex items-center gap-2"><Mail size={12} /> Correo para Reportes (Cierre de Caja)</label>
                                    <input value={reportEmail} onChange={e => setReportEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white font-mono text-[10px] outline-none focus:border-blue-500 shadow-inner" placeholder="reportes@ejemplo.com" />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1.5 ml-1 tracking-widest">Ubicación Física</label>
                                    <input value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-xs outline-none shadow-inner" placeholder="Dirección exacta..." />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1.5 ml-1 tracking-widest">Teléfono Directo</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                                        <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 pl-10 text-white font-mono text-xs outline-none focus:border-cyan-600 shadow-inner" placeholder="Ej: 2222-3333" />
                                    </div>
                                </div>

                                {/* SWITCHES MEJORADOS */}
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setActive(!active)}
                                        className={`flex flex-col p-3 rounded-2xl border transition-all duration-300 text-left ${active ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">Estado</span>
                                            <div className={`w-8 h-4 rounded-full relative shadow-inner transition-colors duration-300 ${active ? 'bg-emerald-600' : 'bg-red-600'}`}>
                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all duration-300 ${active ? 'left-[18px]' : 'left-0.5'}`} />
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setHasReception(!hasReception)}
                                        className={`flex flex-col p-3 rounded-2xl border transition-all duration-300 text-left ${hasReception ? 'bg-blue-500/5 border-blue-500/20' : 'bg-cyan-500/5 border-cyan-500/20'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">Modo Fac.</span>
                                            <div className={`w-8 h-4 rounded-full relative shadow-inner transition-colors duration-300 ${hasReception ? 'bg-blue-600' : 'bg-cyan-600'}`}>
                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all duration-300 ${hasReception ? 'left-[18px]' : 'left-0.5'}`} />
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${hasReception ? 'text-blue-500' : 'text-cyan-500'}`}>
                                            {hasReception ? 'Ticket' : 'Directo'}
                                        </span>
                                    </button>
                                </div>

                                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-3xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                            <RefreshCw size={14} className={autoCloseEnabled ? "animate-spin-slow text-emerald-500" : "text-zinc-600"} />
                                            Cierre Automático
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setAutoCloseEnabled(!autoCloseEnabled)}
                                            className={`w-10 h-5 rounded-full relative transition-all duration-300 shadow-xl ${autoCloseEnabled ? 'bg-emerald-600' : 'bg-zinc-800'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${autoCloseEnabled ? 'left-6' : 'left-1'}`} />
                                        </button>
                                    </div>
                                    {autoCloseEnabled && (
                                        <div className="flex items-center gap-4 animate-in slide-in-from-top-1 duration-200">
                                            <div className="flex-1">
                                                <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest mb-1.5 ml-1">HORA DE CIERRE (HH:MM:SS)</p>
                                                <input
                                                    type="time"
                                                    step="1"
                                                    value={autoCloseTime}
                                                    onChange={e => setAutoCloseTime(e.target.value)}
                                                    className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-emerald-500 font-black font-mono text-center outline-none focus:border-emerald-600 shadow-inner"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* BOTÓN AL FONDO USANDO mt-auto */}
                            <div className="mt-auto">
                                <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all border-b-4 border-cyan-800 active:border-b-0 flex items-center justify-center gap-3">
                                    <Save size={16} /> {editingBranchId ? 'Actualizar Sede' : 'Registrar Sede'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleSavePlan} className="h-full flex flex-col animate-in slide-in-from-right-2 duration-300">
                            <div className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-black text-yellow-500 uppercase block mb-1.5 ml-1 tracking-widest flex items-center gap-2"><Store size={12} /> Seleccionar Sede Target</label>
                                    <select required value={planBranchId} onChange={e => setPlanBranchId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white font-black uppercase text-xs outline-none focus:border-yellow-600 appearance-none shadow-inner">
                                        <option value="">-- ELIGE SEDE --</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Mes Operativo</label>
                                        <select value={planMonth} onChange={e => setPlanMonth(parseInt(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white font-bold text-xs shadow-inner">
                                            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Año</label>
                                        <select value={planYear} onChange={e => setPlanYear(parseInt(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white font-bold text-xs shadow-inner">
                                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-zinc-900/50 p-5 rounded-[2.5rem] border border-zinc-800 space-y-5 shadow-2xl">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-yellow-500 uppercase tracking-widest ml-1">Meta Venta Bruta ($)</label>
                                        <input required type="number" value={planGoal} onChange={e => setPlanGoal(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-white font-black font-mono text-2xl outline-none focus:border-yellow-600 shadow-inner" placeholder="0.00" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1">Días Laborales Confirmados</label>
                                        <input required type="number" value={planDays} onChange={e => setPlanDays(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-white font-black font-mono text-2xl outline-none focus:border-blue-600 shadow-inner" placeholder="Ej: 26" />
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1 flex items-center gap-1"><Percent size={10} /> Cuota de Productos</label>
                                            <span className="text-sm font-black text-yellow-500 font-mono">{planProdPct}%</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input type="range" min="0" max="50" step="5" value={planProdPct} onChange={e => setPlanProdPct(e.target.value)} className="flex-1 h-1.5 bg-black rounded-lg appearance-none cursor-pointer accent-yellow-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BOTÓN AL FONDO USANDO mt-auto */}
                            <div className="mt-auto">
                                <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-500 text-black py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all border-b-4 border-yellow-800 active:border-b-0 flex items-center justify-center gap-3">
                                    <Save size={18} /> Guardar Estrategia
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* PANEL DERECHO (Network Deck) */}
            <div className="flex-1 flex flex-col overflow-hidden bg-black/10 p-8 lg:p-10">
                <div className="mb-8 flex items-center justify-between shrink-0">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-zinc-500 font-black text-[11px] uppercase tracking-[0.5em] flex items-center gap-3">
                            <Globe size={18} className="text-zinc-700" /> NETWORK DECK
                        </h3>
                        <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">Sedes activas en la red corporativa</p>
                    </div>
                    <div className="bg-zinc-900 px-5 py-2 rounded-full border border-zinc-800 shadow-lg">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Activity size={14} className="text-emerald-500" /> Sedes Online: {branches.length}
                        </span>
                    </div>
                </div>

                <div
                    ref={branchScroll.ref}
                    {...branchScroll.props}
                    className="flex-1 overflow-y-auto hide-scrollbar"
                >
                    <div className="space-y-3 pb-10">
                        {branches.map(branch => {
                            const currentPlan = monthlyPlans.find(p => p.branchId === branch.id && p.month === new Date().getMonth() && p.year === new Date().getFullYear());
                            const isEditing = branch.id === editingBranchId;

                            return (
                                <div
                                    key={branch.id}
                                    className={`bg-zinc-900/60 border rounded-2xl p-4 transition-all duration-300 group flex flex-col lg:flex-row items-center gap-6 ${isEditing ? 'border-cyan-600 bg-cyan-600/5 ring-2 ring-cyan-600/10' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'}`}
                                >
                                    <div className="flex items-center gap-4 shrink-0">
                                        <div className={`p-3.5 rounded-2xl shadow-xl transition-all ${branch.active ? 'bg-cyan-600/20 text-cyan-500 border border-cyan-500/20' : 'bg-zinc-800 text-zinc-600'}`}>
                                            <Store size={22} />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-white text-lg uppercase tracking-tight truncate group-hover:text-cyan-400 transition-colors leading-none">{branch.name}</h4>
                                        <div className="flex flex-col gap-1 mt-2">
                                            <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-1.5 truncate">
                                                <MapPin size={10} className="text-zinc-700 shrink-0" /> {branch.address || 'Sin dirección'}
                                            </div>
                                            {branch.phone && (
                                                <div className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest flex items-center gap-1.5">
                                                    <Phone size={10} className="text-zinc-800 shrink-0" /> {branch.phone}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 shrink-0">
                                        <span className={`flex items-center gap-1.5 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest transition-all ${branch.active ? 'bg-emerald-900/20 text-emerald-500 border border-emerald-500/20' : 'bg-red-900/20 text-red-500 border border-red-500/20'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${branch.active ? 'bg-emerald-500 animate-pulse' : 'bg-red-50'}`}></div>
                                            {branch.active ? 'Operativa' : 'Cerrada'}
                                        </span>
                                        <span className={`flex items-center gap-1.5 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest transition-all border ${branch.hasReception ? 'bg-blue-900/20 text-blue-400 border-blue-400/20' : 'bg-zinc-800/40 text-zinc-500 border-zinc-700'}`}>
                                            {branch.hasReception ? <Ticket size={10} /> : <ArrowRightLeft size={10} />}
                                            {branch.hasReception ? 'Ticket' : 'Directo'}
                                        </span>
                                    </div>

                                    <div className="bg-black/40 px-5 py-2.5 rounded-xl border border-zinc-800/50 flex items-center gap-6 shrink-0 lg:w-64">
                                        <div className="flex flex-col">
                                            <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Meta {months[new Date().getMonth()]}</span>
                                            {currentPlan ? (
                                                <span className="text-sm font-black text-white font-mono">${currentPlan.goal.toLocaleString()}</span>
                                            ) : (
                                                <span className="text-[10px] font-black text-red-500/80 uppercase tracking-tighter">N/A</span>
                                            )}
                                        </div>
                                        <div className="h-6 w-px bg-zinc-800"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Días</span>
                                            {currentPlan ? (
                                                <span className="text-sm font-black text-blue-400 font-mono">{currentPlan.workingDays}</span>
                                            ) : (
                                                <span className="text-[10px] font-black text-red-500/80 uppercase tracking-tighter">N/A</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-3">
                                        <span className="text-[8px] font-black text-zinc-800 font-mono tracking-tighter hidden xl:block">ID:{branch.id.substring(0, 4)}</span>
                                        <button
                                            onClick={() => handleEditBranch(branch)}
                                            className="p-3 bg-zinc-800 text-zinc-500 hover:bg-white hover:text-black rounded-xl transition-all shadow-md active:scale-90 border border-zinc-700 group-hover:border-zinc-500"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        <button
                            onClick={resetBranchForm}
                            className="w-full bg-zinc-950 border-2 border-dashed border-zinc-900 p-6 rounded-2xl flex items-center justify-center gap-4 hover:border-cyan-600/30 hover:bg-cyan-600/[0.02] transition-all group shadow-inner"
                        >
                            <Plus size={20} className="text-zinc-800 group-hover:text-cyan-500 group-hover:rotate-90 transition-all duration-300" />
                            <span className="text-xs font-black text-zinc-700 uppercase tracking-[0.3em] group-hover:text-cyan-600 transition-colors">Vincular Nueva Sede a la Red</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
