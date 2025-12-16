
import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Edit2, CheckSquare, Square, Key, Copy, User, Link, Unlink, CheckCircle, AlertTriangle } from 'lucide-react';
import { CleObc, Partenaire, Conducteur, UserRole } from '../types';
import { ViewModeToggle, ViewMode } from '../components/ui/ViewModeToggle';
import { Modal } from '../components/ui/Modal';
import { FormInput, FormSelect } from '../components/ui/FormElements';

interface ObcKeysProps {
    selectedPartnerId: string;
    partners: Partenaire[];
    keys: CleObc[];
    setKeys: React.Dispatch<React.SetStateAction<CleObc[]>>;
    drivers: Conducteur[];
    setDrivers: React.Dispatch<React.SetStateAction<Conducteur[]>>;
    userRole: UserRole;
}

export const ObcKeys = ({ selectedPartnerId, partners, keys, setKeys, drivers, setDrivers, userRole }: ObcKeysProps) => {
    // Modal Creation/Edit Key
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<CleObc>>({ cle_obc: '', partenaire_id: '' });
    
    // Modal Assign Driver
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedKeyForAssign, setSelectedKeyForAssign] = useState<CleObc | null>(null);
    const [assignDriverId, setAssignDriverId] = useState<string>('');

    // Modal Unassign Driver
    const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false);
    const [unassignTarget, setUnassignTarget] = useState<{ key: CleObc, driver: Conducteur } | null>(null);

    // État Suppression
    const [deleteAction, setDeleteAction] = useState<{ type: 'single' | 'bulk', id?: string } | null>(null);

    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [filter, setFilter] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

    const isReadOnly = userRole === 'directeur';

    // --- Helpers ---
    const getAssignedDriver = (keyId: string) => {
        return drivers.find(d => d.cle_obc_ids && d.cle_obc_ids.includes(keyId));
    };

    const filteredKeys = useMemo(() => {
        return keys.filter(k => {
            const matchesPartner = selectedPartnerId === 'all' || k.partenaire_id === selectedPartnerId;
            const partnerName = partners.find(p => p.id === k.partenaire_id)?.nom || '';
            const driver = getAssignedDriver(k.id);
            const driverName = driver ? `${driver.nom} ${driver.prenom}` : '';
            
            const matchesSearch = k.cle_obc.toLowerCase().includes(filter.toLowerCase()) || 
                                  partnerName.toLowerCase().includes(filter.toLowerCase()) ||
                                  driverName.toLowerCase().includes(filter.toLowerCase());
            return matchesPartner && matchesSearch;
        });
    }, [keys, selectedPartnerId, filter, partners, drivers]);

    // --- Actions CRUD Key ---
    const handleSaveKey = () => {
        if (!formData.cle_obc || !formData.partenaire_id) return;
        setKeys(prev => {
            const newItem = { id: editingId || `key_${Date.now()}`, ...formData } as CleObc;
            return editingId ? prev.map(k => k.id === editingId ? newItem : k) : [...prev, newItem];
        });
        setIsModalOpen(false);
    };

    // --- Suppression Optimisée ---
    const requestDelete = (id: string) => setDeleteAction({ type: 'single', id });
    const requestBulkDelete = () => setDeleteAction({ type: 'bulk' });

    const confirmDelete = () => {
        if (!deleteAction) return;

        if (deleteAction.type === 'single' && deleteAction.id) {
            // 1. Unassign driver
            setDrivers(prev => prev.map(d => {
                if (d.cle_obc_ids && d.cle_obc_ids.includes(deleteAction.id!)) {
                    return { ...d, cle_obc_ids: d.cle_obc_ids.filter(kId => kId !== deleteAction.id) };
                }
                return d;
            }));
            // 2. Delete key
            setKeys(prev => prev.filter(k => k.id !== deleteAction.id));
            
            if (selectedKeys.has(deleteAction.id)) {
                const newSelected = new Set(selectedKeys);
                newSelected.delete(deleteAction.id);
                setSelectedKeys(newSelected);
            }
        } else if (deleteAction.type === 'bulk') {
            // Unassign all involved drivers
            setDrivers(prev => prev.map(d => {
                if (d.cle_obc_ids) {
                    return { ...d, cle_obc_ids: d.cle_obc_ids.filter(kId => !selectedKeys.has(kId)) };
                }
                return d;
            }));
            setKeys(prev => prev.filter(k => !selectedKeys.has(k.id)));
            setSelectedKeys(new Set());
        }
        setDeleteAction(null);
    };

    // --- Actions Assignment ---
    const handleOpenAssignModal = (key: CleObc) => {
        setSelectedKeyForAssign(key);
        setAssignDriverId('');
        setIsAssignModalOpen(true);
    };

    const handleAssignDriver = () => {
        if (!selectedKeyForAssign || !assignDriverId) return;

        const targetPartnerId = selectedKeyForAssign.partenaire_id;

        setDrivers(prev => {
            return prev.map(d => {
                const currentKeys = d.cle_obc_ids || [];
                
                if (currentKeys.includes(selectedKeyForAssign.id)) {
                    if (d.id !== assignDriverId) {
                        return { ...d, cle_obc_ids: currentKeys.filter(k => k !== selectedKeyForAssign.id) };
                    }
                }

                if (d.id === assignDriverId) {
                    const keysWithoutTargetPartner = currentKeys.filter(kId => {
                        const keyObj = keys.find(k => k.id === kId);
                        return keyObj && keyObj.partenaire_id !== targetPartnerId;
                    });
                    return { ...d, cle_obc_ids: [...keysWithoutTargetPartner, selectedKeyForAssign.id] };
                }
                return d;
            });
        });

        setIsAssignModalOpen(false);
        setSelectedKeyForAssign(null);
    };

    // --- Actions Unassignment (Optimised) ---
    const initiateUnassign = (key: CleObc) => {
        const driver = getAssignedDriver(key.id);
        if (driver) {
            setUnassignTarget({ key, driver });
            setIsUnassignModalOpen(true);
        }
    };

    const confirmUnassign = () => {
        if (unassignTarget) {
            setDrivers(prev => prev.map(d => {
                if (d.id === unassignTarget.driver.id && d.cle_obc_ids) {
                    return { ...d, cle_obc_ids: d.cle_obc_ids.filter(kId => !selectedKeys.has(kId) && kId !== unassignTarget.key.id) };
                }
                return d;
            }));
            setIsUnassignModalOpen(false);
            setUnassignTarget(null);
        }
    };

    const availableDriversForAssign = useMemo(() => {
        if (!selectedKeyForAssign) return [];
        const targetPartnerId = selectedKeyForAssign.partenaire_id;

        return drivers.filter(d => {
            if (!d.cle_obc_ids || d.cle_obc_ids.length === 0) return true;
            const hasKeyForThisPartner = d.cle_obc_ids.some(keyId => {
                const key = keys.find(k => k.id === keyId);
                return key && key.partenaire_id === targetPartnerId;
            });
            return !hasKeyForThisPartner;
        });
    }, [drivers, keys, selectedKeyForAssign]);


    // --- Selection ---
    const handleSelectAll = () => {
        if (selectedKeys.size === filteredKeys.length) setSelectedKeys(new Set());
        else setSelectedKeys(new Set(filteredKeys.map(k => k.id)));
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedKeys);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedKeys(newSelected);
    };

    const handleOpenModal = (key?: CleObc) => {
        if (key) { setEditingId(key.id); setFormData(key); } 
        else { setEditingId(null); setFormData({ cle_obc: '', partenaire_id: selectedPartnerId !== 'all' ? selectedPartnerId : '' }); }
        setIsModalOpen(true);
    };

    const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); };

    return (
        <div className="space-y-6 animate-fade-in pb-8">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative w-full sm:w-auto flex-1 max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Rechercher (clé, conducteur, partenaire)..." 
                        className="pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full shadow-sm transition-all"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <div className="flex gap-3">
                     <ViewModeToggle mode={viewMode} setMode={setViewMode} />
                    {!isReadOnly && (
                        <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md shadow-blue-900/20 active:scale-95"><Plus size={18} strokeWidth={2.5} /> Nouvelle Clé</button>
                    )}
                </div>
            </div>
            
            {selectedKeys.size > 0 && !isReadOnly && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl px-4 py-3 flex items-center justify-between animate-zoom-in">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">{selectedKeys.size} sélectionné(s)</span>
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
                                        {selectedKeys.size > 0 && selectedKeys.size === filteredKeys.length ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                    </button>
                                </th>
                                <th className="px-6 py-4">Clé OBC</th>
                                <th className="px-6 py-4">Partenaire</th>
                                <th className="px-6 py-4">Conducteur Assigné</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredKeys.map(k => {
                                const isSelected = selectedKeys.has(k.id);
                                const assignedDriver = getAssignedDriver(k.id);
                                return (
                                <tr key={k.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                    <td className="px-6 py-4">
                                        <button onClick={() => toggleSelect(k.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                            {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-mono font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                            <Key size={14} className="text-amber-500" />
                                            {k.cle_obc}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-600 dark:text-slate-400 text-xs">
                                            {partners.find(p => p.id === k.partenaire_id)?.nom || '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {assignedDriver ? (
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold border border-green-200 dark:border-green-800">
                                                    <User size={12} /> {assignedDriver.nom} {assignedDriver.prenom}
                                                </span>
                                                {!isReadOnly && (
                                                    <button 
                                                        onClick={() => initiateUnassign(k)}
                                                        className="text-slate-400 hover:text-red-500 transition-colors p-1 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 hover:border-red-300"
                                                        title="Dissocier le conducteur"
                                                    >
                                                        <Unlink size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            !isReadOnly ? (
                                                <button 
                                                    onClick={() => handleOpenAssignModal(k)}
                                                    className="text-slate-400 hover:text-blue-600 text-xs font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    <Link size={12} /> Assigner
                                                </button>
                                            ) : <span className="text-slate-400 text-xs italic">Non assigné</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button 
                                            onClick={() => copyToClipboard(k.cle_obc)}
                                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                            title="Copier"
                                        >
                                            <Copy size={16} />
                                        </button>
                                        {!isReadOnly && (
                                            <>
                                                <button onClick={() => handleOpenModal(k)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                                                <button onClick={() => requestDelete(k.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            )})}
                            {filteredKeys.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Aucune clé trouvée</td></tr>}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredKeys.map(k => {
                        const isSelected = selectedKeys.has(k.id);
                        const assignedDriver = getAssignedDriver(k.id);
                        return (
                        <div key={k.id} className={`p-4 rounded-xl border transition-all relative group flex flex-col ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'}`}>
                             <div className="absolute top-3 left-3 z-10">
                                 <button onClick={() => toggleSelect(k.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                    {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                </button>
                            </div>
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 dark:bg-slate-800/80 p-0.5 rounded-lg backdrop-blur-sm">
                                <button onClick={() => copyToClipboard(k.cle_obc)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="Copier"><Copy size={14} /></button>
                                {!isReadOnly && (
                                    <>
                                        <button onClick={() => handleOpenModal(k)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={14} /></button>
                                        <button onClick={() => requestDelete(k.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                                    </>
                                )}
                            </div>
                            
                            <div className="flex flex-col items-center mt-2 mb-3">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl mb-2 shadow-sm">
                                    <Key size={20} />
                                </div>
                                <div className="font-mono font-bold text-slate-800 dark:text-white text-base text-center break-all select-all">
                                    {k.cle_obc}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center truncate w-full px-2">
                                    {partners.find(p => p.id === k.partenaire_id)?.nom || '-'}
                                </p>
                            </div>

                            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                {assignedDriver ? (
                                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-100 dark:border-green-800/30">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <User size={14} className="text-green-600 dark:text-green-400 shrink-0" />
                                            <span className="text-xs font-bold text-green-700 dark:text-green-300 truncate">
                                                {assignedDriver.nom} {assignedDriver.prenom}
                                            </span>
                                        </div>
                                        {!isReadOnly && (
                                            <button onClick={() => initiateUnassign(k)} className="text-slate-400 hover:text-red-500 transition-colors" title="Dissocier">
                                                <Unlink size={14} />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    !isReadOnly ? (
                                        <button 
                                            onClick={() => handleOpenAssignModal(k)}
                                            className="w-full py-2 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-blue-600 hover:border-blue-300 transition-all"
                                        >
                                            <Link size={14} /> Assigner un conducteur
                                        </button>
                                    ) : (
                                        <div className="w-full py-2 text-center text-xs text-slate-400 italic">Non assigné</div>
                                    )
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            )}

             {/* Modal Création/Edition Clé */}
             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Modifier Clé' : 'Nouvelle Clé'} footer={
                 <>
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Annuler</button>
                    <button onClick={handleSaveKey} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Enregistrer</button>
                 </>
             }>
                 <div className="space-y-4">
                     <FormInput label="Clé OBC" value={formData.cle_obc} onChange={(e: any) => setFormData({...formData, cle_obc: e.target.value})} placeholder="Ex: 123-ABC-456" />
                     <FormSelect 
                        label="Partenaire associé" 
                        value={formData.partenaire_id} 
                        onChange={(e: any) => setFormData({...formData, partenaire_id: e.target.value})} 
                        options={[{value: '', label: 'Sélectionner...'}, ...partners.map(p => ({value: p.id, label: p.nom}))]}
                        disabled={selectedPartnerId !== 'all' && !editingId} 
                     />
                 </div>
             </Modal>

             {/* Modal Assignation Conducteur */}
             <Modal 
                isOpen={isAssignModalOpen} 
                onClose={() => setIsAssignModalOpen(false)} 
                title="Assigner un Conducteur"
                footer={
                    <>
                       <button onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Annuler</button>
                       <button onClick={handleAssignDriver} disabled={!assignDriverId} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Valider l'assignation</button>
                    </>
                }
            >
                <div className="space-y-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                            <Key size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Clé sélectionnée</p>
                            <p className="text-lg font-mono font-bold text-slate-800 dark:text-white">{selectedKeyForAssign?.cle_obc}</p>
                            <p className="text-sm text-slate-500">{partners.find(p => p.id === selectedKeyForAssign?.partenaire_id)?.nom}</p>
                        </div>
                    </div>

                    <FormSelect 
                        label="Conducteur" 
                        value={assignDriverId} 
                        onChange={(e: any) => setAssignDriverId(e.target.value)} 
                        options={[
                            {value: '', label: 'Sélectionner un conducteur...'},
                            ...availableDriversForAssign.map(d => ({ value: d.id, label: `${d.nom} ${d.prenom}` }))
                        ]}
                    />
                    
                    <p className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 italic">
                        <strong>Note :</strong> Seuls les conducteurs ne possédant pas encore de clé pour ce partenaire sont affichés.
                    </p>
                </div>
            </Modal>

            {/* Modal de Confirmation Dissociation */}
            <Modal
                isOpen={isUnassignModalOpen}
                onClose={() => setIsUnassignModalOpen(false)}
                title="Dissocier la clé"
                footer={
                    <>
                        <button onClick={() => setIsUnassignModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Annuler</button>
                        <button onClick={confirmUnassign} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors">
                            <Unlink size={16} /> Confirmer la dissociation
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                        <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={24} />
                        <div>
                            <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-1">Attention</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                                Vous êtes sur le point de retirer l'accès à la clé OBC. Le conducteur ne pourra plus utiliser ce véhicule connecté pour ce partenaire.
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                            <span className="text-sm text-slate-500">Clé Concernée</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-white">{unassignTarget?.key.cle_obc}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-sm text-slate-500">Conducteur</span>
                            <div className="flex items-center gap-2">
                                <User size={14} className="text-slate-400" />
                                <span className="font-bold text-slate-800 dark:text-white">{unassignTarget?.driver.nom} {unassignTarget?.driver.prenom}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal de Confirmation de Suppression (Clé) */}
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
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Supprimer la clé ?</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
                            {deleteAction?.type === 'bulk' 
                                ? `Vous allez supprimer ${selectedKeys.size} clé(s).` 
                                : "Cela retirera automatiquement la clé au conducteur associé."}
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
