
import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, CheckCircle, Truck, AlertCircle, Shield } from 'lucide-react';
import { User as UserType } from '../types';

interface AuthProps {
    onLogin: (user: UserType) => void;
}

export const Auth = ({ onLogin }: AuthProps) => {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulation d'un délai réseau et validation basique
        setTimeout(() => {
            // --- SCÉNARIOS DE CONNEXION ---
            
            // 1. Directeur Général (Lecture Seule)
            if (email === 'directeur@tpa.com' && password === 'directeur') {
                const user: UserType = {
                    id: 'u_directeur',
                    username: 'directeur',
                    nom: 'Général',
                    prenom: 'Directeur',
                    email: 'directeur@tpa.com',
                    role: 'directeur'
                };
                setIsLoading(false);
                onLogin(user);
                return;
            }

            // 2. OBC / Admin (Accès Complet)
            if (email === 'obc@tpa.com' && password === 'obc') {
                const user: UserType = {
                    id: 'u_obc',
                    username: 'obc_manager',
                    nom: 'Manager',
                    prenom: 'OBC',
                    email: 'obc@tpa.com',
                    role: 'obc'
                };
                setIsLoading(false);
                onLogin(user);
                return;
            }

            // 3. Admin legacy (Accès Complet)
            if (email === 'admin@tpa.com' && password === 'admin') {
                const user: UserType = {
                    id: 'u_admin',
                    username: 'admin',
                    nom: 'Admin',
                    prenom: 'System',
                    email: 'admin@tpa.com',
                    role: 'admin'
                };
                setIsLoading(false);
                onLogin(user);
                return;
            }

            // 4. Inscription simulée (Role OBC par défaut pour le test)
            if (!isLogin && email && password && name) {
                const user: UserType = {
                    id: `u_${Date.now()}`,
                    username: name.toLowerCase().replace(' ', ''),
                    nom: name.split(' ')[1] || '',
                    prenom: name.split(' ')[0] || '',
                    email: email,
                    role: 'obc' // Par défaut
                };
                setIsLoading(false);
                onLogin(user);
                return;
            }

            setIsLoading(false);
            setError('Identifiants invalides.');
        }, 1000);
    };

    return (
        <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-900">
            {/* Colonne Gauche : Formulaire */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16 animate-fade-in">
                <div className="w-full max-w-md space-y-8">
                    {/* Header Logo */}
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6 hover:scale-105 transition-transform duration-300">
                            <img 
                                src="/logo.jpg" 
                                alt="TPA - Transport Pétrolier Africain" 
                                className="h-28 w-auto object-contain drop-shadow-xl" 
                            />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {isLogin ? 'Bienvenue sur TPA Manager' : 'Créer un compte'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            {isLogin 
                                ? 'Transport Pétrolier Africain - Gestion de flotte' 
                                : 'Rejoignez la plateforme de référence pour la gestion de flotte.'}
                        </p>
                    </div>

                    {/* Hint Box for Demo Credentials */}
                    {isLogin && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 text-xs text-blue-800 dark:text-blue-300 space-y-2">
                            <div className="flex items-center gap-2 font-bold mb-1">
                                <Shield size={14} /> Identifiants de démonstration :
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded border border-blue-100 dark:border-slate-700 cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => {setEmail('directeur@tpa.com'); setPassword('directeur');}}>
                                    <span className="font-bold block">Directeur</span>
                                    <span className="opacity-75">directeur@tpa.com</span>
                                    <span className="opacity-75 block">Pass: directeur</span>
                                </div>
                                <div className="p-2 bg-white dark:bg-slate-800 rounded border border-blue-100 dark:border-slate-700 cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => {setEmail('obc@tpa.com'); setPassword('obc');}}>
                                    <span className="font-bold block">OBC / Manager</span>
                                    <span className="opacity-75">obc@tpa.com</span>
                                    <span className="opacity-75 block">Pass: obc</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Formulaire */}
                    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                        {!isLogin && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Nom complet"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                    />
                                </div>
                                <div className="relative group">
                                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Nom de l'entreprise"
                                        value={company}
                                        onChange={(e) => setCompany(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="email"
                                    placeholder="Adresse email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Mot de passe"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2 animate-fade-in">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">Se souvenir de moi</span>
                            </label>
                            {isLogin && (
                                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                    Mot de passe oublié ?
                                </a>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Se connecter' : "S'inscrire"} <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Switcher */}
                    <div className="text-center">
                        <p className="text-slate-500 dark:text-slate-400">
                            {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
                            <button
                                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                                className="ml-2 font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                                {isLogin ? "Créer un compte" : "Se connecter"}
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {/* Colonne Droite : Image / Branding (Masqué sur mobile) */}
            <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-slate-900/90 z-10" />
                <img 
                    src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=2075&auto=format&fit=crop" 
                    alt="Fleet Management" 
                    className="absolute inset-0 w-full h-full object-cover"
                />
                
                <div className="relative z-20 flex flex-col justify-between h-full p-16 text-white">
                    <div className="flex items-center gap-2">
                        {/* Logo aussi sur la partie droite, en blanc/transparent s'il le faut, ou conteneur blanc */}
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1">
                            <img src="/logo.png" alt="TPA" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-bold text-lg tracking-wide">TPA Manager</span>
                    </div>

                    <div className="space-y-6 max-w-lg">
                        <h2 className="text-4xl font-bold leading-tight">
                            Transport Pétrolier Africain : Excellence et Sécurité.
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                                <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold">Suivi Télématique</h3>
                                    <p className="text-sm text-slate-300">Données en temps réel sur les conducteurs et véhicules.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold">Gestion des Infractions</h3>
                                    <p className="text-sm text-slate-300">Suivi automatisé et génération de rapports SCP.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-end text-sm text-slate-400">
                        <p>© 2025 TPA Inc.</p>
                        <div className="flex gap-4">
                            <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
                            <a href="#" className="hover:text-white transition-colors">Conditions</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
