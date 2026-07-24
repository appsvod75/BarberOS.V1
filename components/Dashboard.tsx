
import React, { useState } from 'react';
import { useBarber } from '../context/BarberContext';
import { POS } from './POS';
import { Reception } from './Reception';
import { QueueDisplay } from './QueueDisplay';
import { BarberDashboard } from './BarberDashboard';
import { Agenda } from './Agenda';
import { CashReport } from './CashReport_VERSION_BUENA';
import { InventoryManager } from './InventoryManager';
import { ClientManager } from './ClientManager';
import { CatalogManager } from './CatalogManager';
import { BranchManager } from './BranchManager';
import { StaffManager } from './StaffManager';
import { SettingsManager } from './SettingsManager';
import { SalesHistory } from './SalesHistory';
import { PromotionManager } from './PromotionManager';
import { ReportingDashboard } from './ReportingDashboard';
import {
  LogOut, Scissors, Tv, Users, Store, Package, Settings,
  DollarSign, ArrowLeft, Tag, Wrench, UserCog, Calendar, LayoutGrid, Clock, Zap,
  BarChart3, Download
} from 'lucide-react';

export const Dashboard = () => {
  const { currentUser, logout, config, installApp, isInstallable } = useBarber();

  // LÓGICA DE VISTA INICIAL SEGÚN ROL CON PERSISTENCIA
  const [view, setView] = useState<string>(() => {
    const savedView = localStorage.getItem('last_view');
    if (savedView) return savedView;

    if (currentUser?.role === 'cashier') return 'pos';
    if (currentUser?.role === 'barber') return 'barber_dash';
    if (currentUser?.role === 'reception') return 'reception';
    return 'menu';
  });

  const handleNavigate = (newView: string) => {
    setView(newView);
    localStorage.setItem('last_view', newView);
  };

  // Si no hay usuario (aún cargando), mostramos un loader básico para evitar crashes en componentes hijos
  if (!currentUser) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Iniciando BarberOS...</p>
        </div>
      </div>
    );
  }

  if (view === 'display') {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <QueueDisplay onClose={() => setView('menu')} />
      </div>
    );
  }

  const renderContent = () => {
    switch (view) {
      case 'pos': return <POS navigateView={handleNavigate} />;
      case 'reception': return <Reception navigateView={handleNavigate} />;
      case 'agenda': return <Agenda navigateView={handleNavigate} />;
      case 'cash_cut': return <CashReport navigateView={handleNavigate} />;
      case 'sales': return <SalesHistory navigateView={handleNavigate} />;
      case 'sales_pos': return <SalesHistory navigateView={handleNavigate} hideSummary />; // Modo cajero
      case 'inventory': return <InventoryManager />;
      case 'clients': return <ClientManager />;
      case 'products': return <CatalogManager />;
      case 'branches': return <BranchManager />;
      case 'staff': return <StaffManager />;
      case 'promotions': return <PromotionManager />;
      case 'reports': return <ReportingDashboard />;
      case 'config_tv': return <SettingsManager initialTab="tv" />;
      case 'config_master': return <SettingsManager initialTab="master" />;
      case 'barber_dash': return <BarberDashboard />;
      case 'menu':
      default:
        // Solo administradores pueden ver el menú de rejilla principal
        if (currentUser?.role === 'admin') {
          return <AdminGridMenu />;
        }
        // Si por alguna razón un no-admin termina aquí, lo mandamos a su vista base
        if (currentUser?.role === 'cashier') return <POS navigateView={handleNavigate} />;
        if (currentUser?.role === 'barber') return <BarberDashboard />;
        if (currentUser?.role === 'reception') return <Reception navigateView={handleNavigate} />;
        return <AdminGridMenu />;
    }
  };

  const AdminGridMenu = () => (
    <div className="p-6 max-w-7xl mx-auto animate-in zoom-in duration-200">
      <h2 className="text-2xl font-light text-zinc-400 mb-6">Hola, <span className="text-white font-bold">{currentUser?.name}</span>. ¿Qué deseas hacer hoy?</h2>

      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4 auto-rows-fr">
        <MenuButton onClick={() => handleNavigate('pos')} icon={<Store size={32} className="text-green-400" />} label="Caja / POS" color="hover:bg-red-600" />
        <MenuButton onClick={() => handleNavigate('reception')} icon={<Users size={32} className="text-blue-400" />} label="Recepción" color="hover:bg-blue-600" />
        <MenuButton onClick={() => handleNavigate('reports')} icon={<BarChart3 size={32} className="text-blue-500" />} label="Reportes Pro" color="hover:bg-blue-500" />
        <MenuButton onClick={() => handleNavigate('agenda')} icon={<Calendar size={32} className="text-violet-400" />} label="Agenda" color="hover:bg-violet-600" />
        <MenuButton onClick={() => handleNavigate('clients')} icon={<UserCog size={32} className="text-teal-400" />} label="Clientes" color="hover:bg-teal-600" />
        <MenuButton onClick={() => handleNavigate('products')} icon={<Tag size={32} className="text-pink-400" />} label="Productos" color="hover:bg-pink-600" />
        <MenuButton onClick={() => handleNavigate('inventory')} icon={<Package size={32} className="text-purple-400" />} label="Inventario" color="hover:bg-purple-600" />
        <MenuButton onClick={() => handleNavigate('promotions')} icon={<Zap size={32} className="text-yellow-400" />} label="Promociones" color="hover:bg-yellow-600" />
        <MenuButton onClick={() => handleNavigate('branches')} icon={<Store size={32} className="text-cyan-400" />} label="Sucursales" color="hover:bg-cyan-600" />
        <MenuButton onClick={() => handleNavigate('staff')} icon={<Users size={32} className="text-yellow-400" />} label="Equipo" color="hover:bg-yellow-600" />
        <MenuButton onClick={() => handleNavigate('sales')} icon={<Clock size={32} className="text-blue-400" />} label="Ventas" color="hover:bg-blue-800" />
        <MenuButton onClick={() => handleNavigate('cash_cut')} icon={<DollarSign size={32} className="text-emerald-400" />} label="Corte Caja" color="hover:bg-emerald-600" />
        <MenuButton onClick={() => handleNavigate('display')} icon={<Tv size={32} className="text-indigo-400" />} label="Pantalla TV" color="hover:bg-indigo-600" />
        <MenuButton onClick={() => handleNavigate('config_tv')} icon={<Wrench size={32} className="text-orange-400" />} label="Ajustes TV" color="hover:bg-orange-600" />
        <MenuButton onClick={() => handleNavigate('config_master')} icon={<Settings size={32} className="text-zinc-400" />} label="Configuración" color="hover:bg-zinc-600" />
      </div>
    </div>
  );

  const MenuButton = ({ onClick, icon, label, color }: any) => (
    <button onClick={onClick} className={`bg-zinc-800 group p-4 rounded-2xl border border-zinc-700 transition-all shadow-lg flex flex-col items-center justify-center gap-4 aspect-square ${color} hover:border-white/20`}>
      <div className="bg-zinc-900 group-hover:bg-white/20 p-4 rounded-full transition-colors">
        {React.cloneElement(icon, { className: `${icon.props.className} group-hover:text-white` })}
      </div>
      <span className="text-white font-bold text-sm sm:text-base">{label}</span>
    </button>
  );

  const showHeader = view !== 'display';
  const isUserAdmin = currentUser?.role === 'admin';

  return (
    <div className="h-screen flex flex-col bg-zinc-950 relative">
      {showHeader && (
        <header className="bg-zinc-900 border-b border-zinc-800 h-14 flex items-center justify-between px-6 sticky top-0 z-40 shadow-md">
          <div className="flex items-center gap-4">
            {/* Solo admins ven el botón de regresar al menú principal */}
            {view !== 'menu' && isUserAdmin && (
              <button onClick={() => handleNavigate('menu')} className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full text-zinc-300 hover:text-white transition-colors">
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center gap-3">
              {config.logoUrl ? <img src={config.logoUrl} alt="Logo" className="h-8 w-auto" /> : <div className="bg-red-600 p-1.5 rounded"><Scissors className="text-white" size={18} /></div>}
              <span className="font-bold text-base text-white hidden sm:block">{config.salonName}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isUserAdmin && (
              <div onClick={() => handleNavigate('menu')} className="hidden sm:flex items-center gap-2 text-zinc-400 hover:text-white cursor-pointer px-3 py-1 rounded-lg hover:bg-zinc-800">
                <LayoutGrid size={16} /> <span className="text-sm font-medium">Menú Principal</span>
              </div>
            )}
            {isUserAdmin && <div className="h-6 w-px bg-zinc-700 mx-2"></div>}
            {isInstallable && (
              <button
                onClick={installApp}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-purple-900/20 active:scale-95 transition-all animate-pulse"
              >
                <Download size={14} /> Instalar
              </button>
            )}
            <button onClick={logout} className="text-zinc-400 hover:text-red-500 flex items-center gap-2 text-sm font-medium ml-2">
              <LogOut size={16} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>
      )}
      <main className="flex-1 overflow-hidden">{renderContent()}</main>
    </div>
  );
};
