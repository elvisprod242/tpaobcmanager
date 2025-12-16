
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Calendar, Upload, Plus, Users, UserX, Trash2, CheckSquare, Square, ChevronLeft, ChevronRight, Edit2, Save, Eye, Clock, MapPin, Gauge, X, AlertTriangle, AlertOctagon, ShieldCheck, Truck, Timer, Activity } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Rapport, Partenaire, Invariant, Infraction, UserRole } from '../types';
import { mockConducteurs, mockCleObcList, mockVehicules } from '../services/mockData';
import { isDriverLinkedToPartner } from '../utils/helpers';
import { Modal } from '../components/ui/Modal';
import { FormInput, FormSelect } from '../components/ui/FormElements';

interface ReportsProps {
    selectedPartnerId: string;
    partners: Partenaire[];
    invariants: Invariant[];
    reportsData: Rapport[];
    setReportsData: React.Dispatch<React.SetStateAction<Rapport[]>>;
    infractionsData: Infraction[];
    setInfractionsData: React.Dispatch<React.SetStateAction<Infraction[]>>;
    userRole: UserRole;
}

export const Reports = ({ selectedPartnerId, partners, invariants, reportsData, setReportsData, infractionsData, setInfractionsData, userRole }: ReportsProps) => {
    const reports = reportsData;
    const setReports = setReportsData;
    
    // Permissions
    const isReadOnly = userRole === 'directeur';

    const [filter, setFilter] = useState('');
    const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'custom'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
    
    // État pour stocker les IDs des rapports transformés en infraction
    const [processedReports, setProcessedReports] = useState<Set<string>>(new Set());

    // États pour les modales
    const [isInfractionModalOpen, setIsInfractionModalOpen] = useState(false);
    const [infractionFormData, setInfractionFormData] = useState<Partial<Infraction>>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewingReport, setViewingReport] = useState<Rapport | null>(null);
    
    // État spécifique pour la confirmation de suppression
    const [deleteAction, setDeleteAction] = useState<{ type: 'single' | 'bulk', id?: string } | null>(null);

    const [activeTab, setActiveTab] = useState<'assigned' | 'unassigned'>('assigned');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canAdd = selectedPartnerId !== 'all' && !isReadOnly;
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    const initialFormState: Partial<Rapport> = {
        date: new Date().toISOString().split('T')[0],
        partenaire_id: '',
        conducteur_id: '',
        vehicule_id: '',
        invariant_id: '',
        heure_debut: '08:00:00',
        heure_fin: '17:00:00',
        temps_conduite: '00:00:00',
        temps_attente: '00:00:00',
        duree: '00:00:00',
        duree_ralenti: '00:00:00',
        distance_km: 0,
        vitesse_max: 0,
        vitesse_moyenne: 0
    };
    const [formData, setFormData] = useState(initialFormState);

    const resetForm = () => { setFormData(initialFormState); setEditingId(null); };

    // --- Gestion Modal Édition / Création ---
    const handleOpenModal = (report?: Rapport) => {
        if (report) {
            setEditingId(report.id);
            setFormData({ ...report });
        } else {
            resetForm();
            setFormData(prev => ({...prev, partenaire_id: selectedPartnerId !== 'all' ? selectedPartnerId : ''}));
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.partenaire_id || !formData.date) return;
        
        setReports(prev => {
            const reportDate = new Date(formData.date!);
            const jourStr = reportDate.toLocaleDateString('fr-FR', { weekday: 'long' }).charAt(0).toUpperCase() + reportDate.toLocaleDateString('fr-FR', { weekday: 'long' }).slice(1);
            
            const newReport = { 
                ...initialFormState, 
                ...formData,
                id: editingId || `rep_${Date.now()}`,
                jour: jourStr,
            } as Rapport;
            
            return editingId ? prev.map(r => r.id === editingId ? newReport : r) : [newReport, ...prev];
        });
        setIsModalOpen(false); resetForm();
    };

    // --- Gestion Suppression Optimisée ---
    
    // 1. Demande de suppression (Ouvre la modale)
    const requestDelete = (id: string) => {
        setDeleteAction({ type: 'single', id });
    };

    const requestBulkDelete = () => {
        setDeleteAction({ type: 'bulk' });
    };

    // 2. Exécution de la suppression
    const confirmDelete = () => {
        if (!deleteAction) return;

        if (deleteAction.type === 'single' && deleteAction.id) {
            // Suppression unique
            setReports(prev => prev.filter(r => r.id !== deleteAction.id));
            
            // Nettoyage sélection
            if (selectedReports.has(deleteAction.id)) {
                const newSelected = new Set(selectedReports);
                newSelected.delete(deleteAction.id);
                setSelectedReports(newSelected);
            }

            // Si on visionnait ce rapport, on ferme la modale de détail
            if (viewingReport && viewingReport.id === deleteAction.id) {
                setViewingReport(null);
            }
        } else if (deleteAction.type === 'bulk') {
            // Suppression en masse
            setReports(prev => prev.filter(r => !selectedReports.has(r.id)));
            
            // Si le rapport visionné fait partie de la sélection, on le ferme
            if (viewingReport && selectedReports.has(viewingReport.id)) {
                setViewingReport(null);
            }
            
            setSelectedReports(new Set());
        }

        setDeleteAction(null); // Fermer la modale de confirmation
    };

    // --- Gestion Infraction ---
    const handleOpenInfractionForm = () => {
        if (!viewingReport) return;
        
        const invariant = invariants.find(i => i.id === viewingReport.invariant_id);
        
        setInfractionFormData({
            id: `inf_new_${Date.now()}`,
            date: viewingReport.date,
            partenaire_id: viewingReport.partenaire_id,
            rapports_id: viewingReport.id,
            type_infraction: invariant ? invariant.titre : 'Infraction générique',
            nombre: 1,
            mesure_disciplinaire: 'Avertissement',
            autres_mesures_disciplinaire: '',
            suivi: false,
            amelioration: false
        });
        setIsInfractionModalOpen(true);
    };

    const handleSaveInfraction = () => {
        if (!infractionFormData.type_infraction || !viewingReport) return;

        const newProcessed = new Set(processedReports);
        newProcessed.add(viewingReport.id);
        setProcessedReports(newProcessed);

        setInfractionsData(prev => [...prev, infractionFormData as Infraction]);

        alert("Infraction créée avec succès. Le rapport a été marqué comme traité.");

        setIsInfractionModalOpen(false);
        setViewingReport(null);
    };

    // --- Import / Export ---
    const handleImportClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        alert("Simulation : Fichier importé avec succès. Les données seraient traitées ici.");
    };

    // --- Filtrage & Pagination ---
    const filteredReports = useMemo(() => {
         return reports.filter(r => {
            if (selectedPartnerId !== 'all' && r.partenaire_id !== selectedPartnerId) return false;

            const isAssigned = !!r.conducteur_id;
            if (activeTab === 'assigned' && !isAssigned) return false;
            if (activeTab === 'unassigned' && isAssigned) return false;

            const driver = mockConducteurs.find(c => c.id === r.conducteur_id);
            const invariant = invariants.find(i => i.id === r.invariant_id);

            const searchStr = `${driver?.nom || ''} ${driver?.prenom || ''} ${r.date} ${r.jour} ${invariant?.titre || ''}`.toLowerCase();
            const matchesText = searchStr.includes(filter.toLowerCase());
            
            let matchesDate = true;
            const reportDate = new Date(r.date);
            const today = new Date();

            if (dateFilter === 'week') {
                const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
                matchesDate = reportDate >= lastWeek;
            } else if (dateFilter === 'month') {
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                matchesDate = reportDate >= lastMonth;
            } else if (dateFilter === 'custom' && startDate && endDate) {
                matchesDate = reportDate >= new Date(startDate) && reportDate <= new Date(endDate);
            }

            return matchesText && matchesDate;
        });
    }, [reports, filter, dateFilter, startDate, endDate, selectedPartnerId, activeTab, invariants, processedReports]);

    useEffect(() => {
        setCurrentPage(1);
        setSelectedReports(new Set());
    }, [filter, dateFilter, startDate, endDate, selectedPartnerId, itemsPerPage, activeTab, processedReports]);

    const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
    const paginatedReports = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredReports.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredReports, currentPage, itemsPerPage]);

    // --- Helpers pour les selects dynamiques ---
    const availableDrivers = useMemo(() => {
        if (!formData.partenaire_id) return [];
        return mockConducteurs.filter(c => isDriverLinkedToPartner(c, formData.partenaire_id!, mockCleObcList));
    }, [formData.partenaire_id]);

    const availableVehicles = useMemo(() => {
        if (!formData.partenaire_id) return [];
        return mockVehicules.filter(v => v.partenaire_id === formData.partenaire_id);
    }, [formData.partenaire_id]);

    const availableInvariants = useMemo(() => {
        if (!formData.partenaire_id) return [];
        return invariants.filter(i => i.partenaire_id === formData.partenaire_id);
    }, [formData.partenaire_id, invariants]);

    const handleSelectAll = () => {
        if (selectedReports.size === paginatedReports.length && paginatedReports.length > 0) {
            setSelectedReports(new Set());
        } else {
            setSelectedReports(new Set(paginatedReports.map(r => r.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedReports);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedReports(newSelected);
    };

    const getViewingDetails = () => {
        if (!viewingReport) return null;
        const driver = mockConducteurs.find(c => c.id === viewingReport.conducteur_id);
        const vehicle = mockVehicules.find(v => v.id === viewingReport.vehicule_id);
        const invariant = invariants.find(i => i.id === viewingReport.invariant_id);
        return { driver, vehicle, invariant };
    };

    return (
        <div className="space-y-6 animate-fade-in w-full pb-8">
            
            {/* Header Filtres et Actions */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                 <div className="hidden sm:block"><p className="text-slate-500 dark:text-slate-400">Historique des trajets et anomalies</p></div>
                 <div className="flex flex-col lg:flex-row gap-3 flex-wrap">
                     <div className="relative group">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                         <input type="text" placeholder="Rechercher..." className="pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full lg:w-48 shadow-sm transition-all" value={filter} onChange={(e) => setFilter(e.target.value)} />
                     </div>
                     <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-700 dark:text-slate-300 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                        <Calendar size={18} className="text-slate-500 dark:text-slate-400" />
                        <select className="text-sm bg-transparent border-none focus:ring-0 cursor-pointer outline-none pr-6 dark:bg-slate-800 dark:text-white font-medium" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)}>
                            <option value="all">Toutes dates</option>
                            <option value="week">7 derniers jours</option>
                            <option value="month">30 derniers jours</option>
                            <option value="custom">Personnalisé</option>
                        </select>
                     </div>
                     <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-700 dark:text-slate-300 shadow-sm">
                        <span className="text-sm text-slate-500 whitespace-nowrap hidden sm:inline">Lignes:</span>
                        <select className="text-sm bg-transparent border-none focus:ring-0 cursor-pointer outline-none dark:bg-slate-800 dark:text-white font-medium" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                     </div>
                     {dateFilter === 'custom' && (
                         <div className="flex gap-2 animate-fade-in">
                             <input type="date" className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:bg-slate-800 dark:text-white outline-none shadow-sm focus:ring-2 focus:ring-blue-500" value={startDate} onChange={e => setStartDate(e.target.value)} />
                             <input type="date" className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:bg-slate-800 dark:text-white outline-none shadow-sm focus:ring-2 focus:ring-blue-500" value={endDate} onChange={e => setEndDate(e.target.value)} />
                         </div>
                     )}
                     
                     {!isReadOnly && (
                         <>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept=".csv, .xlsx, .xls"
                                onChange={handleFileChange} 
                            />
                            <button 
                                onClick={handleImportClick} 
                                disabled={!canAdd}
                                title={!canAdd ? "Veuillez sélectionner un partenaire pour importer" : "Importer un fichier Excel ou CSV"}
                                className={`bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap ${canAdd ? 'hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 active:scale-95' : 'opacity-50 cursor-not-allowed'}`}
                            >
                                <Upload size={18} strokeWidth={2.5} /> <span className="hidden lg:inline">Importer</span>
                            </button>

                            <button 
                                onClick={() => handleOpenModal()} 
                                disabled={!canAdd}
                                title={!canAdd ? "Veuillez sélectionner un partenaire pour ajouter un rapport" : ""}
                                className={`bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-900/20 whitespace-nowrap ${canAdd ? 'hover:bg-blue-700 hover:shadow-lg active:scale-95' : 'opacity-50 cursor-not-allowed'}`}
                            >
                                <Plus size={18} strokeWidth={2.5} /> Nouveau
                            </button>
                         </>
                     )}
                 </div>
            </div>

            <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
                <button 
                    onClick={() => setActiveTab('assigned')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'assigned' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    <Users size={16} /> Assignés
                </button>
                <button 
                    onClick={() => setActiveTab('unassigned')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${activeTab === 'unassigned' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    <UserX size={16} /> Non Assignés
                </button>
            </div>

            {/* Barre de suppression en masse */}
            {selectedReports.size > 0 && !isReadOnly && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl px-4 py-3 flex items-center justify-between animate-zoom-in">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">{selectedReports.size} rapport(s) sélectionné(s)</span>
                    <button onClick={requestBulkDelete} className="text-red-600 hover:text-red-700 dark:text-red-400 font-medium flex items-center gap-2 px-3 py-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                        <Trash2 size={18} /> Supprimer
                    </button>
                </div>
            )}
            
            {/* Table des Rapports */}
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/60 overflow-hidden backdrop-blur-sm flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                {!isReadOnly && (
                                    <th className="px-6 py-4 w-12 sticky-header bg-slate-50/50 dark:bg-slate-800/50">
                                         <button onClick={handleSelectAll} className="text-slate-400 hover:text-blue-600 transition-colors">
                                            {paginatedReports.length > 0 && selectedReports.size === paginatedReports.length ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                        </button>
                                    </th>
                                )}
                                <th className="px-6 py-4 sticky-header bg-slate-50/50 dark:bg-slate-800/50">Date</th>
                                <th className="px-6 py-4 sticky-header bg-slate-50/50 dark:bg-slate-800/50">Jour</th>
                                <th className="px-6 py-4 sticky-header bg-slate-50/50 dark:bg-slate-800/50">Conducteur</th>
                                <th className="px-6 py-4 sticky-header bg-slate-50/50 dark:bg-slate-800/50">Invariant</th>
                                <th className="px-6 py-4 sticky-header bg-slate-50/50 dark:bg-slate-800/50">Heure Début</th>
                                <th className="px-6 py-4 sticky-header bg-slate-50/50 dark:bg-slate-800/50">Heure Fin</th>
                                <th className="px-6 py-4 text-center sticky-header bg-slate-50/50 dark:bg-slate-800/50">Temps Conduite</th>
                                <th className="px-6 py-4 text-right sticky-header bg-slate-50/50 dark:bg-slate-800/50">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {paginatedReports.map((report) => {
                                const driver = mockConducteurs.find(c => c.id === report.conducteur_id);
                                const invariant = invariants.find(i => i.id === report.invariant_id);
                                const isSelected = selectedReports.has(report.id);
                                const formatDate = (dateString: string) => {
                                    try {
                                        return new Date(dateString).toLocaleDateString('fr-FR');
                                    } catch (e) {
                                        return dateString;
                                    }
                                }

                                return (
                                    <tr key={report.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                        {!isReadOnly && (
                                            <td className="px-6 py-4">
                                                <button onClick={() => toggleSelect(report.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                                    {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-slate-900 dark:text-slate-200">{formatDate(report.date)}</td>
                                        <td className="px-6 py-4">{report.jour}</td>
                                        <td className="px-6 py-4 text-slate-900 dark:text-slate-200 font-medium">
                                            {driver ? `${driver.prenom} ${driver.nom}` : <span className="text-slate-400 italic">Non assigné</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {invariant ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 truncate max-w-[150px]" title={invariant.titre}>
                                                    {invariant.titre}
                                                </span>
                                            ) : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{report.heure_debut}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{report.heure_fin}</td>
                                        <td className="px-6 py-4 text-center bg-amber-100 dark:bg-amber-900/30 font-bold text-amber-700 dark:text-amber-400">
                                            {report.temps_conduite}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setViewingReport(report)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Voir détails"><Eye size={16} /></button>
                                                {!isReadOnly && (
                                                    <>
                                                        <button onClick={() => handleOpenModal(report)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                                        <button onClick={() => requestDelete(report.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        Affichage de <span className="font-semibold">{paginatedReports.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> à <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredReports.length)}</span> sur <span className="font-semibold">{filteredReports.length}</span> résultats
                    </span>
                    <div className="flex items-center gap-2">
                        <button 
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 px-2">Page {currentPage} / {totalPages || 1}</span>
                        <button 
                            disabled={currentPage >= totalPages} 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal Modification / Création Rapport OPTIMISÉ */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Modifier Rapport' : 'Nouveau Rapport'}
                size="large"
                footer={
                    <>
                        <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Annuler</button>
                        <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"><Save size={18} /> Enregistrer</button>
                    </>
                }
            >
                <div className="space-y-6">
                    {/* Section 1 : Contexte */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700">
                        <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Users size={14} /> Contexte du rapport
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput label="Date" type="date" value={formData.date} onChange={(e: any) => setFormData({...formData, date: e.target.value})} />
                            
                            <FormSelect 
                                label="Partenaire" 
                                value={formData.partenaire_id} 
                                onChange={(e:any) => setFormData({...formData, partenaire_id: e.target.value, conducteur_id: '', vehicule_id: ''})} 
                                options={[{value: '', label: 'Sélectionner...'}, ...partners.map(p => ({value: p.id, label: p.nom}))]} 
                                disabled={selectedPartnerId !== 'all'}
                            />

                            <FormSelect 
                                label="Conducteur" 
                                value={formData.conducteur_id} 
                                onChange={(e: any) => setFormData({...formData, conducteur_id: e.target.value})} 
                                disabled={!formData.partenaire_id}
                                options={[
                                    { value: '', label: formData.partenaire_id ? 'Sélectionner un conducteur...' : 'Aucun partenaire actif' },
                                    ...availableDrivers.map(d => ({ value: d.id, label: `${d.prenom} ${d.nom}` }))
                                ]}
                            />

                            <FormSelect 
                                label="Véhicule" 
                                value={formData.vehicule_id} 
                                onChange={(e: any) => setFormData({...formData, vehicule_id: e.target.value})} 
                                disabled={!formData.partenaire_id}
                                options={[
                                    { value: '', label: 'Sélectionner un véhicule...' },
                                    ...availableVehicles.map(v => ({ value: v.id, label: `${v.nom} (${v.immatriculation})` }))
                                ]}
                            />
                        </div>
                        <div className="mt-4">
                            <FormSelect 
                                label="Invariant (Règle associée)" 
                                value={formData.invariant_id} 
                                onChange={(e: any) => setFormData({...formData, invariant_id: e.target.value})} 
                                disabled={!formData.partenaire_id}
                                options={[
                                    { value: '', label: 'Aucun' },
                                    ...availableInvariants.map(i => ({ value: i.id, label: i.titre }))
                                ]}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Section 2 : Horaires */}
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Clock size={14} /> Horaires & Durées
                            </h4>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <FormInput label="Heure Début" type="time" step="1" value={formData.heure_debut} onChange={(e:any) => setFormData({...formData, heure_debut: e.target.value})} />
                                    <FormInput label="Heure Fin" type="time" step="1" value={formData.heure_fin} onChange={(e:any) => setFormData({...formData, heure_fin: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormInput label="Tps Conduite" type="time" step="1" value={formData.temps_conduite} onChange={(e:any) => setFormData({...formData, temps_conduite: e.target.value})} />
                                    <FormInput label="Tps Attente" type="time" step="1" value={formData.temps_attente} onChange={(e:any) => setFormData({...formData, temps_attente: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormInput label="Tps Ralenti" type="time" step="1" value={formData.duree_ralenti} onChange={(e:any) => setFormData({...formData, duree_ralenti: e.target.value})} />
                                    <FormInput label="Durée Totale" type="time" step="1" value={formData.duree} onChange={(e:any) => setFormData({...formData, duree: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        {/* Section 3 : Télémétrie */}
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Activity size={14} /> Télémétrie
                            </h4>
                            <div className="space-y-4">
                                <FormInput 
                                    label="Distance (km)" 
                                    type="number" 
                                    min="0"
                                    value={formData.distance_km} 
                                    onChange={(e:any) => setFormData({...formData, distance_km: parseFloat(e.target.value) || 0})} 
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <FormInput 
                                        label="Vitesse Moy. (km/h)" 
                                        type="number" 
                                        min="0"
                                        value={formData.vitesse_moyenne} 
                                        onChange={(e:any) => setFormData({...formData, vitesse_moyenne: parseFloat(e.target.value) || 0})} 
                                    />
                                    <FormInput 
                                        label="Vitesse Max (km/h)" 
                                        type="number" 
                                        min="0"
                                        value={formData.vitesse_max} 
                                        onChange={(e:any) => setFormData({...formData, vitesse_max: parseFloat(e.target.value) || 0})} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Nouvelle Modale de Détails OPTIMISÉE (Fiche Télématique) */}
            <Modal
                isOpen={!!viewingReport}
                onClose={() => setViewingReport(null)}
                title="Détails du Rapport"
                size="large"
                footer={
                    <div className="flex gap-2 w-full">
                        {!isReadOnly && (
                            <>
                                <button onClick={handleOpenInfractionForm} className="flex-1 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-semibold rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2 border border-red-200 dark:border-red-900">
                                    <AlertTriangle size={16} /> Signaler Infraction
                                </button>
                                <button onClick={() => requestDelete(viewingReport!.id)} className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-red-600 dark:text-red-400 font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:border-red-200">
                                    <Trash2 size={16} /> Supprimer
                                </button>
                            </>
                        )}
                        <button onClick={() => setViewingReport(null)} className={`px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium ${isReadOnly ? 'w-full' : ''}`}>
                            Fermer
                        </button>
                    </div>
                }
            >
                {viewingReport && (() => {
                    const details = getViewingDetails();
                    return (
                        <div className="space-y-6">
                            {/* Header Card */}
                            <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xl shadow-inner">
                                        {details?.driver ? `${details.driver.prenom[0]}${details.driver.nom[0]}` : <Users />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                            {details?.driver ? `${details.driver.prenom} ${details.driver.nom}` : 'Conducteur Inconnu'}
                                        </h3>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            <Calendar size={14} />
                                            <span>{new Date(viewingReport.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm font-medium flex items-center gap-2 shadow-sm">
                                        <Truck size={14} className="text-slate-400" />
                                        {details?.vehicle ? details.vehicle.nom : 'Véhicule N/A'}
                                        <span className="text-slate-400">|</span>
                                        <span className="font-mono text-slate-600 dark:text-slate-300">{details?.vehicle?.immatriculation || '---'}</span>
                                    </div>
                                    {details?.invariant && (
                                        <div className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-100 dark:border-blue-900 flex items-center gap-1">
                                            <ShieldCheck size={12} /> {details.invariant.titre}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg mb-1">
                                        <MapPin size={24} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Distance</span>
                                    <span className="text-2xl font-bold text-slate-800 dark:text-white">{viewingReport.distance_km} km</span>
                                </div>
                                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg mb-1">
                                        <Activity size={24} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Vitesse Moy.</span>
                                    <span className="text-2xl font-bold text-slate-800 dark:text-white">{viewingReport.vitesse_moyenne} km/h</span>
                                </div>
                                <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg mb-1">
                                        <Gauge size={24} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Vitesse Max</span>
                                    <span className="text-2xl font-bold text-slate-800 dark:text-white">{viewingReport.vitesse_max} km/h</span>
                                </div>
                            </div>

                            {/* Timeline Bar */}
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                    <Clock size={16} /> Chronologie
                                </h4>
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="font-mono text-slate-500">{viewingReport.heure_debut}</span>
                                    <div className="flex-1 mx-4 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
                                        <div className="absolute left-0 top-0 bottom-0 bg-blue-500 w-3/4 rounded-full opacity-30"></div>
                                    </div>
                                    <span className="font-mono text-slate-500">{viewingReport.heure_fin}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
                                    <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border-l-4 border-amber-500">
                                        <span className="text-xs text-slate-500 block">Conduite</span>
                                        <span className="font-bold text-slate-800 dark:text-white font-mono">{viewingReport.temps_conduite}</span>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border-l-4 border-emerald-500">
                                        <span className="text-xs text-slate-500 block">Attente</span>
                                        <span className="font-bold text-slate-800 dark:text-white font-mono">{viewingReport.temps_attente}</span>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border-l-4 border-slate-400">
                                        <span className="text-xs text-slate-500 block">Ralenti</span>
                                        <span className="font-bold text-slate-800 dark:text-white font-mono">{viewingReport.duree_ralenti}</span>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border-l-4 border-blue-500">
                                        <span className="text-xs text-slate-500 block">Durée Totale</span>
                                        <span className="font-bold text-slate-800 dark:text-white font-mono">{viewingReport.duree}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* Modal de Création d'Infraction (Secondaire) */}
            <Modal
                isOpen={isInfractionModalOpen}
                onClose={() => setIsInfractionModalOpen(false)}
                title="Création d'une Infraction"
                footer={
                    <>
                        <button onClick={() => setIsInfractionModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Annuler</button>
                        <button onClick={handleSaveInfraction} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md flex items-center gap-2">
                            <AlertTriangle size={16} /> Confirmer l'infraction
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    {/* Rappel du contexte */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {viewingReport ? new Date(viewingReport.date).toLocaleDateString() : '-'}
                            </span>
                        </div>
                        <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
                        <div className="flex items-center gap-2">
                            <Users size={14} className="text-slate-400" />
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {viewingReport ? mockConducteurs.find(c => c.id === viewingReport.conducteur_id)?.nom : '-'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <FormInput 
                            label="Type d'infraction" 
                            value={infractionFormData.type_infraction || ''} 
                            onChange={(e: any) => setInfractionFormData({...infractionFormData, type_infraction: e.target.value})} 
                            placeholder="Ex: Excès de vitesse"
                        />
                        <FormInput 
                            label="Nombre" 
                            type="number" 
                            min="1" 
                            value={infractionFormData.nombre || 1} 
                            onChange={(e: any) => setInfractionFormData({...infractionFormData, nombre: parseInt(e.target.value) || 1})} 
                        />
                    </div>

                    <div className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                        La sévérité (Alerte/Alarme) sera calculée automatiquement selon l'invariant lié au rapport.
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-500 uppercase">Sanctions</h4>
                        <FormInput 
                            label="Mesure Disciplinaire" 
                            value={infractionFormData.mesure_disciplinaire || ''} 
                            onChange={(e: any) => setInfractionFormData({...infractionFormData, mesure_disciplinaire: e.target.value})} 
                            placeholder="Ex: Avertissement écrit"
                        />
                    </div>
                </div>
            </Modal>

            {/* Modal de Confirmation de Suppression (Nouveau) */}
            <Modal
                isOpen={!!deleteAction}
                onClose={() => setDeleteAction(null)}
                title="Confirmation de suppression"
                size="default"
                footer={
                    <>
                        <button 
                            onClick={() => setDeleteAction(null)} 
                            className="flex-1 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-semibold transition-colors"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={confirmDelete} 
                            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} /> Confirmer
                        </button>
                    </>
                }
            >
                <div className="flex flex-col items-center text-center p-6 space-y-4">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full animate-bounce-short">
                        <AlertTriangle size={48} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            Êtes-vous sûr de vouloir supprimer ?
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                            {deleteAction?.type === 'bulk' 
                                ? `Vous allez supprimer définitivement ${selectedReports.size} rapport(s).` 
                                : "Ce rapport sera définitivement effacé de la base de données."}
                        </p>
                        <p className="text-xs text-red-500 font-medium pt-2">
                            Cette action est irréversible.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
