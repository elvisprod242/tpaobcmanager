
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ShieldCheck, Save, AlertTriangle, Loader2 } from 'lucide-react';
import { Invariant, Partenaire, UserRole } from '../types';
import { Modal } from '../components/ui/Modal';
import { FormInput } from '../components/ui/FormElements';
import { api } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

interface InvariantsProps {
    selectedPartnerId: string;
    partners: Partenaire[];
    invariants: Invariant[];
    setInvariants: React.Dispatch<React.SetStateAction<Invariant[]>>;
    userRole: UserRole;
}

export const Invariants = ({ selectedPartnerId, partners, invariants, setInvariants, userRole }: InvariantsProps) => {
    const { addNotification } = useNotification();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Invariant>>({ titre: '', description: '', partenaire_id: '' });
    const [isSaving, setIsSaving] = useState(false);

    // État Suppression
    const [deleteAction, setDeleteAction] = useState<{ type: 'single', id: string } | null>(null);

    // Filtre
    const filteredInvariants = invariants.filter(i => 
        i.partenaire_id === 'all' || 
        selectedPartnerId === 'all' || 
        i.partenaire_id === selectedPartnerId
    );
    
    const isReadOnly = userRole === 'directeur';

    const handleSave = async () => {
        if (!formData.titre) return;
        setIsSaving(true);

        try {
            const newItem = { 
                id: editingId || `inv_${Date.now()}`, 
                ...formData,
                partenaire_id: editingId ? formData.partenaire_id : 'all' 
            } as Invariant;

            if (editingId) {
                await api.addInvariant(newItem); // Upsert
                setInvariants(prev => prev.map(i => i.id === editingId ? newItem : i));
                addNotification('success', 'Invariant mis à jour.');
            } else {
                await api.addInvariant(newItem);
                setInvariants(prev => [...prev, newItem]);
                addNotification('success', 'Invariant ajouté.');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erreur sauvegarde invariant:", error);
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
            await api.deleteInvariant(deleteAction.id);
            setInvariants(prev => prev.filter(i => i.id !== deleteAction.id));
            addNotification('success', 'Invariant supprimé.');
        } catch (error) {
            console.error("Erreur suppression:", error);
            addNotification('error', "Erreur lors de la suppression.");
        } finally {
            setIsSaving(false);
            setDeleteAction(null);
        }
    };

    const handleOpenModal = (inv?: Invariant) => {
        if (inv) { setEditingId(inv.id); setFormData(inv); }
        else { setEditingId(null); setFormData({ titre: '', description: '', partenaire_id: 'all' }); }
        setIsModalOpen(true);
    }

    return (
        <div className="space-y-6 animate-fade-in pb-8">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Gestion des Invariants</h3>
                {!isReadOnly && (
                    <button 
                        onClick={() => handleOpenModal()} 
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 hover:bg-blue-700"
                    >
                        <Plus size={18} /> Nouvel Invariant (Global)
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredInvariants.map(inv => (
                    <div key={inv.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 group relative flex flex-col h-full hover:shadow-md transition-all">
                        {!isReadOnly && (
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 dark:bg-slate-800/80 p-1 rounded-lg">
                                <button onClick={() => handleOpenModal(inv)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => requestDelete(inv.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                            </div>
                        )}
                        <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                                <ShieldCheck size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-bold text-slate-800 dark:text-white pr-2">{inv.titre}</h4>
                                    {inv.partenaire_id === 'all' && (
                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] font-bold rounded uppercase">Global</span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{inv.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Modifier Invariant' : 'Nouvel Invariant'} footer={<><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Annuler</button>{!isReadOnly && <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70">{isSaving && <Loader2 size={16} className="animate-spin" />} Enregistrer</button>}</>}>
                 <div className="space-y-4">
                     <FormInput label="Titre" value={formData.titre} onChange={(e:any) => setFormData({...formData, titre: e.target.value})} placeholder="Ex: Respect des limitations de vitesse" disabled={isReadOnly || isSaving} />
                     <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
                        <textarea className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white h-24 resize-none transition-all" value={formData.description} onChange={(e:any) => setFormData({...formData, description: e.target.value})} placeholder="Description détaillée de la règle..." disabled={isReadOnly || isSaving} />
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
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Supprimer l'invariant ?</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
                            Cette action supprimera également les objectifs et configurations de sanctions liés à cet invariant.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
