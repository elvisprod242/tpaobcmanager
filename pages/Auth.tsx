
import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle, Briefcase } from 'lucide-react';
import { User as UserType, UserRole } from '../types';
import { api } from '../services/api';
import { auth } from '../services/firebase';
import * as FirebaseAuth from 'firebase/auth';

interface AuthProps {
    onLogin: (user: UserType) => void;
}

export const Auth = ({ onLogin }: AuthProps) => {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'obc' as UserRole // Par défaut
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isLogin) {
                // --- LOGIN FIREBASE ---
                try {
                    const userCredential = await FirebaseAuth.signInWithEmailAndPassword(auth, formData.email, formData.password);
                    const uid = userCredential.user.uid;
                    
                    // Récupération du profil complet (avec Rôle) depuis Firestore via l'API
                    const userProfile = await api.getUserProfile(uid);
                    
                    if (userProfile) {
                        onLogin(userProfile);
                    } else {
                        // Cas rare : Auth existe mais pas le profil Firestore (ex: créé manuellement dans console)
                        // On crée un profil par défaut
                        const fallbackUser: UserType = {
                            id: uid,
                            email: formData.email,
                            username: formData.email.split('@')[0],
                            nom: 'Utilisateur',
                            prenom: '',
                            role: 'obc', // Rôle par défaut si inconnu
                            avatarUrl: ''
                        };
                        await api.createUserProfile(fallbackUser);
                        onLogin(fallbackUser);
                    }
                } catch (loginError: any) {
                    // --- GESTION AUTOMATIQUE DES COMPTES DÉMO (BACKEND LOGIC ONLY) ---
                    // Si le compte démo n'existe pas dans Firebase (error user-not-found), on le crée à la volée
                    // Cette logique est conservée pour faciliter les tests manuels si besoin, mais l'UI est retirée.
                    if ((loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') && 
                        (formData.email === 'directeur@tpa.com' || formData.email === 'obc@tpa.com')) {
                        
                        console.log("Compte démo introuvable, création automatique...");
                        try {
                            const newUserCredential = await FirebaseAuth.createUserWithEmailAndPassword(auth, formData.email, formData.password);
                            
                            // Définition du rôle selon l'email démo
                            const isDirector = formData.email === 'directeur@tpa.com';
                            const demoUser: UserType = {
                                id: newUserCredential.user.uid,
                                email: formData.email,
                                username: isDirector ? 'directeur' : 'obc',
                                nom: isDirector ? 'Général' : 'Manager',
                                prenom: isDirector ? 'Directeur' : 'OBC',
                                role: isDirector ? 'directeur' : 'obc',
                                avatarUrl: ''
                            };

                            await api.createUserProfile(demoUser);
                            onLogin(demoUser);
                            return; // Succès après création auto
                        } catch (createError) {
                            console.error(createError);
                            throw new Error("Erreur lors de la création automatique du compte démo.");
                        }
                    }
                    
                    // Erreur standard
                    console.error("Firebase Login Error:", loginError);
                    if (loginError.code === 'auth/invalid-credential') throw new Error("Email ou mot de passe incorrect.");
                    if (loginError.code === 'auth/too-many-requests') throw new Error("Trop de tentatives. Veuillez patienter.");
                    throw new Error("Erreur de connexion.");
                }

            } else {
                // --- INSCRIPTION FIREBASE ---
                if (!formData.name || !formData.email || !formData.password) {
                    throw new Error("Tous les champs sont requis.");
                }

                const userCredential = await FirebaseAuth.createUserWithEmailAndPassword(auth, formData.email, formData.password);
                const uid = userCredential.user.uid;

                const [prenom, ...nomParts] = formData.name.split(' ');
                
                // Création du profil enrichi dans Firestore
                const newUser: UserType = {
                    id: uid,
                    email: formData.email,
                    username: formData.name.toLowerCase().replace(/\s/g, ''),
                    nom: nomParts.join(' ') || '',
                    prenom: prenom || formData.name,
                    role: formData.role, // Rôle sélectionné dans le formulaire
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
                                ? 'Connectez-vous pour accéder au tableau de bord.' 
                                : 'Rejoignez la plateforme de gestion de flotte.'}
                        </p>
                    </div>

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
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white appearance-none cursor-pointer"
                                    >
                                        <option value="obc">Manager OBC</option>
                                        <option value="directeur">Directeur</option>
                                    </select>
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
                                onClick={() => { setIsLogin(!isLogin); setError(''); setFormData(prev => ({...prev, name: ''})); }}
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
                    src="https://images.unsplash.com/photo-1588615419999-7334757022db?q=80&w=1974&auto=format&fit=crop" 
                    alt="Camion Citerne Transport Pétrolier" 
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
                    </div>

                    <div className="flex justify-between items-end text-sm text-slate-400 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        <p>© 2025 TPA Inc.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
