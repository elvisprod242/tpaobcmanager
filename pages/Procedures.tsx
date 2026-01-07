
import React, { useState, useMemo } from 'react';
import { Search, Upload, Trash2, CheckSquare, Square, Eye, Download, FileText, File, CheckCircle, Image as ImageIcon, ArrowLeft, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { Procedure, UserRole } from '../types';
import { ViewModeToggle, ViewMode } from '../components/ui/ViewModeToggle';
import { Modal } from '../components/ui/Modal';
import { FormInput } from '../components/ui/FormElements';
import { storageService } from '../services/storage';
import { api } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

interface ProceduresProps {
    selectedPartnerId: string;
    procedures: Procedure[];
    setProcedures: (data: Procedure[]) => void;
    userRole: UserRole;
}

export const Procedures = ({ selectedPartnerId, procedures, setProcedures, userRole }: ProceduresProps) => {
    const { addNotification } = useNotification();
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [filter, setFilter] = useState('');
    const [selectedProcedures, setSelectedProcedures] = useState<Set<string>>(new Set());
    
    // Modal Ajout
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Procedure>>({ nom: '', file: '', partenaire_id: '', date: new Date().toISOString().split('T')[0] });
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Modal Suppression
    const [deleteAction, setDeleteAction] = useState<{ type: 'single' | 'bulk', id?: string } | null>(null);

    // État pour le lecteur
    const [viewingItem, setViewingItem] = useState<{ url: string, type: string, name: string } | null>(null);

    const isReadOnly = userRole === 'directeur';
    const canAdd = selectedPartnerId !== 'all' && !isReadOnly;

    const filteredProcedures = useMemo(() => {
        return procedures.filter(p => {
            const matchesPartner = selectedPartnerId === 'all' || p.partenaire_id === selectedPartnerId;
            const matchesSearch = p.nom.toLowerCase().includes(filter.toLowerCase()) || p.file.toLowerCase().includes(filter.toLowerCase());
            return matchesPartner && matchesSearch;
        });
    }, [procedures, selectedPartnerId, filter]);

    const handleSelectAll = () => {
        if (selectedProcedures.size === filteredProcedures.length && filteredProcedures.length > 0) {
            setSelectedProcedures(new Set());
        } else {
            setSelectedProcedures(new Set(filteredProcedures.map(p => p.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedProcedures);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedProcedures(newSelected);
    };

    // --- Logique de Suppression ---

    const confirmDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteAction({ type: 'single', id });
    };

    const confirmBulkDelete = () => {
        setDeleteAction({ type: 'bulk' });
    };

    const executeDelete = async () => {
        if (!deleteAction) return;
        setIsSaving(true);

        try {
            if (deleteAction.type === 'bulk') {
                const idsToDelete = Array.from(selectedProcedures) as string[];
                await Promise.all(idsToDelete.map(id => api.deleteProcedure(id)));
                
                setProcedures(procedures.filter(p => !selectedProcedures.has(p.id)));
                setSelectedProcedures(new Set());
                addNotification('success', `${idsToDelete.length} procédures supprimées.`);
            } else if (deleteAction.type === 'single' && deleteAction.id) {
                await api.deleteProcedure(deleteAction.id);
                setProcedures(procedures.filter(p => p.id !== deleteAction.id));
                if (selectedProcedures.has(deleteAction.id)) {
                    const newSelected = new Set(selectedProcedures);
                    newSelected.delete(deleteAction.id);
                    setSelectedProcedures(newSelected);
                }
                addNotification('success', 'Procédure supprimée.');
            }
        } catch (error) {
            console.error("Erreur suppression:", error);
            addNotification('error', "Erreur lors de la suppression.");
        } finally {
            setIsSaving(false);
            setDeleteAction(null);
        }
    };

    // --- Logique d'Ajout ---

    const handleOpenModal = () => {
        setFormData({ nom: '', file: '', partenaire_id: selectedPartnerId !== 'all' ? selectedPartnerId : '', date: new Date().toISOString().split('T')[0] });
        setIsModalOpen(true);
        setIsUploading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
            
            setIsUploading(true);
            try {
                // Upload vers Firebase Storage (Simulé ou réel selon impl)
                const url = await storageService.uploadFile(file, 'procedures');
                
                setFormData(prev => ({ 
                    ...prev, 
                    file: file.name, 
                    type: extension, 
                    url: url 
                }));
            } catch (error) {
                console.error("Erreur upload:", error);
                alert("Erreur lors de l'upload du fichier");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleSave = async () => {
        if (!formData.nom || !formData.file) return;
        setIsSaving(true);

        try {
            const newItem = { 
                id: `proc_${Date.now()}`, 
                ...formData, 
                type: formData.type || 'pdf'
            } as Procedure;

            await api.addProcedure(newItem);
            setProcedures([...procedures, newItem]);
            addNotification('success', 'Procédure ajoutée.');
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erreur sauvegarde procédure:", error);
            addNotification('error', "Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Logique de Vue ---

    const handleViewDocument = (proc: Procedure) => {
        const isPdf = proc.type.includes('pdf');
        const isImg = ['jpg', 'jpeg', 'png', 'webp'].some(ext => proc.type.includes(ext));
        
        if (isPdf || isImg) {
            const urlToView = proc.url || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
            setViewingItem({ url: urlToView, type: isPdf ? 'pdf' : 'image', name: proc.nom });
        } else {
            alert("La visualisation directe n'est supportée que pour les PDF et les images. Le fichier sera téléchargé.");
        }
    };

    const getFileIcon = (type: string) => {
        if (type.includes('pdf')) return <FileText size={40} className="text-red-500" />;
        if (type.includes('doc')) return <FileText size={40} className="text-blue-500" />;
        if (type.includes('xls')) return <FileText size={40} className="text-green-500" />;
        if (['jpg', 'jpeg', 'png', 'webp'].some(t => type.includes(t))) return <ImageIcon size={40} className="text-purple-500" />;
        return <File size={40} className="text-slate-400" />;
    };

    // --- Rendu VUE LECTEUR (Si un document est ouvert) ---
    if (viewingItem) {
        // ... (Rendu lecteur identique) ...
        return (
            <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
                <div className="flex items-center justify-between mb-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <button 
                            onClick={() => setViewingItem(null)}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-2 font-medium"
                        >
                            <ArrowLeft size={20} /> Retour
                        </button>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate" title={viewingItem.name}>{viewingItem.name}</h2>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <a href={viewingItem.url} target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium"><ExternalLink size={16} /> Ouvrir nouvel onglet</a>
                        <a href={viewingItem.url} download className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"><Download size={16} /> Télécharger</a>
                    </div>
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700 shadow-inner">
                    {viewingItem.type === 'pdf' ? (
                        <iframe src={viewingItem.url} className="w-full h-full" title="PDF Viewer">
                            <div className="flex flex-col items-center justify-center h-full"><p className="mb-4 text-slate-500">Votre navigateur ne supporte pas l'affichage direct des PDF.</p><a href={viewingItem.url} download className="px-4 py-2 bg-blue-600 text-white rounded-lg">Télécharger le PDF</a></div>
                        </iframe>
                    ) : viewingItem.type === 'image' ? (
                        <div className="w-full h-full flex items-center justify-center p-4 overflow-auto"><img src={viewingItem.url} alt={viewingItem.name} className="max-w-full max-h-full object-contain rounded shadow-lg" /></div>
                    ) : (<div className="flex flex-col items-center justify-center h-full text-slate-500"><p>Format non supporté pour la prévisualisation.</p></div>)}
                </div>
            </div>
        );
    }

    // --- Rendu VUE LISTE (Par défaut) ---
    return (
        <div className="space-y-6 animate-fade-in w-full pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div className="relative w-full sm:w-auto flex-1 max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Rechercher un document..." 
                        className="pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full shadow-sm transition-all"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <div className="flex gap-3">
                    <ViewModeToggle mode={viewMode} setMode={setViewMode} />
                    <button 
                        onClick={handleOpenModal} 
                        disabled={!canAdd}
                        title={!canAdd ? "Veuillez sélectionner un partenaire pour ajouter" : ""}
                        className={`bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-md shadow-blue-900/20 active:scale-95 ${canAdd ? 'hover:bg-blue-700' : 'opacity-50 cursor-not-allowed'}`}
                    >
                        <Upload size={18} strokeWidth={2.5} /> Ajouter
                    </button>
                </div>
            </div>

            {selectedProcedures.size > 0 && !isReadOnly && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl px-4 py-3 flex items-center justify-between animate-zoom-in">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">{selectedProcedures.size} document(s) sélectionné(s)</span>
                    <button onClick={confirmBulkDelete} className="text-red-600 hover:text-red-700 dark:text-red-400 font-medium flex items-center gap-2 px-3 py-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                        <Trash2 size={18} /> Supprimer
                    </button>
                </div>
            )}

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredProcedures.map(p => {
                        const isSelected = selectedProcedures.has(p.id);
                        return (
                            <div 
                                key={p.id} 
                                onClick={() => handleViewDocument(p)}
                                className={`p-6 rounded-2xl border transition-all relative group flex flex-col items-center justify-center text-center gap-3 cursor-pointer ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600'}`}
                            >
                                {!isReadOnly && (
                                    <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                                         <button onClick={() => toggleSelect(p.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                            {isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                                        </button>
                                    </div>
                                )}
                                {!isReadOnly && (
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button onClick={(e) => confirmDelete(p.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white dark:bg-slate-700 rounded-lg shadow-sm transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                )}
                                <div className="mb-2 transform group-hover:scale-110 transition-transform duration-300">
                                    {getFileIcon(p.type)}
                                </div>
                                <h4 className="font-semibold text-slate-800 dark:text-white text-sm line-clamp-2" title={p.nom}>{p.nom}</h4>
                                <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">{p.date}</span>
                                <div className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Eye size={12} /> Visualiser
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
                                <th className="px-6 py-4 w-12 sticky-header">
                                     <button onClick={handleSelectAll} className="text-slate-400 hover:text-blue-600 transition-colors">
                                        {selectedProcedures.size > 0 && selectedProcedures.size === filteredProcedures.length ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                    </button>
                                </th>
                                <th className="px-6 py-4 sticky-header">Nom du document</th>
                                <th className="px-6 py-4 sticky-header">Fichier</th>
                                <th className="px-6 py-4 sticky-header">Date</th>
                                <th className="px-6 py-4 text-right sticky-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {filteredProcedures.map(p => {
                                const isSelected = selectedProcedures.has(p.id);
                                return (
                                    <tr 
                                        key={p.id} 
                                        onClick={() => handleViewDocument(p)}
                                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            {!isReadOnly && (
                                                <button onClick={() => toggleSelect(p.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                                    {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-white flex items-center gap-3">
                                            {getFileIcon(p.type)} {p.nom}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 italic">{p.file}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{p.date}</td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end gap-2">
                                                 <button className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors" title="Visualiser" onClick={() => handleViewDocument(p)}><Eye size={16} /></button>
                                                {!isReadOnly && <button onClick={(e) => confirmDelete(p.id, e)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Ajout */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Ajouter une procédure" footer={
                 <>
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Annuler</button>
                    {!isReadOnly && (
                        <button 
                            onClick={handleSave} 
                            disabled={isUploading || isSaving}
                            className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait`}
                        >
                            {(isUploading || isSaving) && <Loader2 size={16} className="animate-spin" />}
                            {isUploading ? 'Upload...' : (isSaving ? 'Enregistrement...' : 'Enregistrer')}
                        </button>
                    )}
                 </>
             }>
                 <div className="space-y-4">
                     <FormInput label="Nom de la procédure" value={formData.nom} onChange={(e: any) => setFormData({...formData, nom: e.target.value})} placeholder="Ex: Consignes de sécurité..." disabled={isReadOnly || isUploading} />
                     {/* ... (File Input Identique) ... */}
                     <div>
                         <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Fichier</label>
                         <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative">
                             <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png" disabled={isReadOnly || isUploading} />
                             {isUploading ? (
                                <div className="text-blue-600 flex flex-col items-center">
                                    <Loader2 size={32} className="animate-spin mb-2" />
                                    <p className="text-sm font-medium">Upload en cours...</p>
                                </div>
                             ) : formData.file ? (
                                 <div className="flex items-center justify-center gap-2 text-blue-600 font-medium">
                                     <CheckCircle size={20} /> {formData.file}
                                 </div>
                             ) : (
                                 <div className="text-slate-500">
                                     <Upload size={24} className="mx-auto mb-2 opacity-50" />
                                     <p>Cliquez pour sélectionner un fichier (PDF, IMG, DOC, XLS)</p>
                                 </div>
                             )}
                         </div>
                     </div>
                 </div>
             </Modal>

             {/* Modal de Confirmation de Suppression */}
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
                            onClick={executeDelete} 
                            disabled={isSaving}
                            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
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
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            Êtes-vous sûr de vouloir supprimer ?
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                            {deleteAction?.type === 'bulk' 
                                ? `Vous allez supprimer définitivement ${selectedProcedures.size} document(s).` 
                                : "Ce document sera définitivement effacé de la base de données."}
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
