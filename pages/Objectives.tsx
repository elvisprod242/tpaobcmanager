
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, ShieldCheck, Target, BarChart2, AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Objectif, Partenaire, Invariant, UserRole } from '../types';
import { Modal } from '../components/ui/Modal';
import { FormInput, FormSelect } from '../components/ui/FormElements';
import { ViewModeToggle, ViewMode } from '../components/ui/ViewModeToggle';
import { api } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

interface ObjectivesProps {
    selectedPartnerId: string;
    partners: Partenaire[];
    invariants: Invariant[];
    objectives: Objectif[];
    setObjectives: React.Dispatch<React.SetStateAction<Objectif[]>>;
    userRole: UserRole;
}

export const Objectives = ({ selectedPartnerId, partners, invariants, objectives, setObjectives, userRole }: ObjectivesProps) => {
    const { addNotification } = useNotification();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Initialisation : Liste pour Tablette/PC (>= 768px), Grille pour Mobile
    const [viewMode, setViewMode] = useState<ViewMode>(() => window.innerWidth >= 768 ? 'list' : 'grid');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const handleResize = () => { if (window.innerWidth >= 768) setViewMode('list'); else setViewMode('grid'); };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [formData, setFormData] = useState<Partial<Objectif>>({ 
        chapitre: '', 
        cible: 0, 
        unite: '', 
        mode: 'Préventif', 
        frequence: 'Mensuel', 
        partenaire_id: '', 
        invariant_id: '' 
    });

    // État Suppression
    const [deleteAction, setDeleteAction] = useState<{ type: 'single', id: string } | null>(null);

    const filteredObjectives = useMemo(() => {
        return objectives.filter(o => selectedPartnerId === 'all' || o.partenaire_id === selectedPartnerId);
    }, [objectives, selectedPartnerId]);

    useEffect(() => { setCurrentPage(1); }, [selectedPartnerId, itemsPerPage]);

    const totalPages = Math.ceil(filteredObjectives.length / itemsPerPage);
    const paginatedObjectives = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredObjectives.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredObjectives, currentPage, itemsPerPage]);
    
    // Logique pour filtrer les invariants déjà utilisés par ce partenaire
    const currentPartnerId = formData.partenaire_id || selectedPartnerId;
    
    const usedInvariantIds = useMemo(() => {
        return new Set(
            objectives
                .filter(obj => obj.partenaire_id === currentPartnerId && obj.id !== editingId)
                .map(obj => obj.invariant_id)
        );
    }, [objectives, currentPartnerId, editingId]);

    const formInvariants = useMemo(() => {
        return invariants.filter(i => {
            // L'invariant doit appartenir au partenaire ou être global
            const matchesPartner = i.partenaire_id === 'all' || i.partenaire_id === currentPartnerId;
            // L'invariant ne doit pas déjà avoir d'objectif (sauf si c'est celui qu'on édite)
            const isNotUsed = !usedInvariantIds.has(i.id);
            return matchesPartner && isNotUsed;
        });
    }, [invariants, currentPartnerId, usedInvariantIds]);

    const selectedInvariant = invariants.find(i => i.id === formData.invariant_id);

    const isReadOnly = userRole === 'directeur';

    const handleSave = async () => {
         if (!formData.invariant_id && !formData.chapitre) return; 
         setIsSaving(true);

         try {
             const newItem = { 
                 id: editingId || `obj_${Date.now()}`, 
                 ...formData,
                 partenaire_id: editingId ? formData.partenaire_id : (selectedPartnerId !== 'all' ? selectedPartnerId : '')
             } as Objectif;

             if (editingId) {
                 await api.addObjectif(newItem); // Upsert
                 setObjectives(prev => prev.map(o => o.id === editingId ? newItem : o));
                 addNotification('success', 'Objectif mis à jour.');
             } else {
                 await api.addObjectif(newItem);
                 setObjectives(prev => [...prev, newItem]);
                 addNotification('success', 'Objectif ajouté.');
             }
             setIsModalOpen(false);
         } catch (error) {
             console.error("Erreur sauvegarde objectif:", error);
             addNotification('error', "Erreur lors de la sauvegarde.");
         } finally {
             setIsSaving(false);
         }
    };

    // --- Gestion Suppression ---
    const requestDelete = (id: string) => setDeleteAction({ type: 'single', id });

    const confirmDelete = async () => {
        if (!deleteAction) return;
        setIsSaving(true);

        try {
            await api.deleteObjectif(deleteAction.id);
            setObjectives(prev => prev.filter(o => o.id !== deleteAction.id));
            addNotification('success', 'Objectif supprimé.');
        } catch (error) {
            console.error("Erreur suppression:", error);
            addNotification('error', "Erreur lors de la suppression.");
        } finally {
            setIsSaving(false);
            setDeleteAction(null);
        }
    };

    const handleOpenModal = (obj?: Objectif) => {
        if(obj) { setEditingId(obj.id); setFormData(obj); }
        else { setEditingId(null); setFormData({ chapitre: '', cible: 0, unite: '', mode: 'Préventif', frequence: 'Mensuel', partenaire_id: selectedPartnerId !== 'all' ? selectedPartnerId : '', invariant_id: '' }); }
        setIsModalOpen(true);
    }
    
    const getInvariantTitle = (id?: string) => {
        if (!id) return null;
        return invariants.find(i => i.id === id)?.titre || 'Invariant Inconnu';
    };

    return (
        <div className="space-y-6 animate-fade-in pb-8">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Gestion des Objectifs</h3>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-700 dark:text-slate-300 shadow-sm">
                        <span className="text-sm text-slate-500 whitespace-nowrap hidden sm:inline">Lignes:</span>
                        <select className="text-sm bg-transparent border-none focus:ring-0 cursor-pointer outline-none dark:bg-slate-800 dark:text-white font-medium" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>

                    <div className="flex gap-3">
                        <ViewModeToggle mode={viewMode} setMode={setViewMode} />
                        {!isReadOnly && (
                            <button 
                                onClick={() => handleOpenModal()} 
                                disabled={selectedPartnerId === 'all'}
                                title={selectedPartnerId === 'all' ? "Sélectionnez un partenaire pour ajouter" : ""}
                                className={`bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${selectedPartnerId === 'all' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'} whitespace-nowrap`}
                            >
                                <Plus size={18} /> <span className="hidden sm:inline">Nouvel Objectif</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedObjectives.map(obj => {
                        const invariantTitle = getInvariantTitle(obj.invariant_id);
                        
                        return (
                        <div key={obj.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col group relative overflow-hidden transition-all hover:shadow-md">
                            {!isReadOnly && (
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10 bg-white/50 dark:bg-slate-800/50 p-1 rounded">
                                    <button onClick={() => handleOpenModal(obj)} className="p-1.5 text-slate-500 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => requestDelete(obj.id)} className="p-1.5 text-slate-500 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                </div>
                            )}
                            
                            <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 mt-0.5">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-white leading-tight mb-1 line-clamp-2">
                                            {invariantTitle || "Objectif Générique"}
                                        </h4>
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                            {obj.chapitre}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target size={18} className="text-slate-400" />
                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Objectif à atteindre</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{obj.cible}</span>
                                    <span className="text-sm font-medium text-slate-500">{obj.unite}</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/30 px-5 py-3 border-t border-slate-100 dark:border-slate-700/50 grid grid-cols-2 gap-4 text-xs">
                                <div className="flex flex-col">
                                    <span className="text-slate-400 mb-0.5">Mode</span>
                                    <span className={`font-semibold ${obj.mode === 'Préventif' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{obj.mode}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-slate-400 mb-0.5">Fréquence</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{obj.frequence}</span>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4">Invariant / Règle</th>
                                <th className="px-6 py-4">Chapitre</th>
                                <th className="px-6 py-4">Cible</th>
                                <th className="px-6 py-4">Mode</th>
                                <th className="px-6 py-4">Fréquence</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {paginatedObjectives.map(obj => {
                                const invariantTitle = getInvariantTitle(obj.invariant_id);
                                return (
                                    <tr key={obj.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                                                    <ShieldCheck size={16} />
                                                </div>
                                                <span className="font-medium text-slate-800 dark:text-white truncate max-w-[250px]" title={invariantTitle || ''}>
                                                    {invariantTitle || "Objectif Générique"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                {obj.chapitre}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
                                                {obj.cible} <span className="text-xs font-normal text-slate-500">{obj.unite}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${obj.mode === 'Préventif' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${obj.mode === 'Préventif' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                                {obj.mode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium text-xs uppercase tracking-wide">
                                            {obj.frequence}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!isReadOnly && (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleOpenModal(obj)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><Edit2 size={16} /></button>
                                                    <button onClick={() => requestDelete(obj.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredObjectives.length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">Aucun objectif défini pour ce partenaire.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 px-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    Affichage de <span className="font-semibold">{paginatedObjectives.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> à <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredObjectives.length)}</span> sur <span className="font-semibold">{filteredObjectives.length}</span> résultats
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
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Modifier Objectif' : 'Nouvel Objectif'} footer={<><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Annuler</button>{!isReadOnly && <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-70">{isSaving && <Loader2 size={16} className="animate-spin" />} Enregistrer</button>}</>}>
                 <div className="space-y-6">
                     <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-3">
                         <div className="flex items-center gap-2 mb-1">
                             <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
                             <h4 className="font-bold text-blue-800 dark:text-blue-200 text-sm uppercase">1. Règle à respecter (Invariant)</h4>
                         </div>
                         <FormSelect 
                            label="" 
                            value={formData.invariant_id} 
                            onChange={(e:any) => setFormData({...formData, invariant_id: e.target.value})} 
                            options={[{value: '', label: 'Sélectionner un invariant...'}, ...formInvariants.map(i => ({value: i.id, label: i.titre}))]} 
                            disabled={isReadOnly || isSaving}
                        />
                        {selectedInvariant && (
                            <div className="text-xs text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 p-3 rounded-lg border border-blue-100 dark:border-blue-900 italic">
                                "{selectedInvariant.description}"
                            </div>
                        )}
                        {!formData.invariant_id && formInvariants.length === 0 && (
                            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 italic">
                                Tous les invariants disponibles ont déjà un objectif assigné.
                            </div>
                        )}
                     </div>

                     <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                             <Target size={18} className="text-slate-500" />
                             <h4 className="font-bold text-slate-600 dark:text-slate-300 text-sm uppercase">2. Définition de la cible</h4>
                        </div>
                        
                        <FormInput label="Chapitre / Catégorie" value={formData.chapitre} onChange={(e:any) => setFormData({...formData, chapitre: e.target.value})} placeholder="Ex: Sécurité Routière" disabled={isReadOnly || isSaving} />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label="Valeur Cible" type="number" value={formData.cible} onChange={(e:any) => setFormData({...formData, cible: parseFloat(e.target.value) || 0})} disabled={isReadOnly || isSaving} />
                            <FormInput label="Unité" value={formData.unite} onChange={(e:any) => setFormData({...formData, unite: e.target.value})} placeholder="Ex: % conformité" disabled={isReadOnly || isSaving} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <FormSelect label="Mode" value={formData.mode} onChange={(e:any) => setFormData({...formData, mode: e.target.value})} options={[{value: 'Préventif', label: 'Préventif'}, {value: 'Curatif', label: 'Curatif'}]} disabled={isReadOnly || isSaving} />
                            <FormSelect 
                                label="Fréquence" 
                                value={formData.frequence} 
                                onChange={(e:any) => setFormData({...formData, frequence: e.target.value})} 
                                options={[
                                    {value: 'Journalier', label: 'Journalier'}, 
                                    {value: 'Hebdomadaire', label: 'Hebdomadaire'}, 
                                    {value: 'Mensuel', label: 'Mensuel'}, 
                                    {value: 'Trimestriel', label: 'Trimestriel'}, 
                                    {value: 'Annuel', label: 'Annuel'}
                                ]} 
                                disabled={isReadOnly || isSaving} 
                            />
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
                        <button onClick={confirmDelete} disabled={isSaving} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-70">
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
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Supprimer l'objectif ?</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
                            Cette action est irréversible.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
