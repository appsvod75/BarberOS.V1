
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useBarber } from '../context/BarberContext';
import {
    Search, Plus, Package, History, Store, X,
    Trash2, Hash, ShoppingCart, User, CheckCircle2,
    DollarSign, AlertCircle, PlusCircle, TrendingUp,
    Layers, Coins, ArrowUpRight, ArrowDownRight, Activity, Truck,
    MinusCircle, RefreshCcw, Bell, Eye, FileText, Calendar, ShieldCheck, Tag,
    ChevronRight, Filter
} from 'lucide-react';
import { CatalogItem, InventoryMovementType, InventoryMovement } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';

interface DetailLine {
    id: string;
    itemId: string;
    itemName: string;
    qty: number;
    lineTotal: number;
    unitCost: number;
}

const StatHeaderCard = ({ icon, label, value, sub, color }: { icon: React.ReactNode, label: string, value: string, sub: string, color?: string }) => (
    <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-md group hover:border-purple-500/30 transition-all flex-1">
        <div className="flex items-center gap-3 text-zinc-500 mb-2">
            {icon}
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <div className={`text-2xl font-black ${color || 'text-white'} font-mono tracking-tighter`}>{value}</div>
        <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">{sub}</div>
    </div>
);

export const InventoryManager = () => {
    const {
        catalog, stocks, registerInventoryMovement, transferStock,
        branches, currentUser, inventoryMovements, getBranchStock, confirmTransferIn, showToast
    } = useBarber();

    const mainScroll = useDragScroll();
    const detailScroll = useDragScroll();
    const receiveScroll = useDragScroll();
    const kardexScroll = useDragScroll();

    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isKardexModalOpen, setIsKardexModalOpen] = useState(false);
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [kardexBranchId, setKardexBranchId] = useState('');

    const [isReadOnly, setIsReadOnly] = useState(false);
    const [docType, setDocType] = useState<InventoryMovementType>('purchase');
    const [docBranchId, setDocBranchId] = useState(currentUser?.branchId || branches[0]?.id || '');
    const [docToBranchId, setDocToBranchId] = useState('');
    const [docReference, setDocReference] = useState('');
    const [docProvider, setDocProvider] = useState('');
    const [docReason, setDocReason] = useState('');

    const [lines, setLines] = useState<DetailLine[]>([]);
    const [gridSearch, setGridSearch] = useState('');
    const [activeSearchLineId, setActiveSearchLineId] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<{ id: string, field: 'qty' | 'total' | 'search' } | null>(null);

    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const pendingTransfers = useMemo(() => {
        const myBranchId = currentUser?.branchId || branches[0]?.id;
        if (!myBranchId) return [];
        return inventoryMovements.filter(m =>
            m.branchId === myBranchId &&
            m.type === 'transfer_in' &&
            m.status === 'pending'
        );
    }, [inventoryMovements, currentUser, branches]);

    const stats = useMemo(() => {
        const activeProducts = catalog.filter(i => i.type === 'product' && i.active !== false);
        const totalStock = stocks.reduce((acc, s) => acc + s.stock, 0);
        const totalInvestment = stocks.reduce((acc, s) => acc + (s.stock * s.averageCost), 0);
        return { uniqueCount: activeProducts.length, totalStock, totalInvestment };
    }, [catalog, stocks]);

    const handleOpenNewMovement = () => {
        setIsReadOnly(false);
        setDocType('purchase');
        setDocReference('');
        setDocProvider('');
        setDocReason('');
        setDocToBranchId('');
        setDocBranchId(currentUser?.branchId || branches[0]?.id || '');
        const firstLineId = crypto.randomUUID();
        setLines([{ id: firstLineId, itemId: '', itemName: '', qty: 0, lineTotal: 0, unitCost: 0 }]);
        setFocusedField({ id: firstLineId, field: 'search' });
        setIsModalOpen(true);
    };

    const handleViewMovementDetail = (m: InventoryMovement) => {
        setIsReadOnly(true);
        setDocType(m.type);
        setDocBranchId(m.branchId);
        setDocToBranchId(m.relatedBranchId || '');

        const reasonParts = (m.reason || '').split('|');
        setDocReason(reasonParts[0]?.trim() || '');
        setDocReference(reasonParts.find(p => p.includes('Ref:'))?.replace('Ref:', '').trim() || '');
        setDocProvider(reasonParts.find(p => p.includes('Prov:'))?.replace('Prov:', '').trim() || '');

        const qty = Number(m.quantity || 0);
        const cost = Number(m.unitCost || 0);

        setLines([{
            id: m.id,
            itemId: m.itemId,
            itemName: m.itemName,
            qty: Math.abs(qty), // Mostrar siempre positivo en el detalle visual
            unitCost: cost,
            lineTotal: cost * Math.abs(qty)
        }]);

        setIsModalOpen(true);
    };

    useEffect(() => {
        if (isReadOnly) return;
        const lastLine = lines[lines.length - 1];
        if (lastLine && lastLine.itemId !== '') {
            const newLineId = crypto.randomUUID();
            setLines([...lines, { id: newLineId, itemId: '', itemName: '', qty: 0, lineTotal: 0, unitCost: 0 }]);
        }
    }, [lines, isReadOnly]);

    const updateLine = (id: string, updates: Partial<DetailLine>) => {
        if (isReadOnly) return;
        setLines(lines.map(l => {
            if (l.id === id) {
                const newLine = { ...l, ...updates };
                if (docType === 'adjustment_out' || docType === 'transfer_out') {
                    const currentStock = getBranchStock(docBranchId, newLine.itemId);
                    newLine.unitCost = currentStock?.averageCost || 0;
                    newLine.lineTotal = newLine.unitCost * newLine.qty;
                } else {
                    if (updates.qty !== undefined || updates.lineTotal !== undefined) {
                        newLine.unitCost = newLine.qty > 0 ? newLine.lineTotal / newLine.qty : 0;
                    }
                }
                return newLine;
            }
            return l;
        }));
    };

    const selectProductForLine = (lineId: string, item: CatalogItem) => {
        const currentStock = getBranchStock(docBranchId, item.id);
        const lastCost = currentStock?.averageCost || 0;
        const initialLineData: Partial<DetailLine> = { itemId: item.id, itemName: item.name };
        if (['adjustment_in', 'adjustment_out', 'transfer_out'].includes(docType)) {
            initialLineData.unitCost = lastCost;
        }
        updateLine(lineId, initialLineData);
        setActiveSearchLineId(null);
        setGridSearch('');
        setTimeout(() => {
            setFocusedField({ id: lineId, field: 'qty' });
            inputRefs.current[`${lineId}-qty`]?.focus();
        }, 50);
    };

    const handleKeyDown = (e: React.KeyboardEvent, lineId: string, field: string) => {
        if (isReadOnly) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            if (field === 'qty') {
                if (docType === 'adjustment_out' || docType === 'transfer_out') {
                    const currentIndex = lines.findIndex(l => l.id === lineId);
                    const nextLine = lines[currentIndex + 1];
                    if (nextLine) {
                        setFocusedField({ id: nextLine.id, field: 'search' });
                        inputRefs.current[`${nextLine.id}-search`]?.focus();
                    }
                } else {
                    setFocusedField({ id: lineId, field: 'total' });
                    inputRefs.current[`${lineId}-total`]?.focus();
                }
            } else if (field === 'total') {
                const currentIndex = lines.findIndex(l => l.id === lineId);
                const nextLine = lines[currentIndex + 1];
                if (nextLine) {
                    setFocusedField({ id: nextLine.id, field: 'search' });
                    inputRefs.current[`${nextLine.id}-search`]?.focus();
                }
            }
        }
    };

    const processDocument = async () => {
        if (isReadOnly) return;
        const validLines = lines.filter(l => l.itemId && l.qty > 0);
        if (validLines.length === 0) return showToast('warning', 'Sin datos', "⚠️ No hay líneas válidas.");
        if (docType === 'transfer_out' && !docToBranchId) return showToast('warning', 'Faltan datos', "⚠️ Debes seleccionar una sede destino.");

        let successCount = 0;
        for (const line of validLines) {
            const reason = `${docReason} | Ref: ${docReference} ${docProvider ? '| Prov: ' + docProvider : ''}`;
            let result = false;

            if (docType === 'transfer_out') {
                // transferStock aún no devuelve promesa bool, asumimos true o implementamos
                transferStock(docBranchId, docToBranchId, line.itemId, line.qty, reason);
                result = true;
            } else {
                result = await registerInventoryMovement(docBranchId, line.itemId, docType, line.qty, line.unitCost, reason);
            }
            if (result) successCount++;
        }

        if (successCount === validLines.length) {
            setIsModalOpen(false);
            showToast('success', 'Operación Exitosa', "✅ Movimiento guardado correctamente.");
        } else {
            showToast('error', 'Error Parcial', "⚠️ Hubo un error al guardar algunas líneas. Verifica.");
        }
    };



    const docTotal = lines.reduce((acc, l) => acc + l.lineTotal, 0);

    const filteredProducts = useMemo(() => {
        const lower = search.toLowerCase();
        return catalog.filter(i => i && i.type === 'product' && i.active !== false)
            .filter(p => {
                if (!p) return false;
                return (p.name || '').toLowerCase().includes(lower) || (p.category || '').toLowerCase().includes(lower);
            });
    }, [catalog, search]);

    const selectedItem = useMemo(() => catalog.find(p => p.id === selectedId) || null, [catalog, selectedId]);

    return (
        <div className="h-full flex flex-col bg-zinc-950 overflow-hidden font-inter">
            {/* HEADER DE MÓDULO */}
            <div className="px-6 py-4 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                    <div className="relative w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
                        <input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white outline-none focus:border-purple-600" placeholder="Buscar producto..." />
                    </div>
                    {pendingTransfers.length > 0 && (
                        <button onClick={() => setIsReceiveModalOpen(true)} className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl group hover:bg-amber-500 hover:text-black transition-all">
                            <div className="relative">
                                <Truck size={18} className="text-amber-500 group-hover:text-black" />
                                <span className="absolute -top-2 -right-2 bg-amber-500 text-black text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full animate-bounce group-hover:bg-black group-hover:text-white">{pendingTransfers.length}</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Recepciones Pendientes</span>
                        </button>
                    )}
                </div>
                <button onClick={handleOpenNewMovement} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all border-b-2 border-purple-800 active:border-b-0">
                    <Plus size={16} /> Nuevo Movimiento
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* IZQUIERDA: DASHBOARD DE INVENTARIO */}
                <div className="flex-[2.5] flex flex-col min-w-0 border-r border-zinc-900 bg-black/5 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-6 py-4 bg-zinc-950 shrink-0 border-b border-zinc-900">
                        <StatHeaderCard icon={<Layers size={16} className="text-blue-500" />} label="Artículos Únicos" value={stats.uniqueCount.toString()} sub="Catálogo Activo" />
                        <StatHeaderCard icon={<Package size={16} className="text-amber-500" />} label="Existencia Total" value={stats.totalStock.toString()} sub="Unidades en Red" color="text-amber-500" />
                        <StatHeaderCard icon={<Coins size={16} className="text-emerald-500" />} label="Inversión Total" value={`$${stats.totalInvestment.toFixed(2)}`} sub="Valor de Inventario" color="text-emerald-500" />
                    </div>

                    <div
                        ref={mainScroll.ref}
                        {...mainScroll.props}
                        className="flex-1 overflow-y-auto hide-scrollbar p-6"
                    >
                        <div className="bg-zinc-900/40 rounded-[2.5rem] border border-zinc-900 overflow-hidden shadow-xl">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-zinc-950 text-zinc-600 font-black uppercase text-[10px] border-b border-zinc-900 tracking-widest sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 w-16 text-center">#</th>
                                        <th className="p-4 w-[45%]">Producto / Categoría</th>
                                        <th className="p-4 text-center">Precio Venta</th>
                                        <th className="p-4 text-center">Costo Prom.</th>
                                        <th className="p-4 text-center">Stock Global</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                    {filteredProducts.map(p => {
                                        const prodStocks = stocks.filter(s => s.itemId === p.id);
                                        const stockCount = prodStocks.reduce((acc, s) => acc + s.stock, 0);
                                        const avgCost = prodStocks.length > 0 ? (prodStocks.reduce((acc, s) => acc + (s.stock * s.averageCost), 0) / (stockCount || 1)) : 0;
                                        return (
                                            <tr key={p.id} onClick={() => setSelectedId(p.id)} className={`group cursor-pointer transition-all ${selectedId === p.id ? 'bg-purple-600/10' : 'hover:bg-white/[0.02]'}`}>
                                                <td className="p-4 text-center text-zinc-700 font-mono text-xs">{catalog.indexOf(p) + 1}</td>
                                                <td className="p-4 flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-600 transition-colors ${selectedId === p.id ? 'text-purple-400' : 'group-hover:text-purple-400'}`}><Package size={18} /></div>
                                                    <div>
                                                        <div className="font-black text-white text-sm uppercase tracking-tight">{p.name}</div>
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{p.category}</div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center font-mono text-sm font-black text-emerald-500 tracking-tighter">${p.price.toFixed(2)}</td>
                                                <td className="p-4 text-center font-mono text-sm font-black text-zinc-400 tracking-tighter">${avgCost.toFixed(2)}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`text-xs font-black font-mono px-3 py-1 rounded-lg ${stockCount > 5 ? 'bg-zinc-800 text-white' : 'bg-red-900/20 text-red-500 border border-red-900/30'}`}>{stockCount} UN</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* DERECHA: FICHA TÉCNICA DEL PRODUCTO */}
                <div
                    ref={detailScroll.ref}
                    {...detailScroll.props}
                    className="flex-1 bg-zinc-900 flex flex-col min-w-[340px] overflow-y-auto hide-scrollbar shadow-2xl border-l border-zinc-900"
                >
                    {selectedItem ? (
                        <div className="p-8 animate-in slide-in-from-right-2 duration-300">
                            <div className="mb-8">
                                <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest block mb-1">Detalle Maestro</span>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">{selectedItem.name}</h2>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{selectedItem.category}</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="bg-gradient-to-br from-emerald-600/20 to-transparent rounded-2xl p-6 border border-emerald-500/20 flex justify-between items-center group">
                                    <div>
                                        <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Valorización de Stock</div>
                                        <div className="text-4xl font-black text-white font-mono tracking-tighter leading-none">
                                            ${stocks.filter(s => s.itemId === selectedId).reduce((acc, s) => acc + (s.stock * s.averageCost), 0).toFixed(2)}
                                        </div>
                                        <div className="text-[7px] font-bold text-emerald-600 uppercase mt-1">Capital Invertido Global</div>
                                    </div>
                                    <Coins className="text-emerald-500/30" size={40} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/40 rounded-2xl p-4 border border-zinc-800">
                                        <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Precio Venta</div>
                                        <div className="text-xl font-black text-white font-mono leading-none">${selectedItem.price.toFixed(2)}</div>
                                    </div>
                                    <div className="bg-black/40 rounded-2xl p-4 border border-zinc-800">
                                        <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Margen Est.</div>
                                        <div className="text-xl font-black text-emerald-400 font-mono leading-none">
                                            {(() => {
                                                const sL = stocks.filter(s => s.itemId === selectedId);
                                                const aC = sL.length > 0 ? (sL.reduce((acc, s) => acc + (s.stock * s.averageCost), 0) / (sL.reduce((acc, s) => acc + s.stock, 0) || 1)) : 0;
                                                return `$${(selectedItem.price - aC).toFixed(2)}`;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button onClick={() => { setKardexBranchId(''); setIsKardexModalOpen(true); }} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl border border-zinc-700 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg group mb-8">
                                <History size={18} className="text-purple-500 group-hover:rotate-12 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Ver Kardex de Sede</span>
                            </button>

                            <div className="border-t border-zinc-800 pt-8">
                                <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2"><Store size={12} /> Stock por Sede</h3>
                                <div className="space-y-2">
                                    {branches.map(b => {
                                        const sR = stocks.find(s => s.branchId === b.id && s.itemId === selectedId);
                                        return (
                                            <div key={b.id} className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 hover:border-purple-500/30 transition-all flex justify-between items-center group">
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-[10px] font-black text-zinc-400 uppercase truncate block mb-1">{b.name}</span>
                                                    <div className="flex flex-wrap gap-x-3">
                                                        <span className="text-[8px] font-black text-emerald-500 uppercase">Precio: ${selectedItem.price.toFixed(2)}</span>
                                                        <span className="text-[8px] font-black text-amber-500 uppercase">Costo Prom: ${(sR?.averageCost || 0).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right ml-4">
                                                    <span className="text-xs font-black text-white font-mono bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 shadow-inner">{sR?.stock || 0} UN</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-800 p-8 text-center opacity-20">
                            <Package size={60} strokeWidth={1} />
                            <span className="text-[10px] font-black uppercase tracking-widest mt-6">Selecciona un producto</span>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL ERP PROFESIONAL: PROCESAMIENTO DE DOCUMENTO / VISTA DETALLE (CAPA SUPERIOR z-700) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[700] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-7xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
                        {isReadOnly && (
                            <div className="bg-blue-600/10 border-b border-blue-500/20 py-2 px-8 flex items-center justify-center gap-2">
                                <ShieldCheck size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Documento Registrado - Modo Consulta Solo Lectura</span>
                            </div>
                        )}
                        <div className="p-8 border-b border-zinc-800 bg-zinc-950 flex flex-col gap-6">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="bg-purple-600/20 p-3 rounded-2xl text-purple-500 border border-purple-500/20 shadow-lg"><ShoppingCart size={28} /></div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">{isReadOnly ? 'Auditoría de Movimiento' : 'Nuevo Movimiento ERP'}</h3>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{isReadOnly ? 'Registro Auditado de Base de Datos' : 'Gestión Centralizada de Stock'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-3 text-zinc-600 hover:text-white transition-all hover:rotate-90 bg-zinc-900 rounded-full border border-zinc-800"><X size={24} /></button>
                            </div>

                            {/* ENCABEZADO EXPANDIDO - OCUPA TODO EL ANCHO */}
                            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 ${isReadOnly ? 'opacity-60 pointer-events-none' : ''}`}>
                                <div className="flex flex-col gap-1.5 relative">
                                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Operación</label>
                                    <div className="relative group/sel">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none z-10">
                                            {docType === 'purchase' && <ShoppingCart size={16} />}
                                            {docType === 'transfer_out' && <Truck size={16} />}
                                            {docType === 'adjustment_in' && <PlusCircle size={16} />}
                                            {docType === 'adjustment_out' && <MinusCircle size={16} />}
                                            {docType === 'initial' && <Layers size={16} />}
                                            {docType === 'sale' && <Hash size={16} />}
                                            {docType === 'transfer_in' && <ArrowDownRight size={16} />}
                                        </div>
                                        <select disabled={isReadOnly} value={docType} onChange={e => setDocType(e.target.value as InventoryMovementType)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 pl-12 text-white font-black uppercase text-xs outline-none focus:border-purple-600 appearance-none shadow-inner">
                                            <option value="purchase">Compra (Entrada)</option>
                                            <option value="transfer_out">Traslado (Salida)</option>
                                            <option value="adjustment_in">Ajuste Positivo (+)</option>
                                            <option value="adjustment_out">Ajuste Negativo (-)</option>
                                            <option value="initial">Inventario Inicial</option>
                                            {isReadOnly && <option value="sale">Venta POS</option>}
                                            <option value="transfer_in">Recepción Traslado</option>
                                        </select>
                                        {!isReadOnly && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-700">
                                                <Plus size={12} className="rotate-45" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Sede Origen</label>
                                    <select disabled={isReadOnly} value={docBranchId} onChange={e => setDocBranchId(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white font-black uppercase text-xs outline-none focus:border-purple-600 shadow-inner">
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>)}
                                    </select>
                                </div>

                                {docType === 'transfer_out' || docType === 'transfer_in' ? (
                                    <div className="flex flex-col gap-1.5 animate-in slide-in-from-left-2">
                                        <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest ml-1">Sede Relacionada</label>
                                        <select disabled={isReadOnly} required value={docToBranchId} onChange={e => setDocToBranchId(e.target.value)} className="w-full bg-black border border-amber-900/50 rounded-xl p-4 text-white font-black uppercase text-xs outline-none focus:border-amber-500 shadow-inner">
                                            <option value="">SELECCIONAR...</option>
                                            {branches.filter(b => b.id !== docBranchId).map(b => <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Tercero / Prov</label>
                                        <input disabled={isReadOnly} value={docProvider} onChange={e => setDocProvider(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white font-black text-xs uppercase outline-none focus:border-purple-600 shadow-inner" placeholder="NOMBRE..." />
                                    </div>
                                )}

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Ref / Factura</label>
                                    <input disabled={isReadOnly} value={docReference} onChange={e => setDocReference(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white font-mono font-black text-xs outline-none focus:border-purple-600 shadow-inner" placeholder="DOC-000..." />
                                </div>

                                <div className="flex flex-col gap-1.5 lg:col-span-2">
                                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Motivo / Observación</label>
                                    <input disabled={isReadOnly} value={docReason} onChange={e => setDocReason(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white font-bold text-xs outline-none focus:border-purple-600 shadow-inner" placeholder="DETALLE DE LA OPERACIÓN..." />
                                </div>
                            </div>
                        </div>

                        {/* GRID ERP */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-black/40 relative">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead className="bg-zinc-900/80 backdrop-blur-md text-zinc-600 font-black uppercase text-[10px] tracking-widest border-b border-zinc-800 sticky top-0 z-50">
                                    <tr>
                                        <th className="p-4 w-16 text-center">#</th>
                                        <th className="p-4 w-[45%]">Búsqueda de Artículo</th>
                                        <th className="p-4 w-40 text-center">Cantidad</th>
                                        <th className="p-4 w-40 text-center">Costo Unit.</th>
                                        <th className="p-4 w-48 text-center">Total Línea</th>
                                        {!isReadOnly && <th className="p-4 w-16"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                    {lines.map((line, idx) => (
                                        <tr key={line.id} className="group hover:bg-white/[0.01]">
                                            <td className="p-4 text-center text-zinc-700 font-mono text-xs">{idx + 1}</td>
                                            <td className="p-4 relative">
                                                {line.itemId ? (
                                                    <div className={`flex items-center gap-4 bg-zinc-800/40 p-3 rounded-2xl border border-zinc-700 ${isReadOnly ? 'opacity-80' : ''}`}>
                                                        <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-zinc-600 shadow-inner"><Package size={20} /></div>
                                                        <div className="text-white font-black text-xs uppercase truncate flex-1 tracking-tight">{line.itemName}</div>
                                                        {!isReadOnly && <button onClick={() => updateLine(line.id, { itemId: '', itemName: '' })} className="p-2 text-zinc-600 hover:text-red-500 transition-colors"><X size={16} /></button>}
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
                                                        <input
                                                            ref={el => { if (el) inputRefs.current[`${line.id}-search`] = el; }}
                                                            value={activeSearchLineId === line.id ? gridSearch : ''}
                                                            onChange={e => { setGridSearch(e.target.value); setActiveSearchLineId(line.id); }}
                                                            onFocus={() => setActiveSearchLineId(line.id)}
                                                            className={`w-full bg-black border rounded-2xl py-4 pl-12 pr-4 text-white font-black text-xs outline-none focus:border-blue-600 transition-all ${focusedField?.id === line.id && focusedField?.field === 'search' ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'border-zinc-800'}`}
                                                            placeholder="BUSCAR PRODUCTO POR NOMBRE..."
                                                        />
                                                        {activeSearchLineId === line.id && gridSearch.length > 0 && (
                                                            <div className="absolute top-full left-0 w-full bg-zinc-800 border border-zinc-700 rounded-2xl mt-1 shadow-2xl z-[100] max-h-64 overflow-y-auto animate-in slide-in-from-top-2">
                                                                {catalog.filter(i => i.type === 'product' && (i.name || '').toLowerCase().includes((gridSearch || '').toLowerCase())).map(item => (
                                                                    <button key={item.id} onClick={() => selectProductForLine(line.id, item)} className="w-full p-4 text-left hover:bg-blue-600 border-b border-zinc-700 last:border-0 flex justify-between items-center group/item transition-colors">
                                                                        <div><div className="text-white font-black text-xs uppercase tracking-tight">{item.name}</div><div className="text-[9px] font-bold text-zinc-500 group-hover/item:text-blue-200 uppercase tracking-widest">{item.category}</div></div>
                                                                        <div className="text-sm font-black text-emerald-500 font-mono">${item.price.toFixed(2)}</div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    disabled={isReadOnly}
                                                    ref={el => { if (el) inputRefs.current[`${line.id}-qty`] = el; }}
                                                    type="number"
                                                    value={line.qty || ''}
                                                    onChange={e => updateLine(line.id, { qty: parseInt(e.target.value) || 0 })}
                                                    onKeyDown={e => handleKeyDown(e, line.id, 'qty')}
                                                    className={`w-full bg-black border rounded-2xl p-4 text-center text-white font-black font-mono text-xl outline-none transition-all ${isReadOnly ? 'border-zinc-900 bg-transparent cursor-default' : (focusedField?.id === line.id && focusedField?.field === 'qty' ? 'border-amber-500 ring-4 ring-amber-500/10 animate-pulse' : 'border-zinc-800 focus:border-purple-600')}`}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <div className={`w-full bg-zinc-950 border rounded-2xl p-4 text-center font-black font-mono text-lg shadow-inner ${isReadOnly ? 'text-zinc-500 border-zinc-900' : (docType === 'adjustment_out' || docType === 'transfer_out') ? 'text-zinc-500 border-zinc-900' : 'text-zinc-500 border-zinc-900'}`}>
                                                    ${line.unitCost.toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="relative group">
                                                    <DollarSign className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isReadOnly ? 'text-zinc-800' : 'text-zinc-700 group-focus-within:text-emerald-500'}`} size={18} />
                                                    <input
                                                        disabled={docType === 'adjustment_out' || docType === 'transfer_out' || isReadOnly}
                                                        ref={el => { if (el) inputRefs.current[`${line.id}-total`] = el; }}
                                                        type="number"
                                                        step="0.01"
                                                        value={line.lineTotal || ''}
                                                        onChange={e => updateLine(line.id, { lineTotal: parseFloat(e.target.value) || 0 })}
                                                        onKeyDown={e => handleKeyDown(e, line.id, 'total')}
                                                        className={`w-full border rounded-2xl py-4 pl-10 pr-4 text-right text-white font-black font-mono text-xl outline-none transition-all ${(docType === 'adjustment_out' || docType === 'transfer_out' || isReadOnly) ? 'bg-zinc-950 border-zinc-900 text-zinc-600 cursor-default' : (focusedField?.id === line.id && focusedField?.field === 'total' ? 'border-emerald-500 ring-4 ring-emerald-500/10 animate-pulse bg-black' : 'border-zinc-800 focus:border-purple-600 bg-black')}`}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </td>
                                            {!isReadOnly && (
                                                <td className="p-4 text-center">
                                                    <button onClick={() => setLines(lines.filter(l => l.id !== line.id))} className="p-2 text-zinc-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* PIE DE DOCUMENTO OPTIMIZADO */}
                        <div className="p-5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
                            <div className="flex gap-8 items-center">
                                <div className="flex flex-col"><span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Líneas</span><span className="text-xl font-black text-white font-mono">{lines.filter(l => l.itemId).length}</span></div>
                                <div className="flex flex-col"><span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Total Doc.</span><span className="text-xl font-black text-emerald-500 font-mono tracking-tighter">${docTotal.toFixed(2)}</span></div>
                                <div className="h-8 w-px bg-zinc-800 ml-2"></div>
                                <div className="flex flex-col"><span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Responsable</span><span className="text-[11px] font-black text-zinc-400 uppercase tracking-tight">{currentUser?.name}</span></div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsModalOpen(false)} className={`px-6 py-2.5 bg-zinc-900 text-zinc-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:text-white transition-all border border-zinc-800 ${isReadOnly ? 'px-12 py-3 text-xs' : ''}`}>
                                    {isReadOnly ? 'Cerrar Consulta' : 'Descartar'}
                                </button>
                                {!isReadOnly && (
                                    <button onClick={processDocument} className="px-8 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all border-b-2 border-purple-800 active:border-b-0 flex items-center gap-2 active:scale-95">
                                        <CheckCircle2 size={16} /> Procesar Movimiento
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL RECEPCIÓN DE TRASLADOS PENDIENTES (Capa z-650) */}
            {isReceiveModalOpen && (
                <div className="fixed inset-0 z-[650] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl h-[70vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="bg-amber-600/20 p-3 rounded-2xl text-amber-500 border border-amber-500/20"><Truck size={24} /></div>
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">Validación de Mercadería</h3>
                                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1.5">Confirma la entrada de stock a esta sede</p>
                                </div>
                            </div>
                            <button onClick={() => setIsReceiveModalOpen(false)} className="p-2 text-zinc-500 hover:text-white"><X size={24} /></button>
                        </div>

                        <div
                            ref={receiveScroll.ref}
                            {...receiveScroll.props}
                            className="flex-1 overflow-y-auto hide-scrollbar p-6 bg-black/20"
                        >
                            {pendingTransfers.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-30">
                                    <CheckCircle2 size={60} strokeWidth={1} />
                                    <span className="text-[10px] font-black uppercase mt-4">Todo al día</span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pendingTransfers.map(m => (
                                        <div key={m.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between group hover:border-amber-500/30 transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-xl bg-zinc-950 flex items-center justify-center text-amber-500/50 border border-zinc-800 group-hover:text-amber-500 transition-colors shadow-inner"><Package size={22} /></div>
                                                <div>
                                                    <div className="font-black text-white uppercase text-sm">{m.itemName}</div>
                                                    <div className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                                        <span>Enviado: {new Date(m.date).toLocaleDateString()}</span>
                                                        <span className="text-zinc-800">•</span>
                                                        <span>Origen: {branches.find(b => b.id === m.relatedBranchId)?.name || 'Desconocido'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8">
                                                <div className="text-center">
                                                    <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Cantidad</div>
                                                    <div className="text-2xl font-black text-white font-mono tracking-tighter">{m.quantity} UN</div>
                                                </div>
                                                <button
                                                    onClick={() => { if (confirm("¿Confirmas que has recibido y contado físicamente esta mercadería?")) confirmTransferIn(m.id); }}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95 border-b-2 border-emerald-800 active:border-b-0"
                                                >
                                                    <CheckCircle2 size={16} /> Confirmar Recepción
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL KARDEX: AUDITORÍA POR SUCURSAL (Capa z-600) */}
            {isKardexModalOpen && selectedItem && (
                <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-6xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-zinc-800 bg-zinc-950 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-600/20 flex items-center justify-center text-purple-400 border border-purple-500/20"><History size={24} /></div>
                                    <div><h2 className="text-xl font-black text-white uppercase tracking-tight">{selectedItem.name}</h2><p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Auditoría de Kardex Cronológico</p></div>
                                </div>
                                <button onClick={() => setIsKardexModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-all hover:rotate-90"><X size={24} /></button>
                            </div>

                            {/* SELECTOR DE SUCURSAL PARA FILTRO AUDITORÍA */}
                            <div className="flex items-center justify-end gap-3 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800 self-end mr-2">
                                <div className="flex items-center gap-2 text-zinc-500">
                                    <Filter size={12} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Filtrar por Sede:</span>
                                </div>
                                <select
                                    value={kardexBranchId}
                                    onChange={e => setKardexBranchId(e.target.value)}
                                    className="bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-[10px] font-black text-white uppercase outline-none focus:border-purple-600 transition-all cursor-pointer shadow-inner"
                                >
                                    <option value="">SELECCIONAR SEDE...</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div
                            ref={kardexScroll.ref}
                            {...kardexScroll.props}
                            className="flex-1 overflow-y-auto hide-scrollbar p-6 bg-black/20 cursor-grab active:cursor-grabbing"
                        >
                            <table className="w-full text-left">
                                <thead className="text-[9px] font-black text-zinc-600 uppercase tracking-widest border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
                                    <tr>
                                        <th className="p-4">Fecha / Hora</th>
                                        <th className="p-4">Operación</th>
                                        <th className="p-4">Estado</th>
                                        <th className="p-4 text-center">Cantidad</th>
                                        <th className="p-4 text-center">Stock Result.</th>
                                        <th className="p-4 text-right">Costo Unit.</th>
                                        <th className="p-4 text-center">Documento</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900">
                                    {(inventoryMovements || [])
                                        .filter(m => m && m.itemId === selectedId && m.branchId === kardexBranchId)
                                        .sort((a, b) => {
                                            const dA = a.date ? new Date(a.date).getTime() : 0;
                                            const dB = b.date ? new Date(b.date).getTime() : 0;
                                            return dA - dB; // ASCENDENTE (Lo más viejo arriba)
                                        })
                                        .map(m => {
                                            if (!m) return null;
                                            // REGLA DE COLORES Y SIGNOS SEGÚN TIPO
                                            const isPositive = ['initial', 'purchase', 'adjustment_in', 'transfer_in'].includes(m.type);
                                            const dateStr = m.date ? new Date(m.date).toLocaleString() : 'Fecha Inválida';
                                            const qty = Number(m.quantity || 0);
                                            const stock = Number(m.newStock || 0);
                                            const cost = Number(m.unitCost || 0);

                                            return (
                                                <tr key={m.id} className="group hover:bg-white/[0.02] transition-all">
                                                    <td className="p-4 text-zinc-500 font-mono text-[10px]">{dateStr}</td>
                                                    <td className="p-4 text-xs font-black text-white uppercase">{m.type || 'N/A'}</td>
                                                    <td className="p-4">
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${m.status === 'completed' || !m.status ? 'bg-emerald-900/20 text-emerald-500' : 'bg-amber-900/20 text-amber-500'}`}>
                                                            {m.status || 'completed'}
                                                        </span>
                                                    </td>
                                                    <td className={`p-4 text-center font-mono font-black text-sm ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {isPositive ? '+' : '-'}{qty}
                                                    </td>
                                                    <td className="p-4 text-center font-mono font-black text-sm text-purple-400">{stock}</td>
                                                    <td className="p-4 text-right font-mono font-black text-sm text-zinc-400">${cost.toFixed(2)}</td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleViewMovementDetail(m); }}
                                                            className="p-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-md group-hover:scale-110 active:scale-95"
                                                            title="Ver Documento ERP"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    {(!kardexBranchId || (inventoryMovements || []).filter(m => m && m.itemId === selectedId && m.branchId === kardexBranchId).length === 0) && (
                                        <tr><td colSpan={7} className="p-20 text-center text-zinc-700 italic font-black uppercase tracking-widest opacity-30">{!kardexBranchId ? 'Selecciona una sede para auditar' : 'Sin movimientos registrados'}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
