
import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, User, Search, MapPin, CreditCard, Key, CheckSquare, Square, Briefcase, Link2Off, AlertCircle, AlertTriangle, Printer, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Conducteur, CleObc, Partenaire, UserRole } from '../types';
import { Modal } from '../components/ui/Modal';
import { ViewModeToggle, ViewMode } from '../components/ui/ViewModeToggle';
import { FormInput, FormSelect } from '../components/ui/FormElements';
import { useNotification } from '../contexts/NotificationContext';

interface DriversProps {
    selectedPartnerId: string;
    drivers: Conducteur[];
    setDrivers: React.Dispatch<React.SetStateAction<Conducteur[]>>;
    obcKeys: CleObc[];
    partners: Partenaire[];
    userRole: UserRole;
}

export const Drivers = ({ selectedPartnerId, drivers, setDrivers, obcKeys, partners, userRole }: DriversProps) => {
    const { addNotification } = useNotification();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Conducteur>>({ nom: '', prenom: '', numero_permis: '', categorie_permis: 'C', lieu_travail: '' });
    
    // État Suppression
    const [deleteAction, setDeleteAction] = useState<{ type: 'single' | 'bulk', id?: string } | null>(null);

    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [filter, setFilter] = useState('');
    const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());

    const isReadOnly = userRole === 'directeur';

    // --- Helpers ---
    const getPartnerName = (cleObcIds?: string[]) => {
        if (!cleObcIds || cleObcIds.length === 0) return 'Aucun partenaire lié';
        
        if (selectedPartnerId === 'all') {
            if (cleObcIds.length > 1) return 'Multi-partenaires';
            const key = obcKeys.find(k => k.id === cleObcIds[0]);
            const partner = key ? partners.find(p => p.id === key.partenaire_id) : null;
            return partner ? partner.nom : 'Partenaire Inconnu';
        }

        const key = obcKeys.find(k => cleObcIds.includes(k.id) && k.partenaire_id === selectedPartnerId);
        const partner = key ? partners.find(p => p.id === key.partenaire_id) : null;
        return partner ? partner.nom : 'Aucun partenaire lié';
    };

    const filteredDrivers = useMemo(() => {
        return drivers.filter(d => {
            const searchStr = `${d.nom} ${d.prenom} ${d.numero_permis} ${d.lieu_travail}`.toLowerCase();
            return searchStr.includes(filter.toLowerCase());
        });
    }, [drivers, filter]);

    const handleSelectAll = () => {
        if (selectedDrivers.size === filteredDrivers.length && filteredDrivers.length > 0) {
            setSelectedDrivers(new Set());
        } else {
            setSelectedDrivers(new Set(filteredDrivers.map(d => d.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedDrivers);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedDrivers(newSelected);
    };

    // --- Actions CRUD ---
    const handleSave = () => {
        if (!formData.nom || !formData.prenom) return;
        setDrivers(prev => {
             const existingDriver = editingId ? prev.find(d => d.id === editingId) : null;
             const cleObcIds = existingDriver ? existingDriver.cle_obc_ids : [];

             const newItem = { 
                 id: editingId || `c_${Date.now()}`, 
                 ...formData,
                 cle_obc_ids: cleObcIds 
             } as Conducteur;
             
             return editingId ? prev.map(d => d.id === editingId ? newItem : d) : [...prev, newItem];
        });
        addNotification('success', editingId ? 'Conducteur mis à jour.' : 'Conducteur ajouté.');
        setIsModalOpen(false);
    };

    // --- Suppression Unifiée ---
    const requestDelete = (id: string, e?: React.MouseEvent) => {
        if(e) e.stopPropagation();
        setDeleteAction({ type: 'single', id });
    };

    const requestBulkDelete = () => setDeleteAction({ type: 'bulk' });

    const confirmDelete = () => {
        if (!deleteAction) return;

        if (deleteAction.type === 'single' && deleteAction.id) {
            setDrivers(prev => prev.filter(d => d.id !== deleteAction.id));
            if (selectedDrivers.has(deleteAction.id)) {
                const newSelected = new Set(selectedDrivers);
                newSelected.delete(deleteAction.id);
                setSelectedDrivers(newSelected);
            }
            addNotification('success', 'Conducteur supprimé.');
        } else if (deleteAction.type === 'bulk') {
            setDrivers(prev => prev.filter(d => !selectedDrivers.has(d.id)));
            addNotification('success', `${selectedDrivers.size} conducteurs supprimés.`);
            setSelectedDrivers(new Set());
        }
        setDeleteAction(null);
    };

    const handleOpenModal = (d?: Conducteur) => {
        if(d) { setEditingId(d.id); setFormData(d); }
        else { setEditingId(null); setFormData({ nom: '', prenom: '', numero_permis: '', categorie_permis: 'C', lieu_travail: '' }); }
        setIsModalOpen(true);
    };

    const getKeyDisplayInfo = (driverKeys?: string[]) => {
        const keys = driverKeys || [];
        if (selectedPartnerId === 'all') {
            if (keys.length === 0) return { text: "Aucune clé associée", isValid: false, isError: false };
            if (keys.length === 1) {
                const k = obcKeys.find(key => key.id === keys[0]);
                return { text: k ? k.cle_obc : "Clé inconnue", isValid: true, isError: false };
            }
            return { text: `${keys.length} clés actives`, isValid: true, isError: false };
        }
        const partnerKey = obcKeys.find(k => keys.includes(k.id) && k.partenaire_id === selectedPartnerId);
        return partnerKey ? { text: partnerKey.cle_obc, isValid: true, isError: false } : { text: "Aucune clé pour ce partenaire", isValid: false, isError: true };
    };

    // --- Gestion Impression & Export PDF ---
    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        
        // Titre et Méta-données
        doc.setFontSize(20);
        doc.setTextColor(30, 41, 59);
        doc.text("Liste des Conducteurs", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        const partnerName = selectedPartnerId === 'all' ? 'Tous les partenaires' : partners.find(p => p.id === selectedPartnerId)?.nom;
        const dateStr = new Date().toLocaleDateString('fr-FR');
        
        doc.text(`Partenaire: ${partnerName}`, 14, 28);
        doc.text(`Date: ${dateStr}`, 14, 33);
        doc.text(`Total: ${filteredDrivers.length} conducteur(s)`, 14, 38);

        // Préparation des données pour le tableau
        const tableColumn = ["Conducteur", "Permis", "Cat.", "Clé OBC", "Lieu Travail", "Partenaire Lié"];
        const tableRows = filteredDrivers.map(d => {
            const keyInfo = getKeyDisplayInfo(d.cle_obc_ids);
            const pName = getPartnerName(d.cle_obc_ids);
            return [
                `${d.nom} ${d.prenom}`,
                d.numero_permis,
                d.categorie_permis,
                keyInfo.text,
                d.lieu_travail || '-',
                pName
            ];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3, textColor: 50 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            didDrawPage: (data: any) => {
                const pageCount = doc.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Page ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });

        doc.save(`Conducteurs_${new Date().toISOString().split('T')[0]}.pdf`);
        addNotification('info', 'Le PDF a été généré avec succès.');
    };

    return (
        <div className="space-y-6 animate-fade-in w-full pb-8">
            {/* Barre d'outils (Masquée à l'impression) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                 <div className="relative w-full sm:w-auto flex-1 max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Rechercher (nom, permis, ville)..." 
                        className="pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full shadow-sm transition-all"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handlePrint}
                        className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors"
                        title="Imprimer (Navigateur)"
                    >
                        <Printer size={20} />
                    </button>
                    <button 
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-3 py-2.5 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40 rounded-xl font-medium transition-colors"
                        title="Télécharger PDF"
                    >
                        <FileText size={18} /> <span className="hidden md:inline">PDF</span>
                    </button>
                    <ViewModeToggle mode={viewMode} setMode={setViewMode} />
                    {!isReadOnly && (
                        <button 
                            onClick={() => handleOpenModal()} 
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-md shadow-blue-900/20 active:scale-95 hover:bg-blue-700"
                        >
                            <Plus size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">Ajouter</span>
                        </button>
                    )}
                </div>
            </div>

            {selectedDrivers.size > 0 && !isReadOnly && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl px-4 py-3 flex items-center justify-between animate-zoom-in no-print">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">{selectedDrivers.size} conducteur(s) sélectionné(s)</span>
                    <button onClick={requestBulkDelete} className="text-red-600 hover:text-red-700 dark:text-red-400 font-medium flex items-center gap-2 px-3 py-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                        <Trash2 size={18} /> Supprimer
                    </button>
                </div>
            )}

            {/* HEADER IMPRESSION (Visible uniquement à l'impression browser) */}
            <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold text-black mb-2">Liste des Conducteurs</h1>
                <div className="text-sm text-gray-600 flex justify-between border-b border-gray-300 pb-2 mb-4">
                    <span>Partenaire : {selectedPartnerId === 'all' ? 'Tous' : partners.find(p => p.id === selectedPartnerId)?.nom}</span>
                    <span>Date : {new Date().toLocaleDateString('fr-FR')}</span>
                    <span>Total : {filteredDrivers.length} conducteur(s)</span>
                </div>
            </div>

            {/* VUE TABLEAU POUR IMPRESSION (Toujours visible à l'impression, remplace Grid/List) */}
            <div className="hidden print:block w-full">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-300">
                            <th className="py-2 text-black font-bold">Nom Prénom</th>
                            <th className="py-2 text-black font-bold">Permis</th>
                            <th className="py-2 text-black font-bold">Clé OBC</th>
                            <th className="py-2 text-black font-bold">Lieu Travail</th>
                            <th className="py-2 text-black font-bold">Partenaire</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDrivers.map(d => {
                            const keyInfo = getKeyDisplayInfo(d.cle_obc_ids);
                            const partnerName = getPartnerName(d.cle_obc_ids);
                            return (
                                <tr key={d.id} className="border-b border-gray-200 break-inside-avoid">
                                    <td className="py-2 text-black">{d.nom} {d.prenom}</td>
                                    <td className="py-2 text-black font-mono">{d.numero_permis} ({d.categorie_permis})</td>
                                    <td className="py-2 text-black">{keyInfo.isValid ? keyInfo.text : '-'}</td>
                                    <td className="py-2 text-black">{d.lieu_travail}</td>
                                    <td className="py-2 text-black">{partnerName}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* VUES INTERACTIVES (Masquées à l'impression) */}
            <div className="print:hidden">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredDrivers.map(d => {
                            const isSelected = selectedDrivers.has(d.id);
                            const partnerName = getPartnerName(d.cle_obc_ids);
                            const keyInfo = getKeyDisplayInfo(d.cle_obc_ids);
                            
                            return (
                                <div 
                                    key={d.id} 
                                    className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all relative group flex flex-col overflow-hidden ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg'}`}
                                    onClick={() => handleOpenModal(d)}
                                >
                                    {!isReadOnly && (
                                        <div className="absolute top-3 left-3 z-20" onClick={(e) => e.stopPropagation()}>
                                             <button onClick={() => toggleSelect(d.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                                {isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                                            </button>
                                        </div>
                                    )}
                                    {!isReadOnly && (
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20 bg-white/80 dark:bg-slate-800/80 p-1 rounded-lg backdrop-blur-sm">
                                            <button onClick={(e) => requestDelete(d.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white dark:bg-slate-700 rounded-lg shadow-sm transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    )}

                                    {/* Header Carte */}
                                    <div className="p-6 flex flex-col items-center border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg mb-3">
                                            {d.prenom[0]}{d.nom[0]}
                                        </div>
                                        <h4 className="font-bold text-lg text-slate-900 dark:text-white text-center truncate w-full" title={`${d.prenom} ${d.nom}`}>
                                            {d.prenom} {d.nom}
                                        </h4>
                                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            <MapPin size={12} /> {d.lieu_travail || 'Non renseigné'}
                                        </div>
                                    </div>

                                    {/* Body Carte */}
                                    <div className="p-4 space-y-3 flex-1 bg-white dark:bg-slate-800">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                <CreditCard size={16} className="text-slate-400" />
                                                <span>Permis {d.categorie_permis}</span>
                                            </div>
                                            <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs text-slate-600 dark:text-slate-300">
                                                {d.numero_permis}
                                            </span>
                                        </div>
                                        
                                        <div className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${keyInfo.isValid ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'}`}>
                                            <div className={`p-1.5 rounded shadow-sm ${keyInfo.isValid ? 'bg-white dark:bg-slate-700 text-amber-500' : 'bg-white dark:bg-slate-700 text-red-400'}`}>
                                                {keyInfo.isValid ? <Key size={14} /> : <AlertCircle size={14} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] uppercase font-bold text-slate-400">Clé OBC</p>
                                                <p className={`text-xs font-medium truncate ${keyInfo.isValid ? 'text-slate-700 dark:text-slate-200 font-mono' : 'text-red-500 dark:text-red-400 italic'}`} title={keyInfo.text}>
                                                    {keyInfo.text}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Partenaire */}
                                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700/50">
                                        <div className={`flex items-center justify-center gap-2 text-xs font-medium ${keyInfo.isValid ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600 italic'}`}>
                                            <Briefcase size={12} />
                                            <span className="truncate max-w-[200px]">{partnerName}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/60 overflow-hidden backdrop-blur-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 w-12 sticky-header">
                                         <button onClick={handleSelectAll} className="text-slate-400 hover:text-blue-600 transition-colors">
                                            {selectedDrivers.size > 0 && selectedDrivers.size === filteredDrivers.length ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 sticky-header">Conducteur</th>
                                    <th className="px-6 py-4 sticky-header">Permis</th>
                                    <th className="px-6 py-4 sticky-header">Clé OBC</th>
                                    <th className="px-6 py-4 sticky-header">Lieu</th>
                                    <th className="px-6 py-4 sticky-header">Partenaire lié (Info)</th>
                                    <th className="px-6 py-4 text-right sticky-header">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {filteredDrivers.map(d => {
                                    const isSelected = selectedDrivers.has(d.id);
                                    const keyInfo = getKeyDisplayInfo(d.cle_obc_ids);
                                    const partnerName = getPartnerName(d.cle_obc_ids);

                                    return (
                                        <tr 
                                            key={d.id} 
                                            onClick={() => handleOpenModal(d)}
                                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                        >
                                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                {!isReadOnly && (
                                                    <button onClick={() => toggleSelect(d.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                                        {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                                        {d.prenom[0]}{d.nom[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white">{d.nom} {d.prenom}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-mono text-xs">
                                                    <CreditCard size={12} /> {d.numero_permis} ({d.categorie_permis})
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {keyInfo.isValid ? (
                                                    <span className="font-mono text-slate-600 dark:text-slate-400 text-xs flex items-center gap-1.5">
                                                        <Key size={12} className="text-amber-500" /> {keyInfo.text}
                                                    </span>
                                                ) : (
                                                    <span className="text-red-500 dark:text-red-400 text-xs italic flex items-center gap-1">
                                                        <Link2Off size={12} /> {keyInfo.text}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                {d.lieu_travail}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">
                                                {partnerName}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={() => handleOpenModal(d)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 dark:bg-slate-700/50 rounded-lg"><Edit2 size={16} /></button>
                                                    {!isReadOnly && (
                                                        <button onClick={(e) => requestDelete(d.id, e)} className="p-2 text-slate-400 hover:text-red-600 transition-colors bg-slate-50 dark:bg-slate-700/50 rounded-lg"><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Modifier Conducteur' : 'Nouveau Conducteur'} footer={
                 <>
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Annuler</button>
                    {!isReadOnly && (
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Enregistrer</button>
                    )}
                 </>
             }>
                 <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                         <FormInput label="Nom" value={formData.nom} onChange={(e:any) => setFormData({...formData, nom: e.target.value})} disabled={isReadOnly} />
                         <FormInput label="Prénom" value={formData.prenom} onChange={(e:any) => setFormData({...formData, prenom: e.target.value})} disabled={isReadOnly} />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <FormInput label="N° Permis" value={formData.numero_permis} onChange={(e:any) => setFormData({...formData, numero_permis: e.target.value})} disabled={isReadOnly} />
                        <FormInput label="Catégorie" value={formData.categorie_permis} onChange={(e:any) => setFormData({...formData, categorie_permis: e.target.value})} disabled={isReadOnly} />
                     </div>

                     <FormInput label="Lieu de travail" value={formData.lieu_travail} onChange={(e:any) => setFormData({...formData, lieu_travail: e.target.value})} disabled={isReadOnly} />
                     
                     <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-sm flex items-start gap-3">
                        <Key className="shrink-0 mt-0.5" size={18} />
                        <p>
                            L'assignation des Clés OBC se fait désormais exclusivement depuis la page <strong>Clés OBC</strong>. 
                            Un conducteur peut posséder une clé par partenaire.
                        </p>
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
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Supprimer le conducteur ?</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-2">
                            {deleteAction?.type === 'bulk' 
                                ? `Vous allez supprimer ${selectedDrivers.size} conducteur(s).` 
                                : "Cette action est irréversible et retirera également les accès clés OBC."}
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
