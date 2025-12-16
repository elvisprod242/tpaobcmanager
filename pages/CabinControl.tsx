import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Edit2, CheckSquare, Square, ClipboardCheck, Upload, Download, Eye, FileText, CheckCircle, Image as ImageIcon, Calendar, ChevronDown, X, ExternalLink, AlertTriangle } from 'lucide-react';
import { ControleCabine, Partenaire, UserRole } from '../types';
import { mockControleCabine } from '../services/mockData';
import { ViewModeToggle, ViewMode } from '../components/ui/ViewModeToggle';
import { Modal } from '../components/ui/Modal';
import { FormInput, FormSelect } from '../components/ui/FormElements';

export const CabinControl = ({ selectedPartnerId, partners, globalYear, userRole }: { selectedPartnerId: string, partners: Partenaire[], globalYear: string, userRole: UserRole }) => {
    const [controls, setControls] = useState<ControleCabine[]>(mockControleCabine);
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
    
    // État Suppression
    const [deleteAction, setDeleteAction] = useState<{ type: 'single' | 'bulk', id?: string } | null>(null);

    // Vue par défaut 'grid' conservée
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [filter, setFilter] = useState('');
    const [selectedControls, setSelectedControls] = useState<Set<string>>(new Set());
    
    // Filtres de date
    const [selectedMonth, setSelectedMonth] = useState<string>(''); // '' = Tous
    
    const months = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    
    // État pour la visualisation
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
            
            // Filtres temporels
            const matchesMonth = selectedMonth === '' || cDate.getMonth().toString() === selectedMonth;
            // Utilisation du filtre global d'année
            const matchesYear = globalYear === '' || cDate.getFullYear().toString() === globalYear;

            return matchesPartner && matchesSearch && matchesMonth && matchesYear;
        });
    }, [controls, selectedPartnerId, filter, selectedMonth, globalYear]);

    const handleSelectAll = () => {
        if (selectedControls.size === filteredControls.length && filteredControls.length > 0) {
            setSelectedControls(new Set());
        } else {
            setSelectedControls(new Set(filteredControls.map(c => c.id)));
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

    const confirmDelete = () => {
        if (!deleteAction) return;

        if (deleteAction.type === 'single' && deleteAction.id) {
            setControls(prev => prev.filter(c => c.id !== deleteAction.id));
            if (selectedControls.has(deleteAction.id)) {
                const newSelected = new Set(selectedControls);
                newSelected.delete(deleteAction.id);
                setSelectedControls(newSelected);
            }
        } else if (deleteAction.type === 'bulk') {
            setControls(prev => prev.filter(c => !selectedControls.has(c.id)));
            setSelectedControls(new Set());
        }
        setDeleteAction(null);
    };

    const handleOpenModal = (ctrl?: ControleCabine) => {
        setDragActive(false);
        if (ctrl) {
            setEditingId(ctrl.id);
            setFormData(ctrl);
        } else {
            setEditingId(null);
            setFormData({ 
                date: new Date().toISOString().split('T')[0], 
                partenaire_id: selectedPartnerId !== 'all' ? selectedPartnerId : '', 
                file: '', 
                commentaire: '' 
            });
        }
        setIsModalOpen(true);
    };

    // Gestion Drag & Drop
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const objectUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, file: file.name, url: objectUrl }));
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const objectUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, file: file.name, url: objectUrl }));
        }
    };

    // Commentaires rapides
    const quickComments = ["RAS", "Propre", "Sale", "Siège abîmé", "Ceinture HS", "Vitre fissurée", "Matériel manquant"];
    
    const addQuickComment = (text: string) => {
        setFormData(prev => {
            const current = prev.commentaire || "";
            // Ajoute le tag avec une virgule si du texte existe déjà
            const newValue = current ? (current.endsWith(' ') ? current + text : current + ', ' + text) : text;
            return { ...prev, commentaire: newValue };
        });
    };

    const handleSave = () => {
        if (!formData.partenaire_id || !formData.date || !formData.file) return;
        setControls(prev => {
            const newItem = { id: editingId || `cc_${Date.now()}`, ...formData } as ControleCabine;
            return editingId ? prev.map(c => c.id === editingId ? newItem : c) : [...prev, newItem];
        });
        setIsModalOpen(false);
    };

    const handleView = (ctrl: ControleCabine) => {
        setViewingItem({ url: ctrl.url || '', name: ctrl.file });
    };

    const canAdd = selectedPartnerId !== 'all' && !isReadOnly;

    return (
        <div className="space-y-6 animate-fade-in w-full pb-8">
            {/* Barre d'outils supérieure */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                 {/* Recherche */}
                 <div className="relative w-full xl:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Rechercher (fichier, commentaire, date)..." 
                        className="pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full shadow-sm transition-all"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 overflow-x-auto pb-1 sm:pb-0">
                    {/* Filtre Mois */}
                    <div className="relative min-w-[140px]">
                        <select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full appearance-none pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                        >
                            <option value="">Tous les mois</option>
                            {months.map((m, index) => (
                                <option key={index} value={index}>{m}</option>
                            ))}
                        </select>
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 ml-auto sm:ml-0">
                        <ViewModeToggle mode={viewMode} setMode={setViewMode} />
                        <button 
                            onClick={() => handleOpenModal()} 
                            disabled={!canAdd}
                            title={!canAdd ? "Veuillez sélectionner un partenaire pour ajouter" : ""}
                            className={`bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-md shadow-blue-900/20 active:scale-95 whitespace-nowrap ${canAdd ? 'hover:bg-blue-700' : 'opacity-50 cursor-not-allowed'}`}
                        >
                            <Plus size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">Ajouter</span>
                        </button>
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
                                        {selectedControls.size > 0 && selectedControls.size === filteredControls.length ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                    </button>
                                </th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Fichier / Photo</th>
                                <th className="px-6 py-4">Commentaire</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredControls.map(c => {
                                const isSelected = selectedControls.has(c.id);
                                const isImg = isImage(c.file);
                                return (
                                <tr key={c.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                    <td className="px-6 py-4">
                                        {!isReadOnly && (
                                            <button onClick={() => toggleSelect(c.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                                {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                            </button>
                                        )}
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
                            {filteredControls.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Aucun contrôle trouvé pour ces critères</td></tr>}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredControls.map(c => {
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
                            
                            {/* CHANGEMENT : Image systématique */}
                            <div className="flex justify-center mb-4 mt-2 cursor-pointer w-full h-48 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 relative group-hover:shadow-md transition-all" onClick={() => handleView(c)}>
                                {isImg && c.url ? (
                                    <img src={c.url} alt={c.file} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    // Placeholder image pour les documents (PDF, etc.)
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 group-hover:scale-105 transition-transform duration-500">
                                         <img 
                                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/PDF_file_icon.svg/1667px-PDF_file_icon.svg.png" 
                                            alt="Document PDF" 
                                            className="w-16 h-16 opacity-80 mb-2 drop-shadow-sm"
                                         />
                                         <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Document PDF</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="text-center space-y-2">
                                <h3 className="font-bold text-slate-800 dark:text-white">{new Date(c.date).toLocaleDateString('fr-FR')}</h3>
                                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate px-4 flex items-center justify-center gap-1" title={c.file}>
                                    {isImg ? <ImageIcon size={14} /> : <FileText size={14} />}
                                    {c.file}
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 px-2 h-10">
                                    {c.commentaire}
                                </p>
                            </div>
                        </div>
                    )})}
                    {filteredControls.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500">
                            Aucun résultat ne correspond à vos filtres.
                        </div>
                    )}
                </div>
            )}

             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Modifier Contrôle' : 'Nouveau Contrôle'} footer={
                 <>
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors