
import React, { useState, useMemo } from 'react';
import { useBarber } from '../context/BarberContext';
import { Appointment, TicketType } from '../types';
import { Calendar, Clock, User, Scissors, Plus, Check, X, Phone, FileText, ArrowRight, Trash2, Edit } from 'lucide-react';
import { useDragScroll } from '../hooks/useDragScroll';

interface AgendaProps {
    navigateView?: (view: string) => void;
}

export const Agenda = ({ navigateView }: AgendaProps) => {
    const { appointments, users, branches, currentUser, addAppointment, updateAppointment, deleteAppointment, createTicket, clients } = useBarber();
    const scroll = useDragScroll();

    // State
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formDate, setFormDate] = useState('');
    const [formTime, setFormTime] = useState('10:00');
    const [formClient, setFormClient] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formBarber, setFormBarber] = useState('');
    const [formService, setFormService] = useState('Corte');
    const [formNotes, setFormNotes] = useState('');

    const currentBranchId = currentUser?.branchId || branches[0]?.id;
    const barbers = users.filter(u => u.role === 'barber' && u.active !== false && (u.branchId === currentBranchId || !u.branchId));

    // Filter appointments for the day (Interpretation safety)
    const dailyAppointments = useMemo(() => {
        return appointments
            .filter(a => a.branchId === currentBranchId && a.date === selectedDate)
            .sort((a, b) => a.time.localeCompare(b.time));
    }, [appointments, selectedDate, currentBranchId]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        const payload: Appointment = {
            id: editingId || crypto.randomUUID(),
            branchId: currentBranchId || '',
            date: formDate,
            time: formTime,
            clientName: formClient,
            clientPhone: formPhone,
            barberId: formBarber || undefined,
            serviceType: formService,
            status: editingId ? (appointments.find(a => a.id === editingId)?.status || 'pending') : 'pending',
            notes: formNotes
        };

        if (editingId) {
            updateAppointment(payload);
        } else {
            addAppointment(payload);
        }
        closeModal();
    };

    const openCreate = () => {
        setEditingId(null);
        setFormDate(selectedDate);
        setFormTime('10:00');
        setFormClient('');
        // FIX: corrected non-existent setPhone to setFormPhone
        setFormPhone('');
        setFormBarber('');
        setFormService('Corte');
        setFormNotes('');
        setShowModal(true);
    };

    const openEdit = (appt: Appointment) => {
        setEditingId(appt.id);
        setFormDate(appt.date);
        setFormTime(appt.time);
        setFormClient(appt.clientName);
        setFormPhone(appt.clientPhone || '');
        setFormBarber(appt.barberId || '');
        setFormService(appt.serviceType);
        setFormNotes(appt.notes || '');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
    };

    const handleCheckIn = (appt: Appointment) => {
        if (confirm(`¿El cliente ${appt.clientName} ha llegado? Se creará un ticket.`)) {
            let type: TicketType = 'C';
            const s = appt.serviceType.toLowerCase();
            if (s.includes('barba') && s.includes('corte')) type = 'D';
            else if (s.includes('barba')) type = 'B';
            else type = 'C';

            const existingClient = clients.find(c => c.name.toLowerCase() === appt.clientName.toLowerCase());
            createTicket(type, appt.clientName, existingClient?.id);
            updateAppointment({ ...appt, status: 'completed' });
        }
    };

    const handleDelete = (id: string) => {
        if (confirm("¿Cancelar esta cita?")) {
            deleteAppointment(id);
        }
    };

    const changeDay = (offset: number) => {
        // Safer day change logic
        const [year, month, day] = selectedDate.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        d.setDate(d.getDate() + offset);
        const newY = d.getFullYear();
        const newM = String(d.getMonth() + 1).padStart(2, '0');
        const newD = String(d.getDate()).padStart(2, '0');
        setSelectedDate(`${newY}-${newM}-${newD}`);
    };

    return (
        <div className="h-full flex flex-col bg-zinc-950 p-6 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Calendar className="text-violet-500" /> Agenda de Citas</h1>
                    <p className="text-zinc-500 text-sm">Administra reservas y conviértelas en tickets.</p>
                </div>
                <div className="flex items-center gap-3 bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                    <button onClick={() => changeDay(-1)} className="text-zinc-400 hover:text-white px-2">←</button>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="bg-transparent text-white font-bold outline-none text-center"
                    />
                    <button onClick={() => changeDay(1)} className="text-zinc-400 hover:text-white px-2">→</button>
                    <button
                        onClick={openCreate}
                        className="ml-4 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-md font-bold flex items-center gap-2 shadow-lg"
                    >
                        <Plus size={18} /> Agendar
                    </button>
                </div>
            </div>

            {/* List */}
            <div
                ref={scroll.ref}
                {...scroll.props}
                className="flex-1 overflow-y-auto hide-scrollbar space-y-3"
            >
                {dailyAppointments.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-zinc-600">
                        <Calendar size={48} className="mb-2 opacity-20" />
                        <p>No hay citas para el {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}.</p>
                    </div>
                ) : (
                    dailyAppointments.map(appt => {
                        const barberName = barbers.find(b => b.id === appt.barberId)?.name.split(' ')[0] || 'Cualquiera';
                        const isCompleted = appt.status === 'completed';

                        return (
                            <div key={appt.id} className={`bg-zinc-900 border ${isCompleted ? 'border-zinc-800 opacity-60' : 'border-zinc-700 hover:border-violet-500'} p-4 rounded-xl flex flex-col md:flex-row items-center gap-4 transition-all group`}>
                                <div className="md:w-24 text-center md:text-left border-b md:border-b-0 md:border-r border-zinc-800 pb-2 md:pb-0 md:pr-4">
                                    <div className="text-xl font-black text-white">{appt.time}</div>
                                    <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded inline-block ${isCompleted ? 'bg-green-900 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                        {isCompleted ? 'Completado' : 'Pendiente'}
                                    </div>
                                </div>
                                <div className="flex-1 w-full text-center md:text-left">
                                    <div className="font-bold text-lg text-white flex items-center justify-center md:justify-start gap-2">
                                        {appt.clientName}
                                        {/* Wrapped icon in a span to fix TS error: 'title' property does not exist on Lucide icons */}
                                        {appt.notes && <span title={appt.notes} className="flex items-center"><FileText size={14} className="text-zinc-500" /></span>}
                                    </div>
                                    <div className="text-sm text-zinc-400 flex flex-col md:flex-row gap-2 md:gap-4 items-center justify-center md:justify-start">
                                        <span className="flex items-center gap-1"><Scissors size={12} /> {appt.serviceType}</span>
                                        <span className="flex items-center gap-1"><User size={12} /> Barbero: <span className="text-violet-400 font-bold">{barberName}</span></span>
                                        {appt.clientPhone && <span className="flex items-center gap-1"><Phone size={12} /> {appt.clientPhone}</span>}
                                    </div>
                                </div>
                                {!isCompleted && (
                                    <div className="flex gap-2 w-full md:w-auto justify-center">
                                        <button onClick={() => openEdit(appt)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg" title="Editar"><Edit size={18} /></button>
                                        <button onClick={() => handleDelete(appt.id)} className="p-2 bg-zinc-800 hover:bg-red-900/50 text-red-500 rounded-lg" title="Cancelar"><Trash2 size={18} /></button>
                                        <button onClick={() => handleCheckIn(appt)} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-green-900/20">
                                            <Check size={18} /> Llegó
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            {editingId ? <Edit size={20} /> : <Plus size={20} />}
                            {editingId ? 'Editar Cita' : 'Nueva Cita'}
                        </h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-zinc-400 block mb-1">Fecha</label>
                                    <input type="date" required value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-400 block mb-1">Hora</label>
                                    <input type="time" required value={formTime} onChange={e => setFormTime(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-zinc-400 block mb-1">Servicio</label>
                                    <select value={formService} onChange={e => setFormService(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white">
                                        <option value="Corte">Corte</option>
                                        <option value="Barba">Barba</option>
                                        <option value="Corte + Barba">Corte + Barba</option>
                                        <option value="Tinte">Tinte / Color</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-400 block mb-1">Barbero</label>
                                    <select value={formBarber} onChange={e => setFormBarber(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white">
                                        <option value="">Cualquiera</option>
                                        {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-zinc-400 block mb-1">Cliente</label>
                                <input required value={formClient} onChange={e => setFormClient(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white" placeholder="Nombre del cliente" />
                            </div>
                            <div>
                                <label className="text-xs text-zinc-400 block mb-1">Teléfono (Opcional)</label>
                                <input value={formPhone} onChange={e => setFormPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white" placeholder="Ej: 7777-8888" />
                            </div>
                            <div>
                                <label className="text-xs text-zinc-400 block mb-1">Notas</label>
                                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white h-20 resize-none" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={closeModal} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-lg">Cancelar</button>
                                <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-lg">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
