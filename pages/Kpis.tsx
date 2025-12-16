
import React, { useState, useMemo } from 'react';
import { Calendar, ChevronDown, Save, Edit2, Printer, FileText } from 'lucide-react';
import { Kpi, Partenaire, Invariant, Objectif } from '../types';
import { mockKpis, mockRapports, mockInfractions, mockInvariants, mockObjectifs } from '../services/mockData';
import { Modal } from '../components/ui/Modal';
import { FormInput } from '../components/ui/FormElements';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper pour convertir temps HH:mm:ss en heures décimales
const timeStringToHours = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m, s] = timeStr.split(':').map(Number);
    return h + (m / 60) + ((s || 0) / 3600);
};

interface KpiRow {
    id: string;
    label: string;
    valeur: number | string;
    objectif: string | number;
    commentaire: string;
    isInvariant: boolean;
    isFixed?: boolean; // Pour distinguer la partie haute fixe
    isSeparator?: boolean; // Gardé pour compatibilité interface, mais non utilisé en mode agrégé
    // Pour la vue annuelle
    analyse_cause?: string;
    action_prise?: string;
    objectif_annuel?: string | number;
}

export const Kpis = ({ selectedPartnerId, partners, globalYear }: { selectedPartnerId: string, partners: Partenaire[], globalYear: string }) => {
    const [viewPeriod, setViewPeriod] = useState<'month' | 'year'>('month');
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
    
    // Utilisation de l'année globale, ou l'année courante par défaut si non sélectionnée
    const selectedYear = globalYear ? parseInt(globalYear) : new Date().getFullYear();
    
    // État local pour les commentaires (session)
    const [comments, setComments] = useState<{ [key: string]: string }>({});

    // Modal Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<KpiRow | null>(null);
    const [editForm, setEditForm] = useState<{
        objectif: string | number, 
        commentaire: string, 
        analyse_cause: string, 
        action_prise: string
    }>({ 
        objectif: '', 
        commentaire: '', 
        analyse_cause: '', 
        action_prise: '' 
    });

    const months = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];

    const currentMonthShort = months[parseInt(selectedMonth)].slice(0, 3).toUpperCase();
    const currentYearShort = selectedYear.toString().slice(2);

    // Construction des données du tableau
    const tableData = useMemo(() => {
        const rows: KpiRow[] = [];
        
        // Facteur multiplicateur : Si "Tous les partenaires", on multiplie par le nombre de partenaires pour les valeurs fixes
        // Pour les invariants dynamiques, on additionnera les cibles réelles.
        const multiplier = selectedPartnerId === 'all' ? partners.length : 1;

        // --- 1. Partie Fixe (Haut du tableau) ---
        // On récupère les rapports filtrés pour les calculs de base
        const relevantReports = mockRapports.filter(r => {
            const rDate = new Date(r.date);
            const matchesPartner = selectedPartnerId === 'all' || r.partenaire_id === selectedPartnerId;
            const matchesYear = rDate.getFullYear() === selectedYear;
            if (viewPeriod === 'year') return matchesPartner && matchesYear;
            return matchesPartner && matchesYear && rDate.getMonth() === parseInt(selectedMonth);
        });

        const totalDistance = Math.round(relevantReports.reduce((acc, r) => acc + r.distance_km, 0));
        const totalDrivingHours = Math.round(relevantReports.reduce((acc, r) => acc + timeStringToHours(r.temps_conduite), 0));
        const totalRestHours = Math.round(relevantReports.reduce((acc, r) => acc + timeStringToHours(r.temps_attente), 0));

        // Calcul dynamique des objectifs fixes basé sur le multiplicateur
        // Valeurs de base (pour 1 partenaire)
        const baseConduiteMensuel = 8580;
        const baseReposMensuel = 132;
        
        const objConduiteMensuel = baseConduiteMensuel * multiplier;
        const objConduiteAnnuel = (baseConduiteMensuel * 12) * multiplier;
        
        const objReposMensuel = baseReposMensuel * multiplier;
        const objReposAnnuel = (baseReposMensuel * 12) * multiplier;

        rows.push({
            id: 'fixed_kms',
            label: 'Kms parcourus',
            valeur: totalDistance,
            objectif: 'N/A',
            objectif_annuel: 'N/A',
            commentaire: comments['fixed_kms'] || '',
            isInvariant: false,
            isFixed: true
        });

        rows.push({
            id: 'fixed_conduite',
            label: 'Temps de conduite',
            valeur: totalDrivingHours,
            objectif: `${objConduiteMensuel.toLocaleString('fr-FR')} h/max`,
            objectif_annuel: `${objConduiteAnnuel.toLocaleString('fr-FR')} h/max`,
            commentaire: comments['fixed_conduite'] || '',
            isInvariant: false,
            isFixed: true
        });

        rows.push({
            id: 'fixed_repos',
            label: 'Temps de repos',
            valeur: totalRestHours, // Utilisation du temps d'attente comme proxy pour l'exemple
            objectif: `${objReposMensuel.toLocaleString('fr-FR')} Jours/Min`,
            objectif_annuel: `${objReposAnnuel.toLocaleString('fr-FR')} Jours/Min`,
            commentaire: comments['fixed_repos'] || '',
            isInvariant: false,
            isFixed: true
        });

        // --- 2. Partie Invariants (Bas du tableau - Agrégé) ---
        
        // On identifie tous les TITRES d'invariants uniques disponibles.
        const allUniqueTitles = Array.from(new Set(mockInvariants.map(i => i.titre)));

        allUniqueTitles.forEach(title => {
            // Trouver tous les invariants (objets) qui correspondent à ce titre
            // et qui appartiennent au contexte actuel (Partner X ou All)
            const matchingInvariants = mockInvariants.filter(inv => 
                inv.titre === title && 
                (selectedPartnerId === 'all' || inv.partenaire_id === selectedPartnerId)
            );

            if (matchingInvariants.length === 0) return;

            // Récupérer les IDs de ces invariants pour filtrer les rapports/infractions
            const matchingInvariantIds = matchingInvariants.map(inv => inv.id);

            // Calcul du nombre d'infractions cumulées pour ce titre d'invariant
            const infractionCount = mockInfractions.filter(inf => {
                const rDate = new Date(inf.date);
                const matchesYear = rDate.getFullYear() === selectedYear;
                const matchesMonth = viewPeriod === 'year' || rDate.getMonth() === parseInt(selectedMonth);
                
                if (selectedPartnerId !== 'all' && inf.partenaire_id !== selectedPartnerId) return false;

                const report = mockRapports.find(r => r.id === inf.rapports_id);
                if (report && matchingInvariantIds.includes(report.invariant_id || '')) {
                    return matchesYear && matchesMonth;
                }
                return false; 
            }).length;

            // --- CALCUL DES OBJECTIFS AGRÉGÉS ---
            // On additionne les cibles de chaque invariant correspondant
            let totalCible = 0;
            let unite = '';
            
            matchingInvariants.forEach(inv => {
                const obj = mockObjectifs.find(o => o.invariant_id === inv.id);
                if (obj) {
                    totalCible += obj.cible;
                    if (!unite && obj.unite) unite = obj.unite; // Prend la première unité trouvée
                }
            });

            // Si aucun objectif n'est défini, on met 0 par défaut
            const objectifVal = `${totalCible} ${unite}`;
            const objectifAnnuelVal = `${totalCible * 12} ${unite}`; // Annuel = Mensuel * 12

            // Création d'un ID unique pour la ligne agrégée
            const rowId = selectedPartnerId === 'all' ? `agg_${title.replace(/\s+/g, '_')}` : matchingInvariants[0].id;

            rows.push({
                id: rowId,
                label: title,
                valeur: infractionCount,
                objectif: objectifVal,
                objectif_annuel: objectifAnnuelVal,
                commentaire: comments[rowId] || '',
                isInvariant: true,
                isFixed: false,
                isSeparator: false,
                analyse_cause: '',
                action_prise: ''
            });
        });

        return rows;
    }, [selectedPartnerId, selectedMonth, selectedYear, viewPeriod, comments, partners.length]);

    const handleEdit = (row: KpiRow) => {
        setEditingRow(row);
        setEditForm({ 
            objectif: row.objectif,
            commentaire: row.commentaire,
            analyse_cause: row.analyse_cause || '',
            action_prise: row.action_prise || ''
        });
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (editingRow) {
            // Mise à jour des commentaires pour tout le monde
            setComments(prev => ({
                ...prev,
                [editingRow.id]: editForm.commentaire
            }));
            // Note: L'édition de l'objectif "Fixe" est désactivée car calculée dynamiquement maintenant
        }
        setIsModalOpen(false);
    };

    const handlePrint = () => window.print();

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`Tableau KPI - ${viewPeriod === 'month' ? months[parseInt(selectedMonth)] : 'Annuel'} ${selectedYear}`, 14, 20);
        
        const headers = viewPeriod === 'month' 
            ? ["Elément KPI", `${currentMonthShort}-${currentYearShort}`, "Objectif mensuel", "Commentaire"]
            : ["Elément KPI", "Score", "Objectif annuel", "Résultat", "Analyse"];

        const body = tableData.filter(r => !r.isSeparator).map(row => {
            if (viewPeriod === 'month') {
                return [row.label, row.valeur, row.objectif, row.commentaire];
            } else {
                const isOk = row.isInvariant ? row.valeur === 0 : true; 
                return [row.label, row.valeur, row.objectif_annuel, isOk ? "OK" : "NOK", row.analyse_cause];
            }
        });

        autoTable(doc, {
            head: [headers],
            body: body,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [91, 155, 213] } // Bleu #5b9bd5
        });
        doc.save('kpi-report.pdf');
    };

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Header Controls */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col xl:flex-row gap-4 items-center justify-between no-print">
                <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
                        <button 
                            onClick={() => setViewPeriod('month')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${viewPeriod === 'month' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            Vue Mensuelle
                        </button>
                        <button 
                            onClick={() => setViewPeriod('year')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${viewPeriod === 'year' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            Vue Annuelle
                        </button>
                    </div>

                    <div className="flex gap-4">
                        {viewPeriod === 'month' && (
                            <div className="w-40 relative">
                                <select 
                                    value={selectedMonth} 
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full appearance-none pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all cursor-pointer font-medium"
                                >
                                    {months.map((m, index) => (
                                        <option key={index} value={index}>{m}</option>
                                    ))}
                                </select>
                                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        )}
                        {/* Sélecteur d'année local supprimé ici, utilisation du filtre global */}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={handlePrint} className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors">
                        <Printer size={20} />
                    </button>
                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl font-medium transition-colors">
                        <FileText size={18} /> <span className="hidden md:inline">Export PDF</span>
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-300 dark:border-slate-600">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-[#5b9bd5] text-white border-b border-blue-600">
                                <th className="px-4 py-3 text-left border-r border-blue-400 w-1/3">Elément KPI</th>
                                {viewPeriod === 'month' ? (
                                    <>
                                        <th className="px-4 py-3 text-center border-r border-blue-400 w-32 font-bold uppercase">
                                            {currentMonthShort}-{currentYearShort}
                                        </th>
                                        <th className="px-4 py-3 text-center border-r border-blue-400 w-48">Objectif mensuel</th>
                                        <th className="px-4 py-3 text-left">Commentaire</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-4 py-3 text-center border-r border-blue-400 w-24 font-bold bg-[#364e6f]">Score</th>
                                        <th className="px-4 py-3 text-center border-r border-blue-400 w-40 bg-[#364e6f]">Objectif annuel</th>
                                        <th className="px-4 py-3 text-center border-r border-blue-400 w-32 bg-[#364e6f]">Résultat</th>
                                        <th className="px-4 py-3 text-left bg-[#364e6f]">Analyse / Action</th>
                                    </>
                                )}
                                <th className="px-2 py-3 w-10 bg-slate-100 dark:bg-slate-800 no-print border-l border-slate-200 dark:border-slate-700"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {/* Partie Fixe */}
                            {tableData.filter(r => r.isFixed).map((row, index) => (
                                <tr key={row.id} className={`${index % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-900/20' : 'bg-white dark:bg-slate-800'}`}>
                                    <td className="px-4 py-4 border-r border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100">
                                        {row.label}
                                    </td>
                                    {viewPeriod === 'month' ? (
                                        <>
                                            <td className="px-4 py-4 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-slate-900 dark:text-white">
                                                {row.valeur}
                                            </td>
                                            <td className="px-4 py-4 border-r border-slate-200 dark:border-slate-700 text-center text-slate-600 dark:text-slate-400">
                                                {row.objectif}
                                            </td>
                                            <td className="px-4 py-4 border-r border-slate-200 dark:border-slate-700 text-slate-500 italic">
                                                {row.commentaire}
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-4 border-r border-slate-200 dark:border-slate-700 text-center font-bold">{row.valeur}</td>
                                            <td className="px-4 py-4 border-r border-slate-200 dark:border-slate-700 text-center">{row.objectif_annuel}</td>
                                            <td className="px-4 py-4 border-r border-slate-200 dark:border-slate-700 text-center bg-green-50 text-green-700 font-bold">OK</td>
                                            <td className="px-4 py-4 text-slate-500">-</td>
                                        </>
                                    )}
                                    <td className="px-2 text-center bg-white dark:bg-slate-800 no-print">
                                        <button onClick={() => handleEdit(row)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={14} /></button>
                                    </td>
                                </tr>
                            ))}

                            {/* Séparateur visuel entre Fixe et Dynamique */}
                            <tr className="bg-[#5b9bd5]/10 h-2 border-t border-b border-blue-200 dark:border-blue-900">
                                <td colSpan={5}></td>
                            </tr>
                            
                            {/* Partie Invariants (Agrégée) */}
                            {tableData.filter(r => !r.isFixed).map((row, index) => {
                                const isAlert = Number(row.valeur) > 0;
                                return (
                                    <tr key={row.id} className="hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                            {row.label}
                                        </td>
                                        {viewPeriod === 'month' ? (
                                            <>
                                                <td className={`px-4 py-3 border-r border-slate-200 dark:border-slate-700 text-center font-bold ${isAlert ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                                                    {row.valeur}
                                                </td>
                                                <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-700 text-center text-slate-600 dark:text-slate-400">
                                                    {row.objectif}
                                                </td>
                                                <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-700 text-slate-500 italic truncate max-w-xs">
                                                    {row.commentaire}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className={`px-4 py-3 border-r border-slate-200 dark:border-slate-700 text-center font-bold ${isAlert ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                                                    {row.valeur}
                                                </td>
                                                <td className="px-4 py-3 border-r border-slate-200 dark:border-slate-700 text-center">{row.objectif_annuel}</td>
                                                <td className={`px-4 py-3 border-r border-slate-200 dark:border-slate-700 text-center font-bold ${isAlert ? 'text-red-600' : 'text-green-600'}`}>
                                                    {isAlert ? "Négatif" : "OK"}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 text-xs">
                                                    {row.analyse_cause || row.action_prise ? (
                                                        <div className="flex flex-col">
                                                            <span>{row.analyse_cause}</span>
                                                            <span className="text-blue-600">{row.action_prise}</span>
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                            </>
                                        )}
                                        <td className="px-2 text-center bg-white dark:bg-slate-800 no-print">
                                            <button onClick={() => handleEdit(row)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={14} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={`Modifier : ${editingRow?.label}`}
                footer={
                    <>
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Annuler</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                            <Save size={16} /> Enregistrer
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between mb-2">
                            <span className="text-sm text-slate-500 font-bold uppercase">Score Actuel</span>
                            <span className="text-sm text-slate-500 font-bold uppercase">Objectif</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-3xl font-bold text-slate-800 dark:text-white">{editingRow?.valeur}</span>
                            <span className="text-lg font-medium text-blue-600 dark:text-blue-400">{editingRow?.objectif}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Commentaire</label>
                        <textarea 
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white h-24 resize-none" 
                            value={editForm.commentaire} 
                            onChange={(e) => setEditForm({...editForm, commentaire: e.target.value})}
                            placeholder="Ajouter une observation..."
                        />
                    </div>
                    
                    {viewPeriod === 'year' && (
                        <>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Analyse de cause</label>
                                <textarea 
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white h-24 resize-none" 
                                    value={editForm.analyse_cause} 
                                    onChange={(e) => setEditForm({...editForm, analyse_cause: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Action prise</label>
                                <textarea 
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white h-24 resize-none" 
                                    value={editForm.action_prise} 
                                    onChange={(e) => setEditForm({...editForm, action_prise: e.target.value})}
                                />
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
};
