
import React, { useState, useMemo } from 'react';
import { Calendar, User, ChevronDown, Activity, Edit2, Plus, Save, Printer, Paperclip, FileText, Trash2, Loader2 } from 'lucide-react';
import { TempsRepos, Partenaire, Rapport, InfractionFile, Conducteur, CleObc } from '../types';
import { mockRapports } from '../services/mockData';
import { Modal } from '../components/ui/Modal';
import { FormInput } from '../components/ui/FormElements';
import { api } from '../services/api';
import { storageService } from '../services/storage';

// Helpers (Same)
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

interface RestTimeProps {
    selectedPartnerId: string;
    partners: Partenaire[];
    globalYear: string;
    analyses: TempsRepos[];
    setAnalyses: React.Dispatch<React.SetStateAction<TempsRepos[]>>;
    drivers: Conducteur[];
    keys: CleObc[];
    reports: Rapport[];
}

export const RestTime = ({ selectedPartnerId, partners, globalYear, analyses, setAnalyses, drivers, keys, reports }: RestTimeProps) => {
    const currentYear = globalYear ? parseInt(globalYear) : new Date().getFullYear();
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentAnalysis, setCurrentAnalysis] = useState<Partial<TempsRepos>>({});
    const [selectedReportDate, setSelectedReportDate] = useState<string>('');
    const [analysisFiles, setAnalysisFiles] = useState<InfractionFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Initialisation & Optimisation du sélecteur
    const availableDrivers = useMemo(() => {
        let filtered = drivers;
        if (selectedPartnerId !== 'all') {
            filtered = drivers.filter(d => 
                d.cle_obc_ids?.some(kId => {
                    const key = keys.find(k => k.id === kId);
                    return key && key.partenaire_id === selectedPartnerId;
                })
            );
        }
        return filtered.sort((a, b) => a.nom.localeCompare(b.nom));
    }, [drivers, keys, selectedPartnerId]);

    const filteredReports = useMemo(() => {
        if (!selectedDriverId) return [];
        return reports.filter(r => {
            const rDate = new Date(r.date);
            return r.conducteur_id === selectedDriverId && rDate.getMonth() === parseInt(selectedMonth) && rDate.getFullYear() === currentYear && (selectedPartnerId === 'all' || r.partenaire_id === selectedPartnerId);
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [selectedDriverId, selectedMonth, selectedPartnerId, currentYear, reports]);

    const reportsByWeek = useMemo(() => {
        const groups: { [week: number]: Rapport[] } = {};
        filteredReports.forEach(r => {
            const week = getWeekNumber(new Date(r.date));
            if (!groups[week]) groups[week] = [];
            groups[week].push(r);
        });
        return groups;
    }, [filteredReports]);

    const monthlyStats = useMemo(() => {
        let total = 0;
        filteredReports.forEach(r => total += timeStringToSeconds(r.temps_attente));
        return { waiting: secondsToTimeString(total) };
    }, [filteredReports]);

    const handleOpenAnalysisModal = async (report: Rapport) => {
        const existingAnalysis = analyses.find(a => a.rapports_id === report.id);
        setSelectedReportDate(new Date(report.date).toLocaleDateString());
        
        let data = existingAnalysis;
        if (!data) {
            data = { id: `tr_${Date.now()}`, partenaire_id: report.partenaire_id, rapports_id: report.id, analyse_cause: '', action_prise: '', suivi: '' };
        }
        setCurrentAnalysis({ ...data });
        
        if (data.id) {
            const files = await api.getTempsReposFiles(data.id);
            setAnalysisFiles(files);
        } else {
            setAnalysisFiles([]);
        }
        setIsModalOpen(true);
    };

    const handleSaveAnalysis = async () => {
        if (!currentAnalysis.rapports_id) return;
        const newEntry = currentAnalysis as TempsRepos;
        await api.addTempsRepos(newEntry);
        setAnalyses(prev => {
            const index = prev.findIndex(a => a.rapports_id === newEntry.rapports_id);
            return index >= 0 ? prev.map((item, i) => i === index ? newEntry : item) : [...prev, newEntry];
        });
        setIsModalOpen(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && currentAnalysis.id) {
            setIsUploading(true);
            try {
                const file = e.target.files[0];
                const url = await storageService.uploadFile(file, 'temps_repos');
                const newFile: InfractionFile = { id: `file_${Date.now()}`, infractions_id: currentAnalysis.id, file: file.name, url, type: file.name.split('.').pop() || 'unknown' };
                await api.addTempsReposFile(currentAnalysis.id, newFile);
                setAnalysisFiles(prev => [...prev, newFile]);
            } catch (err) { console.error(err); } finally { setIsUploading(false); }
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        if (currentAnalysis.id && window.confirm("Supprimer ?")) {
            await api.deleteTempsReposFile(currentAnalysis.id, fileId);
            setAnalysisFiles(prev => prev.filter(f => f.id !== fileId));
        }
    };

    const handlePrint = () => window.print();
    const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

    return (
        <div className="space-y-6 animate-fade-in pb-8 print:p-0 print:space-y-0">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col xl:flex-row gap-4 items-end xl:items-center justify-between no-print">
                <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto flex-1">
                    <div className="w-full md:w-64">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Conducteur</label>
                         <div className="relative">
                            <select value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)} className="w-full appearance-none pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all cursor-pointer font-medium">
                                <option value="">Sélectionner un conducteur...</option>
                                {availableDrivers.map(d => (<option key={d.id} value={d.id}>{d.nom} {d.prenom}</option>))}
                            </select>
                            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                         </div>
                    </div>
                    <div className="w-full md:w-48">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Mois</label>
                        <div className="relative">
                            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full appearance-none pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all cursor-pointer font-medium">
                                {months.map((m, index) => (<option key={index} value={index}>{m} {currentYear}</option>))}
                            </select>
                            <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
                {selectedDriverId && (
                    <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/50 min-w-[120px]">
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Total Repos</p>
                            <p className="text-xl font-bold text-slate-800 dark:text-white">{monthlyStats.waiting}</p>
                        </div>
                        <button onClick={handlePrint} className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors"><Printer size={20} /></button>
                    </div>
                )}
            </div>

            {!selectedDriverId ? <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 no-print"><User size={48} className="mx-auto text-slate-300 mb-4" /><p className="text-slate-500 font-medium">Veuillez sélectionner un conducteur.</p></div> : filteredReports.length === 0 ? <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 no-print"><p className="text-slate-500 font-medium">Aucun rapport trouvé.</p></div> : (
                <div className="space-y-8">
                    {Object.entries(reportsByWeek).map(([week, data]) => {
                        // Calcul du total hebdomadaire (Repos = Temps d'attente/repos)
                        const weeklyTotalSec = (data as Rapport[]).reduce((acc, r) => acc + timeStringToSeconds(r.temps_attente), 0);
                        const weeklyTotalStr = secondsToTimeString(weeklyTotalSec);

                        return (
                            <div key={week} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 font-bold flex justify-between items-center">
                                    <span>Semaine {week}</span>
                                    <span className="text-sm font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                        Total Hebdo : {weeklyTotalStr}
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {(data as Rapport[]).map(report => {
                                        const analysis = analyses.find(t => t.rapports_id === report.id);
                                        return (
                                            <div key={report.id} className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="font-bold">{report.jour} <span className="text-xs font-normal text-slate-500">{new Date(report.date).toLocaleDateString()}</span></div>
                                                    <div className="text-sm font-bold text-emerald-600">Attente: {report.temps_attente}</div>
                                                </div>
                                                <div className="md:w-1/3 text-right">
                                                    {analysis ? (
                                                        <div className="cursor-pointer text-sm font-bold text-red-500" onClick={() => handleOpenAnalysisModal(report)}>
                                                            Analyse: {analysis.analyse_cause}
                                                        </div>
                                                    ) : <button onClick={() => handleOpenAnalysisModal(report)} className="text-xs bg-slate-100 px-3 py-1 rounded hover:bg-slate-200">Ajouter Analyse</button>}
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

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Analyse Repos ${selectedReportDate}`} footer={<><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-slate-100">Annuler</button><button onClick={handleSaveAnalysis} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2"><Save size={16} /> Enregistrer</button></>}>
                <div className="space-y-4">
                    <div className="space-y-2"><label className="block text-sm font-semibold">Cause</label><textarea className="w-full px-4 py-3 bg-slate-50 border rounded-xl h-24" value={currentAnalysis.analyse_cause || ''} onChange={(e) => setCurrentAnalysis({...currentAnalysis, analyse_cause: e.target.value})} placeholder="Cause..." /></div>
                    <FormInput label="Action Prise" value={currentAnalysis.action_prise || ''} onChange={(e:any) => setCurrentAnalysis({...currentAnalysis, action_prise: e.target.value})} placeholder="Ex: Rappel..." />
                    
                    <div className="border-t pt-4 mt-2">
                        <label className="block text-sm font-semibold mb-3 flex items-center gap-2"><Paperclip size={16} /> Justificatifs</label>
                        <div className="space-y-3 mb-4">{analysisFiles.map(file => (<div key={file.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border"><a href={file.url} target="_blank" className="text-sm text-blue-600 flex items-center gap-2"><FileText size={14} /> {file.file}</a><button onClick={() => handleDeleteFile(file.id)} className="text-red-500"><Trash2 size={14} /></button></div>))}</div>
                        {currentAnalysis.id ? (<div className="relative"><input type="file" onChange={handleFileUpload} className="hidden" id="file-upload" disabled={isUploading} /><label htmlFor="file-upload" className={`flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 ${isUploading ? 'opacity-50' : ''}`}>{isUploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}<span className="text-sm font-medium text-slate-500">Ajouter fichier</span></label></div>) : <p className="text-xs text-slate-400 italic text-center">Enregistrez pour ajouter des fichiers.</p>}
                    </div>
                </div>
            </Modal>
        </div>
    );
};
const handleOpenModal = (report: Rapport) => {}; // Placeholder
