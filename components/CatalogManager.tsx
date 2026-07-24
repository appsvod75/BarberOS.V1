
import React, { useState, useMemo, useEffect } from 'react';
import { useBarber } from '../context/BarberContext';
import {
  Search, Plus, Edit, X, Scissors, Package, Layers,
  Info, CheckCircle2, Tag, DollarSign, PlusCircle, List, LayoutGrid, Trash2
} from 'lucide-react';
import { CatalogItem, ItemType } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';

export const CatalogManager = () => {
  const {
    catalog, addItem, updateItem, removeItem, categories,
    addCategory, sales, inventoryMovements, stocks
  } = useBarber();

  const mainScroll = useDragScroll();
  const detailScroll = useDragScroll();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | ItemType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && catalog.length > 0) {
      setSelectedId(catalog[0].id);
    }
  }, [catalog, selectedId]);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState<ItemType>('service');
  const [category, setCategory] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return catalog.filter(item => {
      if (!item) return false;
      const name = item.name || '';
      const cat = item.category || '';
      const matchesSearch = name.toLowerCase().includes(lower) ||
        cat.toLowerCase().includes(lower);
      const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
      return matchesSearch && matchesFilter;
    }).sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
  }, [catalog, search, activeFilter]);

  const selectedItem = useMemo(() =>
    catalog.find(i => i.id === selectedId) || null
    , [catalog, selectedId]);

  const isItemUsed = (id: string) => {
    const hasSales = sales.some(s => s.items.some(i => i.itemId === id));
    const hasMovements = inventoryMovements.some(m => m.itemId === id);
    const hasStock = stocks.some(s => s.itemId === id && s.stock !== 0);
    return hasSales || hasMovements || hasStock;
  };

  const handleDeleteItem = (item: CatalogItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isItemUsed(item.id)) {
      alert(`⚠️ No se puede eliminar "${item.name}" porque tiene historial de movimientos o stock activo. Se recomienda desactivarlo en su lugar.`);
      return;
    }
    if (confirm(`¿Estás seguro de eliminar "${item.name}" permanentemente? Esta acción no se puede deshacer.`)) {
      removeItem(item.id);
      if (selectedId === item.id) setSelectedId(null);
    }
  };

  const handleOpenModal = (item?: CatalogItem) => {
    setIsCreatingCategory(false);
    setNewCategoryName('');
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setPrice(item.price.toString());
      setType(item.type);
      setCategory(item.category);
    } else {
      setEditingItem(null);
      setName('');
      setPrice('');
      setType('service');
      setCategory(categories[0] || 'General');
    }
    setIsModalOpen(true);
  };

  const handleToggleActive = (item: CatalogItem, e: React.MouseEvent) => {
    e.stopPropagation();
    updateItem({ ...item, active: !item.active });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    let finalCategory = category;
    if (isCreatingCategory && newCategoryName.trim()) {
      finalCategory = newCategoryName.trim();
      addCategory(finalCategory);
    }
    const payload: CatalogItem = {
      id: editingItem?.id || crypto.randomUUID(),
      name,
      price: parseFloat(price),
      type,
      category: finalCategory,
      active: editingItem ? editingItem.active : true,
      comboDefinition: editingItem?.comboDefinition
    };
    if (editingItem) updateItem(payload);
    else addItem(payload);
    setIsModalOpen(false);
  };

  const filterCounts = {
    all: catalog.length,
    service: catalog.filter(i => i.type === 'service').length,
    product: catalog.filter(i => i.type === 'product').length,
    combo: catalog.filter(i => i.type === 'combo').length,
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 overflow-hidden animate-in fade-in duration-500">
      <div className="px-6 py-5 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6 flex-1">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
            <input value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-xs text-white focus:border-zinc-500 outline-none transition-all shadow-inner" placeholder="Buscar en catálogo..." />
          </div>
          <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-900">
            <FilterBtn active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} label="Todos" count={filterCounts.all} />
            <FilterBtn active={activeFilter === 'service'} onClick={() => setActiveFilter('service')} label="Servicios" count={filterCounts.service} />
            <FilterBtn active={activeFilter === 'product'} onClick={() => setActiveFilter('product')} label="Productos" count={filterCounts.product} />
            <FilterBtn active={activeFilter === 'combo'} onClick={() => setActiveFilter('combo')} label="Combos" count={filterCounts.combo} />
          </div>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-pink-600 hover:bg-pink-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-pink-900/20 active:scale-95 transition-all border-b-4 border-pink-800 active:border-b-0"><Plus size={18} /> Nuevo Item</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-[3] flex flex-col min-w-0 border-r border-zinc-900 bg-black/10">
          <div
            ref={mainScroll.ref}
            {...mainScroll.props}
            className="flex-1 overflow-y-auto hide-scrollbar p-6"
          >
            <div className="bg-zinc-900/20 rounded-[2.5rem] border border-zinc-900 overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-950/80 backdrop-blur-md text-zinc-600 font-black uppercase text-[10px] border-b border-zinc-900 tracking-[0.2em] sticky top-0 z-10">
                  <tr>
                    <th className="p-5 w-20 text-center">Estado</th>
                    <th className="p-5">Nombre / Tipo</th>
                    <th className="p-5">Categoría</th>
                    <th className="p-5 text-right">Precio</th>
                    <th className="p-5 w-32 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="p-32 text-center text-zinc-800 italic font-black uppercase tracking-[0.3em] opacity-30">Sin resultados</td></tr>
                  ) : filtered.map(item => (
                    <tr key={item.id} onClick={() => setSelectedId(item.id)} className={`group cursor-pointer transition-all ${selectedId === item.id ? 'bg-pink-600/10' : 'hover:bg-white/[0.02]'}`}>
                      <td className="p-5">
                        <div className="flex justify-center">
                          <button onClick={(e) => handleToggleActive(item, e)} className={`w-11 h-6 rounded-full relative transition-all duration-300 ${item.active ? 'bg-emerald-600' : 'bg-zinc-800'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${item.active ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${item.type === 'service' ? 'bg-blue-600/10 text-blue-500' : item.type === 'combo' ? 'bg-indigo-600/10 text-indigo-500' : 'bg-amber-600/10 text-amber-500'}`}>{item.type === 'service' ? <Scissors size={18} /> : item.type === 'combo' ? <Layers size={18} /> : <Package size={18} />}</div>
                          <div><div className="font-black text-white text-sm uppercase tracking-tight">{item.name}</div><div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mt-0.5">{item.type}</div></div>
                        </div>
                      </td>
                      <td className="p-5"><span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">{item.category}</span></td>
                      <td className="p-5 text-right"><div className="text-xl font-black text-white tracking-tighter font-mono">${item.price.toFixed(2)}</div></td>
                      <td className="p-5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }} className="p-2.5 bg-zinc-800 text-zinc-500 hover:bg-white hover:text-black rounded-xl transition-all shadow-lg"><Edit size={14} /></button>
                          <button onClick={(e) => handleDeleteItem(item, e)} className="p-2.5 bg-zinc-800 text-zinc-700 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-lg" title="Eliminar"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div
          ref={detailScroll.ref}
          {...detailScroll.props}
          className="flex-1 bg-zinc-900 flex flex-col shadow-2xl relative z-20 min-w-[320px] overflow-y-auto hide-scrollbar"
        >
          {selectedItem ? (
            <div className="flex-1 flex flex-col p-8 animate-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-start mb-10">
                <div className={`p-6 rounded-[2rem] shadow-2xl ${selectedItem.type === 'service' ? 'bg-blue-600 text-white shadow-blue-900/30' : selectedItem.type === 'combo' ? 'bg-indigo-600 text-white shadow-indigo-900/30' : 'bg-amber-600 text-white shadow-amber-900/30'}`}>{selectedItem.type === 'service' ? <Scissors size={40} /> : selectedItem.type === 'combo' ? <Layers size={40} /> : <Package size={40} />}</div>
                <div className="flex flex-col items-end gap-3">
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border shadow-sm ${selectedItem.active ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-red-950 text-red-400 border-red-800'}`}>{selectedItem.active ? 'ACTIVO' : 'INACTIVO'}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenModal(selectedItem)} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-black text-[10px] uppercase tracking-widest bg-zinc-950/50 px-3 py-2 rounded-xl"><Edit size={12} /> Editar</button>
                    <button onClick={(e) => handleDeleteItem(selectedItem, e)} className="flex items-center gap-2 text-zinc-700 hover:text-red-500 transition-colors font-black text-[10px] uppercase tracking-widest bg-zinc-950/50 px-3 py-2 rounded-xl"><Trash2 size={12} /> Borrar</button>
                  </div>
                </div>
              </div>
              <div className="mb-10"><div className="flex items-center gap-2 text-zinc-500 mb-2"><Tag size={14} /><span className="text-[10px] font-black uppercase tracking-widest">{selectedItem.category}</span></div><h2 className="text-4xl font-black text-white uppercase tracking-tight leading-[0.9] mb-4">{selectedItem.name}</h2></div>
              <div className="bg-black/40 rounded-[2rem] p-8 border border-zinc-800 mb-10 flex flex-col gap-1 shadow-inner"><span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">PVP Sugerido</span><div className="flex items-baseline gap-1"><span className="text-2xl font-black text-emerald-500/50 font-mono">$</span><div className="text-6xl font-black text-emerald-500 font-mono tracking-tighter leading-none">{selectedItem.price.toFixed(2)}</div></div></div>

              {/* Fix: Combo Details View in Side Panel */}
              {selectedItem.type === 'combo' && (
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <LayoutGrid size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Contenido del Pack</span>
                  </div>
                  <div className="space-y-2">
                    {selectedItem.comboDefinition && selectedItem.comboDefinition.length > 0 ? (
                      selectedItem.comboDefinition.map((subId, idx) => {
                        const subItem = catalog.find(x => x.id === subId);
                        if (!subItem) return null;
                        return (
                          <div key={`${subId}-${idx}`} className="flex items-center gap-4 bg-zinc-800/40 p-4 rounded-2xl border border-zinc-800 group hover:bg-zinc-800 transition-all">
                            <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-zinc-600">
                              {subItem?.type === 'service' ? <Scissors size={14} /> : <Package size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-black text-zinc-200 uppercase truncate leading-none">{subItem?.name || 'Item'}</div>
                              <div className="text-[8px] font-bold text-zinc-600 uppercase mt-1">Valor Unit: ${subItem.price.toFixed(2)}</div>
                            </div>
                            <CheckCircle2 size={16} className="text-emerald-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 rounded-2xl bg-zinc-800/20 border border-dashed border-zinc-800 text-center text-zinc-600 text-[10px] uppercase font-bold">
                        Combo sin items definidos
                      </div>
                    )}

                    {/* Add Savings Calculation Display in Side Panel */}
                    {selectedItem.comboDefinition && selectedItem.comboDefinition.length > 0 && (() => {
                      const realTotal = selectedItem.comboDefinition.reduce((acc, curr) => {
                        const item = catalog.find(i => i.id === curr);
                        return acc + (item ? item.price : 0);
                      }, 0);
                      const savings = realTotal - selectedItem.price;
                      return savings > 0 && (
                        <div className="mt-4 p-4 rounded-2xl bg-emerald-900/10 border border-emerald-900/20 flex justify-between items-center">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ahorro Aplicado</span>
                          <span className="text-emerald-400 font-mono font-black text-sm">${savings.toFixed(2)} ({((savings / realTotal) * 100).toFixed(0)}%)</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {(!selectedItem.type || selectedItem.type !== 'combo') && (<div className="mt-auto pt-8 border-t border-zinc-800"><div className="flex items-center gap-4 p-4 bg-zinc-800/30 rounded-2xl border border-zinc-800/50"><div className="p-3 bg-blue-600/10 text-blue-500 rounded-xl"><Info size={20} /></div><div><div className="text-[10px] font-black text-white uppercase mb-0.5">Gestión de Stock</div><div className="text-[9px] text-zinc-500 font-bold leading-tight">Este item afecta directamente el inventario y las comisiones de los barberos asignados.</div></div></div></div>)}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-800 p-8 text-center opacity-30"><LayoutGrid size={80} strokeWidth={0.5} /><span className="text-[11px] font-black uppercase tracking-[0.5em] mt-8 leading-relaxed">SELECCIONA UN ITEM<br />DEL CATÁLOGO</span></div>
          )}
        </div>
      </div>

      {/* MODAL: CONFIGURACIÓN DE ITEM */}
      {isModalOpen && (
        <ItemFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialData={editingItem}
          categories={categories}
          isCreatingCategory={isCreatingCategory}
          setIsCreatingCategory={setIsCreatingCategory}
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          addCategory={addCategory}
          onSave={(item, isEdit) => {
            if (isEdit) updateItem(item);
            else addItem(item);
            setIsModalOpen(false);
          }}
          fullCatalog={catalog}
        />
      )}
    </div>
  );
};

// Refactored Modal Component to handle complex Combo Logic cleanly
const ItemFormModal = ({ isOpen, onClose, initialData, categories, isCreatingCategory, setIsCreatingCategory, newCategoryName, setNewCategoryName, addCategory, onSave, fullCatalog }: any) => {
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData?.price.toString() || '');
  const [type, setType] = useState<ItemType>(initialData?.type || 'service');
  const [category, setCategory] = useState(initialData?.category || categories[0] || 'General');

  // Combo Logic State
  const [comboItems, setComboItems] = useState<string[]>(initialData?.comboDefinition || []);
  const [comboSearch, setComboSearch] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    let finalCategory = category;
    if (isCreatingCategory && newCategoryName.trim()) {
      finalCategory = newCategoryName.trim();
      addCategory(finalCategory);
    }

    const payload: CatalogItem = {
      id: initialData?.id || crypto.randomUUID(),
      name,
      price: parseFloat(price),
      type,
      category: finalCategory,
      active: initialData ? initialData.active : true,
      comboDefinition: type === 'combo' ? comboItems : undefined
    };

    onSave(payload, !!initialData);
  };

  // Calculate Combo Savings
  const comboRealTotal = useMemo(() => {
    return comboItems.reduce((acc, curr) => {
      const item = fullCatalog.find((i: any) => i.id === curr);
      return acc + (item ? item.price : 0);
    }, 0);
  }, [comboItems, fullCatalog]);

  const savings = comboRealTotal - (parseFloat(price) || 0);

  // Filter for combo search
  const availableItems = useMemo(() => {
    if (!comboSearch) return [];
    return fullCatalog.filter((i: any) =>
      i.type !== 'combo' && // No combos inside combos
      (i.name.toLowerCase().includes(comboSearch.toLowerCase()) || (i.category || '').toLowerCase().includes(comboSearch.toLowerCase()))
    ).slice(0, 5); // Limit references
  }, [fullCatalog, comboSearch]);

  return (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-5 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
          <div className="flex items-center gap-4"><div className="bg-pink-600/20 p-2.5 rounded-xl text-pink-500 shadow-lg shadow-pink-900/10">{initialData ? <Edit size={20} /> : <Plus size={20} />}</div><div><h2 className="text-lg font-black text-white uppercase tracking-tight leading-none">{initialData ? 'Editar Item' : 'Nuevo Registro'}</h2><p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Catálogo de Barbería</p></div></div>
          <button onClick={onClose} className="p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all hover:rotate-90"><X size={18} /></button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto hide-scrollbar">
          <div><label className="text-[9px] font-black text-zinc-500 uppercase block mb-1 ml-1 tracking-[0.2em]">Nombre Comercial</label><input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white font-black text-xs outline-none focus:border-pink-600 shadow-inner transition-all" placeholder="EJ: CORTE DEGRADADO" /></div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-1">
              <label className="text-[9px] font-black text-zinc-500 uppercase block mb-1 ml-1 tracking-[0.2em]">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value as ItemType)} className="w-full h-[48px] bg-black border border-zinc-800 rounded-xl px-4 text-white font-black uppercase text-[10px] outline-none focus:border-pink-600 appearance-none cursor-pointer shadow-inner">
                <option value="service">Servicio</option>
                <option value="product">Producto</option>
                <option value="combo">Combo / Pack</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="text-[9px] font-black text-zinc-500 uppercase block mb-1 ml-1 tracking-[0.2em]">Categoría</label>
              <div className="relative">
                {isCreatingCategory ? (
                  <div className="flex gap-2">
                    <input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="w-full h-[48px] bg-zinc-950 border border-pink-600/50 rounded-xl px-4 text-white font-black text-[10px] outline-none focus:border-pink-600 uppercase" placeholder="NUEVA CAT..." />
                    <button type="button" onClick={() => setIsCreatingCategory(false)} className="absolute right-2 top-2 bottom-2 aspect-square bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"><X size={12} className="mx-auto" /></button>
                  </div>
                ) : (
                  <>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-[48px] bg-black border border-zinc-800 rounded-xl px-4 text-white font-black uppercase text-[10px] outline-none focus:border-pink-600 appearance-none cursor-pointer shadow-inner">
                      {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button type="button" onClick={() => setIsCreatingCategory(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-zinc-900 rounded-lg text-zinc-500 hover:text-white border border-zinc-800"><Plus size={12} /></button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* COMBO BUILDER SECTION */}
          {type === 'combo' && (
            <div className="bg-zinc-950/50 border border-zinc-800 rounded-[1.5rem] p-4 space-y-3 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-2 text-indigo-400 mb-1">
                <Layers size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Constructor de Combo</span>
              </div>

              {/* Search for items to add */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={12} />
                <input
                  value={comboSearch}
                  onChange={e => setComboSearch(e.target.value)}
                  placeholder="Buscar items para agregar..."
                  className="w-full bg-black border border-zinc-800 rounded-xl py-2.5 pl-9 pr-3 text-[10px] text-white font-bold outline-none focus:border-indigo-600 transition-all"
                />
                {comboSearch && availableItems.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {availableItems.map((i: any) => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => { setComboItems([...comboItems, i.id]); setComboSearch(''); }}
                        className="w-full p-2.5 text-left hover:bg-indigo-600/20 border-b border-zinc-800 last:border-0 flex justify-between items-center group"
                      >
                        <span className="text-[9px] font-bold text-zinc-300 group-hover:text-white uppercase">{i.name}</span>
                        <span className="text-[9px] font-mono text-zinc-500">${i.price.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Added Items List */}
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                {comboItems.length === 0 && <div className="text-center p-3 text-[9px] text-zinc-600 italic">Agrega productos o servicios al combo...</div>}
                {comboItems.map((id, idx) => {
                  const item = fullCatalog.find((i: any) => i.id === id);
                  if (!item) return null;
                  return (
                    <div key={idx} className="bg-zinc-900 border border-zinc-800 p-1.5 rounded-lg flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-zinc-950 flex items-center justify-center text-zinc-600 text-[9px]">
                          {item.type === 'service' ? <Scissors size={9} /> : <Package size={9} />}
                        </div>
                        <span className="text-[9px] font-bold text-zinc-300 uppercase leading-none">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-zinc-500">${item.price.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => setComboItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals Summary */}
              <div className="pt-2 border-t border-zinc-800 flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-zinc-500 uppercase">Valor Real Total:</span>
                <span className="text-[10px] font-mono font-black text-zinc-400 line-through">${comboRealTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-[9px] font-black text-zinc-500 uppercase block mb-1 ml-1 tracking-[0.2em]">{type === 'combo' ? 'Precio Oferta Combo' : 'Precio PVP'}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 font-black text-lg font-mono">$</span>
              <input required type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-pink-600 font-mono font-black text-xl shadow-inner text-right" placeholder="0.00" />
            </div>
            {type === 'combo' && savings > 0 && (
              <div className="mt-2 text-right">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest bg-emerald-950/50 border border-emerald-900/50 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 shadow-lg shadow-emerald-900/10">
                  Ahorro: ${savings.toFixed(2)} ({((savings / comboRealTotal) * 100).toFixed(0)}%)
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 bg-zinc-800 text-zinc-500 hover:text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95">Cerrar</button>
            <button type="submit" className="flex-[1.5] bg-pink-600 hover:bg-pink-500 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-pink-900/20 active:scale-95 transition-all border-b-4 border-pink-800 active:border-b-0">{initialData ? 'Guardar Cambios' : 'Registrar Item'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FilterBtn = ({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count: number }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${active ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}>{label}<span className={`px-1.5 py-0.5 rounded-md text-[8px] ${active ? 'bg-pink-600 text-white' : 'bg-zinc-950 text-zinc-700'}`}>{count}</span></button>
);
