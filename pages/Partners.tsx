
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, CheckSquare, Square, Briefcase, Save, AlertTriangle, Loader2 } from 'lucide-react';
import { Partenaire, UserRole } from '../types';
import { ViewModeToggle, ViewMode } from '../components/ui/ViewModeToggle';
import { Modal } from '../components/ui/Modal';
import { FormInput } from '../components/ui/FormElements';
import { api } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

export const Partners = ({ partners, setPartners, userRole }: { partners: Partenaire[], setPartners: React.Dispatch<React.SetStateAction<Partenaire[]>>, userRole: UserRole }) => {
    const { addNotification } = useNotification();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ nom: '', actif: true });
    const [isSaving, setIsSaving] = useState(false);
    
    // Permissions
    const isReadOnly = userRole === 'directeur';

    // État Suppression
    const [deleteAction, setDeleteAction] = useState<{ type: 'single' | 'bulk', id?: string } | null>(null);

    // Initialisation : Liste pour Tablette/PC (>= 768px), Grille pour Mobile
    const [viewMode, setViewMode] = useState<ViewMode>(() => window.innerWidth >= 768 ? 'list' : 'grid');
    
    // Écouteur de redimensionnement pour adapter la vue dynamiquement
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setViewMode('list');
            } else {
                setViewMode('grid');
            }
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [filter, setFilter] = useState('');
    const [selectedPartners, setSelectedPartners] = useState<Set<string>>(new Set());

    const filteredPartners = useMemo(() => {
        return partners.filter(p => p.nom.toLowerCase().includes(filter.toLowerCase()));
    }, [partners, filter]);

    const handleSelectAll = () => {
        if (selectedPartners.size === filteredPartners.length) {
            setSelectedPartners(new Set());
        } else {
            setSelectedPartners(new Set(filteredPartners.map(p => p.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedPartners);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedPartners(newSelected);
    };

    // --- Gestion Suppression ---
    const requestDelete = (id: string) => setDeleteAction({ type: 'single', id });
    const requestBulkDelete = () => setDeleteAction({ type: 'bulk' });

    const confirmDelete = async () => {
        if (!deleteAction) return;
        setIsSaving(true);

        try {
            if (deleteAction.type === 'single' && deleteAction.id) {
                // Appel API Optimisé
                await api.deletePartenaire(deleteAction.id);
                
                // Mise à jour locale
                setPartners((prev: Partenaire[]) => prev.filter(p => p.id !== deleteAction.id));
                if (selectedPartners.has(deleteAction.id)) {
                    const newSelected = new Set(selectedPartners);
                    newSelected.delete(deleteAction.id);
                    setSelectedPartners(newSelected);
                }
                addNotification('success', 'Partenaire supprimé avec succès.');
            } else if (deleteAction.type === 'bulk') {
                // Pour le bulk, on boucle sur les suppressions unitaires
                const idsToDelete = Array.from(selectedPartners) as string[];
                await Promise.all(idsToDelete.map(id => api.deletePartenaire(id)));

                // Mise à jour locale
                setPartners((prev: Partenaire[]) => prev.filter(p => !selectedPartners.has(p.id)));
                setSelectedPartners(new Set());
                addNotification('success', `${idsToDelete.length} partenaires supprimés.`);
            }
        } catch (error) {
            console.error("Erreur lors de la suppression", error);
            addNotification('error', "Une erreur est survenue lors de la suppression.");
        } finally {
            setIsSaving(false);
            setDeleteAction(null);
        }
    };

    const handleOpenModal = (partner?: Partenaire) => {
        if (partner) {
            setEditingId(partner.id);
            setFormData({ nom: partner.nom, actif: partner.actif });
        } else {
            setEditingId(null);
            setFormData({ nom: '', actif: true });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.nom) return;
        setIsSaving(true);

        const newPartenaire: Partenaire = {
            id: editingId || `part_${Date.now()}`,
            ...formData
        };

        try {
            if (editingId) {
                // Update Optimisé
                await api.updatePartenaire(newPartenaire);
                setPartners(prev => prev.map(p => p.id === editingId ? newPartenaire : p));
                addNotification('success', 'Partenaire mis à jour.');
            } else {
                // Ajout Optimisé
                await api.addPartenaire(newPartenaire);
                setPartners(prev => [...prev, newPartenaire]);
                addNotification('success', 'Nouveau partenaire ajouté.');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erreur sauvegarde", error);
            addNotification('error', "Erreur lors de la sauvegarde du partenaire.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in relative w-full pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="relative w-full sm:w-auto flex-1 max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Rechercher un partenaire..." 
                        className="pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full shadow-sm transition-all"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <div className="flex gap-3">
                    <ViewModeToggle mode={viewMode} setMode={setViewMode} />
                    {!isReadOnly && (
                        <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-blue-900/20">
                            <Plus size={18} strokeWidth={2.5} /> Nouveau Partenaire
                        </button>
                    )}
                </div>
            </div>

            {selectedPartners.size > 0 && !isReadOnly && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl px-4 py-3 flex items-center justify-between animate-zoom-in">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">{selectedPartners.size} sélectionné(s)</span>
                    <button onClick={requestBulkDelete} className="text-red-600 hover:text-red-700 dark:text-red-400 font-medium flex items-center gap-2 px-3 py-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                        <Trash2 size={18} /> Supprimer
                    </button>
                </div>
            )}

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
                    {filteredPartners.map((p: Partenaire) => {
                        const isSelected = selectedPartners.has(p.id);
                        return (
                            <div key={p.id} className={`p-4 rounded-xl border transition-all relative group flex flex-col ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md ' + (p.actif ? '' : 'opacity-75 grayscale')}`}>
                                {!isReadOnly && (
                                    <div className="absolute top-3 left-3 z-10">
                                         <button onClick={() => toggleSelect(p.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                            {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                        </button>
                                    </div>
                                )}
                                {!isReadOnly && (
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 dark:bg-slate-800/80 p-0.5 rounded-lg backdrop-blur-sm">
                                        <button onClick={() => handleOpenModal(p)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"><Edit2 size={14} /></button>
                                        <button onClick={() => requestDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"><Trash2 size={14} /></button>
                                    </div>
                                )}
                                
                                <div className="flex flex-col items-center mt-2 mb-3">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm mb-3">
                                        <Briefcase size={24} />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white text-center line-clamp-1 w-full px-2" title={p.nom}>{p.nom}</h3>
                                </div>
                                
                                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700/50 flex justify-center">
                                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide ${p.actif ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                        {p.actif ? 'Actif' : 'Inactif'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/60 overflow-hidden backdrop-blur-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                {!isReadOnly && (
                                    <th className="px-6 py-4 w-12">
                                         <button onClick={handleSelectAll} className="text-slate-400 hover:text-blue-600 transition-colors">
                                            {selectedPartners.size > 0 && selectedPartners.size === filteredPartners.length ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                        </button>
                                    </th>
                                )}
                                <th className="px-6 py-4 sticky-header">Nom de l'entreprise</th>
                                <th className="px-6 py-4 sticky-header text-center">Statut</th>
                                {!isReadOnly && <th className="px-6 py-4 text-right sticky-header">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {filteredPartners.map(p => {
                                const isSelected = selectedPartners.has(p.id);
                                return (
                                    <tr key={p.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                        {!isReadOnly && (
                                            <td className="px-6 py-4">
                                                <button onClick={() => toggleSelect(p.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                                    {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{p.nom}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${p.actif ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                                                {p.actif ? 'ACTIF' : 'INACTIF'}
                                            </span>
                                        </td>
                                        {!isReadOnly && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                                                    <button onClick={() => requestDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={editingId ? 'Modifier Partenaire' : 'Nouveau Partenaire'}
                footer={
                    <>
                        <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Annuler</button>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <FormInput label="Nom de l'entreprise" value={formData.nom} onChange={(e: any) => setFormData({...formData, nom: e.target.value})} placeholder="Ex: Transport Logistics" disabled={isSaving} />
                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700">
                         <input 
                            type="checkbox" 
                            id="actif" 
                            checked={formData.actif} 
                            onChange={(e) => setFormData({...formData, actif: e.target.checked})}
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                            disabled={isSaving}
                        />
                        <label htmlFor="actif" className="font-medium text-slate-700 dark:text-slate-300 select-none">Partenaire Actif</label>
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
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Supprimer le partenaire ?</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
                            {deleteAction?.type === 'bulk' 
                                ? `Vous allez supprimer ${selectedPartners.size} partenaire(s).` 
                                : "Attention, cette action supprimera également tous les conducteurs et véhicules associés."}
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
