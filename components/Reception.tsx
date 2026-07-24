import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useBarber } from '../context/BarberContext';
import { TurnTicketContent } from './TurnTicketContent';
import { printReceipt } from '../services/printService';
import { Scissors, UserPlus, User, Search, ArrowRight, ArrowUp, Printer, Clock, CheckCircle, Users, AlertCircle, Mail, DollarSign, LogOut, Gift, UserCheck } from 'lucide-react';
// Added Client to the imports from types.ts
import { TicketType, Ticket, User as UserType, Client } from '../types';
import { useDragScroll } from '../hooks/useDragScroll';

interface WaitingTicketItemProps {
  ticket: Ticket;
  barbers: UserType[];
  onAssign: (ticketId: string, barberId: string, chair: string) => void;
}

const WaitingTicketItem: React.FC<WaitingTicketItemProps> = ({ ticket, barbers, onAssign }) => {
  const [localBarber, setLocalBarber] = useState('');
  const [localChair, setLocalChair] = useState('1');

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex flex-col gap-3 shadow-md hover:border-blue-500/50 transition-colors">
      <div className="text-center border-b border-zinc-800 pb-2">
        <div className="text-3xl font-black text-white tracking-tighter">{ticket.fullCode}</div>
        <div className="font-bold text-zinc-300 text-sm truncate w-full" title={ticket.clientName}>{ticket.clientName}</div>
        <div className="text-[10px] text-zinc-500 mt-1 flex items-center justify-center gap-1"><Clock size={10} /> {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      <div className="flex flex-col gap-2">
        <select className={`w-full bg-zinc-800 text-white text-xs p-2 rounded border outline-none focus:border-blue-500 ${!localBarber ? 'border-zinc-600' : 'border-blue-500'}`} onChange={(e) => setLocalBarber(e.target.value)} value={localBarber}>
          <option value="" disabled>Seleccionar Barbero...</option>
          {barbers.map(b => <option key={b.id} value={b.id}>{b.name?.split(' ')[0] || 'Barbero'}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="number" min="1" className="w-full bg-zinc-800 text-white text-xs p-2 text-center rounded border border-zinc-600 outline-none font-bold" placeholder="Silla" value={localChair} onChange={(e) => { if (e.target.value === '' || parseInt(e.target.value) > 0) setLocalChair(e.target.value); }} />
          <button onClick={() => onAssign(ticket.id, localBarber, localChair)} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded shadow-lg"><ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  );
};

interface ReceptionProps {
  navigateView?: (view: string) => void;
  currentView?: string;
}

export const Reception = ({ navigateView }: ReceptionProps) => {
  const { createTicket, clients, addClient, tickets, users, updateTicketStatus, currentUser, branches, config, logout } = useBarber();
  const clientSearchScroll = useDragScroll();
  const queueScroll = useDragScroll();
  const [view, setView] = useState<'ticket' | 'newClient'>('ticket');
  const [mode, setMode] = useState<'checkin' | 'manage'>('checkin');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [referrerSearch, setReferrerSearch] = useState('');
  const [selectedReferrerId, setSelectedReferrerId] = useState<string | undefined>(undefined);

  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState<Ticket | null>(null);
  const [notification, setNotification] = useState<{ type: 'error' | 'success', msg: string } | null>(null);

  const currentBranchId = currentUser?.branchId || branches[0]?.id;
  const branchName = branches.find(b => b.id === currentBranchId)?.name;

  const waitingTickets = tickets.filter(t => t.status === 'waiting' && t.branchId === currentBranchId);
  const activeBarbers = users.filter(u => u.role === 'barber' && u.active !== false && u.branchId === currentBranchId);

  const filteredClients = clientSearch.length > 0 ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())) : [];
  const suggestNewClient = clientSearch.length > 2 && filteredClients.length === 0 && !selectedClient;

  const filteredReferrers = filteredReferrersForNewClient(clients, referrerSearch);

  // Added missing Client type to function parameter
  function filteredReferrersForNewClient(clients: Client[], search: string) {
    return search.length > 1 ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : [];
  }

  const showNotify = (type: 'error' | 'success', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fix: handleCreateTicket must be async to await createTicket and avoid Promise assignment error
  const handleCreateTicket = async (type: TicketType) => {
    const clientName = selectedClient ? clients.find(c => c.id === selectedClient)?.name || "Cliente" : (clientSearch || "Visitante");
    const newTicket = await createTicket(type, clientName, selectedClient || undefined);
    if (newTicket) { setGeneratedTicket(newTicket); setShowTicketModal(true); }
    setClientSearch(''); setSelectedClient(null);
  };

  const handleRegisterClient = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient = {
      id: crypto.randomUUID(),
      name,
      phone,
      email,
      visits: 1,
      birthDate: birthDate || undefined,
      referredBy: selectedReferrerId
    };
    addClient(newClient);
    if (selectedReferrerId && config.loyalty?.referralBonus) {
      showNotify('success', `Cliente creado! Puntos bono asignados al padrino.`);
    }
    setName(''); setPhone(''); setEmail(''); setBirthDate(''); setReferrerSearch(''); setSelectedReferrerId(undefined);
    setView('ticket');
    setSelectedClient(newClient.id);
    setClientSearch(newClient.name);
  };

  const handleCallTicket = (ticketId: string, assignedBarberId: string, assignedChair: string) => {
    if (!assignedBarberId) return showNotify('error', '⚠️ Falta Barbero.');
    if (!assignedChair || parseInt(assignedChair) < 1) return showNotify('error', '⚠️ Silla inválida.');
    updateTicketStatus(ticketId, 'serving', assignedBarberId, `Silla ${assignedChair}`);
    showNotify('success', 'Asignado.');
  };

  const handlePrint = () => {
    printReceipt('printable-receipt');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto h-full flex flex-col relative">
      {notification && <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 font-bold border-2 ${notification.type === 'error' ? 'bg-red-900/90 text-white border-red-500' : 'bg-green-600/90 text-white border-green-400'}`}>{notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}{notification.msg}</div>}

      {currentUser?.role !== 'admin' && (
        <div className="flex justify-between items-center mb-6 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg"><User className="text-white" size={20} /></div>
            <div>
              <h1 className="text-xl font-bold text-white">Recepción</h1>
              <p className="text-xs text-zinc-500">Hola, {currentUser?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-zinc-800 px-3 py-1 rounded text-xs font-bold text-zinc-400 border border-zinc-700">📍 {branchName}</div>
            {currentUser?.canDoPos && navigateView && (
              <button onClick={() => navigateView('pos')} className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg"><DollarSign size={16} /> Ir a Caja</button>
            )}
            <button onClick={logout} className="p-2 bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white rounded-lg transition-colors" title="Salir"><LogOut size={18} /></button>
          </div>
        </div>
      )}

      {currentUser?.role === 'admin' && (
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-zinc-800 pb-4 gap-4">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3"><User className="text-zinc-400" /> Recepción</h1>
          <div className="absolute top-0 right-4 bg-zinc-800 px-3 py-1 rounded-b-lg text-xs font-bold text-zinc-400 border border-t-0 border-zinc-700 shadow-md z-10">📍 {branchName}</div>
        </div>
      )}

      <div className="flex justify-center mb-6">
        <div className="flex bg-zinc-800 rounded-lg p-1 shadow-lg border border-zinc-700">
          <button onClick={() => setMode('checkin')} className={`px-6 py-2 rounded-md font-bold flex items-center gap-2 transition-all ${mode === 'checkin' ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}><Printer size={18} /> Nuevo Turno</button>
          <button onClick={() => setMode('manage')} className={`px-6 py-2 rounded-md font-bold flex items-center gap-2 transition-all ${mode === 'manage' ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}><Clock size={18} /> Gestionar ({waitingTickets.length})</button>
        </div>
      </div>

      {mode === 'checkin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 shadow-lg relative overflow-hidden">
            <div className="flex gap-4 mb-6 relative z-10">
              <button onClick={() => setView('ticket')} className={`flex-1 py-3 rounded-lg font-bold ${view === 'ticket' ? 'bg-zinc-600 text-white' : 'bg-zinc-900 text-zinc-500'}`}>Cliente Existente</button>
              <button onClick={() => { if (clientSearch && !selectedClient) setName(clientSearch); setView('newClient'); }} className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${view === 'newClient' ? 'bg-zinc-600 text-white' : suggestNewClient ? 'bg-yellow-600 text-white animate-pulse' : 'bg-zinc-900 text-zinc-500'}`}>{suggestNewClient ? <><UserPlus size={18} /> Crear "{clientSearch}"</> : 'Nuevo Cliente'}</button>
            </div>
            {view === 'ticket' ? (
              <div className="relative min-h-[300px]">
                <label className="block text-sm text-zinc-400 mb-2 font-bold">Buscar Cliente</label>
                <div className="relative">
                  <Search className="absolute left-4 top-4 text-zinc-500" size={20} />
                  <input type="text" value={clientSearch} onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); }} className="w-full bg-zinc-900 border border-zinc-600 focus:border-red-500 rounded-xl p-4 pl-12 text-white text-lg outline-none" placeholder="Escribe el nombre aquí..." autoFocus />
                  {selectedClient && <button onClick={() => { setClientSearch(''); setSelectedClient(null); }} className="absolute right-4 top-4 text-zinc-500">✕</button>}
                </div>
                <div
                  ref={clientSearchScroll.ref}
                  {...clientSearchScroll.props}
                  className="mt-2 space-y-2 max-h-[250px] overflow-y-auto pr-1 hide-scrollbar"
                >
                  {filteredClients.map(client => (
                    <div key={client.id} onClick={() => { setSelectedClient(client.id); setClientSearch(client.name); }} className="p-4 bg-zinc-900/50 hover:bg-zinc-700 cursor-pointer border border-zinc-700/50 rounded-lg flex justify-between items-center">
                      <div><div className="font-bold text-white text-lg">{client.name}</div><div className="text-sm text-zinc-500">{client.phone} • {client.visits} visitas</div></div><ArrowRight className="text-zinc-600" />
                    </div>
                  ))}
                  {suggestNewClient && <div className="text-center py-8 flex flex-col items-center text-yellow-500 animate-pulse"><ArrowUp className="animate-bounce" size={32} /><span className="font-bold">Presiona crear arriba</span></div>}
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegisterClient} className="space-y-4 py-4">
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-600 rounded-lg p-3 text-white" placeholder="Nombre completo" autoFocus />
                <div className="grid grid-cols-2 gap-3">
                  <input value={phone} onChange={e => /^\d*$/.test(e.target.value) && setPhone(e.target.value)} className="w-full bg-zinc-900 border border-zinc-600 rounded-lg p-3 text-white" type="tel" placeholder="Teléfono" />
                  <input value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-600 rounded-lg p-3 text-white" type="email" placeholder="Email (Opcional)" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase block mb-1">Fecha Cumpleaños</label>
                    <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-600 rounded-lg p-3 text-white text-sm" />
                  </div>
                  <div className="relative">
                    <label className="text-[10px] text-blue-500 uppercase block mb-1">Referido Por (Padrino)</label>
                    <input value={referrerSearch} onChange={e => { setReferrerSearch(e.target.value); setSelectedReferrerId(undefined); }} className="w-full bg-zinc-900 border border-blue-900/50 rounded-lg p-3 text-white text-sm" placeholder="Buscar cliente..." />
                    {selectedReferrerId && <CheckCircle size={16} className="absolute right-3 top-9 text-green-500" />}
                    {referrerSearch && !selectedReferrerId && (
                      <div className="absolute top-full left-0 w-full bg-zinc-800 border border-zinc-600 mt-1 rounded-lg z-50 max-h-32 overflow-y-auto">
                        {filteredReferrers.map(c => (
                          <div key={c.id} onClick={() => { setSelectedReferrerId(c.id); setReferrerSearch(c.name); }} className="p-2 hover:bg-zinc-700 cursor-pointer text-xs text-white">
                            {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-2 flex gap-3"><button type="button" onClick={() => setView('ticket')} className="flex-1 bg-zinc-700 text-white font-bold py-3 rounded-lg">Cancelar</button><button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"><UserPlus size={20} /> Guardar</button></div>
              </form>
            )}
          </div>
          <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 flex flex-col justify-between shadow-lg">
            <div className="mb-6 border-b border-zinc-700 pb-4"><h2 className="text-xl font-bold text-white mb-1">Generar Turno</h2><p className="text-zinc-400 text-sm">Para: <span className="text-white font-bold text-lg">{selectedClient ? clients.find(c => c.id === selectedClient)?.name : (clientSearch || "Visitante")}</span></p></div>
            <div className="grid grid-cols-2 gap-4 h-full">
              <button onClick={() => handleCreateTicket('C')} className="bg-zinc-700 hover:bg-red-600 rounded-2xl p-6 flex flex-col items-center justify-center gap-4"><Scissors size={56} className="text-zinc-400" /><span className="text-2xl font-bold text-white">CORTE (C)</span></button>
              <button onClick={() => handleCreateTicket('B')} className="bg-zinc-700 hover:bg-blue-600 rounded-2xl p-6 flex flex-col items-center justify-center gap-4"><div className="text-5xl">🧔</div><span className="text-2xl font-bold text-white">BARBA (B)</span></button>
              <button onClick={() => handleCreateTicket('D')} className="bg-zinc-700 hover:bg-purple-600 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 col-span-2"><div className="flex gap-3 text-5xl text-zinc-400 items-center"><Scissors className="w-12 h-12" /> + 🧔</div><span className="text-2xl font-bold text-white">AMBOS (D)</span></button>
            </div>
          </div>
        </div>
      )}

      {mode === 'manage' && (
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 flex-1 overflow-hidden flex flex-col shadow-xl">
          <div className="p-4 bg-zinc-900/50 border-b border-zinc-700 flex justify-between items-center"><h2 className="text-xl font-bold text-white flex items-center gap-2"><Clock size={20} /> Cola de Espera</h2><span className="text-zinc-400 text-sm bg-black/50 px-3 py-1 rounded-full">{waitingTickets.length} Personas</span></div>
          <div
            ref={queueScroll.ref}
            {...queueScroll.props}
            className="flex-1 overflow-y-auto p-3 md:p-4 hide-scrollbar"
          >
            {waitingTickets.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-50"><Users size={64} className="mb-4" /><p className="text-xl font-medium">No hay clientes en espera</p></div> : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{waitingTickets.map(ticket => <WaitingTicketItem key={ticket.id} ticket={ticket} barbers={activeBarbers} onAssign={handleCallTicket} />)}</div>
            )}
          </div>
        </div>
      )}

      {showTicketModal && generatedTicket && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black w-full max-w-[320px] shadow-2xl transform relative">
            <div className="flex flex-col items-center">
              <TurnTicketContent ticket={generatedTicket} config={config} />
            </div>
            <div className="p-4 pt-0 flex flex-col gap-2 no-print">
              <button
                onClick={() => printReceipt('printable-receipt')}
                className="w-full bg-zinc-800 text-white font-bold py-3 rounded flex items-center justify-center gap-2"
              >
                <Printer size={18} /> IMPRIMIR
              </button>
              <button onClick={() => setShowTicketModal(false)} className="w-full border-2 border-zinc-200 text-zinc-500 font-bold py-3 rounded">CERRAR</button>
            </div>

            {/* PORTAL DE IMPRESIÓN EXTERNO AL MODAL */}
            {createPortal(
              <div id="printable-receipt" className="print-area hidden">
                <TurnTicketContent ticket={generatedTicket} config={config} />
              </div>,
              document.body
            )}

          </div>
        </div>
      )}

    </div>
  );
};