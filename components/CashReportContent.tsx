import React from 'react';
import { AppConfig } from '../types';

interface CashReportContentProps {
    stats: any;
    config: AppConfig;
}

export const CashReportContent: React.FC<CashReportContentProps> = ({ stats, config }) => {
    return (
        <div className="bg-white text-black p-8 w-full font-mono text-[10px] leading-tight flex flex-col justify-between max-w-[280px]">
            <div>
                <div className="border-b-2 border-black border-dashed pb-4 mb-4 text-center">
                    {config.logoUrl && (
                        <img src={config.logoUrl} alt="Logo" className="h-10 mx-auto mb-2 grayscale" />
                    )}
                    <div className="text-[11px] font-black uppercase leading-none">{config.salonName}</div>
                    <div className="text-[8px] opacity-70 mt-1 uppercase tracking-tighter">FINANZAS CORTE Z</div>
                    <div className="text-[8px] opacity-70 uppercase">
                        {new Date().toLocaleString()}
                    </div>
                </div>

                <div className="space-y-1.5 mb-6 text-[11px]">
                    <div className="flex justify-between font-black border-b border-black pb-1 mb-1">
                        <span>CONCEPTO</span>
                        <span>VALOR</span>
                    </div>
                    <div className="flex justify-between">
                        <span>BASE INICIAL</span>
                        <span>${stats.opening.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>VENTAS CASH</span>
                        <span>${stats.cash.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>V. TARJETA</span>
                        <span>${stats.card.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black pt-1 border-t border-black">
                        <span>BRUTO TOTAL</span>
                        <span>${stats.totalSales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black text-[12px] pt-1 border-t-2 border-black border-double uppercase italic">
                        <span>CAJA TOTAL</span>
                        <span>${stats.totalInDrawer.toFixed(2)}</span>
                    </div>
                </div>

                <div className="space-y-1.5 mb-6 text-[10px]">
                    <div className="flex justify-between font-black border-b border-black/10 pb-1 mb-1">
                        <span>CONTROLES</span>
                    </div>
                    <div className="flex justify-between">
                        <span>CORTE ({stats.servicesCount})</span>
                        <span>${stats.servicesTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>RETAIL ({stats.productsCount})</span>
                        <span>${stats.productsTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                        <span>COMBOS ({stats.combosCount})</span>
                        <span>${stats.combosTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="border-t-2 border-black border-dashed pt-4 text-center shrink-0">
                <div className="text-[8px] font-black uppercase mb-1">
                    AUDIT: {stats.openedBy ? stats.openedBy.split(' ')[0] : '---'}
                </div>
                <div className="text-[7px] opacity-40 uppercase tracking-tighter italic">
                    Validado BarberOS v4.0
                </div>
            </div>
        </div>
    );
};
