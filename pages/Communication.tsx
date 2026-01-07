
import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Edit2, CheckSquare, Square, Calendar, User, Video, ChevronRight, Loader2, AlertTriangle, MessageSquare } from 'lucide-react';
import { CommunicationPlan, CommunicationExecution, Partenaire, UserRole } from '../types';
import { ViewModeToggle, ViewMode } from '../components/ui/ViewModeToggle';
import { Modal } from '../components/ui/Modal';
import { FormInput, FormSelect } from '../components/ui/FormElements';
import { api } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

interface CommunicationProps {
    selectedPartnerId: string;
    partners: Partenaire[];
    plans: CommunicationPlan[];
    setPlans: React.Dispatch<React.SetStateAction<CommunicationPlan[]>>;
    executions: CommunicationExecution[];
    setExecutions: React.Dispatch<React.SetStateAction<CommunicationExecution[]>>;
    userRole: UserRole;
}

export const Communication = ({ selectedPartnerId, partners, plans, setPlans, executions, setExecutions, userRole }: CommunicationProps) => {
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [filter, setFilter] = useState('');
    const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
    
    // Modal & CRUD
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<CommunicationPlan>>({
        periode: '', theme: '', animateur: '', partenaire_id: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [deleteAction, setDeleteAction] = useState<{ type: 'single' | 'bulk', id?: string } | null>(null);

    const isReadOnly = userRole === 'directeur';

    // Filters
    const filteredPlans = useMemo(() => {
        return plans.filter(p => {
            const matchesPartner = selectedPartnerId === 'all' || p.partenaire_id === selectedPartnerId;
            const matchesSearch = p.theme.toLowerCase().includes(filter.toLowerCase()) || 
                                  p.animateur.toLowerCase().includes(filter.toLowerCase()) ||
                                  p.periode.toLowerCase().includes(filter.toLowerCase());
            return matchesPartner && matchesSearch;
        });
    }, [plans, selectedPartnerId, filter]);

    // Actions
    const handleSelectAll = () => {
        if (selectedPlans.size === filteredPlans.length && filteredPlans.length > 0) {
            setSelectedPlans(new Set());
        } else {
            setSelectedPlans(new Set(filteredPlans.map(p => p.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedPlans);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedPlans(newSelected);
    };

    const handleOpenModal = (plan?: CommunicationPlan) => {
        if (plan) {
            setEditingId(plan.id);
            setFormData(plan);
        } else {
            setEditingId(null);
            setFormData({
                periode: '', theme: '', animateur: '', 
                partenaire_id: selectedPartnerId !== 'all' ? selectedPartnerId : ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.theme || !formData.periode) return;
        setIsSaving(true);

        try {
            const newItem = {
                id: editingId || `plan_${Date.now()}`,
                ...formData
            } as CommunicationPlan;

            if (editingId) {
                await api.addCommunicationPlan(newItem);
                setPlans(prev => prev.map(p => p.id === editingId ? newItem : p));
                addNotification('success', 'Planning mis à jour.');
            } else {
                await api.addCommunicationPlan(newItem);
                setPlans(prev => [...prev, newItem]);
                addNotification('success', 'Nouveau planning ajouté.');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erreur sauvegarde:", error);
            addNotification('error', "Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

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
                await api.deleteCommunicationPlan(deleteAction.id);
                setPlans(prev => prev.filter(p => p.id !== deleteAction.id));
                if (selectedPlans.has(deleteAction.id)) {
                    const newSet = new Set(selectedPlans);
                    newSet.delete(deleteAction.id);
                    setSelectedPlans(newSet);
                }
                addNotification('success', 'Planning supprimé.');
            } else if (deleteAction.type === 'bulk') {
                const idsToDelete = Array.from(selectedPlans) as string[];
                await Promise.all(idsToDelete.map(id => api.deleteCommunicationPlan(id)));
                setPlans(prev => prev.filter(p => !selectedPlans.has(p.id)));
                setSelectedPlans(new Set());
                addNotification('success', `${idsToDelete.length} plannings supprimés.`);
            }
        } catch (error) {
            console.error("Erreur suppression:", error);
            addNotification('error', "Erreur lors de la suppression.");
        } finally {
            setIsSaving(false);
            setDeleteAction(null);
        }
    };

    const goToDetails = (id: string) => navigate(`/communication/${id}`);

    return (
        <div className="space-y-6 animate-fade-in w-full pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="relative w-full sm:w-auto flex-1 max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Rechercher (thème, animateur)..." 
                        className="pl-10 pr-4 py-2.5 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <div className="flex gap-3">
                    <ViewModeToggle mode={viewMode} setMode={setViewMode} />
                    {!isReadOnly && (
                        <button 
                            onClick={() => handleOpenModal()} 
                            disabled={selectedPartnerId === 'all'}
                            className={`bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-md ${selectedPartnerId === 'all' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                        >
                            <Plus size={18} /> <span className="hidden sm:inline">Nouveau Planning</span>
                        </button>
                    )}
                </div>
            </div>

            {selectedPlans.size > 0 && !isReadOnly && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl px-4 py-3 flex items-center justify-between animate-zoom-in">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">{selectedPlans.size} élément(s) sélectionné(s)</span>
                    <button onClick={requestBulkDelete} className="text-red-600 hover:text-red-700 dark:text-red-400 font-medium flex items-center gap-2 px-3 py-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                        <Trash2 size={18} /> Supprimer
                    </button>
                </div>
            )}

            {viewMode === 'list' ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 w-12">
                                     <button onClick={handleSelectAll} className="text-slate-400 hover:text-blue-600 transition-colors">
                                        {selectedPlans.size > 0 && selectedPlans.size === filteredPlans.length ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                    </button>
                                </th>
                                <th className="px-6 py-4">Période</th>
                                <th className="px-6 py-4">Thème</th>
                                <th className="px-6 py-4">Animateur</th>
                                <th className="px-6 py-4 text-center">Support</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredPlans.map(p => {
                                const isSelected = selectedPlans.has(p.id);
                                const exec = executions.find(e => e.planning_communication_id === p.id);
                                return (
                                    <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                        <td className="px-6 py-4">
                                            {!isReadOnly && <button onClick={() => toggleSelect(p.id)} className="text-slate-400 hover:text-blue-600 transition-colors">{isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}</button>}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400">{p.periode}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{p.theme}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                <User size={14} className="text-slate-400" /> {p.animateur}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {exec?.video ? <Video size={16} className="text-blue-500 inline" /> : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => goToDetails(p.id)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 transition-colors"><ChevronRight size={16} /></button>
                                                {!isReadOnly && (
                                                    <>
                                                        <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                                                        <button onClick={(e) => requestDelete(p.id, e)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredPlans.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Aucun planning trouvé.</td></tr>}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPlans.map(p => {
                        const isSelected = selectedPlans.has(p.id);
                        const exec = executions.find(e => e.planning_communication_id === p.id);
                        return (
                            <div key={p.id} className={`p-5 rounded-2xl border transition-all relative group flex flex-col gap-3 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'}`}>
                                {!isReadOnly && (
                                    <div className="absolute top-4 left-4 z-10">
                                        <button onClick={() => toggleSelect(p.id)} className="text-slate-400 hover:text-blue-600 transition-colors">{isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}</button>
                                    </div>
                                )}
                                {!isReadOnly && (
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 dark:bg-slate-800/80 p-1 rounded-lg z-10">
                                        <button onClick={() => handleOpenModal(p)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={(e) => requestDelete(p.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                )}
                                
                                <div className="flex justify-center py-4">
                                    <div className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                                        <MessageSquare size={32} />
                                    </div>
                                </div>

                                <div className="text-center">
                                    <h3 className="font-bold text-slate-800 dark:text-white text-lg line-clamp-1">{p.theme}</h3>
                                    <span className="text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded mt-1 inline-block">{p.periode}</span>
                                </div>

                                <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-auto flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                        <User size={14} /> {p.animateur}
                                    </div>
                                    <button onClick={() => goToDetails(p.id)} className="text-blue-600 hover:underline flex items-center gap-1 text-xs font-bold">
                                        Détails <ChevronRight size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Modifier Planning' : 'Nouveau Planning'} footer={
                <>
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Annuler</button>
                    {!isReadOnly && <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-70">{isSaving && <Loader2 size={16} className="animate-spin" />} Enregistrer</button>}
                </>
            }>
                <div className="space-y-4">
                    <FormSelect label="Partenaire" value={formData.partenaire_id} onChange={(e: any) => setFormData({...formData, partenaire_id: e.target.value})} options={[{value: '', label: 'Sélectionner...'}, ...partners.map(p => ({value: p.id, label: p.nom}))]} disabled={selectedPartnerId !== 'all' || isReadOnly || isSaving} />
                    <FormInput label="Thème de la communication" value={formData.theme} onChange={(e: any) => setFormData({...formData, theme: e.target.value})} placeholder="Ex: Sécurité routière" disabled={isReadOnly || isSaving} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormInput label="Période" value={formData.periode} onChange={(e: any) => setFormData({...formData, periode: e.target.value})} placeholder="Ex: Janvier 2025" disabled={isReadOnly || isSaving} />
                        <FormInput label="Animateur" value={formData.animateur} onChange={(e: any) => setFormData({...formData, animateur: e.target.value})} placeholder="Ex: Jean Dupont" disabled={isReadOnly || isSaving} />
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!deleteAction} onClose={() => setDeleteAction(null)} title="Confirmation" size="default" footer={
                <>
                    <button onClick={() => setDeleteAction(null)} className="flex-1 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-semibold">Annuler</button>
                    <button onClick={confirmDelete} disabled={isSaving} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold flex items-center justify-center gap-2 disabled:opacity-70">{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />} Confirmer</button>
                </>
            }>
                <div className="flex flex-col items-center text-center p-6 space-y-4">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full"><AlertTriangle size={48} /></div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Supprimer le planning ?</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Cette action supprimera également les vidéos et fichiers associés.</p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
