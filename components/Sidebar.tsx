
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '../types';
import { LayoutDashboard, Users, Truck, FileText, AlertTriangle, MessageSquare, Briefcase, X, Key, ShieldCheck, Target, BarChart2, Gavel, Book, ClipboardCheck, Clock, Timer, Coffee, Settings } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, currentUser }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Définition des routes
    const menuItems = [
        { path: '/', label: 'Tableau de bord', icon: LayoutDashboard },
        { path: '/partners', label: 'Partenaires', icon: Briefcase },
        { path: '/obc-keys', label: 'Clés OBC', icon: Key },
        { path: '/invariants', label: 'Invariants', icon: ShieldCheck },
        { path: '/objectives', label: 'Objectifs', icon: Target },
        { path: '/kpi', label: 'Tableau KPI', icon: BarChart2 },
        { path: '/scp', label: 'SCP - Sanctions', icon: Gavel },
        { path: '/procedures', label: 'Procédures', icon: Book },
        { path: '/cabin-control', label: 'Contrôle Cabine', icon: ClipboardCheck },
        { path: '/drivers', label: 'Conducteurs', icon: Users },
        { path: '/vehicles', label: 'Véhicules', icon: Truck },
        { path: '/reports', label: 'Rapports', icon: FileText },
        { path: '/work-time', label: 'Temps de Travail', icon: Clock },
        { path: '/driving-time', label: 'Temps de Conduite', icon: Timer },
        { path: '/rest-time', label: 'Temps de Repos', icon: Coffee },
        { path: '/infractions', label: 'Infractions', icon: AlertTriangle },
        { path: '/communication', label: 'Communication', icon: MessageSquare },
        { path: '/settings', label: 'Paramètres', icon: Settings },
    ];

    const getRoleLabel = (role?: string) => {
        switch (role) {
            case 'admin': return 'Administrateur';
            case 'obc': return 'OBC / Manager';
            case 'directeur': return 'Directeur Général';
            default: return 'Utilisateur';
        }
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        onClose(); // Fermer le menu sur mobile après le clic
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div 
                className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar Container */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 flex flex-col 
                bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100
                dark:from-slate-950 dark:to-slate-950 dark:border-r dark:border-slate-800
                transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)
                w-[85vw] sm:w-80 lg:w-64 lg:static lg:h-screen lg:shrink-0 lg:translate-x-0 shadow-2xl lg:shadow-none
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Header - Fluid */}
                <div className="p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Logo Container */}
                        <div className="bg-white p-1.5 rounded-xl shadow-lg shadow-blue-600/20 h-10 w-10 flex items-center justify-center overflow-hidden">
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
                        className="lg:hidden text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                        aria-label="Fermer le menu"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation - Fluid scroll */}
                <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar scroll-smooth">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        // Vérification exacte pour la racine '/', sinon commence par
                        const isActive = item.path === '/' 
                            ? location.pathname === '/' 
                            : location.pathname.startsWith(item.path);
                            
                        return (
                            <button
                                key={item.path}
                                onClick={() => handleNavigation(item.path)}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden
                                    ${isActive 
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }
                                `}
                            >
                                <Icon 
                                    size={20}
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
                        className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors backdrop-blur-sm group active:scale-95"
                        onClick={() => handleNavigation('/settings')}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner ring-2 ring-slate-700 group-hover:ring-slate-600 transition-all ${currentUser?.role === 'directeur' ? 'bg-gradient-to-tr from-emerald-500 to-teal-600' : 'bg-gradient-to-tr from-blue-500 to-indigo-600'}`}>
                            {currentUser ? `${currentUser.prenom[0]}${currentUser.nom[0]}` : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Utilisateur'}</p>
                            <p className="text-xs text-slate-400 truncate">{getRoleLabel(currentUser?.role)}</p>
                        </div>
                        <Settings size={18} className="text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
