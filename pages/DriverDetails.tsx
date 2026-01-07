
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, User, MapPin, CreditCard, Key, Truck, Calendar, 
    TrendingUp, AlertTriangle, ShieldCheck, Clock, Activity, 
    FileText, Award, AlertOctagon, Zap, Briefcase, Coffee
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Conducteur, Rapport, Infraction, Vehicule, CleObc, Partenaire, Invariant, ScpConfiguration } from '../types';
import { getInfractionSeverity } from '../utils/helpers';

interface DriverDetailsProps {
    drivers: Conducteur[];
    reports: Rapport[];
    infractions: Infraction[];
    vehicles: Vehicule[];
    keys: CleObc[];
    partners: Partenaire[];
    invariants: Invariant[];
    scpConfigs: ScpConfiguration[];
    selectedYear: string;
}

export const DriverDetails = ({ drivers, reports, infractions, vehicles, keys, partners, invariants, scpConfigs, selectedYear }: DriverDetailsProps) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'reports' | 'infractions'>('reports');

    const driver = drivers.find(d => d.id === id);
    const targetYear = selectedYear ? parseInt(selectedYear) : new Date().getFullYear();

    // --- Data Processing ---

    const driverReports = useMemo(() => {
        return reports
            .filter(r => r.conducteur_id === id)
            .filter(r => new Date(r.date).getFullYear() === targetYear)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [reports, id, targetYear]);

    const driverInfractions = useMemo(() => {
        const reportIds = new Set(driverReports.map(r => r.id));
        return infractions
            .filter(i => {
                const iDate = new Date(i.date);
                if (iDate.getFullYear() !== targetYear) return false;
                if (reportIds.has(i.rapports_id)) return true;
                return false; 
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [infractions, driverReports, targetYear]);

    const stats = useMemo(() => {
        let totalDistance = 0;
        let totalDrivingSeconds = 0;
        let totalWorkSeconds = 0;
        let totalRestSeconds = 0;
        let totalPointsLost = 0;
        const penaltyBreakdown: Record<string, number> = {};

        driverReports.forEach(r => {
            totalDistance += r.distance_km;
            
            // Driving
            const [dh, dm] = r.temps_conduite.split(':').map(Number);
            totalDrivingSeconds += (dh * 3600) + (dm * 60);

            // Work (Durée totale)
            const [wh, wm] = r.duree.split(':').map(Number);
            totalWorkSeconds += (wh * 3600) + (wm * 60);

            // Rest (Temps d'attente/Repos)
            const [rh, rm] = r.temps_attente.split(':').map(Number);
            totalRestSeconds += (rh * 3600) + (rm * 60);
        });

        driverInfractions.forEach(inf => {
            const severity = getInfractionSeverity(inf, reports, invariants, scpConfigs);
            totalPointsLost += severity.points;
            
            const type = inf.type_infraction || 'Autre';
            penaltyBreakdown[type] = (penaltyBreakdown[type] || 0) + severity.points;
        });

        const topPenalties = Object.entries(penaltyBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([label, points]) => ({ label, points }));

        const safetyScore = Math.max(0, 100 - (totalPointsLost * 5)); 
        const licensePoints = Math.max(0, 12 - totalPointsLost); 

        // Helper formatage heure
        const formatDuration = (totalSeconds: number) => {
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            return `${h}h${m < 10 ? '0' + m : m}`;
        };

        return {
            distance: Math.round(totalDistance),
            drivingTime: formatDuration(totalDrivingSeconds),
            workTime: formatDuration(totalWorkSeconds),
            restTime: formatDuration(totalRestSeconds),
            infractionCount: driverInfractions.length,
            safetyScore: safetyScore,
            pointsLost: totalPointsLost,
            licensePoints: licensePoints,
            topPenalties: topPenalties
        };
    }, [driverReports, driverInfractions, reports, invariants, scpConfigs]);

    const chartData = useMemo(() => {
        return driverReports.slice(0, 7).reverse().map(r => {
            const [h, m] = r.temps_conduite.split(':').map(Number);
            const hours = h + (m/60);
            return {
                name: new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'short' }),
                conduite: parseFloat(hours.toFixed(1)),
                distance: r.distance_km
            };
        });
    }, [driverReports]);

    const assignedKey = keys.find(k => driver?.cle_obc_ids?.includes(k.id));
    const assignedVehicle = assignedKey 
        ? vehicles.find(v => v.partenaire_id === assignedKey.partenaire_id) 
        : null; 
    
    const lastVehicleId = driverReports.length > 0 ? driverReports[0].vehicule_id : null;
    const currentVehicle = vehicles.find(v => v.id === lastVehicleId) || assignedVehicle;

    const partnerName = assignedKey 
        ? partners.find(p => p.id === assignedKey.partenaire_id)?.nom 
        : (driverReports.length > 0 ? partners.find(p => p.id === driverReports[0].partenaire_id)?.nom : 'Non assigné');


    if (!driver) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
                <User size={48} className="mb-4 opacity-50" />
                <p>Conducteur introuvable.</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">Retour</button>
            </div>
        );
    }

    // Configuration des couleurs et gradients
    const getScoreConfig = (score: number) => {
        if (score >= 90) return { label: 'Excellence', textClass: 'text-emerald-500', bgClass: 'bg-emerald-50', gradient: ['#10b981', '#34d399'] }; // Emerald 500-400
        if (score >= 75) return { label: 'Bon Conducteur', textClass: 'text-blue-500', bgClass: 'bg-blue-50', gradient: ['#3b82f6', '#60a5fa'] }; // Blue 500-400
        if (score >= 50) return { label: 'À Surveiller', textClass: 'text-amber-500', bgClass: 'bg-amber-50', gradient: ['#f59e0b', '#fbbf24'] }; // Amber 500-400
        return { label: 'Critique', textClass: 'text-red-500', bgClass: 'bg-red-50', gradient: ['#ef4444', '#f87171'] }; // Red 500-400
    };

    const status = getScoreConfig(stats.safetyScore);
    
    // Calculs SVG
    const radius = 80; // Rayon
    const stroke = 12; // Epaisseur trait
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (stats.safetyScore / 100) * circumference;

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Navigation Header */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate('/drivers')}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm active:scale-95"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profil Conducteur</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Dossier complet et historique d'activité</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COLONNE GAUCHE : Identité & Score */}
                <div className="space-y-6">
                    {/* Carte Profil */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                        <div className="relative flex flex-col items-center mt-8">
                            <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-800 p-1.5 shadow-lg mb-3">
                                <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-3xl font-bold text-slate-500 dark:text-slate-400">
                                    {driver.prenom[0]}{driver.nom[0]}
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{driver.prenom} {driver.nom}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{partnerName}</p>
                            
                            <div className="grid grid-cols-2 gap-3 w-full mt-2">
                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                                    <span className="text-xs text-slate-400 uppercase font-bold mb-1">Permis</span>
                                    <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                                        <CreditCard size={14} /> {driver.categorie_permis}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">{driver.numero_permis}</span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                                    <span className="text-xs text-slate-400 uppercase font-bold mb-1">Lieu</span>
                                    <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 text-center text-sm leading-tight">
                                        <MapPin size={14} className="shrink-0" /> {driver.lieu_travail || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Carte Score Sécurité Optimisée */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className={status.textClass} size={24} />
                                <h3 className="font-bold text-slate-800 dark:text-white">Score {targetYear}</h3>
                            </div>
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase border ${status.textClass.replace('text-', 'border-')} ${status.bgClass} ${status.textClass}`}>
                                {status.label}
                            </span>
                        </div>
                        
                        <div className="relative flex flex-col items-center justify-center py-6">
                            {/* Jauge Circulaire SVG Custom */}
                            <div className="relative w-48 h-48">
                                <svg 
                                    className="w-full h-full transform -rotate-90 drop-shadow-sm" 
                                    viewBox={`0 0 ${radius * 2} ${radius * 2}`}
                                >
                                    <defs>
                                        <linearGradient id={`gradientScore-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor={status.gradient[0]} />
                                            <stop offset="100%" stopColor={status.gradient[1]} />
                                        </linearGradient>
                                    </defs>
                                    {/* Fond de jauge */}
                                    <circle 
                                        cx={radius} cy={radius} r={normalizedRadius} 
                                        stroke="currentColor" strokeWidth={stroke} fill="transparent" 
                                        className="text-slate-100 dark:text-slate-700/50" 
                                    />
                                    {/* Progression */}
                                    <circle 
                                        cx={radius} cy={radius} r={normalizedRadius} 
                                        stroke={`url(#gradientScore-${id})`} 
                                        strokeWidth={stroke} 
                                        fill="transparent" 
                                        strokeDasharray={circumference + ' ' + circumference} 
                                        style={{ strokeDashoffset }}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out" 
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="flex items-baseline">
                                        <span className={`text-5xl font-extrabold tracking-tighter ${status.textClass}`} style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'}}>
                                            {stats.safetyScore}
                                        </span>
                                        <span className="text-xl font-bold text-slate-400 ml-1">%</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">SÉCURITÉ</span>
                                </div>
                            </div>
                        </div>

                        {/* Barre de Permis à Points */}
                        <div className="mb-6 mt-2">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-xs font-bold text-slate-500 uppercase">Solde Points</span>
                                <span className="text-sm font-bold text-slate-800 dark:text-white">{stats.licensePoints} <span className="text-slate-400 font-normal">/ 12</span></span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${stats.licensePoints > 6 ? 'bg-green-500' : stats.licensePoints > 3 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                    style={{ width: `${(stats.licensePoints / 12) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Top Causes de Pénalité */}
                        {stats.topPenalties.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Principales Causes (-{stats.pointsLost} pts)</p>
                                {stats.topPenalties.map((penalty, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                            {idx === 0 && <AlertOctagon size={14} className="text-red-500" />}
                                            {idx === 1 && <AlertTriangle size={14} className="text-orange-500" />}
                                            {idx === 2 && <Zap size={14} className="text-amber-500" />}
                                            <span className="truncate max-w-[150px]">{penalty.label}</span>
                                        </div>
                                        <span className="font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 rounded text-xs">-{penalty.points}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Background Effect */}
                        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none ${status.bgClass.replace('bg-', 'bg-gradient-to-br from-').replace('50', '500')}`}></div>
                    </div>

                    {/* Carte Matériel Assigné */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide">
                            <Truck size={16} /> Matériel Assigné
                        </h3>
                        
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-amber-500 shadow-sm">
                                <Key size={18} />
                            </div>
                            <div>
                                <p className="text-xs text-amber-700 dark:text-amber-400 font-bold uppercase">Clé OBC</p>
                                <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    {assignedKey ? assignedKey.cle_obc : 'Aucune clé'}
                                </p>
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-blue-500 shadow-sm">
                                <Truck size={18} />
                            </div>
                            <div>
                                <p className="text-xs text-blue-700 dark:text-blue-400 font-bold uppercase">Véhicule Actuel</p>
                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                    {currentVehicle ? currentVehicle.nom : 'Non défini'}
                                </p>
                                {currentVehicle && <p className="text-xs text-slate-500 font-mono">{currentVehicle.immatriculation}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLONNE DROITE : Stats & Historique */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* KPI Grid (Mis à jour avec Travail & Repos) */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                                <Clock size={16} />
                                <span className="text-[10px] font-bold uppercase">Conduite</span>
                            </div>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.drivingTime}</p>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                                <Briefcase size={16} />
                                <span className="text-[10px] font-bold uppercase">Travail</span>
                            </div>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.workTime}</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                                <Coffee size={16} />
                                <span className="text-[10px] font-bold uppercase">Repos</span>
                            </div>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.restTime}</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                                <Activity size={16} />
                                <span className="text-[10px] font-bold uppercase">Distance</span>
                            </div>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.distance.toLocaleString()} km</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                                <AlertTriangle size={16} />
                                <span className="text-[10px] font-bold uppercase">Infractions</span>
                            </div>
                            <p className={`text-xl font-bold ${stats.infractionCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {stats.infractionCount}
                            </p>
                        </div>
                    </div>

                    {/* Graphique Activité */}
                    {chartData.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <TrendingUp size={18} className="text-blue-500" />
                                Activité Récente (Heures de conduite)
                            </h3>
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                                        <Tooltip 
                                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                                            cursor={{fill: 'transparent'}}
                                        />
                                        <Bar dataKey="conduite" radius={[4, 4, 0, 0]} barSize={32}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#3b82f6' : '#cbd5e1'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Onglets Historique */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[400px]">
                        <div className="flex border-b border-slate-200 dark:border-slate-700">
                            <button 
                                onClick={() => setActiveTab('reports')}
                                className={`flex-1 py-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'reports' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-900/30' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Derniers Trajets {targetYear} ({driverReports.length})
                            </button>
                            <button 
                                onClick={() => setActiveTab('infractions')}
                                className={`flex-1 py-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'infractions' ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Sanctions & Infractions {targetYear} ({driverInfractions.length})
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto max-h-[500px]">
                            {activeTab === 'reports' ? (
                                driverReports.length > 0 ? (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {driverReports.map(r => (
                                            <div key={r.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-white text-sm">{new Date(r.date).toLocaleDateString()} <span className="font-normal text-slate-500">- {r.jour}</span></p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {r.heure_debut} - {r.heure_fin} • <span className="font-medium">{r.distance_km} km</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">{r.temps_conduite}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Conduite</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                                        <FileText size={32} className="mb-2 opacity-50" />
                                        <p>Aucun rapport enregistré pour {targetYear}.</p>
                                    </div>
                                )
                            ) : (
                                driverInfractions.length > 0 ? (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {driverInfractions.map(inf => {
                                            const isAlarme = inf.type_infraction === 'Alarme';
                                            const severity = getInfractionSeverity(inf, reports, invariants, scpConfigs);
                                            return (
                                                <div key={inf.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex items-start gap-4">
                                                    <div className={`p-2 rounded-lg mt-1 shrink-0 ${isAlarme ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                                        {isAlarme ? <AlertOctagon size={18} /> : <AlertTriangle size={18} />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">{inf.type_infraction}</h4>
                                                            <span className="text-xs font-medium text-slate-500">{new Date(inf.date).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">{inf.mesure_disciplinaire}</p>
                                                        <div className="flex gap-2 mt-2">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                                -{severity.points} pts
                                                            </span>
                                                            {inf.suivi ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                                                                    <ShieldCheck size={10} /> Suivi OK
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                                                    En attente
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                                        <Award size={32} className="mb-2 opacity-50" />
                                        <p>Aucune infraction en {targetYear}. Conducteur exemplaire !</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
