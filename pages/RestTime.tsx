
import React, { useState, useMemo } from 'react';
import { Calendar, User, AlertCircle, ChevronDown, Activity, Edit2, Plus, Save, Printer, FileText, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { TempsRepos, Partenaire, Rapport } from '../types';
import { mockTempsRepos, mockRapports, mockConducteurs } from '../services/mockData';
import { Modal } from '../components/ui/Modal';
import { FormInput } from '../components/ui/FormElements';

// --- Helpers pour la gestion du temps ---

const timeStringToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [h, m, s] = timeStr.split(':').map(Number);
    return (h * 3600) + (m * 60) + (s || 0);
};

const secondsToTimeString = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
};

const getWeekNumber = (d: Date): number => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const RestTime = ({ selectedPartnerId, partners, globalYear }: { selectedPartnerId: string, partners: Partenaire[], globalYear: string }) => {
    // Utilisation de l'année globale, ou l'année courante par défaut si non sélectionnée
    const currentYear = globalYear ? parseInt(globalYear) : new Date().getFullYear();
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    
    // État pour gérer les analyses localement
    const [analyses, setAnalyses] = useState<TempsRepos[]>(mockTempsRepos);
    
    // État pour le modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAnalysis, setCurrentAnalysis] = useState<Partial<TempsRepos>>({});
    const [selectedReportDate, setSelectedReportDate] = useState<string>('');

    // Filtrer les conducteurs disponibles selon le partenaire sélectionné
    const availableDrivers = useMemo(() => {
        return mockConducteurs.filter(() => true); 
    }, []);

    // Filtrer et trier les rapports
    const filteredReports = useMemo(() => {
        if (!selectedDriverId) return [];

        return mockRapports.filter(r => {
            const rDate = new Date(r.date);
            const matchesDriver = r.conducteur_id === selectedDriverId;
            const matchesMonth = rDate.getMonth() === parseInt(selectedMonth) && rDate.getFullYear() === currentYear;
            const matchesPartner = selectedPartnerId === 'all' || r.partenaire_id === selectedPartnerId;
            
            return matchesDriver && matchesMonth && matchesPartner;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [selectedDriverId, selectedMonth, selectedPartnerId, currentYear]);

    // Regrouper par semaine
    const reportsByWeek = useMemo(() => {
        const groups: { [week: number]: Rapport[] } = {};
        filteredReports.forEach(r => {
            const week = getWeekNumber(new Date(r.date));
            if (!groups[week]) groups[week] = [];
            groups[week].push(r);
        });
        return groups;
    }, [filteredReports]);

    // Calcul des totaux mensuels
    const monthlyStats = useMemo(() => {
        let totalWaitingSec = 0;

        filteredReports.forEach(r => {
            totalWaitingSec += timeStringToSeconds(r.temps_attente);
        });

        return {
            waiting: secondsToTimeString(totalWaitingSec),
            count: filteredReports.length
        };
    }, [filteredReports]);

    // Ouverture du modal
    const handleOpenAnalysisModal = (report: Rapport) => {
        const existingAnalysis = analyses.find(a => a.rapports_id === report.id);
        setSelectedReportDate(new Date(report.date).toLocaleDateString());
        
        if (existingAnalysis) {
            setCurrentAnalysis({ ...existingAnalysis });
        } else {
            // Création d'une nouvelle analyse vide liée au rapport
            setCurrentAnalysis({
                id: `tr_${Date.now()}`,
                partenaire_id: report.partenaire_id,
                rapports_id: report.id,
                objectifs_id: '',
                analyse_cause: '',
                action_prise: '',
                suivi: ''
            });
        }
        setIsModalOpen(true);
    };

    // Sauvegarde
    const handleSaveAnalysis = () => {
        if (!currentAnalysis.rapports_id) return;

        setAnalyses(prev => {
            const index = prev.findIndex(a => a.rapports_id === currentAnalysis.rapports_id);
            const newEntry = currentAnalysis as TempsRepos;
            
            if (index >= 0) {
                const newArr = [...prev];
                newArr[index] = newEntry;
                return newArr;
            } else {
                return [...prev, newEntry];
            }
        });
        setIsModalOpen(false);
    };

    // --- Export Functions ---

    const getExportData = () => {
        const driver = mockConducteurs.find(c => c.id === selectedDriverId);
        const driverName = driver ? `${driver.nom}_${driver.prenom}` : 'Rapport';
        const monthName = months[parseInt(selectedMonth)];
        
        const data = filteredReports.map(r => {
            const analysis = analyses.find(a => a.rapports_id === r.id);
            return {
                Date: new Date(r.date).toLocaleDateString('fr-FR'),
                Jour: r.jour,
                Début: r.heure_debut,
                Fin: r.heure_fin,
                Attente: r.temps_attente,
                Analyse: analysis?.analyse_cause || '-',
                Action: analysis?.action_prise || '-'
            };
        });

        return { data, driverName, monthName };
    };

    const handleExportExcel = () => {
        if (filteredReports.length === 0) return;
        const { data, driverName, monthName } = getExportData();
        
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Définir la largeur des colonnes
        const wscols = [
            { wch: 12 }, // Date
            { wch: 12 }, // Jour
            { wch: 10 }, // Début
            { wch: 10 }, // Fin
            { wch: 12 }, // Attente
            { wch: 40 }, // Analyse
            { wch: 40 }, // Action
        ];
        worksheet['!cols'] = wscols;
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Temps de Repos");
        
        XLSX.writeFile(workbook, `Temps_Repos_${driverName}_${monthName}_${currentYear}.xlsx`);
    };

    const handleExportPDF = () => {
        if (filteredReports.length === 0) return;
        const { data, driverName, monthName } = getExportData();
        
        const doc = new jsPDF();
        
        // --- Header Stylisé ---
        
        // Titre
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.text("Rapport Temps de Repos", 14, 20);
        
        // Ligne de séparation
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(14, 25, 196, 25);

        // Infos Conducteur & Période
        doc.setFontSize(11);
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Conducteur :", 14, 35);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(driverName.replace(/_/g, ' '), 45, 35);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Période :", 14, 42);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(`${monthName} ${currentYear}`, 45, 42);

        // --- Encadré Totaux ---
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.roundedRect(120, 28, 76, 18, 2, 2, 'FD');
        
        // Labels Totaux
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text("TOTAL ATTENTE", 125, 33);
        
        // Valeurs Totaux
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        
        doc.setTextColor(16, 185, 129); // Emerald 500 (Thème de la page)
        doc.text(monthlyStats.waiting, 125, 40);

        // --- Tableau ---
        const tableColumn = ["Date", "Jour", "Début", "Fin", "Attente", "Analyse", "Action"];
        const tableRows = data.map(item => [
            item.Date,
            item.Jour,
            item.Début,
            item.Fin,
            item.Attente,
            item.Analyse,
            item.Action
        ]);

        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 55,
            theme: 'grid',
            styles: { 
                fontSize: 9, 
                cellPadding: 3, 
                textColor: [51, 65, 85], // Slate 700
                lineColor: [226, 232, 240], // Slate 200
                lineWidth: 0.1,
                valign: 'middle'
            },
            headStyles: { 
                fillColor: [16, 185, 129], // Emerald 500
                textColor: [255, 255, 255], 
                fontStyle: 'bold',
                halign: 'center',
                minCellHeight: 10
            },
            columnStyles: {
                0: { cellWidth: 22 }, // Date
                1: { cellWidth: 20 }, // Jour
                2: { cellWidth: 15, halign: 'center' }, // Debut
                3: { cellWidth: 15, halign: 'center' }, // Fin
                4: { cellWidth: 18, halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] }, // Attente
                5: { cellWidth: 'auto' }, // Analyse
                6: { cellWidth: 'auto' }  // Action
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate 50
            },
            margin: { top: 55 },
            didDrawPage: function (data: any) {
                // Footer
                doc.setFontSize(8);
                doc.setTextColor(150);
                const dateStr = new Date().toLocaleDateString('fr-FR');
                doc.text(`Généré le ${dateStr} par TPA Manager`, data.settings.margin.left, doc.internal.pageSize.height - 10);
                
                const pageStr = 'Page ' + doc.internal.getNumberOfPages();
                doc.text(pageStr, doc.internal.pageSize.width - data.settings.margin.right - doc.getTextWidth(pageStr), doc.internal.pageSize.height - 10);
            }
        });

        doc.save(`Rapport_Repos_${driverName}_${monthName}.pdf`);
    };

    const handlePrint = () => {
        window.print();
    };

    const months = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];

    return (
        <div className="space-y-6 animate-fade-in pb-8 print:p-0 print:space-y-2">
            {/* Header / Filtres (Caché à l'impression sauf titre basique) */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col xl:flex-row gap-4 items-end xl:items-center justify-between no-print">
                <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto flex-1">
                    <div className="w-full md:w-64">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Conducteur</label>
                         <div className="relative">
                            <select 
                                value={selectedDriverId} 
                                onChange={(e) => setSelectedDriverId(e.target.value)}
                                className="w-full appearance-none pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all cursor-pointer font-medium"
                            >
                                <option value="">Sélectionner un conducteur...</option>
                                {availableDrivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.nom} {d.prenom}</option>
                                ))}
                            </select>
                            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                         </div>
                    </div>

                    <div className="w-full md:w-48">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Mois</label>
                        <div className="relative">
                            <select 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full appearance-none pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all cursor-pointer font-medium"
                            >
                                {months.map((m, index) => (
                                    <option key={index} value={index}>{m} {currentYear}</option>
                                ))}
                            </select>
                            <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
                
                {selectedDriverId && (
                    <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                        <div className="flex gap-4 flex-1">
                             <div className="bg-slate-50 dark:bg-slate-900/20 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-900/50 flex-1 md:flex-none min-w-[120px]">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Total Attente</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-white">{monthlyStats.waiting}</p>
                            </div>
                        </div>
                        
                        {/* Actions Export */}
                        <div className="flex gap-2">
                             <button 
                                onClick={handlePrint}
                                className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors"
                                title="Imprimer"
                            >
                                <Printer size={20} />
                            </button>
                            <button 
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-medium transition-colors"
                            >
                                <FileText size={18} /> <span className="hidden md:inline">PDF</span>
                            </button>
                            <button 
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-xl font-medium transition-colors"
                            >
                                <FileSpreadsheet size={18} /> <span className="hidden md:inline">Excel</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Titre Impression Seulement */}
            <div className="hidden print-only mb-6">
                <h1 className="text-2xl font-bold mb-2">Rapport Temps de Repos</h1>
                <p className="text-lg">Conducteur: {availableDrivers.find(d => d.id === selectedDriverId)?.nom} {availableDrivers.find(d => d.id === selectedDriverId)?.prenom}</p>
                <p>Période: {months[parseInt(selectedMonth)]} {currentYear}</p>
                <div className="mt-4 border p-4 flex gap-8">
                     <div>Total Attente: <strong>{monthlyStats.waiting}</strong></div>
                </div>
            </div>

            {!selectedDriverId ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 no-print">
                    <User size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">Veuillez sélectionner un conducteur pour voir son temps de repos.</p>
                </div>
            ) : filteredReports.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 no-print">
                    <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">Aucun rapport trouvé pour ce conducteur ce mois-ci.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(reportsByWeek).map(([week, data]) => {
                        const weekReports = data as Rapport[];
                        // Totaux pour la semaine (ici uniquement Attente)
                        const weekWaitingSec = weekReports.reduce((acc, r) => acc + timeStringToSeconds(r.temps_attente), 0);

                        return (
                            <div key={week} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden break-inside-avoid">
                                {/* Header Semaine */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center print:bg-gray-100 print:border-gray-300">
                                    <h3 className="font-bold text-slate-700 dark:text-slate-200">Semaine {week}</h3>
                                    <div className="flex gap-4 text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Total Attente: <span className="font-bold text-slate-800 dark:text-white">{secondsToTimeString(weekWaitingSec)}</span></span>
                                    </div>
                                </div>

                                {/* Liste des jours */}
                                <div className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-gray-200">
                                    {weekReports.map(report => {
                                        const analysis = analyses.find(t => t.rapports_id === report.id);
                                        
                                        return (
                                            <div key={report.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group print:hover:bg-transparent">
                                                <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                                                    {/* Date & Heures */}
                                                    <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-3 gap-4 items-center">
                                                        <div>
                                                            <div className="font-bold text-slate-800 dark:text-white capitalize">{report.jour}</div>
                                                            <div className="text-xs text-slate-500">{new Date(report.date).toLocaleDateString()}</div>
                                                        </div>
                                                        <div className="text-sm">
                                                            <span className="block text-xs text-slate-400">Amplitude</span>
                                                            <span className="font-mono text-slate-700 dark:text-slate-300">{report.heure_debut} - {report.heure_fin}</span>
                                                        </div>
                                                        <div className="text-sm">
                                                            <span className="block text-xs text-slate-400">Temps Attente</span>
                                                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{report.temps_attente}</span>
                                                        </div>
                                                    </div>

                                                    {/* Analyse (Si existante) */}
                                                    <div className="md:w-1/3 flex justify-end">
                                                        {analysis ? (
                                                            <div className="relative w-full bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-3 text-sm cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors group/analysis print:bg-transparent print:border-gray-300" onClick={() => handleOpenAnalysisModal(report)}>
                                                                <div className="absolute top-2 right-2 text-slate-400 opacity-0 group-hover/analysis:opacity-100 transition-opacity no-print">
                                                                    <Edit2 size={14} />
                                                                </div>
                                                                <div className="flex items-start gap-2">
                                                                    <AlertCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                                                                    <div>
                                                                        <p className="font-bold text-emerald-800 dark:text-emerald-300 text-xs uppercase mb-1">Analyse Repos : {analysis.analyse_cause}</p>
                                                                        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                                                                            <Activity size={12} />
                                                                            <span>Action : {analysis.action_prise}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleOpenAnalysisModal(report)}
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 hover:text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-xs font-medium no-print"
                                                            >
                                                                <Plus size={14} />
                                                                Ajouter analyse
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={`Analyse du ${selectedReportDate}`}
                footer={
                    <>
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Annuler</button>
                        <button onClick={handleSaveAnalysis} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2">
                            <Save size={16} /> Enregistrer
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Analyse de la cause (Repos/Pause)</label>
                        <textarea 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white h-32 transition-all resize-none" 
                            value={currentAnalysis.analyse_cause || ''} 
                            onChange={(e) => setCurrentAnalysis({...currentAnalysis, analyse_cause: e.target.value})}
                            placeholder="Décrivez la cause (ex: Coupure journalière réduite, pause manquée...)"
                            autoFocus
                        />
                    </div>
                    
                    <FormInput 
                        label="Action Prise" 
                        value={currentAnalysis.action_prise || ''} 
                        onChange={(e:any) => setCurrentAnalysis({...currentAnalysis, action_prise: e.target.value})} 
                        placeholder="Ex: Rappel RSE..."
                    />

                    <FormInput 
                        label="Suivi" 
                        value={currentAnalysis.suivi || ''} 
                        onChange={(e:any) => setCurrentAnalysis({...currentAnalysis, suivi: e.target.value})} 
                        placeholder="Ex: Pas de récidive..."
                    />
                </div>
            </Modal>
        </div>
    );
};
