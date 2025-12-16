
import React, { useState, useMemo } from 'react';
import { Truck, AlertTriangle, User, ChevronDown, Activity, Key, ShieldAlert, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { mockRapports, mockInfractions, mockConducteurs, mockInvariants, mockScpConfigurations, mockCleObcList, mockVehicules } from '../services/mockData';
import { StatCard } from '../components/ui/StatCard';
import { getInfractionSeverity } from '../utils/helpers';

// Helper pour convertir HH:mm:ss en heures décimales
const timeStringToHours = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m, s] = timeStr.split(':').map(Number);
    return parseFloat((h + (m / 60) + ((s || 0) / 3600)).toFixed(1));
};

// Composant Tooltip Personnalisé pour un look plus pro
const CustomTooltip = ({ active, payload, label, unit = "" }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-700 rounded-lg shadow-xl text-xs">
                <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
                <p className="text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-blue-600 dark:text-blue-400">{payload[0].value}</span> {unit}
                </p>
            </div>
        );
    }
    return null;
};

interface DashboardProps {
    selectedPartnerId: string;
    globalYear: string;
}

export const Dashboard = ({ selectedPartnerId, globalYear }: DashboardProps) => {
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    
    // Utilise l'année globale sélectionnée, ou l'année courante par défaut
    const currentYear = globalYear ? parseInt(globalYear) : new Date().getFullYear();

    // --- DATA PREPARATION ---

    // 1. Filtrer les conducteurs
    const availableDrivers = useMemo(() => {
        if (selectedPartnerId === 'all') return mockConducteurs;
        return mockConducteurs.filter(d => 
            d.cle_obc_ids?.some(keyId => {
                const key = mockCleObcList.find(k => k.id === keyId);
                return key?.partenaire_id === selectedPartnerId;
            })
        );
    }, [selectedPartnerId]);

    // KPI Spécifique : Conducteurs avec Clé OBC
    const driversKeyStats = useMemo(() => {
        const total = availableDrivers.length;
        const withKey = availableDrivers.filter(d => d.cle_obc_ids && d.cle_obc_ids.length > 0).length;
        return { withKey, total };
    }, [availableDrivers]);

    // KPI Spécifique : Nombre de Véhicules
    const vehicleCount = useMemo(() => {
        if (selectedPartnerId === 'all') return mockVehicules.length;
        return mockVehicules.filter(v => v.partenaire_id === selectedPartnerId).length;
    }, [selectedPartnerId]);

    // 2. Calcul des Stats Globales & Agrégation Mensuelle
    const dashboardData = useMemo(() => {
        const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
        
        const monthlyData = months.map(m => ({
            name: m,
            infractions: 0,
            travail: 0,
            conduite: 0,
            repos: 0
        }));

        let totalDistance = 0;
        let totalInfractionsCount = 0;
        let totalScpLost = 0;

        const isMatch = (itemPartId: string, itemDriverId: string) => {
            const matchPartner = selectedPartnerId === 'all' || itemPartId === selectedPartnerId;
            const matchDriver = selectedDriverId === '' || itemDriverId === selectedDriverId;
            return matchPartner && matchDriver;
        };

        // Traitement des rapports
        mockRapports.forEach(r => {
            if (!isMatch(r.partenaire_id, r.conducteur_id)) return;
            
            const d = new Date(r.date);
            if (d.getFullYear() !== currentYear) return;
            
            const monthIdx = d.getMonth();
            
            monthlyData[monthIdx].travail += timeStringToHours(r.duree);
            monthlyData[monthIdx].conduite += timeStringToHours(r.temps_conduite);
            monthlyData[monthIdx].repos += timeStringToHours(r.temps_attente);
            
            totalDistance += r.distance_km;
        });

        // Arrondir les valeurs mensuelles pour l'affichage
        monthlyData.forEach(d => {
            d.travail = Math.round(d.travail);
            d.conduite = Math.round(d.conduite);
            d.repos = Math.round(d.repos);
        });

        // Traitement des infractions
        const infractionStatsByType: {[key: string]: number} = {};
        const pointsLostByDriver: {[id: string]: number} = {};
        const pointsLostByInvariant: {[title: string]: number} = {};
        const recentInfractionsList: any[] = [];

        mockInfractions.forEach(inf => {
            const report = mockRapports.find(r => r.id === inf.rapports_id);
            const driverId = report ? report.conducteur_id : '';
            
            // Si pas de rapport lié direct, on check si le partenaire match l'infraction directement
            const partnerMatch = selectedPartnerId === 'all' || inf.partenaire_id === selectedPartnerId;
            const driverMatch = selectedDriverId === '' || driverId === selectedDriverId;

            if (!partnerMatch || !driverMatch) return;

            const d = new Date(inf.date);
            if (d.getFullYear() !== currentYear) return;

            monthlyData[d.getMonth()].infractions += 1;
            
            totalInfractionsCount += 1;
            const severity = getInfractionSeverity(inf, mockRapports, mockInvariants, mockScpConfigurations);
            totalScpLost += severity.points;

            const typeKey = inf.type_infraction;
            infractionStatsByType[typeKey] = (infractionStatsByType[typeKey] || 0) + 1;

            if (driverId) {
                pointsLostByDriver[driverId] = (pointsLostByDriver[driverId] || 0) + severity.points;
            }

            const invariantTitle = report?.invariant_id 
                ? mockInvariants.find(i => i.id === report.invariant_id)?.titre || "Autre"
                : (inf.type_infraction || "Autre"); // Fallback sur le type si pas d'invariant lié
            
            // Tronquer le titre s'il est trop long pour le graphique
            const shortTitle = invariantTitle.length > 25 ? invariantTitle.substring(0, 25) + '...' : invariantTitle;
            pointsLostByInvariant[shortTitle] = (pointsLostByInvariant[shortTitle] || 0) + severity.points;

            recentInfractionsList.push({
                ...inf,
                driverName: report ? mockConducteurs.find(c => c.id === report.conducteur_id)?.nom : 'Inconnu',
                severity
            });
        });

        const pieData = Object.entries(infractionStatsByType)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const driverPointsData = Object.entries(pointsLostByDriver)
            .map(([id, points]) => {
                const d = mockConducteurs.find(c => c.id === id);
                return { name: d ? `${d.prenom} ${d.nom}` : 'Inconnu', points };
            })
            .sort((a, b) => b.points - a.points)
            .slice(0, 5);

        const invariantPointsData = Object.entries(pointsLostByInvariant)
            .map(([name, points]) => ({ name, points }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 5);

        recentInfractionsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Calcul score sécurité
        const baseScore = 100;
        const penalty = (totalScpLost * 2) + (totalInfractionsCount * 0.5); 
        const safetyScore = Math.max(0, Math.round(baseScore - penalty));

        return {
            monthlyData,
            pieData,
            driverPointsData,
            invariantPointsData,
            recentInfractions: recentInfractionsList.slice(0, 5),
            kpis: {
                distance: Math.round(totalDistance),
                infractions: totalInfractionsCount,
                scpLost: totalScpLost,
                safetyScore
            }
        };
    }, [selectedPartnerId, selectedDriverId, currentYear]);

    const PIE_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#64748b'];

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Header Filtres */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Vue d'ensemble {currentYear}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{selectedPartnerId === 'all' ? 'Tous les partenaires' : 'Partenaire sélectionné'}</p>
                    </div>
                </div>

                <div className="relative w-full md:w-72">
                    <select 
                        value={selectedDriverId} 
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="w-full appearance-none pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all cursor-pointer font-medium text-sm"
                    >
                        <option value="">Tous les conducteurs</option>
                        {availableDrivers.map(d => (
                            <option key={d.id} value={d.id}>{d.nom} {d.prenom}</option>
                        ))}
                    </select>
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Partenaires" 
                    value={selectedPartnerId === 'all' ? mockConducteurs.length : 1} 
                    icon={User} 
                    color="bg-slate-500" 
                />
                <StatCard 
                    title="Conducteurs avec Clé OBC" 
                    value={`${driversKeyStats.withKey} / ${driversKeyStats.total}`} 
                    icon={Key} 
                    color="bg-indigo-500"
                />
                <StatCard 
                    title="Véhicules" 
                    value={vehicleCount} 
                    icon={Truck} 
                    color="bg-blue-500" 
                />
                <StatCard 
                    title="Infractions (Total Année)" 
                    value={dashboardData.kpis.infractions} 
                    icon={AlertTriangle} 
                    trend={0} 
                    color="bg-red-500" 
                />
            </div>

            {/* Row 2: Infractions Overview & Recent List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Aperçu des Infractions (Graphique optimisé) */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">Aperçu des Infractions ({currentYear})</h3>
                    <p className="text-xs text-slate-500 mb-6">Nombre d'infractions par mois.</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dashboardData.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip unit="" />} cursor={{fill: '#f1f5f9', opacity: 0.4}} />
                                <Bar dataKey="infractions" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} name="Infractions" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Infractions Récentes */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">Infractions récentes</h3>
                    <p className="text-xs text-slate-500 mb-6">Les 5 dernières infractions enregistrées.</p>
                    
                    <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                        {dashboardData.recentInfractions.length > 0 ? (
                            dashboardData.recentInfractions.map((inf, idx) => (
                                <div key={idx} className="flex items-start gap-3 pb-3 border-b border-slate-50 dark:border-slate-700 last:border-0 group">
                                    <div className="mt-1 p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg group-hover:bg-red-100 transition-colors">
                                        <AlertTriangle size={14} className="text-red-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white line-clamp-1" title={inf.type_infraction}>{inf.type_infraction}</p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(inf.date).toLocaleDateString()} • <span className="font-medium">{inf.driverName}</span>
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                <Award size={32} className="mb-2 opacity-50" />
                                <p className="text-sm">Aucune infraction récente pour {currentYear}.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 3: Time Analysis (Graphiques optimisés) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Temps de Travail */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">Temps de Travail (h)</h3>
                    <p className="text-xs text-slate-500 mb-4">Cumul mensuel.</p>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dashboardData.monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip unit="h" />} cursor={{fill: '#f1f5f9', opacity: 0.4}} />
                                <Bar dataKey="travail" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Heures" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Temps de Conduite */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">Temps de Conduite (h)</h3>
                    <p className="text-xs text-slate-500 mb-4">Cumul mensuel.</p>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dashboardData.monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip unit="h" />} cursor={{fill: '#f1f5f9', opacity: 0.4}} />
                                <Bar dataKey="conduite" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Heures" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Temps de Repos */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">Temps de Repos (h)</h3>
                    <p className="text-xs text-slate-500 mb-4">Cumul mensuel.</p>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dashboardData.monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip unit="h" />} cursor={{fill: '#f1f5f9', opacity: 0.4}} />
                                <Bar dataKey="repos" fill="#10b981" radius={[3, 3, 0, 0]} name="Heures" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 4: Distribution & Points Analysis (Optimisé avec Layout Vertical propre) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Répartition des Infractions */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">Répartition</h3>
                    <p className="text-xs text-slate-500 mb-4">Par type d'infraction.</p>
                    
                    <div className="h-56 relative">
                        {dashboardData.pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dashboardData.pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {dashboardData.pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                                Aucune donnée pour {currentYear}.
                            </div>
                        )}
                        {/* Custom Legend */}
                        <div className="mt-2 grid grid-cols-1 gap-1 text-xs max-h-24 overflow-y-auto custom-scrollbar">
                            {dashboardData.pieData.map((entry, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                                    <span className="flex-1 truncate text-slate-600 dark:text-slate-300">{entry.name}</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{entry.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Points Perdus par Conducteur (Barres Horizontales optimisées) */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">Points / Conducteur</h3>
                    <p className="text-xs text-slate-500 mb-4">Top 5 conducteurs sanctionnés.</p>
                    
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={dashboardData.driverPointsData} margin={{ top: 5, right: 30, left: 20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                                <XAxis type="number" stroke="#94a3b8" fontSize={10} hide />
                                <YAxis dataKey="name" type="category" width={100} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip unit="pts" />} cursor={{fill: '#f1f5f9', opacity: 0.4}} />
                                <Bar dataKey="points" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={16} name="Points">
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Points Perdus par Invariant (Barres Horizontales optimisées) */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">Points / Invariant</h3>
                    <p className="text-xs text-slate-500 mb-4">Top 5 motifs de sanction.</p>
                    
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={dashboardData.invariantPointsData} margin={{ top: 5, right: 30, left: 20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                                <XAxis type="number" stroke="#94a3b8" fontSize={10} hide />
                                <YAxis dataKey="name" type="category" width={120} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip unit="pts" />} cursor={{fill: '#f1f5f9', opacity: 0.4}} />
                                <Bar dataKey="points" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} name="Points" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};
