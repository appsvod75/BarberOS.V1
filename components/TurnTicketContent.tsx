import React from 'react';
import { Ticket, AppConfig } from '../types';

interface TurnTicketContentProps {
    ticket: Ticket;
    config: AppConfig;
}

export const TurnTicketContent: React.FC<TurnTicketContentProps> = ({ ticket, config }) => {
    return (
        <div className="bg-white text-black p-8 flex flex-col items-center text-center pt-10 pb-6 font-mono">
            <h3 className="font-black text-2xl uppercase tracking-widest mb-2">{config.salonName}</h3>
            <p className="text-xs font-mono text-zinc-500 mb-6 border-b border-black pb-2 w-full text-center">
                {new Date(ticket.createdAt).toLocaleDateString()} - {new Date(ticket.createdAt).toLocaleTimeString()}
            </p>
            <div className="text-xs font-bold uppercase text-zinc-400 mb-1">Tu Turno</div>
            <div className="text-7xl font-black tracking-tighter leading-none mb-4">{ticket.fullCode}</div>
            <div className="border-t-2 border-black border-dashed w-full my-4"></div>
            <p className="font-bold text-xl mb-1">{ticket.clientName}</p>
            <p className="text-zinc-600 text-sm">Por favor espera tu llamado.</p>
        </div>
    );
};
