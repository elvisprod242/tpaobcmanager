
import React, { useState } from 'react';
import { Truck, Plus, Edit2, Trash2, MapPin, Video, EyeOff, Cpu, Check, AlertTriangle } from 'lucide-react';
import { Vehicule, Equipement, Partenaire, UserRole } from '../types';
import { Modal } from '../components/ui/Modal';
import { FormInput } from '../components/ui/FormElements';
import { ViewModeToggle, ViewMode } from '../components/ui/ViewModeToggle';

interface VehiclesProps {
    selectedPartnerId: string;
    partners: Partenaire[];
    vehiclesData: Vehicule[];
    setVehiclesData: React.Dispatch<React.SetStateAction<Vehicule[]>>;
    equipementsData: Equipement[];
    setEquipementsData: React.Dispatch<React.SetStateAction<Equipement[]>>;
    userRole: UserRole;
}

export const Vehicles = ({ selectedPartnerId, partners, vehiclesData, setVehiclesData, equipementsData, setEquipementsData, userRole }: VehiclesProps) => {
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'equipement'>('general');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // État Suppression
    const [deleteAction, setDeleteAction] = useState<{ type: 'single', id?: string } | null>(null);

    const [formData, setFormData] = useState<Partial<Vehicule & Equipement>>({ 
        nom: '', 
        immatriculation: '', 
        partenaire_id: '',
        balise: false, balise_detail: '',
        camera: false, camera_detail: '',
        detecteur_fatigue: false, detecteur_fatigue_detail: ''
    });

    const isReadOnly = userRole === 'directeur';

    const filteredVehicles = vehiclesData.filter(v => selectedPartnerId === 'all' || v.partenaire_id === selectedPartnerId);

    const handleSave = () => {
         if (!formData.nom) return;
         
         const vehiculeId = editingId || `v_${Date.now()}`;
         const partnerId = editingId ? formData.partenaire_id : (selectedPartnerId !== 'all' ? selectedPartnerId : '');

         setVehiclesData(prev => {
             const newItem: Vehicule = { 
                 id: vehiculeId, 
                 nom: formData.nom!,
                 immatriculation: formData.immatriculation!,
                 partenaire_id: partnerId!
             };
             return editingId ? prev.map(v => v.id === editingId ? newItem : v) : [...prev, newItem];
         });

         setEquipementsData(prev => {
             const existingEq = prev.find(e => e.vehicule_id === vehiculeId);
             
             const newEq: Equipement = {
                 id: existingEq ? existingEq.id : `eq_${Date.now()}`,
                 vehicule_id: vehiculeId,
                 partenaire_id: partnerId!,
                 date: existingEq ? existingEq.date : new Date().toISOString().split('T')[0],
                 balise: formData.balise || false,
                 balise_detail: formData.balise ? (formData.balise_detail || '') : '',
                 camera: formData.camera || false,
                 camera_detail: formData.camera ? (formData.camera_detail || '') : '',
                 detecteur_fatigue: formData.detecteur_fatigue || false,
                 detecteur_fatigue_detail: formData.detecteur_fatigue ? (formData.detecteur_fatigue_detail || '') : ''
             };

             if (existingEq) {
                 return prev.map(e => e.id === existingEq.id ? newEq : e);
             } else {
                 return [...prev, newEq];
             }
         });

         setIsModalOpen(false);
    };
    
    // --- Suppression ---
    const requestDelete = (id: string) => setDeleteAction({ type: 'single', id });

    const confirmDelete = () => {
        if (!deleteAction || !deleteAction.id) return;
        
        setVehiclesData(prev => prev.filter(v => v.id !== deleteAction.id));
        setEquipementsData(prev => prev.filter(e => e.vehicule_id !== deleteAction.id));
        setDeleteAction(null);
    };

    const handleOpenModal = (v?: Vehicule) => {
        setActiveTab('general');
        if (v) { 
            setEditingId(v.id); 
            const eq = equipementsData.find(e => e.vehicule_id === v.id);
            setFormData({ 
                ...v,
                balise: eq?.balise || false,
                balise_detail: eq?.balise_detail || '',
                camera: eq?.camera || false,
                camera_detail: eq?.camera_detail || '',
                detecteur_fatigue: eq?.detecteur_fatigue || false,
                detecteur_fatigue_detail: eq?.detecteur_fatigue_detail || ''
            }); 
        }
        else { 
            setEditingId(null); 
            setFormData({ 
                nom: '', 
                immatriculation: '', 
                partenaire_id: selectedPartnerId !== 'all' ? selectedPartnerId : '',
                balise: false, balise_detail: '',
                camera: false, camera_detail: '',
                detecteur_fatigue: false, detecteur_fatigue_detail: ''
            }); 
        }
        setIsModalOpen(true);
    }

    return (
        <div className="space-y-6 animate-fade-in pb-8">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Gestion des Véhicules & Équipements</h3>
                <div className="flex gap-3">
                    <ViewModeToggle mode={viewMode} setMode={setViewMode} />
                    {!isReadOnly && (
                        <button 
                            onClick={() => handleOpenModal()} 
                            disabled={selectedPartnerId === 'all'}
                            title={selectedPartnerId === 'all' ? "Sélectionnez un partenaire pour ajouter" : ""}
                            className={`bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${selectedPartnerId === 'all' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                        >
                            <Plus size={18} /> Nouveau Véhicule
                        </button>
                    )}
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVehicles.map(v => {
                         const eq = equipementsData.find(e => e.vehicule_id === v.id);
                         return (
                            <div key={v.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative group flex flex-col justify-between h-full hover:shadow-md transition-all">
                                {!isReadOnly && (
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 dark:bg-slate-800/80 rounded-lg p-1 z-10">
                                        <button onClick={() => handleOpenModal(v)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={() => requestDelete(v.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                )}
                                
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <Truck size={28} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-800 dark:text-white truncate text-lg" title={v.nom}>{v.nom}</h4>
                                        <p className="text-sm font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 inline-block px-2 py-0.5 rounded mt-1">{v.immatriculation}</p>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Équipements installés</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {/* Balise GPS Widget */}
                                        <div className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${eq?.balise ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600 grayscale opacity-70'}`}>
                                            <MapPin size={20} className="mb-2" />
                                            <span className="text-[10px] font-bold uppercase">GPS</span>
                                            {eq?.balise && (
                                                <div className="absolute top-1 right-1">
                                                    <Check size={12} className="text-green-600 dark:text-green-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Camera Widget */}
                                        <div className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${eq?.camera ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600 grayscale opacity-70'}`}>
                                            <Video size={20} className="mb-2" />
                                            <span className="text-[10px] font-bold uppercase">Caméra</span>
                                            {eq?.camera && (
                                                <div className="absolute top-1 right-1">
                                                    <Check size={12} className="text-blue-600 dark:text-blue-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Fatigue Widget */}
                                        <div className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${eq?.detecteur_fatigue ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400' : 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600 grayscale opacity-70'}`}>
                                            <EyeOff size={20} className="mb-2" />
                                            <span className="text-[10px] font-bold uppercase">Fatigue</span>
                                            {eq?.detecteur_fatigue && (
                                                <div className="absolute top-1 right-1">
                                                    <Check size={12} className="text-amber-600 dark:text-amber-400" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-3 text-xs text-center text-slate-400 flex items-center justify-center gap-1">
                                        <Cpu size={12} />
                                        <span>Survolez les icônes pour voir les détails</span>
                                    </div>
                                </div>
                            </div>
                         );
                    })}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4">Véhicule</th>
                                <th className="px-6 py-4">Immatriculation</th>
                                <th className="px-6 py-4 text-center">Équipements Installés</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredVehicles.map(v => {
                                const eq = equipementsData.find(e => e.vehicule_id === v.id);
                                return (
                                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                                    <Truck size={18} />
                                                </div>
                                                <span className="font-bold text-slate-800 dark:text-white">{v.nom}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/50 px-2 py-1 rounded">
                                                {v.immatriculation}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className={`p-1.5 rounded-lg border ${eq?.balise ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' : 'bg-slate-50 border-slate-200 text-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-600'}`} title={`GPS ${eq?.balise_detail ? `(${eq.balise_detail})` : ''}`}>
                                                    <MapPin size={16} />
                                                </div>
                                                <div className={`p-1.5 rounded-lg border ${eq?.camera ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'bg-slate-50 border-slate-200 text-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-600'}`} title={`Caméra ${eq?.camera_detail ? `(${eq.camera_detail})` : ''}`}>
                                                    <Video size={16} />
                                                </div>
                                                <div className={`p-1.5 rounded-lg border ${eq?.detecteur_fatigue ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' : 'bg-slate-50 border-slate-200 text-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-600'}`} title={`Détecteur Fatigue ${eq?.detecteur_fatigue_detail ? `(${eq.detecteur_fatigue_detail})` : ''}`}>
                                                    <EyeOff size={16} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!isReadOnly && (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleOpenModal(v)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><Edit2 size={16} /></button>
                                                    <button onClick={() => requestDelete(v.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredVehicles.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                                        Aucun véhicule trouvé pour ce partenaire.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Modifier Véhicule' : 'Nouveau Véhicule'} footer={<><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Annuler</button>{!isReadOnly && <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Enregistrer</button>}</>}>
                 <div className="space-y-4">
                     <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                         <button 
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setActiveTab('general')}
                         >
                             <Truck size={16} className="inline mr-2" /> Général
                         </button>
                         <button 
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'equipement' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setActiveTab('equipement')}
                         >
                             <Cpu size={16} className="inline mr-2" /> Équipements
                         </button>
                     </div>

                     {activeTab === 'general' && (
                         <div className="space-y-4 animate-fade-in">
                             <FormInput label="Nom / Marque" value={formData.nom} onChange={(e:any) => setFormData({...formData, nom: e.target.value})} placeholder="Ex: Renault Master" disabled={isReadOnly} />
                             <FormInput label="Immatriculation" value={formData.immatriculation} onChange={(e:any) => setFormData({...formData, immatriculation: e.target.value})} placeholder="AA-123-BB" disabled={isReadOnly} />
                         </div>
                     )}

                     {activeTab === 'equipement' && (
                         <div className="space-y-4 animate-fade-in">
                             
                             {/* Balise GPS Toggle Block */}
                             <div className={`p-4 rounded-xl border transition-all duration-300 ${formData.balise ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800 ring-1 ring-green-500/20' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'}`}>
                                 <div className="flex items-center justify-between mb-2">
                                     <div className="flex items-center gap-3">
                                         <div className={`p-2 rounded-lg ${formData.balise ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                             <MapPin size={20} />
                                         </div>
                                         <span className={`font-semibold ${formData.balise ? 'text-green-800 dark:text-green-200' : 'text-slate-600 dark:text-slate-400'}`}>Balise GPS</span>
                                     </div>
                                     <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={formData.balise} onChange={(e) => setFormData({...formData, balise: e.target.checked})} className="sr-only peer" disabled={isReadOnly} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                    </label>
                                 </div>
                                 {formData.balise && (
                                     <div className="mt-4 animate-fade-in pl-1">
                                         <FormInput 
                                            label="Identifiant Balise (Détail)" 
                                            value={formData.balise_detail} 
                                            onChange={(e:any) => setFormData({...formData, balise_detail: e.target.value})} 
                                            placeholder="Ex: 585KO" 
                                            className="transition-all"
                                            disabled={isReadOnly}
                                         />
                                     </div>
                                 )}
                             </div>

                             {/* Camera Toggle Block */}
                             <div className={`p-4 rounded-xl border transition-all duration-300 ${formData.camera ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 ring-1 ring-blue-500/20' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'}`}>
                                 <div className="flex items-center justify-between mb-2">
                                     <div className="flex items-center gap-3">
                                         <div className={`p-2 rounded-lg ${formData.camera ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                             <Video size={20} />
                                         </div>
                                         <span className={`font-semibold ${formData.camera ? 'text-blue-800 dark:text-blue-200' : 'text-slate-600 dark:text-slate-400'}`}>Caméra</span>
                                     </div>
                                     <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={formData.camera} onChange={(e) => setFormData({...formData, camera: e.target.checked})} className="sr-only peer" disabled={isReadOnly} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                 </div>
                                 {formData.camera && (
                                     <div className="mt-4 animate-fade-in pl-1">
                                         <FormInput 
                                            label="Identifiant Caméra (Détail)" 
                                            value={formData.camera_detail} 
                                            onChange={(e:any) => setFormData({...formData, camera_detail: e.target.value})} 
                                            placeholder="Ex: CAM556" 
                                            disabled={isReadOnly}
                                         />
                                     </div>
                                 )}
                             </div>

                             {/* Fatigue Toggle Block */}
                             <div className={`p-4 rounded-xl border transition-all duration-300 ${formData.detecteur_fatigue ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 ring-1 ring-amber-500/20' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'}`}>
                                 <div className="flex items-center justify-between mb-2">
                                     <div className="flex items-center gap-3">
                                         <div className={`p-2 rounded-lg ${formData.detecteur_fatigue ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                             <EyeOff size={20} />
                                         </div>
                                         <span className={`font-semibold ${formData.detecteur_fatigue ? 'text-amber-800 dark:text-amber-200' : 'text-slate-600 dark:text-slate-400'}`}>Détecteur de fatigue</span>
                                     </div>
                                     <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={formData.detecteur_fatigue} onChange={(e) => setFormData({...formData, detecteur_fatigue: e.target.checked})} className="sr-only peer" disabled={isReadOnly} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-600"></div>
                                    </label>
                                 </div>
                                 {formData.detecteur_fatigue && (
                                     <div className="mt-4 animate-fade-in pl-1">
                                         <FormInput 
                                            label="Identifiant Détecteur (Détail)" 
                                            value={formData.detecteur_fatigue_detail} 
                                            onChange={(e:any) => setFormData({...formData, detecteur_fatigue_detail: e.target.value})} 
                                            placeholder="Ex: DRT556" 
                                            disabled={isReadOnly}
                                         />
                                     </div>
                                 )}
                             </div>

                         </div>
                     )}
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
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Supprimer le véhicule ?</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
                            Cette action supprimera également les équipements associés.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
