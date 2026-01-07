
import React, { useState, useMemo } from 'react';
import { ArrowLeft, Save, ShieldCheck, AlertTriangle, AlertOctagon, Edit2, Search, Plus, Trash2 } from 'lucide-react';
import { ScpConfiguration, Partenaire, Invariant, UserRole } from '../types';
import { Modal } from '../components/ui/Modal';
import { FormInput, FormSelect } from '../components/ui/FormElements';
import { api } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

interface ScpAttributionProps {
    selectedPartnerId: string;
    partners: Partenaire[];
    invariants: Invariant[];
    onBack: () => void;
    userRole: UserRole;
    scpConfigs: ScpConfiguration[];
    setScpConfigs: (data: ScpConfiguration[]) => void;
}

export const ScpAttribution = ({ selectedPartnerId, partners, invariants, onBack, userRole, scpConfigs, setScpConfigs }: ScpAttributionProps) => {
    const { addNotification } = useNotification();
    const configs = scpConfigs;
    const setConfigs = setScpConfigs;
    
    const [filterText, setFilterText] = useState('');
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<Partial<ScpConfiguration>>({
        invariants_id: '',
        partenaire_id: '',
        sanction: '',
        type: 'Alerte',
        value: 1
    });

    const isReadOnly = userRole === 'directeur';

    // 1. Filtrer les invariants pertinents (globaux 'all' ou spécifiques au partenaire)
    const filteredInvariants = useMemo(() => {
        return invariants.filter(inv => {
            const matchesPartner = inv.partenaire_id === 'all' || selectedPartnerId === 'all' || inv.partenaire_id === selectedPartnerId;
            const matchesSearch = inv.titre.toLowerCase().includes(filterText.toLowerCase()) || 
                                  inv.description.toLowerCase().includes(filterText.toLowerCase());
            return matchesPartner && matchesSearch;
        });
    }, [selectedPartnerId, filterText, invariants]);

    const handleOpenModal = (inv: Invariant, type: 'Alerte' | 'Alarme', existingConfig?: ScpConfiguration) => {
        if (existingConfig) {
            setEditingConfig(existingConfig);
        } else {
            // Créer une nouvelle config pour ce type spécifique
            setEditingConfig({
                id: `scp_conf_${Date.now()}`,
                invariants_id: inv.id,
                // On associe la sanction au partenaire sélectionné si possible, sinon au partenaire de l'invariant (ou 'all')
                partenaire_id: selectedPartnerId !== 'all' ? selectedPartnerId : inv.partenaire_id,
                sanction: '',
                type: type,
                value: type === 'Alarme' ? 3 : 1
            });
        }
        setIsModalOpen(true);
    };

    // Nouvelle fonction pour ouvrir le modal sans invariant pré-sélectionné (bouton "Nouvelle Config")
    const handleOpenNewModal = () => {
        setEditingConfig({
            id: `scp_conf_${Date.now()}`,
            invariants_id: '', // Vide pour forcer la sélection
            partenaire_id: selectedPartnerId !== 'all' ? selectedPartnerId : 'all',
            sanction: '',
            type: 'Alerte',
            value: 1
        });
        setIsModalOpen(true);
    };

    const handleDeleteConfig = async (configId: string) => {
        if (window.confirm("Supprimer cette configuration de sanction ?")) {
            await api.deleteScpConfiguration(configId);
            setConfigs(configs.filter(c => c.id !== configId));
            addNotification('success', 'Configuration supprimée.');
        }
    };

    const handleSave = async () => {
        if (!editingConfig.invariants_id || !editingConfig.sanction) return;

        try {
            // Vérifier si une config existe déjà pour cet ID d'invariant ET ce Type ET ce Partenaire
            const existsIndex = configs.findIndex(c => c.invariants_id === editingConfig.invariants_id && c.type === editingConfig.type && c.partenaire_id === editingConfig.partenaire_id);
            
            const newConfig = {
                ...editingConfig,
                id: (existsIndex >= 0 ? configs[existsIndex].id : editingConfig.id) || `scp_conf_${Date.now()}`
            } as ScpConfiguration;

            await api.addScpConfiguration(newConfig);

            if (existsIndex >= 0) {
                // Mise à jour de l'existante
                const newConfigs = [...configs];
                newConfigs[existsIndex] = newConfig;
                setConfigs(newConfigs);
                addNotification('success', 'Configuration mise à jour.');
            } else {
                // Ajout nouvelle
                setConfigs([...configs, newConfig]);
                addNotification('success', 'Nouvelle configuration ajoutée.');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            addNotification('error', "Erreur lors de la sauvegarde.");
        }
    };

    const getInvariantTitle = (id: string) => {
        return invariants.find(i => i.id === id)?.titre || '';
    };

    // Options pour le selecteur d'invariants (modal création)
    const invariantOptions = useMemo(() => {
        return [{ value: '', label: 'Sélectionner un invariant...' }, ...filteredInvariants.map(inv => ({ value: inv.id, label: inv.titre }))];
    }, [filteredInvariants]);

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Header avec Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configuration des Sanctions (SCP)</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Définissez les sanctions pour chaque type (Alerte / Alarme).</p>
                    </div>
                </div>
            </div>

            {/* Barre de Recherche et Bouton Ajout */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between gap-4 items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Rechercher un invariant..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                </div>
                {!isReadOnly && (
                    <button 
                        onClick={handleOpenNewModal}
                        className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md shadow-blue-900/20 active:scale-95 whitespace-nowrap w-full md:w-auto justify-center"
                    >
                        <Plus size={18} /> Nouvelle Configuration
                    </button>
                )}
            </div>

            {/* Tableau des Invariants et Configs */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="px-6 py-4 w-1/3">Invariant (Infraction)</th>
                            <th className="px-6 py-4 w-1/3 border-l border-slate-100 dark:border-slate-700 bg-orange-50/50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={14} /> Configuration Alerte 
                                </div>
                            </th>
                            <th className="px-6 py-4 w-1/3 border-l border-slate-100 dark:border-slate-700 bg-red-50/50 dark:bg-red-900/10 text-red-700 dark:text-red-400">
                                <div className="flex items-center gap-2">
                                    <AlertOctagon size={14} /> Configuration Alarme 
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {filteredInvariants.map(inv => {
                            // Trouver les configs spécifiques pour cet invariant ET le partenaire actif (ou 'all' si global)
                            // Priorité au partenaire sélectionné s'il existe une config spécifique
                            const configAlerte = configs.find(c => c.invariants_id === inv.id && c.type === 'Alerte' && (selectedPartnerId === 'all' || c.partenaire_id === selectedPartnerId));
                            const configAlarme = configs.find(c => c.invariants_id === inv.id && c.type === 'Alarme' && (selectedPartnerId === 'all' || c.partenaire_id === selectedPartnerId));
                            
                            return (
                                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    {/* Colonne Invariant */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400">
                                                <ShieldCheck size={18} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-slate-800 dark:text-white">{inv.titre}</p>
                                                    {inv.partenaire_id === 'all' && <span className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded border border-blue-100 uppercase">Global</span>}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{inv.description}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Colonne Alerte */}
                                    <td className="px-6 py-4 border-l border-slate-100 dark:border-slate-700 relative">
                                        {configAlerte ? (
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30">
                                                <div>
                                                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase block mb-1">
                                                        Points : {configAlerte.value}
                                                    </span>
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                        {configAlerte.sanction}
                                                    </span>
                                                </div>
                                                {!isReadOnly && (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleOpenModal(inv, 'Alerte', configAlerte)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors shadow-sm"><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDeleteConfig(configAlerte.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors shadow-sm"><Trash2 size={14} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            !isReadOnly ? (
                                                <button 
                                                    onClick={() => handleOpenModal(inv, 'Alerte')}
                                                    className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                                                >
                                                    <Plus size={16} /> Ajouter Alerte
                                                </button>
                                            ) : <span className="text-slate-400 text-xs italic">Non configuré</span>
                                        )}
                                    </td>

                                    {/* Colonne Alarme */}
                                    <td className="px-6 py-4 border-l border-slate-100 dark:border-slate-700">
                                        {configAlarme ? (
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                                                <div>
                                                    <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase block mb-1">
                                                        Points : {configAlarme.value}
                                                    </span>
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                        {configAlarme.sanction}
                                                    </span>
                                                </div>
                                                {!isReadOnly && (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleOpenModal(inv, 'Alarme', configAlarme)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors shadow-sm"><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDeleteConfig(configAlarme.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors shadow-sm"><Trash2 size={14} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            !isReadOnly ? (
                                                <button 
                                                    onClick={() => handleOpenModal(inv, 'Alarme')}
                                                    className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                                                >
                                                    <Plus size={16} /> Ajouter Alarme
                                                </button>
                                            ) : <span className="text-slate-400 text-xs italic">Non configuré</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredInvariants.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                                    Aucun invariant trouvé pour les critères actuels.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingConfig.invariants_id ? `Configurer ${editingConfig.type} - ${getInvariantTitle(editingConfig.invariants_id)}` : 'Nouvelle Configuration'}
                footer={
                    <>
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Annuler</button>
                        {!isReadOnly && <button onClick={handleSave} className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 shadow-md ${editingConfig.type === 'Alarme' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                            <Save size={16} /> Enregistrer
                        </button>}
                    </>
                }
            >
                <div className="space-y-6">
                    <div className={`p-4 rounded-xl border ${editingConfig.type === 'Alarme' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/50'}`}>
                        <div className="flex items-center gap-3">
                            {editingConfig.type === 'Alarme' ? <AlertOctagon className="text-red-500" /> : <AlertTriangle className="text-orange-500" />}
                            <div>
                                <span className="text-xs font-bold opacity-70 uppercase block">Type de sanction</span>
                                <span className={`font-bold text-lg ${editingConfig.type === 'Alarme' ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'}`}>
                                    {editingConfig.type}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Sélecteur d'invariant seulement si création via bouton global */}
                    {!editingConfig.invariants_id && (
                        <FormSelect 
                            label="Invariant concerné"
                            value={editingConfig.invariants_id} 
                            onChange={(e: any) => setEditingConfig({...editingConfig, invariants_id: e.target.value})} 
                            options={invariantOptions}
                            disabled={isReadOnly}
                        />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <FormSelect 
                            label="Type" 
                            value={editingConfig.type} 
                            onChange={(e: any) => setEditingConfig({...editingConfig, type: e.target.value})} 
                            options={[{value: 'Alerte', label: 'Alerte'}, {value: 'Alarme', label: 'Alarme'}]}
                            disabled={isReadOnly}
                        />
                        <FormInput 
                            label="Points Perdus (Valeur)" 
                            type="number" 
                            min="0"
                            value={editingConfig.value} 
                            onChange={(e: any) => setEditingConfig({...editingConfig, value: parseInt(e.target.value) || 0})} 
                            disabled={isReadOnly}
                        />
                    </div>

                    <FormInput 
                        label="Sanction disciplinaire par défaut" 
                        value={editingConfig.sanction} 
                        onChange={(e: any) => setEditingConfig({...editingConfig, sanction: e.target.value})} 
                        placeholder="Ex: Avertissement écrit, Mise à pied..."
                        disabled={isReadOnly}
                    />
                </div>
            </Modal>
        </div>
    );
};
