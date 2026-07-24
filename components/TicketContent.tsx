import React from 'react';
import { Sale, CatalogItem, AppConfig, PaymentMethod } from '../types';

interface TicketContentProps {
    sale: Sale;
    config: AppConfig;
    catalog: CatalogItem[];
}

const paymentMethods: Partial<Record<PaymentMethod, string>> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transf.',
    bitcoin: 'Bitcoin'
};

export const TicketContent: React.FC<TicketContentProps> = ({ sale, config, catalog }) => {
    return (
        <div className="bg-white text-black p-6 shadow-inner rounded-sm font-mono text-[11px] leading-tight flex flex-col">
            {config.logoUrl && (
                <div className="flex justify-center mb-2">
                    <img src={config.logoUrl} alt="Logo" className="max-h-16 w-auto object-contain" />
                </div>
            )}
            <div className="text-center font-black text-lg mb-2 uppercase tracking-tighter">{config.salonName}</div>
            <div className="text-center text-[8px] mb-4 border-b border-black border-dashed pb-2">
                {new Date(sale.timestamp).toLocaleString()}
            </div>

            <div className="space-y-1.5 mb-4">
                {(sale.items || []).map((item, i) => {
                    const catItem = catalog.find(x => x.id === item.itemId);
                    return (
                        <div key={i} className="flex flex-col mb-1 uppercase">
                            <div className="flex justify-between font-bold">
                                <span>{item.quantity}x {item.name}</span>
                                <span>${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            {catItem?.type === 'combo' && catItem.comboDefinition && (
                                <div className="pl-2 border-l border-zinc-200 text-[8px] italic opacity-70">
                                    {catItem.comboDefinition.map(subId => (
                                        <div key={subId}>• {catalog.find(x => x.id === subId)?.name}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="border-t border-black pt-2 space-y-1">
                <div className="flex justify-between uppercase text-[8px]">
                    <span>Subtotal</span>
                    <span>${(sale.subtotal || 0).toFixed(2)}</span>
                </div>
                {(sale.discount || 0) > 0 && (
                    <div className="flex justify-between uppercase text-[8px] font-bold italic">
                        <span>{sale.pointsUsed && sale.pointsUsed > 0 ? 'DESC. CANJE PUNTOS' : 'Descuento'}</span>
                        <span>-${(sale.discount || 0).toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between font-black text-[13px] uppercase pb-1">
                    <span>TOTAL</span>
                    <span>${(sale.total || 0).toFixed(2)}</span>
                </div>
            </div>

            <div className="border-t border-black border-dashed pt-2 space-y-1 mt-2">
                <div className="text-[9px] font-bold uppercase mb-1">Detalle de Pago:</div>
                {(sale.payments || []).map((p, idx) => (
                    <div key={idx} className="flex justify-between uppercase text-[9px]">
                        <span>{paymentMethods[p.method] || p.method}</span>
                        <span>${p.amount.toFixed(2)}</span>
                    </div>
                ))}
                <div className="flex justify-between uppercase font-black text-[10px] pt-1">
                    <span>RECIBIDO:</span>
                    <span>${sale.payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between uppercase font-black text-[10px]">
                    <span>CAMBIO:</span>
                    <span>${Math.max(0, sale.payments.reduce((sum, p) => sum + p.amount, 0) - sale.total).toFixed(2)}</span>
                </div>
            </div>

            <div className="mt-6 text-[8px] text-center italic uppercase font-bold opacity-70">
                {config.ticketFooter || '¡Gracias por tu visita!'}
            </div>
            <div className="mt-2 text-center text-[7px] font-mono opacity-40">
                Folio: {(sale.id || '').split('-')[0].toUpperCase()}
            </div>
        </div>
    );
};
