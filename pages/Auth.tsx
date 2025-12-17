
import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Truck, AlertCircle, Shield, Check, CheckCircle } from 'lucide-react';
import { User as UserType } from '../types';
import { auth } from '../services/firebase';
import { api } from '../services/api';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

interface AuthProps {
    onLogin: (user: UserType) => void;
}

export const Auth = ({ onLogin }: AuthProps) => {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [justFilled, setJustFilled] = useState(false);

    // État unifié pour le formulaire
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
        
        if (!formData.email || !formData.password) {
            setError("L'email et le mot de passe sont requis.");
            return;
        }
        if (!isLogin && !formData.name) {
            setError("Le nom complet est requis pour l'inscription.");
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            if (!auth) {
                throw new Error("Le service d'authentification Firebase n'est pas initialisé. Vérifiez votre configuration.");
            }

            if (isLogin) {
                // --- CONNEXION ---
                const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                const uid = userCredential.user.uid;

                // Récupération du profil complet (rôle, nom, prénom) depuis Firestore
                const userProfile = await api.getUserProfile(uid);

                if (userProfile) {
                    onLogin(userProfile);
                } else {
                    // Fallback si l'utilisateur existe dans Auth mais pas dans Firestore (Cas rare ou import manuel)
                    // On crée un profil basique par sécurité ou on refuse
                    const fallbackUser: UserType = {
                        id: uid,
                        email: userCredential.user.email || '',
                        username: userCredential.user.email?.split('@')[0] || 'user',
                        nom: 'Utilisateur',
                        prenom: '',
                        role: 'obc' // Rôle par défaut de sécurité
                    };
                    onLogin(fallbackUser);
                }

            } else {
                // --- INSCRIPTION ---
                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                const uid = userCredential.user.uid;

                // Construction du profil utilisateur enrichi
                const [prenom, ...nomParts] = formData.name.split(' ');
                const nom = nomParts.join(' ');

                const newUser: UserType = {
                    id: uid,
                    email: formData.email,
                    username: formData.name.toLowerCase().replace(/\s/g, ''),
                    nom: nom || '',
                    prenom: prenom || formData.name,
                    role: 'obc', // Rôle par défaut pour les nouveaux inscrits
                    avatarUrl: ''
                };

                // Sauvegarde du profil dans Firestore (Collection 'users')
                await api.createUserProfile(newUser);
                
                onLogin(newUser);
            }

        } catch (err: any) {
            console.error("Erreur Auth:", err);

            // --- FALLBACK MODE DÉMO ---
            // Si l'authentification Firebase échoue pour les comptes de démo (car ils n'existent pas encore en base),
            // on autorise l'accès en mode "Mock" pour permettre la visite.
            const demoAccounts = ['directeur@tpa.com', 'obc@tpa.com'];
            // Note: auth/invalid-credential remplace souvent user-not-found pour la sécurité
            if (isLogin && demoAccounts.includes(formData.email) && (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password')) {
                const isDirecteur = formData.email.includes('directeur');
                const mockUser: UserType = {
                    id: isDirecteur ? 'demo_dir_1' : 'demo_obc_1',
                    email: formData.email,
                    username: isDirecteur ? 'directeur' : 'obc',
                    nom: isDirecteur ? 'Général' : 'Manager',
                    prenom: isDirecteur ? 'Directeur' : 'OBC',
                    role: isDirecteur ? 'directeur' : 'obc',
                    avatarUrl: ''
                };
                
                // Petit délai pour simuler
                setTimeout(() => {
                    console.warn("Passage en mode DÉMO (Fallback Auth) suite erreur Firebase");
                    onLogin(mockUser);
                }, 500);
                return;
            }

            // Gestion des erreurs Firebase courantes
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError("Email ou mot de passe incorrect.");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("Cet email est déjà utilisé par un autre compte.");
            } else if (err.code === 'auth/weak-password') {
                setError("Le mot de passe doit contenir au moins 6 caractères.");
            } else {
                setError(err.message || "Une erreur de connexion est survenue.");
            }
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
                                ? 'Connectez-vous pour gérer votre flotte.' 
                                : 'Rejoignez la plateforme de référence pour la gestion de flotte.'}
                        </p>
                    </div>

                    {/* Hint Box for Demo Credentials (Facultatif, utile pour le test) */}
                    {isLogin && (
                        <div className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 text-xs text-blue-800 dark:text-blue-300 space-y-3 transition-all ${justFilled ? 'ring-2 ring-blue-400 scale-[1.02]' : ''}`}>
                            <div className="flex items-center justify-between font-bold">
                                <div className="flex items-center gap-2"><Shield size={14} /> Pré-remplir (Test) :</div>
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
                            {isLogin && (
                                <button type="button" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors hover:underline">
                                    Mot de passe oublié ?
                                </button>
                            )}
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
                                    <h3 className="font-bold text-lg">Suivi Télématique</h3>
                                    <p className="text-sm text-slate-200 mt-1 leading-relaxed">Données en temps réel sur les conducteurs et véhicules pour une optimisation continue.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/15 transition-colors">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-300 mt-1">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Gestion des Infractions</h3>
                                    <p className="text-sm text-slate-200 mt-1 leading-relaxed">Suivi automatisé et génération de rapports SCP pour garantir la conformité.</p>
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
