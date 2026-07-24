import React, { useState, useEffect } from 'react';
import { useBarber } from '../context/BarberContext';
import { Scissors, AlertTriangle, Lock, Timer, ShieldAlert } from 'lucide-react';

export const Login = () => {
  const { login, config } = useBarber();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [warning, setWarning] = useState('');

  // Security State
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Constants
  const MAX_ATTEMPTS = 5; // Más intentos para producción
  const BLOCK_DURATION = 60; // segundos

  useEffect(() => {
    const blockUntil = localStorage.getItem('login_block_until');
    if (blockUntil) {
      const remaining = Math.ceil((parseInt(blockUntil) - Date.now()) / 1000);
      if (remaining > 0) {
        setIsBlocked(true);
        setTimeLeft(remaining);
      } else {
        localStorage.removeItem('login_block_until');
      }
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (isBlocked && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsBlocked(false);
            setAttempts(0);
            localStorage.removeItem('login_block_until');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBlocked, timeLeft]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;

    const success = await login(pin);

    if (success) {
      setError(false);
      setAttempts(0);
      setPin('');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');

      if (newAttempts >= MAX_ATTEMPTS) {
        setIsBlocked(true);
        setTimeLeft(BLOCK_DURATION);
        const blockUntil = Date.now() + (BLOCK_DURATION * 1000);
        localStorage.setItem('login_block_until', blockUntil.toString());
        setError(false);
      } else {
        setError(true);
        setTimeout(() => setError(false), 3000);
      }
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isBlocked) return;
    const val = e.target.value;
    if (/^\d*$/.test(val)) {
      setPin(val);
      setError(false);
      setWarning('');
    } else {
      setWarning('⚠️ Solo números');
      setTimeout(() => setWarning(''), 2000);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden font-inter">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-zinc-800/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-sm p-10 bg-zinc-900/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-zinc-800 z-10 relative">
        <div className="flex flex-col items-center mb-10">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt="Logo" className="h-20 w-auto mb-6 object-contain drop-shadow-2xl" />
          ) : (
            <div className="bg-zinc-800 p-5 rounded-3xl mb-6 shadow-xl ring-1 ring-zinc-700">
              <Lock size={40} className="text-white" />
            </div>
          )}
          <h1 className="text-2xl font-black tracking-tighter text-center text-white uppercase">{config.salonName || 'BarberOS Pro'}</h1>
          <p className="text-zinc-500 mt-2 text-[10px] font-black uppercase tracking-[0.3em]">Acceso Restringido</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="relative">
            <input
              type="password"
              value={pin}
              onChange={handlePinChange}
              disabled={isBlocked}
              className={`w-full text-center text-4xl tracking-[0.4em] py-6 bg-black border rounded-2xl focus:outline-none transition-all shadow-inner font-mono ${isBlocked
                  ? 'border-red-900/50 text-zinc-700'
                  : error
                    ? 'border-red-500 ring-4 ring-red-500/10'
                    : 'border-zinc-800 focus:border-white focus:ring-4 focus:ring-white/5'
                }`}
              maxLength={6}
              placeholder="••••••"
              autoFocus
            />

            <div className="absolute -bottom-7 left-0 w-full text-center h-6">
              {warning && <span className="text-yellow-500 text-[10px] font-black uppercase tracking-widest">{warning}</span>}
              {error && !isBlocked && <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">PIN Incorrecto</span>}
            </div>
          </div>

          {isBlocked ? (
            <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-6 text-center">
              <Timer className="text-red-500 mx-auto mb-2" size={24} />
              <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">Sistema Bloqueado</p>
              <p className="text-white font-mono text-2xl mt-1 font-black">{timeLeft}s</p>
            </div>
          ) : (
            <button
              type="submit"
              disabled={pin.length < 4}
              className="w-full py-5 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black rounded-2xl transition-all shadow-xl active:scale-[0.97] uppercase text-xs tracking-widest"
            >
              Entrar
            </button>
          )}
        </form>

        <div className="mt-12 pt-8 border-t border-zinc-800/50 text-center">
          <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-[0.4em]">Enterprise Edition v4.0</p>
        </div>
      </div>
    </div>
  );
};