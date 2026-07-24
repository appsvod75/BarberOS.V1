
import React, { useState, useMemo, useEffect } from 'react';
import { useBarber } from '../context/BarberContext';
import {
    Users, Plus, Edit, Shield, Save, RefreshCw,
    X, CheckCircle2, AlertCircle,
    Lock, Store, UserCog, ShieldCheck,
    AtSign, Briefcase, Search, UserMinus, ToggleLeft, ToggleRight,
    ShieldAlert, Pencil, Trash2
} from 'lucide-react';
import { User, Role } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';

export const StaffManager = () => {
    const { users, branches, addUser, updateUser, removeUser, currentUser, sales, tickets, appointments } = useBarber();
    const formScroll = useDragScroll();
    const listScroll = useDragScroll();

    // Determinar nivel de privilegio
    const isSuperAdmin = currentUser?.role === 'admin' && !currentUser.branchId;
    const isBranchAdmin = currentUser?.role === 'admin' && !!currentUser.branchId;

    // Form State
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<Role>('barber');
    const [pin, setPin] = useState('');
    // Si es admin de sucursal, forzamos su branchId desde el inicio
    const [branchId, setBranchId] = useState(isBranchAdmin ? (currentUser?.branchId || '') : '');
    const [active, setActive] = useState(true);
    const [canDoPos, setCanDoPos] = useState(false);

    // List Control State
    const [listSearch, setListSearch] = useState('');

    // Status for feedback
    const [notify, setNotify] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const showNotify = (type: 'success' | 'error', msg: string) => {
        setNotify({ type, msg });
        setTimeout(() => setNotify(null), 3000);
    };

    const resetForm = () => {
        setEditingUserId(null);
        setName('');
        setUsername('');
        setRole('barber');
        setPin('');
        // Al resetear, el admin de sucursal debe mantener su sucursal fija
        setBranchId(isBranchAdmin ? (currentUser?.branchId || '') : '');
        setActive(true);
        setCanDoPos(false);
    };

    const handleEdit = (user: User) => {
        // Bloquear edición del Super Admin Protegido por otros
        if (user.id === 'u_admin' && currentUser?.id !== 'u_admin') {
            showNotify('error', 'No tienes permisos para editar al desarrollador');
            return;
        }
        setEditingUserId(user.id);
        setName(user.name);
        setUsername(user.username || '');
        setRole(user.role);
        setPin(user.pin);
        setBranchId(user.branchId || '');
        setActive(user.active !== false);
        setCanDoPos(!!user.canDoPos);
    };

    const handleDelete = (user: User) => {
        if (user.id === 'u_admin') {
            showNotify('error', 'El usuario de sistema no puede ser eliminado');
            return;
        }
        if (confirm(`¿Estás seguro de eliminar permanentemente a ${user.name}? Esta acción no se puede deshacer.`)) {
            removeUser(user.id);
            showNotify('success', 'Colaborador eliminado');
            if (editingUserId === user.id) resetForm();
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        const payload: User = {
            id: editingUserId || crypto.randomUUID(),
            name,
            username,
            role,
            pin,
            branchId: branchId || undefined,
            active,
            canDoPos
        };

        if (editingUserId) {
            updateUser(payload);
            showNotify('success', 'Colaborador actualizado');
        } else {
            addUser(payload);
            showNotify('success', 'Colaborador registrado');
        }
        resetForm();
    };

    // Filtered Users Logic with Hierarchy logic
    const filteredUsers = useMemo(() => {
        const query = listSearch.toLowerCase();

        // Primero filtramos por Jerarquía (Branch Admin solo ve su sucursal)
        let baseList = users;
        if (isBranchAdmin) {
            baseList = users.filter(u => u.branchId === currentUser?.branchId);
        }

        // OCULTAR SUPER ADMIN PROTEGIDO de la lista SOLO para otros usuarios
        // Si el usuario actual ES el Super Admin, SÍ puede verse a sí mismo
        const isSuperAdminLoggedIn = currentUser?.id === '1' || currentUser?.id === 'u_admin' || currentUser?.username === 'admin';

        if (!isSuperAdminLoggedIn) {
            // Si NO eres el Super Admin, entonces NO puedes ver al Super Admin
            baseList = baseList.filter(u => u.id !== '1' && u.id !== 'u_admin' && u.username !== 'admin');
        }

        // Luego filtramos por el buscador de texto
        return baseList.filter(u =>
            u.name.toLowerCase().includes(query) ||
            u.username.toLowerCase().includes(query) ||
            u.role.toLowerCase().includes(query)
        );
    }, [users, listSearch, isBranchAdmin, currentUser]);

    const activeCount = filteredUsers.filter(u => u.active !== false).length;
    const branchName = branches.find(b => b.id === currentUser?.branchId)?.name || 'Corporativo';

    // Helper to check if user can be deleted (no records)
    const canUserBeDeleted = (userId: string) => {
        if (userId === currentUser?.id) return false; // No borrarse a sí mismo
        if (userId === '1' || userId === 'u_admin') return false; // Proteger sistema
        const hasSales = sales.some(s => s.barberId === userId);
        const hasTickets = tickets.some(t => t.barberId === userId);
        const hasAppointments = appointments.some(a => a.barberId === userId);
        return !hasSales && !hasTickets && !hasAppointments;
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-zinc-950 animate-in fade-in duration-500 overflow-hidden font-inter">

            {/* NOTIFICACIÓN FLOTANTE */}
            {notify && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold border ${notify.type === 'success' ? 'bg-emerald-600/90 text-white border-emerald-400' : 'bg-red-600/90 text-white border-red-400'}`}>
                    {notify.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {notify.msg}
                </div>
            )}

            {/* COLUMNA IZQUIERDA: FORMULARIO */}
            <div
                ref={formScroll.ref}
                {...formScroll.props}
                className="w-full md:w-[380px] lg:w-[420px] border-r border-zinc-900 bg-black/20 overflow-y-auto hide-scrollbar flex flex-col p-6 lg:p-7 shrink-0"
            >
                <div className="mb-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl shadow-lg ${editingUserId ? 'bg-yellow-600/20 text-yellow-500' : 'bg-blue-600/20 text-blue-500'}`}>
                            {editingUserId ? <Pencil size={24} /> : <Plus size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none">
                                {editingUserId ? 'Editar Perfil' : 'Nuevo Miembro'}
                            </h2>
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-1.5">
                                {isSuperAdmin ? 'Control Corporativo Total' : `Gestión Sede: ${branchName}`}
                            </p>
                        </div>
                    </div>
                    {editingUserId && (
                        <button onClick={resetForm} className="p-2 bg-zinc-900 text-zinc-500 hover:text-white rounded-xl border border-zinc-800 transition-all">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <form onSubmit={handleSave} className="flex-1 flex flex-col justify-between min-h-0">
                    <div className="space-y-4 lg:space-y-5">
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase block mb-2 ml-1 tracking-[0.2em]">Nombre Completo</label>
                            <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-white font-bold text-sm outline-none focus:border-yellow-600 shadow-inner transition-all placeholder:text-zinc-700 uppercase" placeholder="EJ: JUAN PÉREZ" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase block mb-2 ml-1 tracking-[0.2em]">Usuario ID</label>
                                <div className="relative">
                                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" size={14} />
                                    <input required value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3.5 pl-9 pr-3 text-white font-bold text-sm outline-none focus:border-yellow-600 shadow-inner transition-all placeholder:text-zinc-700" placeholder="usuario" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-yellow-500 uppercase block mb-2 ml-1 tracking-[0.2em] flex items-center gap-2">
                                    <Lock size={10} /> PIN Acceso
                                </label>
                                <input required maxLength={6} value={pin} onChange={e => /^\d*$/.test(e.target.value) && setPin(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3.5 text-white font-black text-center text-sm outline-none focus:border-yellow-600 shadow-inner tracking-[0.3em] font-mono" placeholder="••••••" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase block mb-2 ml-1 tracking-[0.2em]">Rol / Cargo Operativo</label>
                                <select value={role} onChange={e => setRole(e.target.value as Role)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-white font-black text-xs outline-none focus:border-yellow-600 shadow-inner appearance-none cursor-pointer">
                                    <option value="barber">✂️ BARBERO</option>
                                    <option value="reception">📞 RECEPCIÓN</option>
                                    <option value="cashier">💰 CAJERO</option>
                                    <option value="admin">🛡️ ADMINISTRADOR</option>
                                    <option value="display">📺 TV DISPLAY</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase block mb-2 ml-1 tracking-[0.2em]">Asignación de Sede</label>
                                {isSuperAdmin ? (
                                    <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-white font-bold text-xs outline-none focus:border-yellow-600 shadow-inner appearance-none cursor-pointer">
                                        <option value="">TODAS LAS SEDES (GLOBAL)</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>📍 {b.name.toUpperCase()}</option>)}
                                    </select>
                                ) : (
                                    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-zinc-400 font-black text-xs flex items-center gap-2 cursor-not-allowed">
                                        <Store size={14} className="text-zinc-600" /> {branchName.toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* TOGGLES ACTIVOS */}
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <button
                                type="button"
                                onClick={() => setActive(!active)}
                                className={`bg-zinc-900/60 p-4 rounded-2xl border flex items-center justify-between group transition-all ${active ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-zinc-800/50 hover:border-red-500/40'}`}
                            >
                                <div className="text-left min-w-0">
                                    <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest truncate">Estado</div>
                                    <div className={`text-[8px] font-black uppercase mt-1 ${active ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {active ? 'Habilitado' : 'Suspendido'}
                                    </div>
                                </div>
                                <div className={`w-10 h-5.5 rounded-full relative transition-all duration-300 shadow-inner shrink-0 ${active ? 'bg-emerald-600' : 'bg-zinc-800'}`}>
                                    <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-md transition-all duration-300 ${active ? 'left-5' : 'left-0.5'}`} />
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setCanDoPos(!canDoPos)}
                                className={`bg-zinc-900/60 p-4 rounded-2xl border flex items-center justify-between group transition-all ${canDoPos ? 'border-blue-500/20 hover:border-blue-500/40' : 'border-zinc-800/50 hover:border-zinc-700'}`}
                            >
                                <div className="text-left min-w-0">
                                    <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest truncate">Caja POS</div>
                                    <div className={`text-[8px] font-black uppercase mt-1 ${canDoPos ? 'text-blue-500' : 'text-zinc-700'}`}>
                                        {canDoPos ? 'Con Acceso' : 'Restringido'}
                                    </div>
                                </div>
                                <div className={`w-10 h-5.5 rounded-full relative transition-all duration-300 shadow-inner shrink-0 ${canDoPos ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                                    <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-md transition-all duration-300 ${canDoPos ? 'left-5' : 'left-0.5'}`} />
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="pt-6">
                        <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-yellow-900/30 active:scale-95 transition-all border-b-4 border-yellow-800 active:border-b-0 flex items-center justify-center gap-3">
                            <Save size={18} /> {editingUserId ? 'Actualizar Perfil' : 'Confirmar Registro'}
                        </button>
                    </div>
                </form>
            </div>

            {/* COLUMNA DERECHA: LISTADO DECK */}
            <div className="flex-1 flex flex-col overflow-hidden bg-black/10 p-6 lg:p-8">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                    <div className="flex flex-col">
                        <h3 className="text-zinc-500 font-black text-[11px] uppercase tracking-[0.4em] flex items-center gap-3">
                            <UserCog size={16} className="text-zinc-700" /> ELITE STAFF DECK
                        </h3>
                        <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                            <span className="text-emerald-500">{activeCount} Activos</span>
                            <span className="text-zinc-800">/</span>
                            <span>{filteredUsers.length} en esta Vista</span>
                            {!isSuperAdmin && (
                                <>
                                    <span className="text-zinc-800">•</span>
                                    <span className="text-blue-500 flex items-center gap-1"><Store size={10} /> Filtro Sede Activo</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* BUSCADOR DE LISTA */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" size={14} />
                        <input
                            value={listSearch}
                            onChange={e => setListSearch(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-[10px] text-white font-black uppercase tracking-wider outline-none focus:border-yellow-600 transition-all placeholder:text-zinc-700 shadow-xl"
                            placeholder="FILTRAR EN ESTA VISTA..."
                        />
                        {listSearch && (
                            <button onClick={() => setListSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-white">
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* HEADER DE ALINEACIÓN (SOLO DESKTOP) */}
                <div className="hidden lg:grid grid-cols-12 gap-5 px-6 py-2 mb-2 text-zinc-700 font-black text-[8px] uppercase tracking-widest border-b border-zinc-900/50">
                    <div className="col-span-1">Avatar</div>
                    <div className="col-span-3">Colaborador / Usuario</div>
                    <div className="col-span-2 text-center">Sede / Rol</div>
                    <div className="col-span-1 text-center">POS</div>
                    <div className="col-span-1 text-center">PIN</div>
                    <div className="col-span-2 text-center">Referencia ID</div>
                    <div className="col-span-2 text-right pr-4">Acciones</div>
                </div>

                <div
                    ref={listScroll.ref}
                    {...listScroll.props}
                    className="flex-1 overflow-y-auto hide-scrollbar pr-2"
                >
                    <div className="space-y-2 pb-10">
                        {filteredUsers.length === 0 ? (
                            <div className="h-60 flex flex-col items-center justify-center text-zinc-800 border-2 border-dashed border-zinc-900 rounded-[2.5rem] bg-black/10">
                                <ShieldAlert size={40} className="opacity-20 mb-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-30 text-center leading-relaxed">
                                    No hay registros que coincidan<br />en tu nivel de acceso
                                </span>
                            </div>
                        ) : filteredUsers.map(user => {
                            const userBranch = branches.find(b => b.id === user.branchId)?.name || 'Corporativo';
                            const isEditing = user.id === editingUserId;
                            const deletable = canUserBeDeleted(user.id);

                            return (
                                <div
                                    key={user.id}
                                    className={`bg-zinc-900/40 border rounded-2xl px-5 py-3 transition-all duration-300 group relative grid grid-cols-1 lg:grid-cols-12 items-center gap-5 ${isEditing ? 'border-yellow-600 bg-yellow-600/5 ring-2 ring-yellow-600/20 shadow-2xl z-10' : 'border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900'}`}
                                >
                                    {/* AVATAR */}
                                    <div className="col-span-1 flex justify-center lg:justify-start">
                                        <div className={`relative p-0.5 rounded-xl ${user.active !== false ? 'bg-gradient-to-tr from-emerald-500 to-emerald-300' : 'bg-zinc-800'}`}>
                                            <div className="bg-zinc-950 p-2 rounded-[calc(0.75rem-1px)] text-zinc-500 shadow-inner">
                                                <Users size={18} className={user.active !== false ? 'text-yellow-500' : 'text-zinc-800'} />
                                            </div>
                                            {user.active !== false && (
                                                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-900"></div>
                                            )}
                                        </div>
                                    </div>

                                    {/* IDENTIDAD */}
                                    <div className="col-span-1 lg:col-span-3 min-w-0 text-center lg:text-left">
                                        <div className="flex items-center justify-center lg:justify-start gap-2">
                                            <h4 className="font-black text-white text-sm uppercase tracking-tight truncate group-hover:text-yellow-400 transition-colors">
                                                {user.name}
                                            </h4>
                                            {user.role === 'admin' && <Shield size={10} className="text-yellow-500 shrink-0" />}
                                        </div>
                                        <div className="flex items-center justify-center lg:justify-start gap-2 mt-0.5">
                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">@{user.username}</span>
                                            <span className={`text-[7px] font-black px-1.5 py-0.2 rounded border ${user.active !== false ? 'text-emerald-500 border-emerald-500/20' : 'text-red-500 border-red-500/20'}`}>
                                                {user.active !== false ? 'ON' : 'OFF'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* INFO LABORAL */}
                                    <div className="col-span-1 lg:col-span-2 text-center lg:text-left flex flex-col items-center lg:items-start overflow-hidden">
                                        <div className="flex items-center gap-1.5 text-zinc-400 text-[8px] font-black uppercase truncate w-full justify-center lg:justify-start">
                                            <Store size={10} className="text-zinc-700 shrink-0" /> <span className="truncate">{userBranch}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-zinc-600 text-[8px] font-bold uppercase mt-1 justify-center lg:justify-start w-full">
                                            <Briefcase size={10} className="text-zinc-800 shrink-0" /> {user.role}
                                        </div>
                                    </div>

                                    {/* POS ACCESS */}
                                    <div className="col-span-1 text-center hidden lg:block">
                                        <div className={`p-1 rounded-lg inline-flex ${user.canDoPos ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-800 text-zinc-700'}`}>
                                            {user.canDoPos ? <CheckCircle2 size={12} /> : <X size={12} />}
                                        </div>
                                    </div>

                                    {/* PIN */}
                                    <div className="col-span-1 text-center hidden lg:block">
                                        <span className="bg-black/40 px-2 py-1 rounded border border-zinc-800 text-[9px] font-black text-yellow-500 font-mono tracking-widest">
                                            {user.pin}
                                        </span>
                                    </div>

                                    {/* ID REFERENCIA */}
                                    <div className="col-span-1 lg:col-span-2 text-center hidden lg:block">
                                        <span className="text-[7px] font-black text-zinc-700 uppercase bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800/50">
                                            REF: {user.id.substring(0, 8).toUpperCase()}
                                        </span>
                                    </div>

                                    {/* ACCIONES */}
                                    <div className="col-span-1 lg:col-span-2 flex items-center justify-center lg:justify-end gap-2 pr-4">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="w-8 h-8 flex items-center justify-center bg-zinc-800 text-zinc-500 hover:bg-yellow-600 hover:text-white rounded-xl transition-all shadow-md active:scale-90 border border-zinc-700 group/edit"
                                            title="Editar"
                                        >
                                            <Pencil size={14} />
                                        </button>

                                        {deletable && (
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="w-8 h-8 flex items-center justify-center bg-zinc-800 text-zinc-700 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-md active:scale-90 border border-zinc-700 group/trash"
                                                title="Eliminar permanentemente"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* MOBILE PIN INFO */}
                                    <div className="lg:hidden col-span-1 flex justify-center gap-4 pt-3 border-t border-zinc-800/30">
                                        <div className="text-[8px] font-black text-yellow-500 uppercase flex items-center gap-1"><Lock size={8} /> {user.pin}</div>
                                        <div className="text-[8px] font-black text-blue-500 uppercase flex items-center gap-1"><Shield size={8} /> POS: {user.canDoPos ? 'SI' : 'NO'}</div>
                                    </div>
                                </div>
                            );
                        })}


                        {/* BOTÓN AGREGAR */}
                        {listSearch === '' && (
                            <button
                                onClick={resetForm}
                                className="w-full bg-zinc-950 border-2 border-dashed border-zinc-900 p-5 rounded-[2.5rem] flex items-center justify-center gap-4 hover:border-yellow-600/40 hover:bg-yellow-600/[0.02] transition-all group shadow-inner"
                            >
                                <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-800 group-hover:bg-yellow-600 group-hover:text-white transition-all shadow-2xl group-hover:rotate-90">
                                    <Plus size={20} />
                                </div>
                                <div className="text-xs font-black text-zinc-700 uppercase tracking-[0.3em] group-hover:text-white transition-colors">Vincular Nuevo Colaborador</div>
                            </button>
                        )}
                    </div>
                </div>
            </div>

        </div >
    );
};
