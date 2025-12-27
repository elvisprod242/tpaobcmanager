
import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Truck, AlertCircle, Shield, Check, CheckCircle } from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../services/api';

interface AuthProps {
    onLogin: (user: UserType) => void;
}

export const Auth = ({ onLogin }: AuthProps) => {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [justFilled, setJustFilled] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        company: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const fillCredentials = (email: string, pass: string) => {
        setFormData(prev => ({ ...prev, email, password: pass }));
        setError('');
        setJustFilled(true);
        setTimeout(() => setJustFilled(false), 1000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulation de délai réseau
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            if (isLogin) {
                // --- LOGIN LOCAL SIMULÉ ---
                // Vérification des comptes de démo par défaut
                if (formData.email === 'directeur@tpa.com' && formData.password === 'directeur') {
                    const mockUser: UserType = {
                        id: 'demo_dir_1',
                        email: formData.email,
                        username: 'directeur',
                        nom: 'Général',
                        prenom: 'Directeur',
                        role: 'directeur',
                        avatarUrl: ''
                    };
                    onLogin(mockUser);
                    return;
                }
                
                if (formData.email === 'obc@tpa.com' && formData.password === 'obc123') {
                    const mockUser: UserType = {
                        id: 'demo_obc_1',
                        email: formData.email,
                        username: 'obc',
                        nom: 'Manager',
                        prenom: 'OBC',
                        role: 'obc',
                        avatarUrl: ''
                    };
                    onLogin(mockUser);
                    return;
                }

                // Vérification contre la base locale (utilisateurs inscrits)
                // Note: Dans un vrai système, il faudrait hacher le mot de passe. Ici, c'est une démo locale.
                const usersStr = localStorage.getItem('db_users_auth');
                const localUsers = usersStr ? JSON.parse(usersStr) : [];
                const userFound = localUsers.find((u: any) => u.email === formData.email && u.password === formData.password);

                if (userFound) {
                    // Récupérer le profil complet via l'API
                    const profile = await api.getUserProfile(userFound.id);
                    if (profile) {
                        onLogin(profile);
                    } else {
                        // Fallback si profil manquant
                        onLogin({
                            id: userFound.id,
                            email: userFound.email,
                            username: 'user',
                            nom: 'Utilisateur',
                            prenom: 'Local',
                            role: 'obc'
                        });
                    }
                } else {
                    throw new Error("Email ou mot de passe incorrect.");
                }

            } else {
                // --- INSCRIPTION LOCALE ---
                if (!formData.name || !formData.email || !formData.password) {
                    throw new Error("Tous les champs sont requis.");
                }

                const uid = `local_${Date.now()}`;
                
                // Sauvegarde Auth (Email/Pass)
                const usersStr = localStorage.getItem('db_users_auth');
                const localUsers = usersStr ? JSON.parse(usersStr) : [];
                
                if (localUsers.find((u: any) => u.email === formData.email)) {
                    throw new Error("Cet email est déjà utilisé.");
                }

                localUsers.push({ id: uid, email: formData.email, password: formData.password });
                localStorage.setItem('db_users_auth', JSON.stringify(localUsers));

                // Sauvegarde Profil
                const [prenom, ...nomParts] = formData.name.split(' ');
                const newUser: UserType = {
                    id: uid,
                    email: formData.email,
                    username: formData.name.toLowerCase().replace(/\s/g, ''),
                    nom: nomParts.join(' ') || '',
                    prenom: prenom || formData.name,
                    role: 'obc', // Par défaut
                    avatarUrl: ''
                };

                await api.createUserProfile(newUser);
                onLogin(newUser);
            }
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-900">
            {/* Colonne Gauche : Formulaire */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 animate-fade-in overflow-y-auto">
                <div className="w-full max-w-md space-y-8">
                    {/* Header Logo */}
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6 hover:scale-105 transition-transform duration-300">
                            <img 
                                src="/logo.jpg" 
                                alt="TPA - Transport Pétrolier Africain" 
                                className="h-24 w-auto object-contain drop-shadow-xl rounded-xl" 
                            />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {isLogin ? 'Bienvenue sur TPA' : 'Créer un compte'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                            {isLogin 
                                ? 'Mode Local : Connectez-vous pour gérer votre flotte.' 
                                : 'Rejoignez la plateforme locale de gestion de flotte.'}
                        </p>
                    </div>

                    {/* Hint Box for Demo Credentials */}
                    {isLogin && (
                        <div className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 text-xs text-blue-800 dark:text-blue-300 space-y-3 transition-all ${justFilled ? 'ring-2 ring-blue-400 scale-[1.02]' : ''}`}>
                            <div className="flex items-center justify-between font-bold">
                                <div className="flex items-center gap-2"><Shield size={14} /> Pré-remplir (Test Local) :</div>
                                {justFilled && <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><Check size={14}/> Rempli</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    type="button"
                                    className="text-left p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm transition-all group"
                                    onClick={() => fillCredentials('directeur@tpa.com', 'directeur')}
                                >
                                    <span className="font-bold block text-slate-700 dark:text-slate-200 group-hover:text-blue-600">Directeur</span>
                                    <span className="opacity-60 block mt-1">directeur@tpa.com</span>
                                </button>
                                <button 
                                    type="button"
                                    className="text-left p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm transition-all group"
                                    onClick={() => fillCredentials('obc@tpa.com', 'obc123')}
                                >
                                    <span className="font-bold block text-slate-700 dark:text-slate-200 group-hover:text-blue-600">Manager OBC</span>
                                    <span className="opacity-60 block mt-1">obc@tpa.com</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Formulaire */}
                    <form onSubmit={handleSubmit} className="space-y-5 mt-4" noValidate>
                        {!isLogin && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="relative group">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="Nom complet"
                                        value={formData.name}
                                        onChange={handleChange}
                                        autoComplete="name"
                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                                    />
                                </div>
                                <div className="relative group">
                                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <input
                                        type="text"
                                        name="company"
                                        placeholder="Nom de l'entreprise"
                                        value={formData.company}
                                        onChange={handleChange}
                                        autoComplete="organization"
                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Adresse email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    autoComplete="username"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                                />
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="Mot de passe"
                                    value={formData.password}
                                    onChange={handleChange}
                                    autoComplete="current-password"
                                    required
                                    className="w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-2 animate-fade-in border border-red-100 dark:border-red-900/50">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                                <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">Se souvenir de moi</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Connexion...</span>
                                </>
                            ) : (
                                <>
                                    {isLogin ? 'Se connecter' : "S'inscrire"} <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Switcher */}
                    <div className="text-center pt-2">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
                            <button
                                onClick={() => { setIsLogin(!isLogin); setError(''); setFormData(prev => ({...prev, name: '', company: ''})); }}
                                className="ml-2 font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors hover:underline focus:outline-none"
                            >
                                {isLogin ? "Créer un compte" : "Se connecter"}
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {/* Colonne Droite : Image / Branding (Masqué sur mobile) */}
            <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-slate-900/90 z-10 mix-blend-multiply" />
                <img 
                    src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=2075&auto=format&fit=crop" 
                    alt="Fleet Management Background" 
                    className="absolute inset-0 w-full h-full object-cover animate-pulse-slow"
                />
                
                <div className="relative z-20 flex flex-col justify-between h-full p-16 text-white">
                    <div className="flex items-center gap-3 animate-fade-in">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 shadow-lg">
                            <img src="/logo.jpg" alt="TPA" className="w-full h-full object-contain rounded-lg" />
                        </div>
                        <span className="font-bold text-xl tracking-wide">TPA Manager</span>
                    </div>

                    <div className="space-y-8 max-w-lg animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        <h2 className="text-4xl font-bold leading-tight">
                            Transport Pétrolier Africain : <span className="text-blue-300">Excellence et Sécurité</span>.
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/15 transition-colors">
                                <div className="p-2 bg-green-500/20 rounded-lg text-green-300 mt-1">
                                    <CheckCircle size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Mode Local (Hors-Ligne)</h3>
                                    <p className="text-sm text-slate-200 mt-1 leading-relaxed">Cette version fonctionne sans connexion serveur. Toutes vos données sont sauvegardées localement sur votre appareil.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-end text-sm text-slate-400 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        <p>© 2025 TPA Inc.</p>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
                            <a href="#" className="hover:text-white transition-colors">Conditions</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
