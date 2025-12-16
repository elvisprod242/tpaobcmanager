
import React, { useState, useRef } from 'react';
import { User as UserIcon, Shield, Lock, Monitor, Save, LogOut, Trash2, Check, Moon, Sun, Camera, CheckCircle as CheckCircleIcon, Database, Mail, Briefcase, Phone, MapPin, Globe } from 'lucide-react';
import { FormInput } from '../components/ui/FormElements';
import { User } from '../types';

interface SettingsProps {
    isDarkMode: boolean;
    toggleTheme: () => void;
    currentUser: User | null;
    onLogout: () => void;
}

export const Settings = ({ isDarkMode, toggleTheme, currentUser, onLogout }: SettingsProps) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'display' | 'data'>('profile');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form States
    const [profile, setProfile] = useState({
        firstName: currentUser?.prenom || 'Admin',
        lastName: currentUser?.nom || 'User',
        email: currentUser?.email || 'admin@tpa.com',
        phone: '+33 6 12 34 56 78',
        role: currentUser?.role === 'admin' ? 'Administrateur Principal' : (currentUser?.role === 'directeur' ? 'Directeur Général' : 'OBC / Manager'),
        department: 'Direction Logistique',
        bio: 'Gestionnaire de flotte senior avec 10 ans d\'expérience dans le transport routier et la sécurité.',
        location: 'Paris, France',
        avatarUrl: currentUser?.avatarUrl || ''
    });

    const [displaySettings, setDisplaySettings] = useState({
        density: 'comfortable',
        colorTheme: 'blue'
    });

    const handleSave = () => {
        setIsLoading(true);
        // Simulation d'appel API
        setTimeout(() => {
            setIsLoading(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }, 800);
    };

    const handleResetDatabase = () => {
        if (window.confirm("ATTENTION : Vous êtes sur le point d'effacer toutes les données locales et de remettre les données par défaut. Continuer ?")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setProfile(prev => ({ ...prev, avatarUrl: url }));
        }
    };

    const handleRemoveImage = () => {
        setProfile(prev => ({ ...prev, avatarUrl: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const tabs = [
        { id: 'profile', label: 'Mon Profil', icon: UserIcon },
        { id: 'display', label: 'Affichage', icon: Monitor },
        { id: 'security', label: 'Sécurité', icon: Shield },
        { id: 'data', label: 'Base de Données', icon: Database },
    ];

    return (
        <div className="animate-fade-in pb-8">
            <div className="flex flex-col lg:flex-row gap-8">
                
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-72 flex-shrink-0">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden sticky top-24">
                        {/* Mini Profil Sidebar */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg overflow-hidden mb-3 ring-4 ring-slate-50 dark:ring-slate-800">
                                {profile.avatarUrl ? (
                                    <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{profile.firstName[0]}{profile.lastName[0]}</span>
                                )}
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white truncate w-full">{profile.firstName} {profile.lastName}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate w-full mb-2">{profile.email}</p>
                            <span className="inline-flex px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wide">
                                {currentUser?.role || 'Utilisateur'}
                            </span>
                        </div>

                        <nav className="p-2 space-y-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                        activeTab === tab.id 
                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm' 
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    <tab.icon size={18} />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700/50 mt-2">
                            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                                <LogOut size={18} />
                                Déconnexion
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 space-y-6">
                    {/* Header Mobile Only (Select) */}
                    <div className="lg:hidden bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                        <select 
                            value={activeTab} 
                            onChange={(e) => setActiveTab(e.target.value as any)}
                            className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {tabs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </div>

                    {/* Content Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[600px] flex flex-col relative overflow-hidden">
                        
                        {/* Tab: Profil */}
                        {activeTab === 'profile' && (
                            <div className="flex-1 animate-fade-in">
                                {/* Banner Hero */}
                                <div className="h-32 w-full bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                </div>

                                <div className="px-6 lg:px-10 pb-10">
                                    {/* Avatar & Header Action */}
                                    <div className="relative flex flex-col sm:flex-row items-end sm:items-center justify-between -mt-12 mb-8 gap-4">
                                        <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                                            <div className="w-32 h-32 rounded-full bg-white dark:bg-slate-800 p-1.5 shadow-xl">
                                                <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden relative">
                                                    {profile.avatarUrl ? (
                                                        <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-4xl font-bold text-slate-400 dark:text-slate-500">{profile.firstName[0]}{profile.lastName[0]}</span>
                                                    )}
                                                    {/* Overlay Edit */}
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                                                        <Camera size={28} className="text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Bouton Reset Image */}
                                            {profile.avatarUrl && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                                                    className="absolute bottom-1 right-1 p-2 bg-white dark:bg-slate-700 text-red-500 rounded-full shadow-md border border-slate-100 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-slate-600 transition-colors z-10"
                                                    title="Supprimer la photo"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        </div>
                                        
                                        <div className="flex-1 pt-12 sm:pt-0 sm:pb-2 text-center sm:text-left">
                                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.firstName} {profile.lastName}</h2>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm">{profile.role}</p>
                                        </div>

                                        <div className="hidden sm:block pb-2">
                                            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2">
                                                <Save size={18} /> Enregistrer
                                            </button>
                                        </div>
                                    </div>

                                    {/* Formulaire Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        
                                        {/* Section Identité */}
                                        <div className="space-y-5">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                                                <UserIcon size={18} className="text-blue-600 dark:text-blue-400" />
                                                <h3 className="font-bold text-slate-800 dark:text-white">Identité</h3>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormInput label="Prénom" value={profile.firstName} onChange={(e: any) => setProfile({...profile, firstName: e.target.value})} />
                                                <FormInput label="Nom" value={profile.lastName} onChange={(e: any) => setProfile({...profile, lastName: e.target.value})} />
                                            </div>
                                            <div className="relative">
                                                <FormInput label="Bio / À propos" value="" onChange={() => {}} className="hidden" /> {/* Spacer hack or custom wrapper needed */}
                                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Bio / À propos</label>
                                                <textarea 
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all h-28 resize-none"
                                                    value={profile.bio}
                                                    onChange={(e) => setProfile({...profile, bio: e.target.value})}
                                                />
                                            </div>
                                        </div>

                                        {/* Section Professionnel & Contact */}
                                        <div className="space-y-5">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                                                <Briefcase size={18} className="text-blue-600 dark:text-blue-400" />
                                                <h3 className="font-bold text-slate-800 dark:text-white">Informations Pro</h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="relative">
                                                    <Mail size={16} className="absolute top-9 left-3 text-slate-400 z-10" />
                                                    <FormInput label="Email Professionnel" value={profile.email} onChange={(e: any) => setProfile({...profile, email: e.target.value})} className="pl-8" />
                                                    <style>{`input[type="email"] { padding-left: 2.5rem; }`}</style>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Rôle (Lecture seule)</label>
                                                        <div className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed flex items-center gap-2">
                                                            <Shield size={14} /> {profile.role}
                                                        </div>
                                                    </div>
                                                    <FormInput label="Département" value={profile.department} onChange={(e: any) => setProfile({...profile, department: e.target.value})} />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="relative">
                                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Téléphone</label>
                                                        <div className="relative">
                                                            <Phone size={16} className="absolute top-3 left-3 text-slate-400" />
                                                            <input type="text" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all" />
                                                        </div>
                                                    </div>
                                                    <div className="relative">
                                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Localisation</label>
                                                        <div className="relative">
                                                            <MapPin size={16} className="absolute top-3 left-3 text-slate-400" />
                                                            <input type="text" value={profile.location} onChange={(e) => setProfile({...profile, location: e.target.value})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab: Affichage */}
                        {activeTab === 'display' && (
                            <div className="p-6 lg:p-10 space-y-8 animate-fade-in flex-1">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Affichage & Apparence</h2>
                                    <p className="text-slate-500 dark:text-slate-400">Personnalisez votre expérience visuelle.</p>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Thème de l'interface</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button 
                                                onClick={() => !isDarkMode && toggleTheme()}
                                                disabled={!isDarkMode}
                                                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${!isDarkMode ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                            >
                                                <div className="p-3 bg-white rounded-full shadow-sm">
                                                    <Sun size={24} className="text-amber-500" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">Mode Clair</p>
                                                    <p className="text-xs text-slate-500">Idéal pour les environnements lumineux</p>
                                                </div>
                                                {!isDarkMode && <div className="ml-auto text-blue-600"><CheckCircleIcon size={24} /></div>}
                                            </button>

                                            <button 
                                                onClick={() => isDarkMode && toggleTheme()}
                                                disabled={isDarkMode}
                                                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${isDarkMode ? 'border-blue-500 bg-slate-800' : 'border-slate-200 bg-slate-900 hover:border-slate-600'}`}
                                            >
                                                <div className="p-3 bg-slate-700 rounded-full shadow-sm">
                                                    <Moon size={24} className="text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">Mode Sombre</p>
                                                    <p className="text-xs text-slate-400">Repose les yeux en faible luminosité</p>
                                                </div>
                                                {isDarkMode && <div className="ml-auto text-blue-500"><CheckCircleIcon size={24} /></div>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab: Sécurité */}
                        {activeTab === 'security' && (
                            <div className="p-6 lg:p-10 space-y-8 animate-fade-in flex-1">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Sécurité du compte</h2>
                                    <p className="text-slate-500 dark:text-slate-400">Gérez vos mots de passe et accès.</p>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/50 flex items-start gap-3">
                                    <Lock size={20} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Mot de passe</h4>
                                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Pour changer votre mot de passe, veuillez contacter l'administrateur système ou utiliser la procédure de récupération sur la page de connexion.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab: Data Database */}
                        {activeTab === 'data' && (
                            <div className="p-6 lg:p-10 space-y-8 animate-fade-in flex-1">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Base de Données Locale</h2>
                                    <p className="text-slate-500 dark:text-slate-400">Gestion des données stockées dans le navigateur (Persistence).</p>
                                </div>

                                <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50">
                                    <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                                        <Database size={18} /> État du stockage
                                    </h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                                        Cette application utilise une base de données locale (LocalStorage) pour sauvegarder vos modifications.
                                    </p>
                                    <div className="flex gap-4 text-xs font-mono text-blue-600 dark:text-blue-400">
                                        <span>Partenaires: {localStorage.getItem('db_partners')?.length ? 'OK' : 'Mock'}</span>
                                        <span>Conducteurs: {localStorage.getItem('db_drivers')?.length ? 'OK' : 'Mock'}</span>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                                    <h3 className="font-bold text-red-600 mb-2">Zone de Danger</h3>
                                    <p className="text-sm text-slate-500 mb-4">La réinitialisation effacera tous les nouveaux ajouts et restaurera les données de démonstration.</p>
                                    <button 
                                        onClick={handleResetDatabase}
                                        className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 size={16} /> Réinitialiser la Base de Données
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Footer Actions (Visible on all tabs) */}
                        <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20 flex justify-end gap-3 rounded-b-2xl">
                            <button className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-xl font-medium transition-all">
                                Annuler
                            </button>
                            <button 
                                onClick={handleSave} 
                                disabled={isLoading}
                                className={`px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Enregistrement...
                                    </>
                                ) : showSuccess ? (
                                    <>
                                        <Check size={18} /> Enregistré !
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} /> Enregistrer
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
