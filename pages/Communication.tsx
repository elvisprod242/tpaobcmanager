
import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Edit2, MessageSquare, Calendar, User, BookOpen, CheckSquare, Square, Save, Eye, LayoutGrid, List, Clock, CheckCircle2, Hourglass, AlertTriangle } from 'lucide-react';
import { CommunicationPlan, Partenaire, UserRole } from '../types';
import { mockCommunicationPlans } from '../services/mockData';
import { Modal } from '../components/ui/Modal';
import { FormInput, FormSelect } from '../components/ui/FormElements';
import { ViewModeToggle, ViewMode } from '../components/ui/ViewModeToggle';

interface CommunicationProps {
    selectedPartnerId: string;
    partners: Partenaire[];
    onViewDetails?: (planId: string) => void;
    userRole: UserRole;
}

type PlanStatus = 'ongoing' | 'upcoming' | 'completed' | 'unknown';

export const Communication = ({ selectedPartnerId, partners, onViewDetails, userRole }: CommunicationProps) => {
    const [plans, setPlans] = useState<CommunicationPlan[]>(mockCommunicationPlans);
    const [filterText, setFilterText] = useState('');
    const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [statusFilter, setStatusFilter] = useState<'all' | PlanStatus>('all');
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<CommunicationPlan>>({
        partenaire_id: '',
        periode: '',
        theme: '',
        animateur: ''
    });

    // État Suppression
    const [deleteAction, setDeleteAction] = useState<{ type: 'single' | 'bulk', id?: string } | null>(null);

    const isReadOnly = userRole === 'directeur';

    // --- Helpers de Date ---

    const getPlanStatus = (periodeStr: string): PlanStatus => {
        if (!periodeStr) return 'unknown';
        
        const months: { [key: string]: number } = {
            'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
            'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
        };

        try {
            const parts = periodeStr.toLowerCase().split(' ');
            if (parts.length < 2) return 'unknown';

            const monthIndex = months[parts[0]];
            const year = parseInt(parts[1]);

            if (isNaN(monthIndex) || isNaN(year)) return 'unknown';

            const planDate = new Date(year, monthIndex);
            const now = new Date();
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth());

            if (planDate.getTime() === currentMonthStart.getTime()) return 'ongoing';
            if (planDate > currentMonthStart) return 'upcoming';
            return 'completed';
        } catch (e) {
            return 'unknown';
        }
    };

    const getStatusConfig = (status: PlanStatus) => {
        switch (status) {
            case 'ongoing': return { label: 'En cours', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400', icon: Clock };
            case 'upcoming': return { label: 'À venir', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400', icon: Hourglass };
            case 'completed': return { label: 'Terminé', color: 'text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400', icon: CheckCircle2 };
            default: return { label: 'Indéfini', color: 'text-slate-400 bg-slate-50', icon: Calendar };
        }
    };

    // --- Filtrage & Tri ---

    const filteredPlans = useMemo(() => {
        return plans.filter(p => {
            // 1. Filtre Partenaire
            const matchesPartner = selectedPartnerId === 'all' || p.partenaire_id === selectedPartnerId;
            
            // 2. Filtre Recherche
            const searchStr = `${p.theme} ${p.animateur} ${p.periode}`.toLowerCase();
            const matchesSearch = searchStr.includes(filterText.toLowerCase());

            // 3. Filtre Statut
            const status = getPlanStatus(p.periode);
            const matchesStatus = statusFilter === 'all' || status === statusFilter;

            return matchesPartner && matchesSearch && matchesStatus;
        }).sort((a, b) => {
            // Tri: En cours d'abord, puis À venir, puis Terminé
            const statusOrder = { 'ongoing': 0, 'upcoming': 1, 'completed': 2, 'unknown': 3 };
            const statusA = getPlanStatus(a.periode);
            const statusB = getPlanStatus(b.periode);
            return statusOrder[statusA] - statusOrder[statusB];
        });
    }, [plans, selectedPartnerId, filterText, statusFilter]);

    // --- Actions CRUD ---

    const handleOpenModal = (plan?: CommunicationPlan) => {
        if (plan) {
            setEditingId(plan.id);
            setFormData(plan);
        } else {
            setEditingId(null);
            setFormData({
                partenaire_id: selectedPartnerId !== 'all' ? selectedPartnerId : '',
                periode: '',
                theme: '',
                animateur: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.partenaire_id || !formData.theme || !formData.periode) return;

        setPlans(prev => {
            const newItem = { 
                id: editingId || `comm_${Date.now()}`, 
                ...formData 
            } as CommunicationPlan;
            
            return editingId 
                ? prev.map(p => p.id === editingId ? newItem : p) 
                : [...prev, newItem];
        });
        setIsModalOpen(false);
    };

    // --- Gestion Suppression Optimisée ---
    const requestDelete = (id: string, e?: React.MouseEvent) => {
        if(e) e.stopPropagation();
        setDeleteAction({ type: 'single', id });
    };

    const requestBulkDelete = () => {
        setDeleteAction({ type: 'bulk' });
    };

    const confirmDelete = () => {
        if (!deleteAction) return;

        if (deleteAction.type === 'single' && deleteAction.id) {
            setPlans(prev => prev.filter(p => p.id !== deleteAction.id));
            setSelectedPlans(prev => {
                const newSet = new Set(prev);
                newSet.delete(deleteAction.id!);
                return newSet;
            });
        } else if (deleteAction.type === 'bulk') {
            setPlans(prev => prev.filter(p => !selectedPlans.has(p.id)));
            setSelectedPlans(new Set());
        }
        setDeleteAction(null);
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedPlans);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedPlans(newSet);
    };

    const handleSelectAll = () => {
        if (selectedPlans.size === filteredPlans.length && filteredPlans.length > 0) {
            setSelectedPlans(new Set());
        } else {
            setSelectedPlans(new Set(filteredPlans.map(p => p.id)));
        }
    };

    const StatusTab = ({ id, label, count }: { id: typeof statusFilter, label: string, count: number }) => (
        <button
            onClick={() => setStatusFilter(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                statusFilter === id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
        >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                {count}
            </span>
        </button>
    );

    // Calcul des compteurs pour les onglets
    const counts = useMemo(() => {
        const all = plans.filter(p => selectedPartnerId === 'all' || p.partenaire_id === selectedPartnerId);
        return {
            all: all.length,
            ongoing: all.filter(p => getPlanStatus(p.periode) === 'ongoing').length,
            upcoming: all.filter(p => getPlanStatus(p.periode) === 'upcoming').length,
            completed: all.filter(p => getPlanStatus(p.periode) === 'completed').length,
        };
    }, [plans, selectedPartnerId]);

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            
            {/* Header & Filtres */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                        <StatusTab id="all" label="Tous" count={counts.all} />
                        <StatusTab id="ongoing" label="En cours" count={counts.ongoing} />
                        <StatusTab id="upcoming" label="À venir" count={counts.upcoming} />
                        <StatusTab id="completed" label="Historique" count={counts.completed} />
                    </div>

                    <div className="flex gap-3 ml-auto">
                        <ViewModeToggle mode={viewMode} setMode={setViewMode} />
                        {!isReadOnly && (
                            <button 
                                onClick={() => handleOpenModal()} 
                                disabled={selectedPartnerId === 'all'}
                                title={selectedPartnerId === 'all' ? "Veuillez sélectionner un partenaire" : ""}
                                className={`bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-md shadow-blue-900/20 active:scale-95 ${selectedPartnerId === 'all' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                            >
                                <Plus size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">Nouveau Planning</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Rechercher (thème, animateur...)" 
                        className="pl-10 pr-4 py-3 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
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

            {/* --- VUE GRILLE --- */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPlans.map(plan => {
                        const isSelected = selectedPlans.has(plan.id);
                        const status = getPlanStatus(plan.periode);
                        const statusConf = getStatusConfig(status);
                        const StatusIcon = statusConf.icon;

                        return (
                            <div key={plan.id} className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm hover:shadow-md transition-all group flex flex-col relative overflow-hidden ${isSelected ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                {!isReadOnly && (
                                    <div className="absolute top-3 left-3 z-10">
                                         <button onClick={() => toggleSelect(plan.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                            {isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                                        </button>
                                    </div>
                                )}
                                {!isReadOnly && (
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 dark:bg-slate-800/80 p-1 rounded-lg backdrop-blur-sm z-10">
                                        <button onClick={() => handleOpenModal(plan)} className="p-1.5 text-slate-500 hover:text-blue-600 transition-colors"><Edit2 size={14} /></button>
                                        <button onClick={(e) => requestDelete(plan.id, e)} className="p-1.5 text-slate-500 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                                    </div>
                                )}

                                {/* Header Status */}
                                <div className="p-4 pb-0 flex justify-end">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusConf.color}`}>
                                        <StatusIcon size={12} /> {statusConf.label}
                                    </span>
                                </div>

                                <div className="p-6 pt-2 flex-1 flex flex-col items-center text-center">
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                        <BookOpen size={24} />
                                    </div>
                                    
                                    <h4 className="font-bold text-slate-800 dark:text-white text-lg mb-2 line-clamp-2" title={plan.theme}>
                                        {plan.theme}
                                    </h4>
                                    
                                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-900/50 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700">
                                        {plan.periode}
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-auto">
                                        <User size={14} />
                                        <span>{plan.animateur}</span>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-900/20">
                                    {onViewDetails && (
                                        <button 
                                            onClick={() => onViewDetails(plan.id)}
                                            className="w-full flex items-center justify-center gap-2 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-blue-600 dark:text-blue-400 text-sm font-semibold rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors shadow-sm"
                                        >
                                            <Eye size={16} /> Voir le contenu
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* --- VUE LISTE --- */
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 w-12">
                                        {!isReadOnly && (
                                            <button onClick={handleSelectAll} className="text-slate-400 hover:text-blue-600 transition-colors">
                                                {filteredPlans.length > 0 && selectedPlans.size === filteredPlans.length ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                            </button>
                                        )}
                                    </th>
                                    <th className="px-6 py-4">Statut</th>
                                    <th className="px-6 py-4">Période</th>
                                    <th className="px-6 py-4">Thème Abordé</th>
                                    <th className="px-6 py-4">Animateur</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredPlans.map(plan => {
                                    const isSelected = selectedPlans.has(plan.id);
                                    const status = getPlanStatus(plan.periode);
                                    const statusConf = getStatusConfig(status);
                                    
                                    return (
                                        <tr key={plan.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                            <td className="px-6 py-4">
                                                {!isReadOnly && (
                                                    <button onClick={() => toggleSelect(plan.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                                        {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusConf.color}`}>
                                                    {statusConf.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                                                    <Calendar size={16} className="text-blue-500" />
                                                    {plan.periode}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                                                        <BookOpen size={16} />
                                                    </div>
                                                    <span className="font-semibold text-slate-800 dark:text-white">{plan.theme}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                    <User size={16} />
                                                    {plan.animateur}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {onViewDetails && (
                                                        <button 
                                                            onClick={() => onViewDetails(plan.id)}
                                                            className="p-2 text-blue-600 hover:text-white hover:bg-blue-600 dark:text-blue-400 dark:hover:bg-blue-600 rounded-lg transition-colors bg-blue-50 dark:bg-blue-900/20"
                                                            title="Voir les détails"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    )}
                                                    {!isReadOnly && (
                                                        <>
                                                            <button onClick={() => handleOpenModal(plan)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button onClick={(e) => requestDelete(plan.id, e)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredPlans.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            Aucun planning trouvé pour les critères actuels.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Modifier le Planning' : 'Nouveau Planning de Communication'}
                footer={
                    <>
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Annuler</button>
                        {!isReadOnly && <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                            <Save size={16} /> Enregistrer
                        </button>}
                    </>
                }
            >
                <div className="space-y-6">
                    <FormSelect 
                        label="Partenaire" 
                        value={formData.partenaire_id} 
                        onChange={(e: any) => setFormData({...formData, partenaire_id: e.target.value})} 
                        options={[{value: '', label: 'Sélectionner...'}, ...partners.map(p => ({value: p.id, label: p.nom}))]} 
                        disabled={selectedPartnerId !== 'all'}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormInput 
                            label="Période (Mois Année)" 
                            value={formData.periode} 
                            onChange={(e: any) => setFormData({...formData, periode: e.target.value})} 
                            placeholder="Ex: Mars 2024"
                            disabled={isReadOnly}
                        />
                        <FormInput 
                            label="Animateur" 
                            value={formData.animateur} 
                            onChange={(e: any) => setFormData({...formData, animateur: e.target.value})} 
                            placeholder="Ex: Jean Dupont"
                            disabled={isReadOnly}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Thème de la communication</label>
                        <div className="relative">
                            <div className="absolute top-3 left-3 text-slate-400">
                                <MessageSquare size={18} />
                            </div>
                            <input 
                                type="text"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all"
                                value={formData.theme} 
                                onChange={(e: any) => setFormData({...formData, theme: e.target.value})} 
                                placeholder="Ex: Sensibilisation à l'éco-conduite..."
                                disabled={isReadOnly}
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
                        <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold shadow-lg shadow-red-900/20 flex items-center justify-center gap-2">
                            <Trash2 size={18} /> Confirmer
                        </button>
                    </>
                }
            >
                <div className="flex flex-col items-center text-center p-6 space-y-4">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full animate-bounce-short">
                        <AlertTriangle size={48} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            Supprimer {deleteAction?.type === 'bulk' ? 'ces plannings' : 'ce planning'} ?
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
                            Cette action est irréversible et supprimera l'historique associé.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
