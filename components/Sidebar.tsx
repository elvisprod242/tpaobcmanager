
import React from 'react';
import { AppView, User } from '../types';
import { LayoutDashboard, Users, Truck, FileText, AlertTriangle, MessageSquare, Briefcase, X, Key, ShieldCheck, Target, Book, Clock, Timer, Coffee, ClipboardCheck, BarChart2, Gavel, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
    currentView: AppView;
    onChangeView: (view: AppView) => void;
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, onClose, currentUser }) => {
    const menuItems = [
        { id: AppView.DASHBOARD, label: 'Tableau de bord', icon: LayoutDashboard },
        { id: AppView.PARTNERS, label: 'Partenaires', icon: Briefcase },
        { id: AppView.OBC_KEYS, label: 'Clés OBC', icon: Key },
        { id: AppView.INVARIANTS, label: 'Invariants', icon: ShieldCheck },
        { id: AppView.OBJECTIVES, label: 'Objectifs', icon: Target },
        { id: AppView.KPI, label: 'Tableau KPI', icon: BarChart2 },
        { id: AppView.SCP, label: 'SCP - Sanctions', icon: Gavel },
        { id: AppView.PROCEDURES, label: 'Procédures', icon: Book },
        { id: AppView.CABIN_CONTROL, label: 'Contrôle Cabine', icon: ClipboardCheck },
        { id: AppView.DRIVERS, label: 'Conducteurs', icon: Users },
        { id: AppView.VEHICLES, label: 'Véhicules', icon: Truck },
        { id: AppView.REPORTS, label: 'Rapports', icon: FileText },
        { id: AppView.WORK_TIME, label: 'Temps de Travail', icon: Clock },
        { id: AppView.DRIVING_TIME, label: 'Temps de Conduite', icon: Timer },
        { id: AppView.REST_TIME, label: 'Temps de Repos', icon: Coffee },
        { id: AppView.INFRACTIONS, label: 'Infractions', icon: AlertTriangle },
        { id: AppView.COMMUNICATION, label: 'Communication', icon: MessageSquare },
        { id: AppView.SETTINGS, label: 'Paramètres', icon: Settings },
    ];

    const getRoleLabel = (role?: string) => {
        switch (role) {
            case 'admin': return 'Administrateur';
            case 'obc': return 'OBC / Manager';
            case 'directeur': return 'Directeur Général';
            default: return 'Utilisateur';
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div 
                className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 flex flex-col 
                bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100
                dark:from-slate-950 dark:to-slate-950 dark:border-r dark:border-slate-800
                transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)
                w-[280px] lg:w-64 lg:static lg:h-screen lg:shrink-0 lg:translate-x-0 shadow-2xl lg:shadow-none
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Header - Fluid, no hard border */}
                <div className="p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Logo Container - Blanc pour assurer la lisibilité du logo TPA */}
                        <div className="bg-white p-1.5 rounded-xl shadow-lg shadow-blue-600/20 h-10 w-10 flex items-center justify-center">
                            <img src="/logo.jpg" alt="TPA" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <span className="text-xl font-bold tracking-tight text-white block leading-none">TPA</span>
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Manager</span>
                        </div>
                    </div>
                    {/* Close button for mobile */}
                    <button 
                        onClick={onClose}
                        className="lg:hidden text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation - Fluid scroll */}
                <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onChangeView(item.id);
                                    onClose(); // Close sidebar on mobile after selection
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden
                                    ${isActive 
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }
                                `}
                            >
                                <Icon 
                                    size={18}
                                    className={`transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} 
                                />
                                <span className="relative z-10">{item.label}</span>
                                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-30 animate-shimmer" />}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer User - Floating card style */}
                <div className="p-4 shrink-0">
                    <div 
                        className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors backdrop-blur-sm group"
                        onClick={() => { onChangeView(AppView.SETTINGS); onClose(); }}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner ring-2 ring-slate-700 group-hover:ring-slate-600 transition-all ${currentUser?.role === 'directeur' ? 'bg-gradient-to-tr from-emerald-500 to-teal-600' : 'bg-gradient-to-tr from-blue-500 to-indigo-600'}`}>
                            {currentUser ? `${currentUser.prenom[0]}${currentUser.nom[0]}` : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Utilisateur'}</p>
                            <p className="text-xs text-slate-400 truncate">{getRoleLabel(currentUser?.role)}</p>
                        </div>
                        <Settings size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
