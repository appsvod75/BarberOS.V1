
import React, { useState } from 'react';
import { useBarber } from '../context/BarberContext';
import {
    Zap, Plus, Trash2, Calendar, Clock, Star, Gift,
    Percent, DollarSign, X, CheckCircle2, Info,
    Sparkles, PartyPopper, Tag, Scissors, Edit,
    Trophy, Coins, UserPlus, Target, Award, Search, Package
} from 'lucide-react';
import { Promotion, PromotionTrigger, PromotionType } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';

export const PromotionManager = () => {
    const { promotions, addPromotion, removePromotion, updatePromotion, config, updateConfig, catalog } = useBarber();
    const scroll = useDragScroll();
    const modalScroll = useDragScroll();
    const [activeTab, setActiveTab] = useState<'promos' | 'loyalty'>('promos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [lEnabled, setLEnabled] = useState(config.loyalty?.enabled ?? true);
    const [lPointsVisit, setLPointsVisit] = useState(config.loyalty?.pointsPerVisit ?? 1);
    const [lPointsRef, setLPointsRef] = useState(config.loyalty?.referralBonus ?? 2);
    const [lThreshold, setLThreshold] = useState(config.loyalty?.redemptionThreshold ?? 5);
    const [lValue, setLValue] = useState(config.loyalty?.redemptionValue ?? 5.00);

    const [name, setName] = useState('');
    const [type, setType] = useState<PromotionType>('percentage');
    const [value, setValue] = useState('');
    const [trigger, setTrigger] = useState<PromotionTrigger>('always');
    const [daysActive, setDaysActive] = useState<number[]>([]);
    const [hourStart, setHourStart] = useState('00:00');
    const [hourEnd, setHourEnd] = useState('23:59');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [applyTo, setApplyTo] = useState<'all' | 'services' | 'products' | 'specific'>('all');
    const [specificItemId, setSpecificItemId] = useState('');
    const [itemSearch, setItemSearch] = useState('');

    const handleSaveLoyalty = () => {
        updateConfig({
            ...config,
            loyalty: {
                enabled: lEnabled,
                pointsPerVisit: Number(lPointsVisit),
                pointsPerCurrency: config.loyalty?.pointsPerCurrency ?? 0,
                redemptionThreshold: Number(lThreshold),
                redemptionValue: Number(lValue),
                referralBonus: Number(lPointsRef)
            }
        });
        alert("¡Sistema de Lealtad Actualizado!");
    };

    const handleOpenModal = (promo?: Promotion) => {
        if (promo) {
            setEditingId(promo.id);
            setName(promo.name);
            setType(promo.type);
            setValue(promo.value.toString());
            setTrigger(promo.trigger);
            setDaysActive(promo.daysActive || []);
            setHourStart(promo.hourStart || '00:00');
            setHourEnd(promo.hourEnd || '23:59');
            setStartDate(promo.startDate || '');
            setEndDate(promo.endDate || '');
            setApplyTo(promo.applyTo || 'all');
            setSpecificItemId(promo.specificItemId || '');
            const item = catalog.find(i => i.id === promo.specificItemId);
            setItemSearch(item?.name || '');
        } else {
            setEditingId(null);
            setName('');
            setType('percentage');
            setValue('');
            setTrigger('always');
            setDaysActive([]);
            setHourStart('00:00');
            setHourEnd('23:59');
            setStartDate('');
            setEndDate('');
            setApplyTo('all');
            setSpecificItemId('');
            setItemSearch('');
        }
        setIsModalOpen(true);
    };

    const handleSavePromo = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: Promotion = {
            id: editingId || crypto.randomUUID(),
            name, type, value: parseFloat(value),
            trigger, active: true,
            daysActive: trigger === 'days_of_week' ? daysActive : undefined,
            hourStart: (trigger === 'happy_hour' || trigger === 'days_of_week') ? hourStart : undefined,
            hourEnd: (trigger === 'happy_hour' || trigger === 'days_of_week') ? hourEnd : undefined,
            startDate: trigger === 'date_range' ? startDate : undefined,
            endDate: trigger === 'date_range' ? endDate : undefined,
            applyTo,
            specificItemId: applyTo === 'specific' ? specificItemId : undefined
        };
        if (editingId) updatePromotion(payload);
        else addPromotion(payload);
        setIsModalOpen(false);
    };

    const filteredCatalogItems = catalog.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()));
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
        <div className="h-full flex flex-col bg-zinc-950 p-4 lg:p-6 animate-in fade-in duration-500 overflow-hidden font-inter">

            <div className="flex flex-col md:flex-row justify-between items-center mb-4 shrink-0 gap-4">
                <div className="flex items-center gap-3">
                    <Zap className="text-yellow-500 fill-yellow-500" size={24} />
                    <div>
                        <h1 className="text-xl font-black text-white uppercase tracking-tight leading-none">Marketing Pro</h1>
                        <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">Estrategia y Crecimiento</p>
                    </div>
                </div>

                <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 shadow-xl">
                    <button onClick={() => setActiveTab('promos')} className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'promos' ? 'bg-yellow-600 text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><Tag size={12} /> Promociones</button>
                    <button onClick={() => setActiveTab('loyalty')} className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'loyalty' ? 'bg-yellow-600 text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}><Trophy size={12} /> Lealtad (Puntos)</button>
                </div>

                {activeTab === 'promos' && (
                    <button onClick={() => handleOpenModal()} className="bg-zinc-100 hover:bg-white text-black px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all border-b-2 border-zinc-300 active:border-b-0"><Plus size={16} /> Nueva Estrategia</button>
                )}
            </div>

            <div
                ref={scroll.ref}
                {...scroll.props}
                className="flex-1 overflow-y-auto hide-scrollbar pr-2"
            >
                {activeTab === 'promos' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                        {promotions.map(promo => {
                            const specificItem = catalog.find(i => i.id === promo.specificItemId);
                            return (
                                <div key={promo.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl relative group flex flex-col justify-between min-h-[160px]">
                                    <div className="absolute top-4 right-4">
                                        <div className={`p-1.5 rounded-lg border ${promo.type === 'percentage' ? 'bg-blue-900/20 border-blue-500/30 text-blue-400' : 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400'}`}>{promo.type === 'percentage' ? <Percent size={14} /> : <DollarSign size={14} />}</div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${promo.active ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`}></span>
                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{promo.trigger.replace('_', ' ')}</span>
                                        </div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-tight mb-2 pr-8">{promo.name}</h3>

                                        <div className="flex flex-wrap gap-2 mb-2">
                                            <div className="flex items-center gap-2 text-zinc-400 text-[9px] font-bold uppercase bg-black/40 p-2 rounded-lg border border-zinc-800/50 w-fit">
                                                {promo.trigger === 'days_of_week' && <Calendar size={12} className="text-blue-500" />}
                                                {promo.trigger === 'happy_hour' && <Clock size={12} className="text-orange-500" />}
                                                {promo.trigger === 'birthday' && <PartyPopper size={12} className="text-pink-500" />}
                                                {promo.trigger === 'always' && <Sparkles size={12} className="text-yellow-500" />}
                                                <span className="truncate max-w-[150px]">
                                                    {promo.trigger === 'days_of_week' && `${promo.daysActive?.map(d => dayNames[d][0]).join(', ')} | ${promo.hourStart || '00:00'}-${promo.hourEnd || '23:59'}`}
                                                    {promo.trigger === 'happy_hour' && `${promo.hourStart}-${promo.hourEnd}`}
                                                    {promo.trigger === 'birthday' && 'Cumpleaños'}
                                                    {promo.trigger === 'always' && 'Activa'}
                                                </span>
                                            </div>
                                            {promo.applyTo === 'specific' && (
                                                <div className="flex items-center gap-2 text-pink-400 text-[9px] font-black uppercase bg-pink-900/10 p-2 rounded-lg border border-pink-500/20 w-fit">
                                                    <Tag size={10} /> {specificItem?.name || 'Item'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end mt-3">
                                        <div>
                                            <div className="text-[20px] font-black text-white font-mono tracking-tighter">
                                                {promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value}`}
                                                <span className="text-[9px] font-bold text-zinc-500 ml-1 uppercase">Off</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => handleOpenModal(promo)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-all border border-zinc-700"><Edit size={12} /></button>
                                            <button onClick={() => removePromotion(promo.id)} className="p-2 bg-zinc-800 hover:bg-red-900/40 text-zinc-400 hover:text-red-500 rounded-lg transition-all border border-zinc-700"><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto animate-in slide-in-from-bottom-2 duration-500">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            <div className="lg:col-span-8 space-y-4">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2.5 bg-yellow-600/20 text-yellow-500 rounded-xl border border-yellow-500/20 shadow-lg"><Coins size={20} /></div>
                                        <div>
                                            <h2 className="text-sm font-black text-white uppercase tracking-tight">Acumulación</h2>
                                            <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">Reglas de obtención</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-black/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between group hover:border-yellow-600/30 transition-all">
                                            <div><div className="text-[8px] font-black text-zinc-500 uppercase mb-1 tracking-widest flex items-center gap-1.5"><Scissors size={10} /> Por Visita</div><span className="text-2xl font-black text-white font-mono leading-none">{lPointsVisit} <span className="text-[10px] text-zinc-600">PTS</span></span></div>
                                            <div className="flex gap-1"><button onClick={() => setLPointsVisit(Math.max(0, lPointsVisit - 1))} className="w-8 h-8 rounded-lg bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-all text-xs">-</button><button onClick={() => setLPointsVisit(lPointsVisit + 1)} className="w-8 h-8 rounded-lg bg-yellow-600 text-black font-bold hover:bg-yellow-500 transition-all text-xs">+</button></div>
                                        </div>
                                        <div className="bg-black/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between group hover:border-blue-600/30 transition-all">
                                            <div><div className="text-[8px] font-black text-blue-500 uppercase mb-1 tracking-widest flex items-center gap-1.5"><UserPlus size={10} /> Referencia</div><span className="text-2xl font-black text-white font-mono leading-none">{lPointsRef} <span className="text-[10px] text-zinc-600">PTS</span></span></div>
                                            <div className="flex gap-1"><button onClick={() => setLPointsRef(Math.max(0, lPointsRef - 1))} className="w-8 h-8 rounded-lg bg-zinc-800 text-white font-bold hover:bg-zinc-700 transition-all text-xs">-</button><button onClick={() => setLPointsRef(lPointsRef + 1)} className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all text-xs">+</button></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2.5 bg-emerald-600/20 text-emerald-500 rounded-xl border border-emerald-500/20 shadow-lg"><Target size={20} /></div>
                                        <div><h2 className="text-sm font-black text-white uppercase tracking-tight">Definición del Premio</h2><p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">Qué ganan tus clientes</p></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative"><label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 block ml-1">Meta (Puntos)</label><input type="number" value={lThreshold} onChange={e => setLThreshold(Number(e.target.value))} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-black text-xl font-mono text-center outline-none focus:border-yellow-600 shadow-inner" /></div>
                                        <div className="relative"><label className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 block ml-1">Valor Regalo ($)</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 font-black text-sm font-mono">$</span><input type="number" step="0.01" value={lValue} onChange={e => setLValue(Number(e.target.value))} className="w-full bg-black border border-zinc-800 rounded-xl p-3 pl-8 text-white font-black text-xl font-mono text-center outline-none focus:border-emerald-600 shadow-inner" /></div></div>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-4 space-y-4">
                                <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700 rounded-3xl p-5 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute -right-6 -top-6 text-white/5 rotate-12"><Trophy size={100} /></div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="bg-yellow-600 text-black px-3 py-1 rounded-full font-black text-[7px] uppercase tracking-widest flex items-center gap-1"><Sparkles size={8} /> VISTA PREVIA TARJETA</div>
                                            <div className="text-right">
                                                <div className="text-[7px] text-zinc-500 font-black uppercase">Saldo Ejemplo</div>
                                                <div className="text-xl font-black text-white font-mono leading-none">{Math.floor(lThreshold * 0.6)} <span className="text-[10px] text-zinc-600">PTS</span></div>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mb-6">
                                            <div className="flex justify-between items-end">
                                                <div className="text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-1.5"><Award size={10} className="text-yellow-500" /> Meta: {lThreshold} Puntos</div>
                                                <div className="text-[7px] font-bold text-zinc-500 uppercase">Faltan {Math.max(0, lThreshold - Math.floor(lThreshold * 0.6))}</div>
                                            </div>
                                            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-zinc-800 shadow-inner">
                                                <div
                                                    className="h-full bg-yellow-600 shadow-[0_0_10px_rgba(202,138,4,0.3)] transition-all duration-500"
                                                    style={{ width: '60%' }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                                            <div className="p-2 bg-black/40 rounded-lg text-yellow-500"><Gift size={16} /></div>
                                            <div>
                                                <div className="text-[8px] font-black text-white uppercase">Premio Activo</div>
                                                <div className="text-[7px] font-bold text-zinc-500 uppercase mt-0.5 leading-none">Descuento: <span className="text-emerald-500 font-mono">${Number(lValue).toFixed(2)}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleSaveLoyalty} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-900/20 active:scale-95 transition-all border-b-4 border-emerald-800 active:border-b-0 flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Guardar Cambios</button>
                                <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800"><p className="text-[7px] text-zinc-600 font-bold uppercase leading-tight text-center">Configura el bono de referencia alto para incentivar que traigan amigos.</p></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[1000] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-yellow-600/20 p-2.5 rounded-xl text-yellow-500 border border-yellow-500/20"><Zap size={20} /></div>
                                <h2 className="text-lg font-black text-white uppercase tracking-tight leading-none">{editingId ? 'Refinar Promo' : 'Nueva Campaña'}</h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-all"><X size={20} /></button>
                        </div>
                        <form
                            onSubmit={handleSavePromo}
                            ref={modalScroll.ref}
                            {...modalScroll.props}
                            className="p-8 space-y-6 overflow-y-auto max-h-[85vh] hide-scrollbar"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nombre</label>
                                        <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-bold outline-none focus:border-yellow-600 shadow-inner text-xs" placeholder="Ej: Martes Locos" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Tipo</label>
                                            <select value={type} onChange={e => setType(e.target.value as PromotionType)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-black text-[9px] outline-none focus:border-yellow-600"><option value="percentage">%</option><option value="fixed_discount">$</option></select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Valor</label>
                                            <input required type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-black text-center text-sm outline-none focus:border-yellow-600 shadow-inner" placeholder="0" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Alcance / Qué descuenta</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button type="button" onClick={() => { setApplyTo('all'); setSpecificItemId(''); }} className={`p-2.5 rounded-xl text-[8px] font-black uppercase border transition-all ${applyTo === 'all' ? 'bg-white text-black border-white' : 'bg-zinc-950 text-zinc-600 border-zinc-800'}`}>Total Carrito</button>
                                            <button type="button" onClick={() => { setApplyTo('services'); setSpecificItemId(''); }} className={`p-2.5 rounded-xl text-[8px] font-black uppercase border transition-all ${applyTo === 'services' ? 'bg-white text-black border-white' : 'bg-zinc-950 text-zinc-600 border-zinc-800'}`}>Solo Servicios</button>
                                            <button type="button" onClick={() => { setApplyTo('products'); setSpecificItemId(''); }} className={`p-2.5 rounded-xl text-[8px] font-black uppercase border transition-all ${applyTo === 'products' ? 'bg-white text-black border-white' : 'bg-zinc-950 text-zinc-600 border-zinc-800'}`}>Solo Productos</button>
                                            <button type="button" onClick={() => setApplyTo('specific')} className={`p-2.5 rounded-xl text-[8px] font-black uppercase border transition-all ${applyTo === 'specific' ? 'bg-pink-600 text-white border-pink-500' : 'bg-zinc-950 text-zinc-600 border-zinc-800'}`}>Item Específico</button>
                                        </div>
                                    </div>

                                    {applyTo === 'specific' && (
                                        <div className="space-y-2 animate-in slide-in-from-top-2">
                                            <label className="text-[8px] font-black text-pink-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Search size={10} /> Buscar Item</label>
                                            <div className="relative">
                                                <input value={itemSearch} onChange={e => { setItemSearch(e.target.value); setSpecificItemId(''); }} className={`w-full bg-black border rounded-xl p-3 text-white font-bold outline-none shadow-inner text-xs ${specificItemId ? 'border-emerald-500/50' : 'border-zinc-800 focus:border-pink-600'}`} placeholder="Ej: Corte Clásico..." />
                                                {specificItemId && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={14} />}
                                                {itemSearch.length > 0 && !specificItemId && filteredCatalogItems.length > 0 && (
                                                    <div className="absolute top-full left-0 w-full bg-zinc-800 border border-zinc-700 rounded-xl mt-1 shadow-2xl z-[200] max-h-32 overflow-y-auto">
                                                        {filteredCatalogItems.map(item => (<button key={item.id} type="button" onClick={() => { setSpecificItemId(item.id); setItemSearch(item.name); }} className="w-full p-2.5 text-left text-[9px] font-black text-white hover:bg-pink-600 border-b border-zinc-700 last:border-0 flex justify-between items-center transition-colors uppercase"><span>{item.name}</span><span className="text-[7px] text-zinc-400 font-mono">${item.price.toFixed(2)}</span></button>))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Disparador / Cuándo</label>
                                        <select value={trigger} onChange={e => setTrigger(e.target.value as PromotionTrigger)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-black text-[9px] outline-none focus:border-yellow-600"><option value="always">Siempre</option><option value="days_of_week">Días Semanales</option><option value="happy_hour">Happy Hour</option><option value="birthday">Cumpleaños</option></select>
                                    </div>

                                    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-4 animate-in fade-in">
                                        {trigger === 'days_of_week' && (
                                            <div className="space-y-4">
                                                <div className="flex gap-1 justify-between w-full">
                                                    {dayNames.map((d, i) => (
                                                        <button key={i} type="button" onClick={() => { setDaysActive(prev => prev.includes(i) ? prev.filter(day => day !== i) : [...prev, i]); }} className={`w-7 h-7 rounded-full text-[8px] font-black flex items-center justify-center transition-all ${daysActive.includes(i) ? 'bg-yellow-600 text-black shadow-lg shadow-yellow-600/20' : 'bg-zinc-800 text-zinc-500'}`}>{d[0]}</button>
                                                    ))}
                                                </div>
                                                {/* HORAS DEBAJO DE LOS DÍAS */}
                                                <div className="pt-2 border-t border-zinc-900">
                                                    <label className="text-[7px] text-zinc-600 font-black uppercase mb-1.5 block text-center">Rango Horario del Día</label>
                                                    <div className="grid grid-cols-2 gap-3 w-full">
                                                        <input type="time" value={hourStart} onChange={e => setHourStart(e.target.value)} className="bg-black border border-zinc-800 rounded-lg p-2 text-white font-mono text-[10px] outline-none text-center" />
                                                        <input type="time" value={hourEnd} onChange={e => setHourEnd(e.target.value)} className="bg-black border border-zinc-800 rounded-lg p-2 text-white font-mono text-[10px] outline-none text-center" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {trigger === 'happy_hour' && (
                                            <div className="grid grid-cols-2 gap-3 w-full">
                                                <div className="space-y-1"><label className="text-[7px] text-zinc-600 font-black uppercase">Desde</label><input type="time" value={hourStart} onChange={e => setHourStart(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-white font-mono text-[10px] outline-none" /></div>
                                                <div className="space-y-1"><label className="text-[7px] text-zinc-600 font-black uppercase">Hasta</label><input type="time" value={hourEnd} onChange={e => setHourEnd(e.target.value)} className="bg-black border border-zinc-800 rounded-lg p-2 text-white font-mono text-[10px] outline-none w-full" /></div>
                                            </div>
                                        )}
                                        {trigger === 'always' && <div className="text-center py-4 text-[9px] font-black text-emerald-500 uppercase tracking-widest">Activa 24/7 sin restricciones</div>}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-zinc-800 text-zinc-400 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cerrar</button>
                                <button type="submit" className="flex-[2] bg-yellow-600 hover:bg-yellow-500 text-black py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">Activar Promo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
