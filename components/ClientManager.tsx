
import React, { useState, useMemo, useRef } from 'react';
import { useBarber } from '../context/BarberContext';
import {
    Search, Plus, FileSpreadsheet, Edit, X, UserPlus,
    Mail, Calendar, FileText, Info, AlertCircle, CheckCircle, Download, FileCheck, Star, Trophy, Gift
} from 'lucide-react';
import { Client } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';

export const ClientManager = () => {
    const { clients, addClient, updateClient, config } = useBarber();
    const scroll = useDragScroll();
    const [search, setSearch] = useState('');

    // Estados de Modales
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    // Estado Importación
    const [importCount, setImportCount] = useState(0);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [notes, setNotes] = useState('');
    const [referrerSearch, setReferrerSearch] = useState('');
    const [selectedReferrerId, setSelectedReferrerId] = useState<string | undefined>(undefined);

    const filtered = useMemo(() => {
        const lower = search.toLowerCase();
        return clients.filter(c =>
            c.name.toLowerCase().includes(lower) ||
            (c.phone && c.phone.includes(lower)) ||
            (c.email && c.email.toLowerCase().includes(lower))
        );
    }, [clients, search]);

    const filteredReferrers = useMemo(() => {
        return referrerSearch.length > 1
            ? clients.filter(c => c.name.toLowerCase().includes(referrerSearch.toLowerCase()))
            : [];
    }, [clients, referrerSearch]);

    const handleOpenModal = (client?: Client) => {
        setReferrerSearch('');
        setSelectedReferrerId(undefined);
        if (client) {
            setEditingClient(client);
            setName(client.name);
            setPhone(client.phone || '');
            setEmail(client.email || '');
            setBirthDate(client.birthDate ? client.birthDate.split('T')[0] : '');
            setNotes(client.notes || '');
        } else {
            setEditingClient(null);
            setName('');
            setPhone('');
            setEmail('');
            setBirthDate('');
            setNotes('');
        }
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: Client = {
            id: editingClient?.id || crypto.randomUUID(),
            name,
            phone,
            email,
            birthDate: birthDate || undefined,
            notes,
            visits: editingClient?.visits || 0,
            points: editingClient?.points || 0,
            referredBy: selectedReferrerId
        };
        if (editingClient) updateClient(payload);
        else addClient(payload);
        setIsModalOpen(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            setImportCount(Math.floor(Math.random() * 140) + 10);
        }
    };

    const resetImport = () => {
        setImportCount(0);
        setFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="h-full flex flex-col gap-4 p-6 bg-zinc-950 animate-in fade-in duration-300 font-inter">

            {/* HEADER DE ACCIONES */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-4 top-3 text-zinc-500" size={18} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:border-teal-500 outline-none transition-all shadow-inner"
                        placeholder="Buscar por nombre, teléfono o email..."
                    />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex-1 md:flex-none bg-zinc-900 text-zinc-400 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-zinc-800 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                    >
                        <FileSpreadsheet size={16} /> Importar
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex-1 md:flex-none bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-teal-900/20 active:scale-95 transition-all border-b-4 border-teal-800 active:border-b-0"
                    >
                        <Plus size={18} /> Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* TABLA DE CLIENTES */}
            <div
                ref={scroll.ref}
                {...scroll.props}
                className="flex-1 overflow-y-auto hide-scrollbar bg-zinc-900/10 rounded-[2rem] border border-zinc-900"
            >
                <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-950 text-zinc-500 font-black uppercase text-[10px] sticky top-0 z-10 border-b border-zinc-800 tracking-[0.2em]">
                        <tr>
                            <th className="p-5">Información del Cliente</th>
                            <th className="p-5 text-center">Cumpleaños</th>
                            <th className="p-5">Fidelidad (Progreso a Premio)</th>
                            <th className="p-5 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-20 text-center text-zinc-700 italic font-bold uppercase tracking-widest opacity-30">
                                    No se encontraron clientes
                                </td>
                            </tr>
                        ) : filtered.map(c => {
                            const threshold = config.loyalty?.redemptionThreshold || 5;
                            const currentPoints = c.points || 0;
                            const progress = Math.min(100, (currentPoints / threshold) * 100);
                            const canRedeem = currentPoints >= threshold;

                            return (
                                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-teal-600/20 group-hover:text-teal-500 transition-all">
                                                <UserPlus size={18} />
                                            </div>
                                            <div>
                                                <div className="font-black text-white text-sm uppercase tracking-tight">{c.name}</div>
                                                <div className="text-[10px] text-zinc-500 font-bold mt-0.5 flex items-center gap-2">
                                                    {c.phone || 'Sin teléfono'} {c.email && <span className="opacity-30">|</span>} {c.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        {c.birthDate ? (
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-lg border border-zinc-800 text-[10px] text-zinc-400 font-mono">
                                                <Calendar size={12} className="text-zinc-600" />
                                                {new Date(c.birthDate.split('T')[0] + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase()}
                                            </div>
                                        ) : (
                                            <span className="text-zinc-800 text-[10px] font-black italic">N/A</span>
                                        )}
                                    </td>
                                    <td className="p-5 w-72">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-end">
                                                <div className="flex items-center gap-1.5">
                                                    <Star size={12} className={canRedeem ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-700'} />
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${canRedeem ? 'text-yellow-500' : 'text-zinc-500'}`}>
                                                        {currentPoints} / {threshold} Puntos
                                                    </span>
                                                </div>
                                                {canRedeem ? (
                                                    <span className="text-[8px] font-black bg-yellow-600 text-black px-2 py-0.5 rounded-md animate-pulse">¡LISTO PARA PREMIO!</span>
                                                ) : (
                                                    <span className="text-[8px] font-bold text-zinc-600 uppercase">Faltan {threshold - currentPoints}</span>
                                                )}
                                            </div>
                                            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 shadow-inner">
                                                <div
                                                    className={`h-full transition-all duration-1000 ease-out ${canRedeem ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'bg-teal-600'}`}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5 text-center">
                                        <button
                                            onClick={() => handleOpenModal(c)}
                                            className="p-3 bg-zinc-800 hover:bg-white hover:text-black rounded-xl text-zinc-400 transition-all shadow-md active:scale-95"
                                            title="Editar Perfil"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* MODAL: REGISTRO/EDICIÓN */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-teal-600/20 p-2 rounded-xl text-teal-500"><UserPlus size={24} /></div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                                    {editingClient ? 'Perfil del Cliente' : 'Nuevo Registro Pro'}
                                </h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1.5 ml-1 tracking-widest">Nombre Completo *</label>
                                    <input
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-teal-500 shadow-inner transition-all"
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1.5 ml-1 tracking-widest">Teléfono</label>
                                    <input
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white font-bold outline-none focus:border-teal-500 shadow-inner font-mono"
                                        placeholder="7777-8888"
                                        type="tel"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-teal-500 uppercase block mb-1.5 ml-1 tracking-widest">Cumpleaños</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                                        <input
                                            type="date"
                                            value={birthDate}
                                            onChange={e => setBirthDate(e.target.value)}
                                            className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-teal-500 shadow-inner font-mono text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1.5 ml-1 tracking-widest">Email Principal</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                                        <input
                                            value={email}
                                            onChange={e => setEmail(e.target.value.toLowerCase())}
                                            className="w-full bg-black border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-teal-500 shadow-inner lowercase"
                                            placeholder="ejemplo@correo.com"
                                            type="email"
                                            inputMode="email"
                                            autoCapitalize="none"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 relative">
                                    <label className="text-[10px] font-black text-blue-500 uppercase block mb-1.5 ml-1 tracking-widest flex items-center gap-2">
                                        {/* Added missing Gift icon from lucide-react to fix a reference error on line 287. */}
                                        <Gift size={12} /> Referido Por (Padrino)
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
                                        <input
                                            value={referrerSearch}
                                            onChange={e => { setReferrerSearch(e.target.value); setSelectedReferrerId(undefined); }}
                                            className={`w-full bg-black border rounded-xl py-4 pl-12 pr-4 text-white font-bold outline-none shadow-inner transition-all text-xs ${selectedReferrerId ? 'border-emerald-500/50' : 'border-zinc-800 focus:border-blue-600'}`}
                                            placeholder="BUSCAR CLIENTE EXISTENTE..."
                                        />
                                        {selectedReferrerId && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />}
                                    </div>
                                    {referrerSearch.length > 0 && !selectedReferrerId && filteredReferrers.length > 0 && (
                                        <div className="absolute top-full left-0 w-full bg-zinc-800 border border-zinc-700 rounded-xl mt-1 shadow-2xl z-[150] max-h-32 overflow-y-auto">
                                            {filteredReferrers.map(c => (
                                                <button key={c.id} type="button" onClick={() => { setSelectedReferrerId(c.id); setReferrerSearch(c.name); }} className="w-full p-3 text-left text-[10px] font-bold text-white hover:bg-blue-600 border-b border-zinc-700 last:border-0 flex justify-between items-center transition-colors">
                                                    <span>{c.name.toUpperCase()}</span>
                                                    <span className="text-[8px] text-zinc-400 font-mono">{c.phone}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1.5 ml-1 tracking-widest flex items-center gap-1"><FileText size={10} /> Notas / Observaciones</label>
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white outline-none focus:border-teal-500 shadow-inner h-24 resize-none text-xs"
                                        placeholder="Preferencias de corte, alergias, etc..."
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-zinc-800 text-zinc-400 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Cancelar</button>
                                <button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all border-b-4 border-teal-800 active:border-b-0">
                                    {editingClient ? 'Actualizar' : 'Guardar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: IMPORTAR CLIENTES */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-5 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-600/20 p-2 rounded-xl text-blue-500"><FileSpreadsheet size={20} /></div>
                                <div>
                                    <h2 className="text-lg font-black text-white uppercase tracking-tight leading-none">Importación</h2>
                                    <p className="text-zinc-500 text-[9px] mt-1 font-bold uppercase tracking-widest">Migra tu base de datos</p>
                                </div>
                            </div>
                            <button onClick={() => { setIsImportModalOpen(false); resetImport(); }} className="p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors"><X size={18} /></button>
                        </div>

                        <div className="p-5 space-y-3">
                            <div className="space-y-2">
                                <h3 className="text-zinc-500 font-black text-[9px] uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Info size={12} className="text-blue-500" /> Preparación del archivo
                                </h3>
                                <div className="grid grid-cols-1 gap-2">
                                    <ImportTip step="1" text="Usa columnas: Nombre, Teléfono, Email, Fecha Nacimiento." />
                                    <ImportTip step="2" text="Encabezados: Son OPCIONALES. Puedes incluirlos o empezar directo con los datos." />
                                    <ImportTip step="3" text="Orden: Asegúrate de respetar el orden de las columnas arriba mencionadas." />
                                </div>
                            </div>

                            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-zinc-900 rounded-lg text-zinc-500 group-hover:text-emerald-500 transition-colors"><Download size={18} /></div>
                                    <div>
                                        <div className="font-bold text-white text-[10px] uppercase">Plantilla Recomendada</div>
                                        <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-tighter">Formato Excel (.xlsx)</div>
                                    </div>
                                </div>
                                <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all">Descargar</button>
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-3xl p-5 flex flex-col items-center justify-center text-center group transition-all cursor-pointer bg-black/20 ${importCount > 0 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-zinc-800 hover:border-blue-500/50'}`}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".csv,.xlsx,.xls"
                                    className="hidden"
                                />

                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform ${importCount > 0 ? 'bg-emerald-600/20 text-emerald-500' : 'bg-blue-600/10 text-blue-500'}`}>
                                    {importCount > 0 ? <FileCheck size={18} /> : <FileSpreadsheet size={18} />}
                                </div>

                                {importCount > 0 ? (
                                    <>
                                        <div className="font-black text-emerald-500 text-xs uppercase tracking-tight">{fileName}</div>
                                        <div className="text-[8px] text-zinc-400 font-bold uppercase mt-1 flex items-center gap-2">
                                            <CheckCircle size={10} /> {importCount} registros detectados
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); resetImport(); }} className="text-[7px] text-zinc-600 hover:text-red-500 font-black uppercase mt-1 underline">Cambiar archivo</button>
                                    </>
                                ) : (
                                    <>
                                        <div className="font-black text-white text-xs uppercase tracking-tight">Haz clic para subir</div>
                                        <p className="text-zinc-600 text-[8px] mt-1 font-bold uppercase tracking-tighter">Soporta .csv, .xlsx (Máx 5MB)</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-5 bg-zinc-950 border-t border-zinc-800 flex gap-3 relative">
                            {importCount > 0 && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[8px] font-black px-3 py-1 rounded-full shadow-lg border border-emerald-400 animate-in slide-in-from-bottom-1 uppercase">
                                    {importCount} CLIENTES LISTOS
                                </div>
                            )}
                            <button onClick={() => { setIsImportModalOpen(false); resetImport(); }} className="flex-1 bg-zinc-900 text-zinc-500 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:text-white transition-all">Cancelar</button>
                            <button
                                onClick={() => { alert(`Importación simulada: ${importCount} clientes añadidos.`); setIsImportModalOpen(false); resetImport(); }}
                                disabled={importCount === 0}
                                className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all ${importCount > 0 ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95' : 'bg-zinc-800 text-zinc-700 cursor-not-allowed opacity-50'}`}
                            >
                                Procesar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ImportTip = ({ step, text }: { step: string, text: string }) => (
    <div className="flex gap-3 items-start bg-zinc-900/30 p-2 rounded-xl border border-zinc-800/40">
        <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[8px] font-black text-white shrink-0 mt-0.5">{step}</div>
        <p className="text-[9px] text-zinc-400 leading-tight font-bold uppercase">{text}</p>
    </div>
);
