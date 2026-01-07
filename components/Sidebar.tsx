
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '../types';
import { LayoutDashboard, Users, Truck, FileText, AlertTriangle, MessageSquare, Briefcase, X, Key, ShieldCheck, Target, BarChart2, Gavel, Book, ClipboardCheck, Clock, Timer, Coffee, Settings, LogOut, ChevronRight, MessageCircle } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User | null;
    unreadCount?: number; // Nouvelle prop
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, currentUser, unreadCount = 0 }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [animateItems, setAnimateItems] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setAnimateItems(true), 50);
        } else {
            setAnimateItems(false);
        }
    }, [isOpen]);

    const menuItems = [
        { path: '/', label: 'Tableau de bord', icon: LayoutDashboard, category: 'Pilotage', color: 'text-blue-500' },
        { path: '/kpi', label: 'Tableau KPI', icon: BarChart2, category: 'Pilotage', color: 'text-indigo-500' },
        
        { path: '/partners', label: 'Partenaires', icon: Briefcase, category: 'Gestion', color: 'text-emerald-500' },
        { path: '/drivers', label: 'Conducteurs', icon: Users, category: 'Gestion', color: 'text-cyan-500' },
        { path: '/vehicles', label: 'Véhicules', icon: Truck, category: 'Gestion', color: 'text-amber-500' },
        { path: '/obc-keys', label: 'Clés OBC', icon: Key, category: 'Gestion', color: 'text-violet-500' },
        
        { path: '/reports', label: 'Rapports', icon: FileText, category: 'Analyse', color: 'text-orange-500' },
        { path: '/work-time', label: 'Temps Travail', icon: Clock, category: 'Analyse', color: 'text-teal-500' },
        { path: '/driving-time', label: 'Temps Conduite', icon: Timer, category: 'Analyse', color: 'text-yellow-500' },
        { path: '/rest-time', label: 'Temps Repos', icon: Coffee, category: 'Analyse', color: 'text-lime-500' },
        { path: '/infractions', label: 'Infractions', icon: AlertTriangle, category: 'Analyse', color: 'text-red-500' },
        
        { path: '/invariants', label: 'Invariants', icon: ShieldCheck, category: 'Règles & Sécurité', color: 'text-rose-500' },
        { path: '/objectives', label: 'Objectifs', icon: Target, category: 'Règles & Sécurité', color: 'text-fuchsia-500' },
        { path: '/scp', label: 'Sanctions (SCP)', icon: Gavel, category: 'Règles & Sécurité', color: 'text-red-600' },
        { path: '/procedures', label: 'Procédures', icon: Book, category: 'Règles & Sécurité', color: 'text-sky-500' },
        { path: '/cabin-control', label: 'Contrôle Cabine', icon: ClipboardCheck, category: 'Règles & Sécurité', color: 'text-purple-500' },
        { path: '/communication', label: 'Communication', icon: MessageSquare, category: 'Règles & Sécurité', color: 'text-pink-500' },
        { path: '/chat', label: 'Messagerie', icon: MessageCircle, category: 'Règles & Sécurité', color: 'text-blue-400', isChat: true },
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
        onClose();
    };

    const isActiveLink = (path: string) => {
        return path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
    };

    return (
        <>
            {/* --- MOBILE MENU --- */}
            <div 
                className={`fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-xl text-white transition-all duration-300 lg:hidden ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
            >
                <div className="flex justify-between items-center p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/30">
                            <img src="/logo.jpg" alt="TPA" className="w-8 h-8 object-contain rounded-lg bg-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Menu</h2>
                            <p className="text-xs text-slate-400">Navigation rapide</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-20">
                        {menuItems.map((item, index) => {
                            const Icon = item.icon;
                            const active = isActiveLink(item.path);
                            
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => handleNavigation(item.path)}
                                    className={`
                                        relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-500 group
                                        ${active 
                                            ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/50' 
                                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                        }
                                        ${animateItems ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
                                    `}
                                    style={{ transitionDelay: `${index * 30}ms` }}
                                >
                                    <div className={`p-3 rounded-full mb-3 transition-colors relative ${active ? 'bg-white/20 text-white' : `bg-white/5 ${item.color} group-hover:text-white group-hover:bg-white/10`}`}>
                                        <Icon size={28} strokeWidth={1.5} />
                                        {item.isChat && unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white items-center justify-center font-bold">
                                                    {unreadCount > 9 ? '9+' : unreadCount}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-xs font-semibold text-center leading-tight ${active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 bg-black/20 backdrop-blur-md border-t border-white/5">
                    <div 
                        onClick={() => handleNavigation('/settings')}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 active:scale-95 transition-transform"
                    >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-bold shadow-lg border border-white/10">
                            {currentUser ? `${currentUser.prenom[0]}${currentUser.nom[0]}` : 'U'}
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-bold text-sm text-white">{currentUser?.prenom} {currentUser?.nom}</p>
                            <p className="text-xs text-slate-400">{getRoleLabel(currentUser?.role)}</p>
                        </div>
                        <Settings size={20} className="text-slate-400" />
                    </div>
                </div>
            </div>


            {/* --- DESKTOP SIDEBAR --- */}
            <aside className="hidden lg:flex flex-col w-72 h-screen bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shrink-0 relative z-20">
                <div className="p-6 pb-2">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center p-1.5 overflow-hidden">
                            <img src="/logo.jpg" alt="TPA" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">TPA</h1>
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Manager</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar pb-6">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActiveLink(item.path);

                        return (
                            <button
                                key={item.path}
                                onClick={() => handleNavigation(item.path)}
                                className={`
                                    w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group border
                                    ${active 
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 border-blue-500' 
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-sm'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3 relative">
                                    <Icon 
                                        size={18} 
                                        className={`transition-colors ${active ? 'text-white' : item.color}`} 
                                    />
                                    {item.isChat && unreadCount > 0 && (
                                        <span className="absolute -top-1.5 -left-1.5 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-white dark:border-slate-900"></span>
                                        </span>
                                    )}
                                    <span className={`${active ? 'text-white' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                                        {item.label}
                                    </span>
                                </div>
                                
                                {item.isChat && unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                                {active && !item.isChat && <ChevronRight size={14} className="text-white/80" />}
                            </button>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <button 
                        onClick={() => handleNavigation('/settings')}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all group text-left"
                    >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-800 ${currentUser?.role === 'directeur' ? 'bg-gradient-to-tr from-emerald-500 to-teal-600' : 'bg-gradient-to-tr from-blue-500 to-indigo-600'}`}>
                            {currentUser ? `${currentUser.prenom[0]}${currentUser.nom[0]}` : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Utilisateur'}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide truncate">
                                {getRoleLabel(currentUser?.role)}
                            </p>
                        </div>
                        <Settings size={16} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
