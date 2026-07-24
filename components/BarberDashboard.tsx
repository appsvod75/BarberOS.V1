
import React, { useState, useMemo } from 'react';
import { useBarber } from '../context/BarberContext';
import { Calendar as CalendarIcon, DollarSign, Scissors, Clock, Search, LogOut, CheckCircle, User, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

export const BarberDashboard = () => {
    const { currentUser, sales, logout, appointments } = useBarber();

    // --- STATE FOR CALENDAR & AGENDA ---
    const [selectedDate, setSelectedDate] = useState(() => {
        // Default to Today YYYY-MM-DD
        const d = new Date();
        return d.toISOString().split('T')[0];
    });

    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Date Range State for Historical Sales Query
    const [historyStartDate, setHistoryStartDate] = useState('');
    const [historyEndDate, setHistoryEndDate] = useState('');

    // --- CALENDAR LOGIC ---
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); // 0 = Sunday

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };
    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };
    const goToToday = () => {
        const today = new Date();
        setCurrentMonth(today);
        setSelectedDate(today.toISOString().split('T')[0]);
    };

    // Get all dates where THIS barber has appointments (for the dots)
    const appointmentDates = useMemo(() => {
        const dates = new Set<string>();
        appointments.forEach(a => {
            if (a.barberId === currentUser?.id && a.status !== 'cancelled') {
                dates.add(a.date);
            }
        });
        return dates;
    }, [appointments, currentUser]);

    // --- SELECTED DAY AGENDA ---
    const selectedAgenda = useMemo(() => {
        return appointments
            .filter(a => a.barberId === currentUser?.id && a.date === selectedDate && a.status !== 'cancelled')
            .sort((a, b) => a.time.localeCompare(b.time));
    }, [appointments, currentUser, selectedDate]);

    // --- TODAY'S STATS (REAL TIME) ---
    const mySales = useMemo(() => {
        return sales.filter(s => s.barberId === currentUser?.id);
    }, [sales, currentUser]);

    const todayStats = useMemo(() => {
        const todayStr = new Date().toDateString();
        const todays = mySales.filter(s => new Date(s.timestamp).toDateString() === todayStr);

        const totalMoney = todays.reduce((acc, s) => acc + s.total, 0);
        const totalServices = todays.reduce((acc, s) => acc + s.items.length, 0);

        return { sales: todays, totalMoney, totalServices };
    }, [mySales]);

    // --- HISTORICAL QUERY STATS ---
    const rangeStats = useMemo(() => {
        if (!historyStartDate || !historyEndDate) return null;

        const start = new Date(historyStartDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(historyEndDate);
        end.setHours(23, 59, 59, 999);

        const filtered = mySales.filter(s => {
            const t = new Date(s.timestamp);
            return t >= start && t <= end;
        });

        const totalMoney = filtered.reduce((acc, s) => acc + s.total, 0);
        const totalServices = filtered.reduce((acc, s) => acc + s.items.length, 0);

        return { sales: filtered, totalMoney, totalServices };
    }, [mySales, historyStartDate, historyEndDate]);

    // Helper to render calendar days
    const renderCalendarDays = () => {
        const days = [];
        // Empty slots for days before the 1st
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-10 w-full"></div>);
        }

        // Actual days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const hasAppt = appointmentDates.has(dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];

            days.push(
                <button
                    key={d}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`h-10 w-full rounded-lg flex flex-col items-center justify-center relative transition-all ${isSelected
                            ? 'bg-violet-600 text-white font-bold shadow-lg shadow-violet-900/40'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        } ${isToday && !isSelected ? 'border border-zinc-700' : ''}`}
                >
                    <span className="text-sm">{d}</span>
                    {hasAppt && (
                        <span className={`w-1.5 h-1.5 rounded-full absolute bottom-1.5 ${isSelected ? 'bg-white' : 'bg-violet-500'}`}></span>
                    )}
                </button>
            );
        }
        return days;
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">

            {/* HEADER */}
            <header className="bg-zinc-900 border-b border-zinc-800 h-16 flex items-center justify-between px-4 sticky top-0 z-40 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-1.5 rounded shadow-lg shadow-blue-900/50">
                        <Scissors className="text-white" size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-white tracking-tight leading-none">Hola, {currentUser?.name?.split(' ')[0] || 'Gestor'}</div>
                        <div className="text-[10px] text-zinc-400 font-mono uppercase">Panel de Barbero</div>
                    </div>
                </div>
                <button onClick={logout} className="text-zinc-400 hover:text-red-500 flex items-center gap-2 text-sm font-medium transition-colors">
                    <LogOut size={18} />
                </button>
            </header>

            <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full space-y-8">

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* COLUMN 1: CALENDARIO & AGENDA (7 Cols) */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* CALENDAR WIDGET */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-white font-bold flex items-center gap-2 capitalize">
                                    <CalendarIcon className="text-violet-500" size={18} />
                                    {currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                                </h2>
                                <div className="flex gap-1">
                                    <button onClick={prevMonth} className="p-1 hover:bg-zinc-800 rounded text-zinc-400"><ChevronLeft size={20} /></button>
                                    <button onClick={goToToday} className="px-2 text-xs font-bold text-zinc-500 hover:text-white uppercase">Hoy</button>
                                    <button onClick={nextMonth} className="p-1 hover:bg-zinc-800 rounded text-zinc-400"><ChevronRight size={20} /></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 mb-2 text-center">
                                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                                    <div key={i} className="text-[10px] font-bold text-zinc-600 uppercase">{d}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                                {renderCalendarDays()}
                            </div>
                        </div>

                        {/* AGENDA LIST DETAIL */}
                        <div>
                            <h3 className="text-zinc-400 font-bold flex items-center justify-between uppercase text-xs tracking-widest border-b border-zinc-800 pb-2 mb-4">
                                <span>
                                    Citas del {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </span>
                                <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-[10px]">{selectedAgenda.length}</span>
                            </h3>

                            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {selectedAgenda.length === 0 ? (
                                    <div className="bg-zinc-900/30 border border-zinc-800/50 border-dashed rounded-xl p-8 text-center text-zinc-600">
                                        <Clock size={32} className="mx-auto mb-2 opacity-30" />
                                        <p>Día libre de citas.</p>
                                    </div>
                                ) : (
                                    selectedAgenda.map(appt => {
                                        const isCompleted = appt.status === 'completed';
                                        return (
                                            <div key={appt.id} className={`p-4 rounded-xl border flex justify-between items-center transition-all ${isCompleted ? 'bg-zinc-900/50 border-zinc-800 opacity-60' : 'bg-zinc-900 border-zinc-700 hover:border-violet-500'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-center min-w-[50px] bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                                                        <div className="text-lg font-black text-white leading-none">{appt.time}</div>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white flex items-center gap-2">
                                                            {appt.clientName}
                                                            {isCompleted && <CheckCircle size={14} className="text-green-500" />}
                                                        </div>
                                                        <div className="text-xs text-zinc-400 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                                                            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{appt.serviceType}</span>
                                                            {appt.clientPhone && <span className="flex items-center gap-1"><MapPin size={10} /> {appt.clientPhone}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${isCompleted ? 'bg-green-900 text-green-400' : 'bg-violet-900 text-violet-300'}`}>
                                                        {isCompleted ? 'Atendido' : 'Agendado'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 2: PRODUCCIÓN (5 Cols) */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* REAL TIME STATS */}
                        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-xl">
                            <h2 className="text-zinc-500 font-bold flex items-center gap-2 uppercase text-xs tracking-widest mb-4">
                                <ActivityDot /> Producción Hoy
                            </h2>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-black/40 p-3 rounded-lg border border-zinc-800">
                                    <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Total Generado</div>
                                    <div className="text-2xl font-black text-white text-green-400">${todayStats.totalMoney.toFixed(2)}</div>
                                </div>
                                <div className="bg-black/40 p-3 rounded-lg border border-zinc-800">
                                    <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Servicios</div>
                                    <div className="text-2xl font-black text-white text-blue-400">{todayStats.totalServices}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="text-xs text-zinc-500 font-bold uppercase mb-2">Últimos trabajos</div>
                                {todayStats.sales.length === 0 ? (
                                    <p className="text-center text-zinc-600 text-xs italic py-2">Sin actividad hoy.</p>
                                ) : (
                                    <div className="space-y-1">
                                        {todayStats.sales.slice().reverse().slice(0, 5).map(sale => (
                                            <div key={sale.id} className="flex justify-between items-center text-xs p-2 hover:bg-zinc-800 rounded transition-colors">
                                                <span className="text-zinc-300 truncate w-2/3">{sale.items.map(i => i.name).join(', ')}</span>
                                                <span className="font-mono text-green-500 font-bold">+${sale.total.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* HISTORICAL QUERY */}
                        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                            <div className="p-4 border-b border-zinc-800 bg-zinc-900">
                                <h2 className="text-white font-bold flex items-center gap-2 text-sm">
                                    <Search size={16} className="text-zinc-400" /> Consultar Historial
                                </h2>
                            </div>

                            <div className="p-4">
                                <div className="space-y-3 mb-4">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold">Desde</label>
                                        <input
                                            type="date"
                                            value={historyStartDate}
                                            onChange={(e) => setHistoryStartDate(e.target.value)}
                                            className="w-full bg-black border border-zinc-700 rounded p-2 text-white text-xs outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-bold">Hasta</label>
                                        <input
                                            type="date"
                                            value={historyEndDate}
                                            onChange={(e) => setHistoryEndDate(e.target.value)}
                                            className="w-full bg-black border border-zinc-700 rounded p-2 text-white text-xs outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* RESULTS */}
                                {historyStartDate && historyEndDate && rangeStats ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-zinc-400 text-xs">Total Período</span>
                                            <span className="text-lg font-black text-white">${rangeStats.totalMoney.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-zinc-500">Servicios</span>
                                            <span className="text-zinc-300 font-bold">{rangeStats.totalServices}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-2 text-zinc-600 text-xs">
                                        Selecciona fechas para calcular.
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                </div>
            </main>
        </div>
    );
};

const ActivityDot = () => (
    <span className="relative flex h-2 w-2 mr-1">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
    </span>
);
