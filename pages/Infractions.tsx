import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, Eye, Upload, FileText, XCircle, AlertTriangle, AlertOctagon, Calendar, FolderSearch, ShieldCheck, Search, Filter, User, Image as ImageIcon, ChevronLeft, ChevronRight, Loader2, CheckSquare, Square } from 'lucide-react';
import { Infraction, Partenaire, Rapport, InfractionFile, Invariant, UserRole, Conducteur } from '../types';
import { Modal } from '../components/ui/Modal';
import { FormInput, FormSelect } from '../components/ui/FormElements';
import { ViewModeToggle, ViewMode } from '../components/ui/ViewModeToggle';
import { api } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

interface InfractionsProps {
    selectedPartnerId: string;
    partners: Partenaire[];
    reports: Rapport[];
    invariants: Invariant[];
    infractionsData: Infraction[];
    setInfractionsData: React.Dispatch<React.SetStateAction<Infraction[]>>;
    onViewFiles: (infractionId: string) => void;
    userRole: UserRole;
    drivers: Conducteur[];
}

export const Infractions = ({ selectedPartnerId, partners, reports, invariants, infractionsData, setInfractionsData, onViewFiles, userRole, drivers }: InfractionsProps) => {
    const { addNotification } = useNotification();
    const infractions = infractionsData;
    const setInfractions = setInfractionsData;
    
    // États d'interface & Filtres
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // État Suppression et Sélection
    const [deleteAction, setDeleteAction] = useState<{ type: 'single' | 'bulk', id?: string } | null>(null);
    const [selectedInfractions, setSelectedInfractions] = useState<Set<string>>(new Set());

    const [searchText, setSearchText] = useState('');
    const [monthFilter, setMonthFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>(''); 

    const [formData, setFormData] = useState<Partial<Infraction>>({ 
        date: new Date().toISOString().split('T')[0],
        type_infraction: 'Alerte',
        nombre: 1, 
        mesure_disciplinaire: 'Avertissement', 
        autres_mesures_disciplinaire: '',
        suivi: false, 
        date_suivi: '',
        amelioration: false,
        partenaire_id: '', 
        rapports_id: '',
        files: []
    });

    const isReadOnly = userRole === 'directeur';

    const months = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];

    // --- Helpers d'affichage ---
    const getConducteurName = (rapportId: string) => {
        const report = reports.find(r => r.id === rapportId);
        if (!report) return 'Conducteur Inconnu';
        const driver = drivers.find(c => c.id === report.conducteur_id);
        return driver ? `${driver.nom} ${driver.prenom}` : 'Inconnu';
    };

    const getInvariantTitle = (rapportId: string) => {
        const report = reports.find(r => r.id === rapportId);
        if (!report || !report.invariant_id) return '-';
        const invariant = invariants.find(inv => inv.id === report.invariant_id);
        return invariant ? invariant.titre : '-';
    };

    // --- Filtrage ---
    const filteredInfractions = useMemo(() => {
        return infractions.filter(inf => {
            if (selectedPartnerId !== 'all' && inf.partenaire_id !== selectedPartnerId) return false;
            if (monthFilter !== '') {
                const d = new Date(inf.date);
                if (d.getMonth().toString() !== monthFilter) return false;
            }
            if (typeFilter && inf.type_infraction !== typeFilter) return false;
            if (searchText) {
                const lowerSearch = searchText.toLowerCase();
                const driver = getConducteurName(inf.rapports_id).toLowerCase();
                const invariant = getInvariantTitle(inf.rapports_id).toLowerCase();
                const mesure = inf.mesure_disciplinaire.toLowerCase();
                return driver.includes(lowerSearch) || invariant.includes(lowerSearch) || mesure.includes(lowerSearch);
            }
            return true;
        });
    }, [infractions, selectedPartnerId, monthFilter, typeFilter, searchText, reports, invariants, drivers]);

    // Reset page quand le filtre change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedPartnerId, monthFilter, typeFilter, searchText, itemsPerPage]);

    const totalPages = Math.ceil(filteredInfractions.length / itemsPerPage);
    const paginatedInfractions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredInfractions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredInfractions, currentPage, itemsPerPage]);

    // --- Sélection Multiple ---
    const handleSelectAll = () => {
        if (selectedInfractions.size === paginatedInfractions.length && paginatedInfractions.length > 0) {
            setSelectedInfractions(new Set());
        } else {
            setSelectedInfractions(new Set(paginatedInfractions.map(i => i.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedInfractions);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedInfractions(newSelected);
    };

    // --- Actions CRUD ---
    const handleSave = async () => {
        if (!formData.partenaire_id) return;
        setIsSaving(true);

        try {
            const newItem = { id: editingId || `inf_${Date.now()}`, ...formData } as Infraction;
            
            if (editingId) {
                await api.addInfraction(newItem); // Upsert
                setInfractions(prev => prev.map(i => i.id === editingId ? newItem : i));
                addNotification('success', 'Infraction mise à jour.');
            } else {
                await api.addInfraction(newItem);
                setInfractions(prev => [...prev, newItem]);
                addNotification('success', 'Infraction créée.');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erreur sauvegarde infraction:", error);
            addNotification('error', "Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Suppression Optimisée ---
    const requestDelete = (id: string, e?: React.MouseEvent) => {
        if(e) e.stopPropagation();
        setDeleteAction({ type: 'single', id });
    };

    const requestBulkDelete = () => setDeleteAction({ type: 'bulk' });

    const confirmDelete = async () => {
        if (!deleteAction) return;
        setIsSaving(true);

        try {
            if (deleteAction.type === 'single' && deleteAction.id) {
                await api.deleteInfraction(deleteAction.id);
                setInfractions(prev => prev.filter(i => i.id !== deleteAction.id));
                
                // Mise à jour de la sélection si l'élément était coché
                if (selectedInfractions.has(deleteAction.id)) {
                    const newSelected = new Set(selectedInfractions);
                    newSelected.delete(deleteAction.id);
                    setSelectedInfractions(newSelected);
                }
                
                addNotification('success', 'Infraction supprimée.');
            } else if (deleteAction.type === 'bulk') {
                const idsToDelete = Array.from(selectedInfractions) as string[];
                // Utilisation de la méthode Batch optimisée
                await api.deleteInfractionsBulk(idsToDelete);
                
                setInfractions(prev => prev.filter(i => !selectedInfractions.has(i.id)));
                setSelectedInfractions(new Set());
                addNotification('success', `${idsToDelete.length} infractions supprimées.`);
            }
        } catch (error) {
            console.error("Erreur suppression:", error);
            addNotification('error', "Erreur lors de la suppression.");
        } finally {
            setIsSaving(false);
            setDeleteAction(null);
        }
    };

    const handleOpenModal = (inf?: Infraction) => {
        if(inf) { setEditingId(inf.id); setFormData(inf); } 
        else { setEditingId(null); setFormData({ date: new Date().toISOString().split('T')[0], type_infraction: 'Alerte', nombre: 1, mesure_disciplinaire: 'Avertissement', autres_mesures_disciplinaire: '', suivi: false, amelioration: false, date_suivi: '', partenaire_id: selectedPartnerId !== 'all' ? selectedPartnerId : '', rapports_id: '', files: [] }); }
        setIsModalOpen(true);
    };

    const filteredReportsForForm = reports.filter(r => r.partenaire_id === formData.partenaire_id);

    return (
        <div className="space-y-6 animate-fade-in w-full pb-8">
             <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex flex-col md:flex-row gap-3 flex-1">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Rechercher..." className="pl-10 pr-4 py-2.5 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0">
                        <div className="relative min-w-[140px]">
                            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-full appearance-none pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium">
                                <option value="">Tous les mois</option>
                                {months.map((m, index) => (<option key={index} value={index}>{m}</option>))}
                            </select>
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative min-w-[140px]">
                            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full appearance-none pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium">
                                <option value="">Tous types</option>
                                <option value="Alerte">Alerte</option>
                                <option value="Alarme">Alarme</option>
                            </select>
                            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative min-w-[120px]">
                            <select className="w-full appearance-none pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                                <option value={10}>10 / page</option>
                                <option value={20}>20 / page</option>
                                <option value={30}>30 / page</option>
                                <option value={50}>50 / page</option>
                                <option value={100}>100 / page</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    <ViewModeToggle mode={viewMode} setMode={setViewMode} />
                    {!isReadOnly && (
                        <button onClick={() => handleOpenModal()} disabled={selectedPartnerId === 'all'} className={`bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 ${selectedPartnerId === 'all' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'} whitespace-nowrap`}><Plus size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">Nouvelle Infraction</span></button>
                    )}
                </div>
            </div>

            {/* Barre d'action groupée */}
            {selectedInfractions.size > 0 && !isReadOnly && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl px-4 py-3 flex items-center justify-between animate-zoom-in">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">{selectedInfractions.size} élément(s) sélectionné(s)</span>
                    <button onClick={requestBulkDelete} className="text-red-600 hover:text-red-700 dark:text-red-400 font-medium flex items-center gap-2 px-3 py-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                        <Trash2 size={18} /> Supprimer
                    </button>
                </div>
            )}

            {/* --- VUE GRILLE (Mode Carte) --- */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedInfractions.map(inf => {
                        const invariantTitle = getInvariantTitle(inf.rapports_id);
                        const driverName = getConducteurName(inf.rapports_id);
                        const isAlarme = inf.type_infraction === 'Alarme';
                        const isSelected = selectedInfractions.has(inf.id);
                        
                        return (
                            <div key={inf.id} className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm hover:shadow-lg transition-all group flex flex-col relative overflow-hidden ${isSelected ? 'border-blue-400 dark:border-blue-500 bg-blue-50/10' : 'border-slate-200 dark:border-slate-700'}`}>
                                {!isReadOnly && (
                                    <div className="absolute top-3 left-3 z-20">
                                        <button onClick={() => toggleSelect(inf.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                            {isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                                        </button>
                                    </div>
                                )}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isAlarme ? 'bg-red-500' : 'bg-orange-400'}`}></div>
                                <div className="p-5 pl-7 flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-lg ml-6">
                                            <Calendar size={12} /> {new Date(inf.date).toLocaleDateString()}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${isAlarme ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' : 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400'}`}>
                                            {isAlarme ? <AlertOctagon size={10} /> : <AlertTriangle size={10} />}
                                            {inf.type_infraction}
                                        </span>
                                    </div>
                                    <div className="mb-4">
                                        <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-1">
                                            <User size={16} className="text-blue-500" />
                                            <span className="truncate">{driverName}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2 pl-6">
                                            {invariantTitle !== '-' ? invariantTitle : "Motif non spécifié"}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 -mx-5 -mb-5 px-5 py-3 mt-auto border-t border-slate-100 dark:border-slate-700/50">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[120px]" title={inf.mesure_disciplinaire}>
                                                {inf.mesure_disciplinaire}
                                            </span>
                                            {inf.nombre > 1 && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600">x{inf.nombre}</span>}
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                            <div className={`flex items-center gap-1 text-xs ${inf.suivi ? 'text-green-600 dark:text-green-400 font-bold' : 'text-slate-400'}`}>
                                                {inf.suivi ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                                {inf.suivi ? 'Suivi OK' : 'À traiter'}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onViewFiles(inf.id)} className="p-1.5 bg-white dark:bg-slate-700 text-blue-600 rounded shadow-sm hover:bg-blue-50"><FolderSearch size={14} /></button>
                                                {!isReadOnly && (
                                                    <>
                                                        <button onClick={() => handleOpenModal(inf)} className="p-1.5 bg-white dark:bg-slate-700 text-slate-500 rounded shadow-sm hover:text-blue-600"><Edit2 size={14} /></button>
                                                        <button onClick={(e) => requestDelete(inf.id, e)} className="p-1.5 bg-white dark:bg-slate-700 text-red-500 rounded shadow-sm hover:bg-red-50"><Trash2 size={14} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 w-12">
                                         <button onClick={handleSelectAll} className="text-slate-400 hover:text-blue-600 transition-colors">
                                            {selectedInfractions.size > 0 && selectedInfractions.size === paginatedInfractions.length ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Conducteur</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Motif (Invariant)</th>
                                    <th className="px-6 py-4">Sanction (Mesure)</th>
                                    <th className="px-6 py-4">Autres mesures</th>
                                    <th className="px-6 py-4 text-center">Suivi</th>
                                    <th className="px-6 py-4 text-center">Docs</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {paginatedInfractions.map(inf => {
                                    const invariantTitle = getInvariantTitle(inf.rapports_id);
                                    const driverName = getConducteurName(inf.rapports_id);
                                    const isAlarme = inf.type_infraction === 'Alarme';
                                    const isSelected = selectedInfractions.has(inf.id);
                                    
                                    return (
                                    <tr key={inf.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                        <td className="px-6 py-4">
                                            {!isReadOnly && <button onClick={() => toggleSelect(inf.id)} className="text-slate-400 hover:text-blue-600 transition-colors">{isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}</button>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">{new Date(inf.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-white">
                                                <User size={14} className="text-slate-400" />
                                                {driverName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${isAlarme ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' : 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400'}`}>
                                                {isAlarme ? <AlertOctagon size={12} /> : <AlertTriangle size={12} />}
                                                {inf.type_infraction}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 max-w-[200px] truncate" title={invariantTitle}>
                                                <ShieldCheck size={14} className="text-blue-400 shrink-0" />
                                                {invariantTitle}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{inf.mesure_disciplinaire}</td>
                                        <td className="px-6 py-4 text-slate-500 italic max-w-[150px] truncate" title={inf.autres_mesures_disciplinaire}>{inf.autres_mesures_disciplinaire || '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                {inf.suivi ? (
                                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-bold"><CheckCircle size={14} /> {inf.date_suivi ? new Date(inf.date_suivi).toLocaleDateString() : 'Oui'}</span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-slate-400 text-xs"><XCircle size={14} /> Non</span>
                                                )}
                                                {inf.amelioration && <span className="text-[10px] text-blue-500 mt-0.5">Amélioré</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {inf.files && inf.files.length > 0 ? (
                                                <button onClick={() => onViewFiles(inf.id)} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-200 transition-colors">{inf.files.length}</button>
                                            ) : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onViewFiles(inf.id)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors" title="Dossier"><FolderSearch size={16} /></button>
                                                {!isReadOnly && (
                                                    <>
                                                        <button onClick={() => handleOpenModal(inf)} className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-white dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                                        <button onClick={(e) => requestDelete(inf.id, e)} className="p-2 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-white dark:bg-slate-700/50 dark:hover:bg-slate-700 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                                {filteredInfractions.length === 0 && <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-500">Aucune infraction trouvée avec les filtres actuels.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Footer Pagination */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 px-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    Affichage de <span className="font-semibold">{paginatedInfractions.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> à <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredInfractions.length)}</span> sur <span className="font-semibold">{filteredInfractions.length}</span> résultats
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
            
            {/* Modal Création / Edition */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Modifier Infraction' : 'Nouvelle Infraction'} size="large" footer={<><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Annuler</button>{!isReadOnly && <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2 disabled:opacity-70">{isSaving && <Loader2 size={16} className="animate-spin" />} Enregistrer</button>}</>}>
                 {/* ... Formulaire Infraction (Identique) ... */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">Détails de l'infraction</h4>
                        <div className="grid grid-cols-2 gap-4">
                             <FormInput label="Date constat" type="date" value={formData.date} onChange={(e:any) => setFormData({...formData, date: e.target.value})} disabled={isReadOnly || isSaving} />
                             <FormSelect label="Partenaire" value={formData.partenaire_id} onChange={(e:any) => setFormData({...formData, partenaire_id: e.target.value})} options={[{value: '', label: 'Sélectionner...'}, ...partners.map(p => ({value: p.id, label: p.nom}))]} disabled={selectedPartnerId !== 'all' || isReadOnly || isSaving} />
                        </div>
                        <FormSelect label="Rapport Lié (Invariant)" value={formData.rapports_id} onChange={(e:any) => setFormData({...formData, rapports_id: e.target.value})} disabled={!formData.partenaire_id || isReadOnly || isSaving} options={[{value: '', label: 'Sélectionner un rapport...'}, ...filteredReportsForForm.map(r => ({ value: r.id, label: `${new Date(r.date).toLocaleDateString()} - ${getConducteurName(r.id)} (${getInvariantTitle(r.id)})` }))]} />
                        <div className="grid grid-cols-3 gap-4">
                             <div className="col-span-2">
                                <FormSelect label="Type d'infraction (Sévérité)" value={formData.type_infraction} onChange={(e:any) => setFormData({...formData, type_infraction: e.target.value})} options={[{ value: 'Alerte', label: 'Alerte' }, { value: 'Alarme', label: 'Alarme' }]} disabled={isReadOnly || isSaving} />
                             </div>
                             <FormInput label="Nombre" type="number" min="1" value={formData.nombre} onChange={(e:any) => setFormData({...formData, nombre: parseInt(e.target.value) || 1})} disabled={isReadOnly || isSaving} />
                        </div>
                     </div>
                     <div className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">Mesures Disciplinaires</h4>
                            <FormInput label="Mesure Principale" value={formData.mesure_disciplinaire} onChange={(e:any) => setFormData({...formData, mesure_disciplinaire: e.target.value})} placeholder="Ex: Avertissement" disabled={isReadOnly || isSaving} />
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Autres mesures disciplinaire</label>
                                <textarea className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white h-20 resize-none transition-all" value={formData.autres_mesures_disciplinaire || ''} onChange={(e) => setFormData({...formData,autres_mesures_disciplinaire: e.target.value})} placeholder="Ex: Formation complémentaire..." disabled={isReadOnly || isSaving} />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">Suivi & Résultats</h4>
                            <div className="flex flex-wrap gap-6 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.suivi} onChange={(e) => setFormData({...formData, suivi: e.target.checked})} className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500" disabled={isReadOnly || isSaving} />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Suivi effectué</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                     </div>
                 </div>
            </Modal>

            {/* Modal de Confirmation de Suppression */}
            <Modal
                isOpen={!!deleteAction}
                onClose={() => setDeleteAction(null)}
                title="Confirmation"
                size="default"
                footer={
                    <>
                        <button onClick={() => setDeleteAction(null)} className="flex-1 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-semibold">Annuler</button>
                        <button 
                            onClick={confirmDelete} 
                            disabled={isSaving}
                            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />} 
                            Confirmer
                        </button>
                    </>
                }
            >
                <div className="flex flex-col items-center text-center p-6 space-y-4">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full animate-bounce-short">
                        <AlertTriangle size={48} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Supprimer l'infraction ?</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
                            {deleteAction?.type === 'bulk' 
                                ? `Vous allez supprimer ${selectedInfractions.size} infraction(s).` 
                                : "Cette action est irréversible."}
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};