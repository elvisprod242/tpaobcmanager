
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Bell, Briefcase, ChevronDown, Calendar, ShieldCheck, MessageCircle } from 'lucide-react';
import { Partenaire, User } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface HeaderProps {
    title: string;
    toggleSidebar: () => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
    partners: Partenaire[];
    selectedPartnerId: string;
    onSelectPartner: (id: string) => void;
    selectedYear: string;
    onSelectYear: (year: string) => void;
    currentUser: User | null;
    unreadCount?: number; // Messages chat non lus
}

export const Header = ({ title, toggleSidebar, isDarkMode, toggleTheme, partners, selectedPartnerId, onSelectPartner, selectedYear, onSelectYear, currentUser, unreadCount = 0 }: HeaderProps) => {
    const navigate = useNavigate();
    const { unreadSystemCount, clearSystemNotifications } = useNotification();
    
    const getRoleLabel = () => {
        if (!currentUser) return '';
        switch (currentUser.role) {
            case 'admin': return 'Administrateur';
            case 'obc': return 'OBC / Manager';
            case 'directeur': return 'Directeur Général';
            default: return 'Utilisateur';
        }
    };

    // Génération dynamique des années (Année actuelle + 1 jusqu'à 2020)
    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear + 1; i >= 2020; i--) {
            years.push(i);
        }
        return years;
    }, []);

    return (
        <header className="sticky top-0 z-30 glass border-b border-slate-200/60 dark:border-slate-800/60 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300">
            <div className="flex items-center justify-between w-full md:w-auto">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white hidden sm:block tracking-tight">{title}</h2>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white sm:hidden">TPA</h2>
                </div>
                
                {/* Mobile Actions */}
                <div className="flex items-center gap-2 md:hidden">
                    <button 
                        onClick={() => navigate('/chat')}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 active:scale-90 relative"
                    >
                        <MessageCircle size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
                        )}
                    </button>
                    <button 
                        onClick={clearSystemNotifications}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 active:scale-90 relative"
                    >
                        <Bell size={20} />
                        {unreadSystemCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white dark:border-slate-900"></span>
                        )}
                    </button>
                    <button 
                        onClick={toggleTheme} 
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 active:scale-90"
                    >
                        {isDarkMode ? <Moon size={20} className="fill-current" /> : <Sun size={20} className="text-amber-500 fill-current" />}
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6 w-full md:w-auto">
                 <div className="grid grid-cols-[1fr_130px] sm:flex sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                    {/* Partner Selector */}
                    <div className="relative group w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Briefcase size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                        </div>
                        <select 
                            value={selectedPartnerId}
                            onChange={(e) => onSelectPartner(e.target.value)}
                            className="appearance-none pl-10 pr-8 py-2.5 w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all cursor-pointer font-medium truncate"
                        >
                            <option value="all">Tous les partenaires</option>
                            {partners.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.nom}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                            <ChevronDown size={16} className="text-slate-400" />
                        </div>
                    </div>

                    {/* Year Selector */}
                    <div className="relative group w-full sm:w-40">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                        </div>
                        <select 
                            value={selectedYear}
                            onChange={(e) => onSelectYear(e.target.value)}
                            className="appearance-none pl-10 pr-8 py-2.5 w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all cursor-pointer font-medium"
                        >
                            <option value="">Année</option>
                            {availableYears.map(year => (
                                <option key={year} value={year.toString()}>{year}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                            <ChevronDown size={16} className="text-slate-400" />
                        </div>
                    </div>
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/chat')}
                        className="p-2.5 rounded-full hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm text-slate-500 dark:text-slate-400 transition-all duration-300 relative group active:scale-95"
                        title="Messagerie"
                    >
                        <MessageCircle size={20} className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                        )}
                    </button>

                    <button 
                        onClick={clearSystemNotifications}
                        className="p-2.5 rounded-full hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm text-slate-500 dark:text-slate-400 transition-all duration-300 relative group active:scale-95"
                        title="Notifications Système"
                    >
                        <Bell size={20} className="group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors" />
                        {unreadSystemCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold border-2 border-white dark:border-slate-900 animate-bounce-short">
                                {unreadSystemCount > 9 ? '9+' : unreadSystemCount}
                            </span>
                        )}
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <button 
                        onClick={toggleTheme} 
                        className={`p-2.5 rounded-full hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all duration-300 transform active:scale-90 ${isDarkMode ? 'text-slate-300 rotate-0' : 'text-slate-600 rotate-180'}`}
                        title={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
                    >
                        {isDarkMode ? <Moon size={20} className="fill-current" /> : <Sun size={20} className="text-amber-500 fill-current" />}
                    </button>
                    <div className="flex items-center gap-3 pl-2 cursor-pointer group">
                        <div className="text-right hidden xl:block">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {currentUser?.prenom} {currentUser?.nom}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 flex items-center justify-end gap-1">
                                {currentUser?.role === 'directeur' && <ShieldCheck size={10} />}
                                {getRoleLabel()}
                            </p>
                        </div>
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white dark:ring-slate-900 group-hover:ring-blue-200 dark:group-hover:ring-blue-900 transition-all ${currentUser?.role === 'directeur' ? 'bg-gradient-to-tr from-emerald-500 to-teal-600' : 'bg-gradient-to-tr from-blue-500 to-indigo-600'}`}>
                            {currentUser?.avatarUrl ? (
                                <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <span>{currentUser ? `${currentUser.prenom[0]}${currentUser.nom[0]}` : 'U'}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
