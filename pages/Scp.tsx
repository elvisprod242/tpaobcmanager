
import React, { useState, useMemo } from 'react';
import { Search, Printer, AlertCircle, TrendingDown, User, Gavel, AlertTriangle, AlertOctagon, ChevronDown, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { Partenaire, Conducteur, Infraction, AppView, UserRole, Rapport, Invariant, ScpConfiguration, CleObc } from '../types';
import { isDriverLinkedToPartner, getInfractionSeverity } from '../utils/helpers';

interface ScpProps {
    selectedPartnerId: string;
    partners: Partenaire[];
    globalYear: string;
    onChangeView?: (view: AppView) => void;
    userRole: UserRole;
    infractions: Infraction[];
    reports: Rapport[];
    drivers: Conducteur[];
    invariants: Invariant[];
    scpConfigs: ScpConfiguration[];
    keys: CleObc[];
}

export const Scp = ({ selectedPartnerId, partners, globalYear, onChangeView, userRole, infractions, reports, drivers, invariants, scpConfigs, keys }: ScpProps) => {
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [filterText, setFilterText] = useState('');
    
    const currentYear = globalYear ? parseInt(globalYear) : new Date().getFullYear();
    const isReadOnly = userRole === 'directeur';

    // 1. Filtrer les conducteurs disponibles selon le partenaire sélectionné
    const availableDrivers = useMemo(() => {
        return drivers.filter(c => {
            const matchesPartner = isDriverLinkedToPartner(c, selectedPartnerId, keys);
            return matchesPartner;
        });
    }, [selectedPartnerId, drivers, keys]);

    // 2. Récupérer les infractions du conducteur sélectionné pour l'année en cours
    const driverInfractions = useMemo(() => {
        if (!selectedDriverId) return [];

        return infractions.filter(inf => {
            const infDate = new Date(inf.date);
            // Vérifier l'année
            if (infDate.getFullYear() !== currentYear) return false;

            // Vérifier le conducteur via le rapport lié
            const report = reports.find(r => r.id === inf.rapports_id);
            if (!report) return false; // Si pas de rapport, on ignore (sécurité)
            
            return report.conducteur_id === selectedDriverId;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedDriverId, currentYear, infractions, reports]);

    // 3. Calculs des points (Dynamique via Helper)
    const stats = useMemo(() => {
        const totalPointsStart = 12; // Permis à points classique
        
        let pointsLost = 0;
        driverInfractions.forEach(inf => {
            const severity = getInfractionSeverity(inf, reports, invariants, scpConfigs);
            pointsLost += severity.points;
        });

        // Plafonner à 12 max perdus pour ne pas avoir de solde négatif absurde sans contexte
        const safePointsLost = Math.min(pointsLost, totalPointsStart);

        return {
            pointsLost,
            remainingPoints: totalPointsStart - safePointsLost,
            totalInfractions: driverInfractions.length
        };
    }, [driverInfractions, reports, invariants, scpConfigs]);

    // 4. Filtrage de la liste des infractions via la barre de recherche
    const filteredInfractionsList = useMemo(() => {
        return driverInfractions.filter(inf => {
            const report = reports.find(r => r.id === inf.rapports_id);
            const invariant = report?.invariant_id ? invariants.find(i => i.id === report.invariant_id) : null;
            
            const searchStr = `
                ${inf.type_infraction} 
                ${invariant?.titre || ''} 
                ${inf.mesure_disciplinaire}
            `.toLowerCase();
            
            return searchStr.includes(filterText.toLowerCase());
        });
    }, [driverInfractions, filterText, reports, invariants]);

    const handlePrint = () => {
        window.print();
    };

    const getInvariantTitle = (rapportId: string) => {
        const report = reports.find(r => r.id === rapportId);
        if (!report || !report.invariant_id) return 'Non spécifié';
        const invariant = invariants.find(inv => inv.id === report.invariant_id);
        return invariant ? invariant.titre : 'Non spécifié';
    };

    const handleManageScp = () => {
        if (onChangeView) {
            onChangeView(AppView.SCP_ATTRIBUTION);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Détail des Sanctions par Chauffeur</h2>
                {!isReadOnly && (
                    <button 
                        onClick={handleManageScp}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95"
                    >
                        <Gavel size={18} />
                        Gérer l'attribution des SCP
                    </button>
                )}
            </div>

            {/* Stats Cards (Style Blanc / Standard) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Solde Points Restants */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Solde de Points Restants</h3>
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                <TrendingDown size={20} className={stats.remainingPoints < 6 ? "text-red-500" : ""} />
                            </div>
                        </div>
                        <p className="text-4xl font-bold mt-2 text-slate-800 dark:text-white">
                            {selectedDriverId ? stats.remainingPoints : '- / -'}
                        </p>
                    </div>
                    {/* Decorative bg element */}
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-50 dark:bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors"></div>
                </div>

                {/* Total Points Perdus */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Points Perdus</h3>
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                                <User size={20} />
                            </div>
                        </div>
                        <p className="text-4xl font-bold mt-2 text-amber-600 dark:text-amber-500">
                            {selectedDriverId ? stats.pointsLost : '-'}
                        </p>
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-amber-50 dark:bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 transition-colors"></div>
                </div>

                {/* Total Infractions */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Infractions</h3>
                            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                                <AlertCircle size={20} />
                            </div>
                        </div>
                        <p className="text-4xl font-bold mt-2 text-red-600 dark:text-red-500">
                            {selectedDriverId ? stats.totalInfractions : '-'}
                        </p>
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-red-50 dark:bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-100 dark:group-hover:bg-red-500/20 transition-colors"></div>
                </div>
            </div>

            {/* Filter Bar (Style Standard) */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Filtrer par invariant ou sanction..." 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        disabled={!selectedDriverId}
                    />
                </div>
                
                <div className="relative w-full md:w-72">
                    <select 
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 appearance-none bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                        <option value="">Sélectionner un conducteur</option>
                        {availableDrivers.map(d => (
                            <option key={d.id} value={d.id}>{d.nom} {d.prenom}</option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors w-full md:w-auto justify-center"
                >
                    <Printer size={18} />
                    <span className="hidden md:inline">Imprimer</span>
                </button>
            </div>

            {/* Content Area */}
            {!selectedDriverId ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px] animate-fade-in">
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-4">
                        <User size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-white mb-2">Veuillez sélectionner un conducteur</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md">Choisissez un conducteur dans le menu déroulant ci-dessus pour voir le détail de ses infractions et son solde de points.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Invariant Violé</th>
                                    <th className="px-6 py-4">Type Infraction</th>
                                    <th className="px-6 py-4 text-center">Points Perdus (Est.)</th>
                                    <th className="px-6 py-4">Sanction Appliquée</th>
                                    <th className="px-6 py-4 text-center">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredInfractionsList.map(inf => {
                                    const severity = getInfractionSeverity(inf, reports, invariants, scpConfigs);
                                    const invariantTitle = getInvariantTitle(inf.rapports_id);
                                    
                                    return (
                                        <tr key={inf.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">
                                                {new Date(inf.date).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {invariantTitle !== 'Non spécifié' && <ShieldCheck size={16} className="text-blue-500 shrink-0" />}
                                                    <span className="text-slate-600 dark:text-slate-300 truncate max-w-[200px]" title={invariantTitle}>
                                                        {invariantTitle}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-slate-800 dark:text-white font-medium">
                                                        {inf.type_infraction}
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border w-fit ${severity.type === 'Alarme' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'}`}>
                                                        {severity.type === 'Alarme' ? <AlertOctagon size={10} /> : <AlertTriangle size={10} />}
                                                        {severity.type}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-red-500">
                                                -{severity.points}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 italic">
                                                {inf.mesure_disciplinaire}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {inf.suivi ? (
                                                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-bold" title="Suivi effectué">
                                                        <CheckCircle size={14} /> Traité
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-slate-400 text-xs" title="En attente de suivi">
                                                        <XCircle size={14} /> En attente
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredInfractionsList.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            Aucune infraction trouvée pour ce conducteur avec les filtres actuels.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
