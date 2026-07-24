
import React, { useState, useEffect, useRef } from 'react';
import { useBarber } from '../context/BarberContext';
import {
    Settings, Save, CheckCircle2, Tv, ListVideo, Plus,
    Trash2, Youtube, FileVideo, Scissors, Printer, RefreshCcw,
    HardDrive, Database, Users, Calendar, ShoppingBag, Zap
} from 'lucide-react';

export const SettingsManager = ({ initialTab = 'master' }: { initialTab?: 'master' | 'tv' }) => {
    const {
        config, updateConfig, branches, updateBranch,
        factoryReset, currentUser
    } = useBarber();

    const [salonName, setSalonName] = useState(config.salonName || '');
    const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');
    const [ticketFooter, setTicketFooter] = useState(config.ticketFooter || '');
    const [ticketSize, setTicketSize] = useState(config.ticketSize || '58mm');
    const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl || '');

    // TV Settings
    const [videoPlaylist, setVideoPlaylist] = useState<any[]>(config.videoPlaylist || []);
    const [tickerSpeed, setTickerSpeed] = useState(config.tickerSpeed || 20);
    const [tickerMessage, setTickerMessage] = useState(config.tickerMessage || '');

    // UI State
    const [notify, setNotify] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
    const [newItemName, setNewItemName] = useState('');
    const [newItemUrl, setNewItemUrl] = useState('');
    const [previewVideo, setPreviewVideo] = useState<any>(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedResetSegments, setSelectedResetSegments] = useState<string[]>(['sales']);
    const [resetConfirmCode, setResetConfirmCode] = useState('');
    const safetyCode = "8899"; // Código fijo para el reset masivo

    const fileInputRef = useRef<HTMLInputElement>(null);

    const isProtegido = currentUser?.id === 'u_admin' || currentUser?.id === '1' || currentUser?.username === 'admin';
    const isSuperAdmin = isProtegido;

    useEffect(() => {
        if (videoPlaylist.length > 0 && !previewVideo) {
            setPreviewVideo(videoPlaylist[0]);
        }
    }, [videoPlaylist]);

    const showNotify = (type: 'success' | 'error', msg: string) => {
        setNotify({ type, msg });
        setTimeout(() => setNotify(null), 3000);
    };

    const handleSave = async () => {
        const success = await updateConfig({
            salonName,
            logoUrl,
            ticketFooter,
            ticketSize,
            webhookUrl,
            videoPlaylist,
            tickerSpeed,
            tickerMessage
        });

        if (success) {
            showNotify('success', 'Configuraciones guardadas localmente y en el VPS');
        }
    };

    const handleFileBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Logica para subir archivo al VPS o usar base64 para demo
            const reader = new FileReader();
            reader.onload = (event) => {
                setNewItemUrl(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const addToPlaylist = () => {
        if (!newItemUrl) return;
        const isYoutube = newItemUrl.includes('youtube.com') || newItemUrl.includes('youtu.be');

        const newItem = {
            id: crypto.randomUUID(),
            name: newItemName || (isYoutube ? 'VIDEO YOUTUBE' : 'VIDEO CARGADO'),
            url: newItemUrl,
            type: isYoutube ? 'youtube' : 'mp4'
        };

        setVideoPlaylist([...videoPlaylist, newItem]);
        setNewItemName('');
        setNewItemUrl('');
        showNotify('success', 'Video agregado a la cartelera');
    };

    const removeFromPlaylist = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newPlaylist = videoPlaylist.filter(v => v.id !== id);
        setVideoPlaylist(newPlaylist);
        if (previewVideo?.id === id) {
            setPreviewVideo(newPlaylist[0] || null);
        }
    };

    const toggleResetSegment = (segment: string) => {
        if (selectedResetSegments.includes(segment)) {
            setSelectedResetSegments(selectedResetSegments.filter(s => s !== segment));
        } else {
            setSelectedResetSegments([...selectedResetSegments, segment]);
        }
    };

    const handleExecuteReset = async () => {
        if (resetConfirmCode !== safetyCode) {
            showNotify('error', 'Código de seguridad incorrecto');
            return;
        }

        if (selectedResetSegments.length === 0) {
            showNotify('error', 'Selecciona al menos un segmento');
            return;
        }

        const success = await factoryReset(selectedResetSegments);
        if (success) {
            showNotify('success', 'Reset de datos completado con éxito');
            setShowResetModal(false);
            setResetConfirmCode('');
        } else {
            showNotify('error', 'Error al ejecutar el reset');
        }
    };

    return (
        <div className="h-full flex flex-col bg-zinc-950 font-inter animate-in fade-in duration-300 overflow-hidden">

            {notify && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-2 rounded-full shadow-2xl flex items-center gap-2 font-black bg-emerald-600 text-white border border-emerald-400 animate-in slide-in-from-top-2 uppercase text-[10px] tracking-widest">
                    <CheckCircle2 size={16} />
                    {notify.msg}
                </div>
            )}

            <div className="px-8 py-3 border-b border-zinc-900 flex justify-between items-center bg-zinc-950/50 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-zinc-900 rounded-lg text-zinc-500 border border-zinc-800">
                        {initialTab === 'tv' ? <Tv size={18} /> : <Settings size={18} />}
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-tight leading-none">
                            {initialTab === 'tv' ? 'Ajustes de Cartelera TV' : 'Configuración Maestra'}
                        </h2>
                        <p className="text-[7px] font-black text-zinc-600 uppercase tracking-[0.4em] mt-1">Nivel: Administrador Global</p>
                    </div>
                </div>
                <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl font-black flex items-center gap-2 shadow-lg transition-all active:scale-95 uppercase tracking-widest text-[9px] border-b-2 border-emerald-800 active:border-b-0">
                    <Save size={14} /> Aplicar Cambios
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
                {initialTab === 'master' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-12 max-w-6xl mx-auto">
                        <div className="space-y-8">
                            <div className="flex items-center gap-3 border-b border-zinc-900 pb-2">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em]">01. Identidad Visual</span>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">Nombre Comercial</label>
                                    <input value={salonName} onChange={e => setSalonName(e.target.value)} className="w-full bg-zinc-900/30 border border-zinc-800 rounded-xl py-2.5 px-4 text-white font-bold text-sm outline-none focus:border-blue-600 transition-all shadow-inner" placeholder="EJ: BARBEROS PRO" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">Logo URL (Icono)</label>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="w-full bg-zinc-900/30 border border-zinc-800 rounded-xl py-2.5 px-4 text-white font-mono text-[9px] outline-none focus:border-blue-600 transition-all shadow-inner" placeholder="https://..." />
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-xl">
                                            {logoUrl ? <img src={logoUrl} alt="Preview" className="max-w-full max-h-full object-contain" /> : <Scissors size={16} className="text-red-600" />}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">Mensaje Pie de Ticket</label>
                                    <textarea value={ticketFooter} onChange={e => setTicketFooter(e.target.value)} className="w-full bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 text-white font-bold text-xs outline-none h-32 resize-none focus:border-blue-600 transition-all shadow-inner" placeholder="Escribe aquí el mensaje de agradecimiento..." />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="flex items-center gap-3 border-b border-zinc-900 pb-2">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em]">02. Hardware & Automatización</span>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">Ancho de papel térmico</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setTicketSize('58mm')} className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${ticketSize === '58mm' ? 'bg-white text-black border-white shadow-xl' : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}>
                                            <Printer size={14} />
                                            <span className="text-[9px] font-black uppercase">58mm</span>
                                        </button>
                                        <button onClick={() => setTicketSize('80mm')} className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${ticketSize === '80mm' ? 'bg-white text-black border-white shadow-xl' : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}>
                                            <Printer size={14} />
                                            <span className="text-[9px] font-black uppercase">80mm</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest ml-1">Configuración de Cierre</label>
                                    <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                                            Las configuraciones de <span className="text-emerald-500">Cierre Automático</span> ahora se gestionan individualmente en la sección de <span className="text-cyan-500">Gestión de Sedes</span> para un control total por sucursal.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-emerald-500 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Zap size={10} /> Webhook GAS Global</label>
                                    <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-white font-mono text-[9px] outline-none focus:border-emerald-500 transition-all shadow-inner" placeholder="https://script.google.com/..." />
                                </div>

                                {isSuperAdmin && (
                                    <div className="pt-6">
                                        <button onClick={() => { setResetConfirmCode(''); setShowResetModal(true); }} className="w-full bg-red-900/10 hover:bg-red-600 text-red-600 hover:text-white border border-red-900/50 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 group">
                                            <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
                                            Panel de Reset Segmentado
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto flex flex-col gap-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                            <div className="lg:col-span-8 space-y-4">
                                <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em]">01. Gestor de Multimedia TV</span>
                                    <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                                        <ListVideo size={10} className="text-orange-500" />
                                        <span className="text-[8px] font-black text-zinc-400 uppercase">{videoPlaylist.length} Videos</span>
                                    </div>
                                </div>

                                <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800 shadow-xl space-y-2">
                                    <div className="flex flex-col md:flex-row items-end gap-3">
                                        <div className="flex-1 w-full space-y-1">
                                            <label className="text-[7px] font-black text-zinc-600 uppercase tracking-widest ml-1">Etiqueta (Opcional)</label>
                                            <input value={newItemName} onChange={e => setNewItemName(e.target.value.toUpperCase())} className="w-full bg-black border border-zinc-800 rounded-xl p-2 text-white font-black text-[10px] outline-none focus:border-orange-600 shadow-inner transition-all" placeholder="EJ: COMERCIAL BARBA" />
                                        </div>
                                        <div className="flex-[2] w-full space-y-1">
                                            <label className="text-[7px] font-black text-zinc-600 uppercase tracking-widest ml-1">Enlace YouTube o URL</label>
                                            <input value={newItemUrl} onChange={e => setNewItemUrl(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-2 text-white font-mono text-[9px] outline-none focus:border-orange-600 shadow-inner transition-all" placeholder="https://..." />
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="file" ref={fileInputRef} onChange={handleFileBrowse} className="hidden" accept="video/*" />
                                            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-700 hover:border-zinc-500 transition-all shadow-lg active:scale-95">
                                                <HardDrive size={16} />
                                            </button>
                                            <button onClick={addToPlaylist} disabled={!newItemUrl} className="bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:hover:bg-orange-600 text-white px-5 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-xl active:scale-95 border-b-2 border-orange-800 active:border-b-0 outline-none">
                                                <Plus size={14} className="inline mr-2" /> Agregar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                    {videoPlaylist.map((video: any) => (
                                        <div
                                            key={video.id}
                                            onClick={() => setPreviewVideo(video)}
                                            className={`group relative bg-zinc-900 border rounded-2xl p-3 flex items-center gap-4 cursor-pointer transition-all hover:border-orange-600/50 ${previewVideo?.id === video.id ? 'border-orange-600 bg-orange-600/5 shadow-[0_0_20px_rgba(234,88,12,0.1)]' : 'border-zinc-800'}`}
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-black border border-zinc-800 flex items-center justify-center shadow-lg overflow-hidden shrink-0">
                                                {video.type === 'youtube' ? <Youtube className="text-red-600" size={18} /> : <FileVideo className="text-blue-500" size={18} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="text-[10px] font-black text-white uppercase truncate">{video.name}</h5>
                                                <p className="text-[8px] font-bold text-zinc-600 truncate font-mono uppercase tracking-tighter">{video.type}</p>
                                            </div>
                                            <button onClick={(e) => removeFromPlaylist(video.id, e)} className="p-2 text-zinc-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="lg:col-span-4 space-y-6">
                                <div className="space-y-4">
                                    <div className="border-b border-zinc-900 pb-1.5 flex items-center gap-2">
                                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em]">02. Vista de Previa</span>
                                    </div>
                                    <div className="aspect-video bg-black rounded-2xl border border-zinc-800 flex items-center justify-center overflow-hidden shadow-2xl relative group">
                                        {previewVideo ? (
                                            <div className="w-full h-full">
                                                {previewVideo.type === 'youtube' ? (
                                                    <iframe
                                                        className="w-full h-full pointer-events-none"
                                                        src={`https://www.youtube.com/embed/${previewVideo.url.split('v=')[1] || previewVideo.url.split('/').pop()}?autoplay=0&controls=0&mute=1`}
                                                        title="YouTube video player"
                                                    />
                                                ) : (
                                                    <video src={previewVideo.url} className="w-full h-full object-cover" muted />
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                    <span className="text-white font-black text-[10px] uppercase tracking-widest bg-orange-600 px-4 py-2 rounded-full shadow-2xl">Visualizando Stream</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center space-y-2 opacity-20">
                                                <Tv size={32} className="mx-auto text-zinc-600" />
                                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Sin señal activa</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-zinc-900/50">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <RefreshCcw size={10} className="text-zinc-700" /> Velocidad del Ticker
                                        </label>
                                        <span className="text-[10px] font-black text-orange-500 font-mono">{tickerSpeed} PX/S</span>
                                    </div>
                                    <input type="range" min="10" max="60" value={tickerSpeed} onChange={e => setTickerSpeed(parseInt(e.target.value))} className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-orange-600" />

                                    <div className="space-y-2 mt-4">
                                        <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest ml-1">Mensaje de Noticia Global</label>
                                        <textarea value={tickerMessage} onChange={e => setTickerMessage(e.target.value)} className="w-full bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 text-white font-bold text-xs outline-none h-24 resize-none focus:border-orange-600 transition-all shadow-inner" placeholder="Escribe el anuncio para la marquesina..." />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL RESET SEGMENTADO */}
            {showResetModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500"></div>
                    <div className="relative bg-zinc-950 border border-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-[0_0_100px_rgba(239,68,68,0.15)] overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-b from-red-600/20 to-transparent p-10 text-center border-b border-zinc-900">
                            <div className="w-20 h-20 bg-red-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-900/20 animate-pulse">
                                <Database size={40} />
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-3">Power Reset</h2>
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest max-w-[280px] mx-auto leading-relaxed">Peligro: Estás a punto de eliminar datos permanentes. Selecciona los segmentos a purgar.</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'sales', name: 'Ventas', icon: ShoppingBag, color: 'text-orange-500' },
                                    { id: 'inventory', name: 'Stock', icon: HardDrive, color: 'text-blue-500' },
                                    { id: 'clients', name: 'Clientes', icon: Users, color: 'text-emerald-500' },
                                    { id: 'appointments', name: 'Turnos', icon: Calendar, color: 'text-purple-500' }
                                ].map(seg => (
                                    <button
                                        key={seg.id}
                                        onClick={() => toggleResetSegment(seg.id)}
                                        className={`flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all group ${selectedResetSegments.includes(seg.id) ? 'bg-zinc-900 border-white shadow-xl' : 'bg-transparent border-zinc-900 text-zinc-700 hover:border-zinc-800'}`}
                                    >
                                        <seg.icon size={24} className={selectedResetSegments.includes(seg.id) ? seg.color : 'text-zinc-800'} />
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${selectedResetSegments.includes(seg.id) ? 'text-white' : 'text-zinc-800 group-hover:text-zinc-600'}`}>{seg.name}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4 pt-4 border-t border-zinc-900">
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Ingresa el Código Maestro para Confirmar: <span className="text-white font-mono">{safetyCode}</span></p>
                                    <input
                                        type="text"
                                        maxLength={4}
                                        value={resetConfirmCode}
                                        onChange={e => setResetConfirmCode(e.target.value)}
                                        className="w-full bg-black border border-zinc-800 rounded-2xl py-5 text-center text-4xl font-black text-white font-mono tracking-[0.5em] outline-none focus:border-red-600 shadow-inner"
                                        placeholder="----"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={() => setShowResetModal(false)} className="flex-1 py-4 text-zinc-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Abortar Reset</button>
                                    <button
                                        onClick={handleExecuteReset}
                                        disabled={resetConfirmCode !== safetyCode || selectedResetSegments.length === 0}
                                        className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl active:scale-95 ${resetConfirmCode === safetyCode ? 'bg-red-600 text-white border-b-4 border-red-800 active:border-b-0 shadow-red-900/40' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed opacity-50'}`}
                                    >
                                        Confirmar Purgado
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
