
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, CheckSquare, Square, ClipboardCheck, Upload, Download, Eye, FileText, CheckCircle, Image as ImageIcon, Calendar, ChevronDown, X, ExternalLink, AlertTriangle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ControleCabine, Partenaire, UserRole } from '../types';
import { ViewModeToggle, ViewMode } from '../components/ui/ViewModeToggle';
import { Modal } from '../components/ui/Modal';
import { FormInput, FormSelect } from '../components/ui/FormElements';
import { storageService } from '../services/storage';
import { api } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

interface CabinControlProps {
    selectedPartnerId: string;
    partners: Partenaire[];
    globalYear: string;
    controls: ControleCabine[];
    setControls: React.Dispatch<React.SetStateAction<ControleCabine[]>>;
    userRole: UserRole;
}

export const CabinControl = ({ selectedPartnerId, partners, globalYear, controls, setControls, userRole }: CabinControlProps) => {
    const { addNotification } = useNotification();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<ControleCabine>>({ 
        date: new Date().toISOString().split('T')[0], 
        partenaire_id: '', 
        file: '', 
        commentaire: '' 
    });
    
    // État pour le Drag & Drop
    const [dragActive, setDragActive] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // État Suppression
    const [deleteAction, setDeleteAction] = useState<{ type: 'single' | 'bulk', id?: string } | null>(null);

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

    const [filter, setFilter] = useState('');
    const [selectedControls, setSelectedControls] = useState<Set<string>>(new Set());
    
    // Filtres de date
    const [selectedMonth, setSelectedMonth] = useState<string>(''); // '' = Tous
    
    const months = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    
    const [viewingItem, setViewingItem] = useState<{ url: string, name: string } | null>(null);
    const isImage = (filename: string) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename);
    const isReadOnly = userRole === 'directeur';

    const filteredControls = useMemo(() => {
        return controls.filter(c => {
            const cDate = new Date(c.date);
            const matchesPartner = selectedPartnerId === 'all' || c.partenaire_id === selectedPartnerId;
            const matchesSearch = c.commentaire.toLowerCase().includes(filter.toLowerCase()) || 
                                  c.file.toLowerCase().includes(filter.toLowerCase()) ||
                                  c.date.includes(filter);
            const matchesMonth = selectedMonth === '' || cDate.getMonth().toString() === selectedMonth;
            const matchesYear = globalYear === '' || cDate.getFullYear().toString() === globalYear;
            return matchesPartner && matchesSearch && matchesMonth && matchesYear;
        });
    }, [controls, selectedPartnerId, filter, selectedMonth, globalYear]);

    useEffect(() => { setCurrentPage(1); }, [selectedPartnerId, filter, selectedMonth, globalYear, itemsPerPage]);

    const totalPages = Math.ceil(filteredControls.length / itemsPerPage);
    const paginatedControls = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredControls.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredControls, currentPage, itemsPerPage]);

    const handleSelectAll = () => {
        if (selectedControls.size === paginatedControls.length && paginatedControls.length > 0) {
            setSelectedControls(new Set());
        } else {
            setSelectedControls(new Set(paginatedControls.map(c => c.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedControls);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedControls(newSelected);
    };

    // --- Gestion Suppression Unifiée ---
    const requestDelete = (id: string) => setDeleteAction({ type: 'single', id });
    const requestBulkDelete = () => setDeleteAction({ type: 'bulk' });

    const confirmDelete = async () => {
        if (!deleteAction) return;
        setIsSaving(true);

        try {
            if (deleteAction.type === 'single' && deleteAction.id) {
                await api.deleteControleCabine(deleteAction.id);
                setControls(prev => prev.filter(c => c.id !== deleteAction.id));
                if (selectedControls.has(deleteAction.id)) {
                    const newSelected = new Set(selectedControls);
                    newSelected.delete(deleteAction.id);
                    setSelectedControls(newSelected);
                }
                addNotification('success', 'Contrôle supprimé.');
            } else if (deleteAction.type === 'bulk') {
                const idsToDelete = Array.from(selectedControls) as string[];
                await Promise.all(idsToDelete.map(id => api.deleteControleCabine(id)));
                
                setControls(prev => prev.filter(c => !selectedControls.has(c.id)));
                setSelectedControls(new Set());
                addNotification('success', `${idsToDelete.length} contrôles supprimés.`);
            }
        } catch (error) {
            console.error("Erreur suppression:", error);
            addNotification('error', "Erreur lors de la suppression.");
        } finally {
            setIsSaving(false);
            setDeleteAction(null);
        }
    };

    const handleOpenModal = (ctrl?: ControleCabine) => {
        setDragActive(false);
        setIsUploading(false);
        if (ctrl) { setEditingId(ctrl.id); setFormData(ctrl); } 
        else { setEditingId(null); setFormData({ date: new Date().toISOString().split('T')[0], partenaire_id: selectedPartnerId !== 'all' ? selectedPartnerId : '', file: '', commentaire: '' }); }
        setIsModalOpen(true);
    };

    const processFile = async (file: File) => {
        setIsUploading(true);
        try {
            const url = await storageService.uploadFile(file, 'controles_cabine');
            setFormData(prev => ({ ...prev, file: file.name, url: url }));
        } catch (error) {
            console.error("Erreur upload:", error);
            addNotification('error', "Erreur lors de l'envoi du fichier.");
        } finally {
            setIsUploading(false);
        }
    };

    // ... (Drag & Drop handlers inchangés) ...
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) await processFile(e.dataTransfer.files[0]);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) await processFile(e.target.files[0]);
    };

    const quickComments = ["RAS", "Propre", "Sale", "Siège abîmé", "Ceinture HS", "Vitre fissurée", "Matériel manquant"];
    const addQuickComment = (text: string) => {
        setFormData(prev => {
            const current = prev.commentaire || "";
            const newValue = current ? (current.endsWith(' ') ? current + text : current + ', ' + text) : text;
            return { ...prev, commentaire: newValue };
        });
    };

    const handleSave = async () => {
        if (!formData.partenaire_id || !formData.date || !formData.file) return;
        setIsSaving(true);

        try {
            const newItem = { 
                id: editingId || `cc_${Date.now()}`, 
                ...formData 
            } as ControleCabine;

            if (editingId) {
                await api.addControleCabine(newItem); // Upsert
                setControls(prev => prev.map(c => c.id === editingId ? newItem : c));
                addNotification('success', 'Contrôle mis à jour.');
            } else {
                await api.addControleCabine(newItem);
                setControls(prev => [...prev, newItem]);
                addNotification('success', 'Nouveau contrôle ajouté.');
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erreur sauvegarde:", error);
            addNotification('error', "Erreur lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleView = (ctrl: ControleCabine) => { setViewingItem({ url: ctrl.url || '', name: ctrl.file }); };
    const canAdd = selectedPartnerId !== 'all' && !isReadOnly;

    return (
        <div className="space-y-6 animate-fade-in w-full pb-8">
            {/* ... (Header Filtres identique) ... */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                 <div className="relative w-full xl:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input type="text" placeholder="Rechercher (fichier, commentaire, date)..." className="pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full shadow-sm transition-all" value={filter} onChange={(e) => setFilter(e.target.value)} />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 overflow-x-auto pb-1 sm:pb-0">
                    <div className="relative min-w-[140px]">
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full appearance-none pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm">
                            <option value="">Tous les mois</option>
                            {months.map((m, index) => (<option key={index} value={index}>{m}</option>))}
                        </select>
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
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
                    <div className="flex gap-3 ml-auto sm:ml-0">
                        <ViewModeToggle mode={viewMode} setMode={setViewMode} />
                        <button onClick={() => handleOpenModal()} disabled={!canAdd} className={`bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-md shadow-blue-900/20 active:scale-95 whitespace-nowrap ${canAdd ? 'hover:bg-blue-700' : 'opacity-50 cursor-not-allowed'}`}><Plus size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">Ajouter</span></button>
                    </div>
                </div>
            </div>

            {selectedControls.size > 0 && !isReadOnly && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl px-4 py-3 flex items-center justify-between animate-zoom-in">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">{selectedControls.size} contrôle(s) sélectionné(s)</span>
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
                                        {selectedControls.size > 0 && selectedControls.size === paginatedControls.length ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                    </button>
                                </th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Fichier / Photo</th>
                                <th className="px-6 py-4">Commentaire</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {paginatedControls.map(c => {
                                const isSelected = selectedControls.has(c.id);
                                const isImg = isImage(c.file);
                                return (
                                <tr key={c.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                    <td className="px-6 py-4">
                                        {!isReadOnly && <button onClick={() => toggleSelect(c.id)} className="text-slate-400 hover:text-blue-600 transition-colors">{isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}</button>}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">{new Date(c.date).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 cursor-pointer hover:underline" onClick={() => handleView(c)}>
                                            {isImg ? <ImageIcon size={16} /> : <FileText size={16} />} {c.file}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{c.commentaire}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button onClick={() => handleView(c)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Eye size={16} /></button>
                                        {!isReadOnly && (
                                            <>
                                                <button onClick={() => handleOpenModal(c)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                                                <button onClick={() => requestDelete(c.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            )})}
                            {filteredControls.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Aucun contrôle trouvé</td></tr>}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedControls.map(c => {
                        const isSelected = selectedControls.has(c.id);
                        const isImg = isImage(c.file);
                        return (
                        <div key={c.id} className={`p-6 rounded-2xl border transition-all relative group flex flex-col ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'}`}>
                             {!isReadOnly && (
                                 <div className="absolute top-4 left-4 z-10">
                                     <button onClick={() => toggleSelect(c.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                        {isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                                    </button>
                                </div>
                             )}
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/50 dark:bg-slate-800/50 p-1 rounded-lg z-10">
                                <button onClick={() => handleView(c)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Eye size={16} /></button>
                                {!isReadOnly && (
                                    <>
                                        <button onClick={() => handleOpenModal(c)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                                        <button onClick={() => requestDelete(c.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                    </>
                                )}
                            </div>
                            <div className="flex justify-center mb-4 mt-2 cursor-pointer w-full h-48 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 relative group-hover:shadow-md transition-all" onClick={() => handleView(c)}>
                                {isImg && c.url ? (
                                    <img src={c.url} alt={c.file} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 group-hover:scale-105 transition-transform duration-500">
                                         <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/PDF_file_icon.svg/1667px-PDF_file_icon.svg.png" alt="PDF" className="w-16 h-16 opacity-80 mb-2 drop-shadow-sm" />
                                         <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Document PDF</span>
                                    </div>
                                )}
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="font-bold text-slate-800 dark:text-white">{new Date(c.date).toLocaleDateString('fr-FR')}</h3>
                                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate px-4 flex items-center justify-center gap-1" title={c.file}>{isImg ? <ImageIcon size={14} /> : <FileText size={14} />} {c.file}</div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 px-2 h-10">{c.commentaire}</p>
                            </div>
                        </div>
                    )})}
                </div>
            )}

            {/* ... Pagination (Identique) ... */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 px-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    Affichage de <span className="font-semibold">{paginatedControls.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> à <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredControls.length)}</span> sur <span className="font-semibold">{filteredControls.length}</span> résultats
                </span>
                <div className="flex items-center gap-2">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><ChevronLeft size={18} /></button>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 px-2">Page {currentPage} / {totalPages || 1}</span>
                    <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><ChevronRight size={18} /></button>
                </div>
            </div>

             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Modifier Contrôle' : 'Nouveau Contrôle'} footer={
                 <>
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Annuler</button>
                    {!isReadOnly && (
                        <button onClick={handleSave} disabled={isUploading || isSaving} className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait`}>
                            {(isUploading || isSaving) && <Loader2 size={16} className="animate-spin" />}
                            {isUploading ? 'Envoi...' : (isSaving ? 'Enregistrement...' : 'Enregistrer')}
                        </button>
                    )}
                 </>
             }>
                 {/* ... Formulaire (Identique) ... */}
                 <div className="space-y-4">
                     <FormInput label="Date" type="date" value={formData.date} onChange={(e:any) => setFormData({...formData, date: e.target.value})} disabled={isReadOnly || isSaving} />
                     <FormSelect label="Partenaire" value={formData.partenaire_id} onChange={(e:any) => setFormData({...formData, partenaire_id: e.target.value})} options={[{value: '', label: 'Sélectionner...'}, ...partners.map(p => ({value: p.id, label: p.nom}))]} disabled={selectedPartnerId !== 'all' || isReadOnly || isSaving} />
                     <div className="space-y-2">
                         <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Commentaire</label>
                         <textarea className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white h-24 resize-none transition-all" value={formData.commentaire} onChange={(e:any) => setFormData({...formData, commentaire: e.target.value})} placeholder="Observations..." disabled={isReadOnly || isSaving} />
                        {!isReadOnly && <div className="flex flex-wrap gap-2 mt-2">{quickComments.map(tag => (<button key={tag} onClick={() => addQuickComment(tag)} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">+ {tag}</button>))}</div>}
                     </div>
                     {!isReadOnly && (
                         <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer relative ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                             <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} accept="image/*,.pdf" disabled={isUploading || isSaving} />
                             {isUploading ? (<div className="text-blue-600 flex flex-col items-center"><Loader2 size={32} className="animate-spin mb-2" /><p className="text-sm font-medium">Upload en cours...</p></div>) : formData.file ? (<div className="flex flex-col items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-medium animate-fade-in"><CheckCircle size={32} /> <span className="text-sm truncate max-w-[250px]">{formData.file}</span><span className="text-xs text-slate-500">Cliquez pour changer</span></div>) : (<div className="text-slate-500 dark:text-slate-400"><Upload size={32} className="mx-auto mb-2 opacity-50" /><p className="font-medium">Glissez une photo ou un fichier ici</p><p className="text-xs mt-1">ou cliquez pour parcourir</p></div>)}
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
                        <button onClick={confirmDelete} disabled={isSaving} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-70">
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />} Confirmer
                        </button>
                    </>
                }
            >
                <div className="flex flex-col items-center text-center p-6 space-y-4">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full animate-bounce-short"><AlertTriangle size={48} strokeWidth={1.5} /></div>
                    <div><h3 className="text-lg font-bold text-slate-800 dark:text-white">Supprimer le contrôle ?</h3><p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">{deleteAction?.type === 'bulk' ? `Vous allez supprimer ${selectedControls.size} contrôle(s).` : "Ce document sera définitivement effacé."}</p></div>
                </div>
            </Modal>
        </div>
    );
};
