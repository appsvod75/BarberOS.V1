import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    title: string;
    message: string;
}

export const useToast = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (type: ToastType, title: string, message: string) => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => removeToast(id), 5000); // Auto-dismiss
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return { toasts, addToast, removeToast };
};

// Componente global para renderizar los toasts
export const ToastContainer = ({ toasts, removeToast }: { toasts: ToastMessage[], removeToast: (id: string) => void }) => {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className={`pointer-events-auto w-80 p-4 rounded-xl border shadow-2xl flex gap-3 animate-in slide-in-from-right-10 fade-in duration-300 ${t.type === 'success' ? 'bg-zinc-900 border-emerald-500/50 text-white' :
                        t.type === 'error' ? 'bg-zinc-900 border-red-500/50 text-white' :
                            t.type === 'warning' ? 'bg-zinc-900 border-amber-500/50 text-white' :
                                'bg-zinc-900 border-blue-500/50 text-white'
                    }`}>
                    <div className={`shrink-0 ${t.type === 'success' ? 'text-emerald-500' :
                            t.type === 'error' ? 'text-red-500' :
                                t.type === 'warning' ? 'text-amber-500' :
                                    'text-blue-500'
                        }`}>
                        {t.type === 'success' && <CheckCircle size={24} />}
                        {t.type === 'error' && <AlertOctagon size={24} />}
                        {t.type === 'warning' && <AlertTriangle size={24} />}
                        {t.type === 'info' && <Info size={24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm uppercase tracking-wide">{t.title}</h4>
                        <p className="text-xs text-zinc-400 mt-1 break-words leading-relaxed">{t.message}</p>
                    </div>
                    <button onClick={() => removeToast(t.id)} className="text-zinc-500 hover:text-white transition-colors self-start">
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};
