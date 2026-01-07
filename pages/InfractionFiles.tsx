
import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Upload, Trash2, Eye, Download, AlertTriangle, AlertOctagon, User, Calendar, FolderOpen, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { Infraction, InfractionFile, UserRole } from '../types';
import { mockConducteurs, mockRapports, mockInvariants, mockScpConfigurations } from '../services/mockData';
import { getInfractionSeverity } from '../utils/helpers';
import { Modal } from '../components/ui/Modal';
import { storageService } from '../services/storage';
import { api } from '../services/api';

interface InfractionFilesProps {
    infractionId: string;
    infractions: Infraction[];
    setInfractions: React.Dispatch<React.SetStateAction<Infraction[]>>; // Gardé pour compat, mais moins utilisé
    onBack: () => void;
    userRole: UserRole;
}

export const InfractionFiles = ({ infractionId, infractions, setInfractions, onBack, userRole }: InfractionFilesProps) => {
    const infraction = infractions.find(i => i.id === infractionId);
    
    // État local des fichiers (chargés à la demande)
    const [files, setFiles] = useState<InfractionFile[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(true);
    
    // État pour la visualisation
    const [viewingFile, setViewingFile] = useState<InfractionFile | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const isReadOnly = userRole === 'directeur';

    // Chargement des fichiers depuis la sous-collection
    useEffect(() => {
        const loadFiles = async () => {
            if (!infractionId) return;
            setIsLoadingFiles(true);
            try {
                const data = await api.getInfractionFiles(infractionId);
                setFiles(data);
            } catch (error) {
                console.error("Erreur chargement fichiers:", error);
            } finally {
                setIsLoadingFiles(false);
            }
        };
        loadFiles();
    }, [infractionId]);

    if (!infraction) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <AlertTriangle size={48} className="mb-4 text-amber-500" />
                <p>Infraction introuvable.</p>
                <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">Retour</button>
            </div>
        );
    }

    const driverName = (() => {
        const report = mockRapports.find(r => r.id === infraction.rapports_id);
        if (!report) return 'Inconnu';
        const driver = mockConducteurs.find(c => c.id === report.conducteur_id);
        return driver ? `${driver.nom} ${driver.prenom}` : 'Inconnu';
    })();

    const severity = getInfractionSeverity(infraction, mockRapports, mockInvariants, mockScpConfigurations);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && infraction) {
            const file = e.target.files[0];
            setIsUploading(true);

            try {
                // 1. Upload vers le stockage (simulé Base64)
                const url = await storageService.uploadFile(file, 'infractions');

                // 2. Création de l'objet métadonnées
                const newFile: InfractionFile = {
                    id: `file_${Date.now()}`,
                    infractions_id: infraction.id,
                    file: file.name,
                    description: "Justificatif ajouté",
                    url: url,
                    type: file.name.split('.').pop()?.toLowerCase() || 'unknown'
                };
                
                // 3. Sauvegarde dans la sous-collection Firestore
                await api.addInfractionFile(infraction.id, newFile);
                
                // 4. Mise à jour locale
                setFiles(prev => [...prev, newFile]);
            } catch (error) {
                console.error("Upload échoué:", error);
                alert("Erreur lors de l'envoi du fichier.");
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        if (window.confirm("Supprimer ce fichier définitivement ?") && infraction) {
            try {
                // Suppression API
                await api.deleteInfractionFile(infraction.id, fileId);
                // Mise à jour locale
                setFiles(prev => prev.filter(f => f.id !== fileId));
            } catch (error) {
                console.error("Erreur suppression:", error);
                alert("Impossible de supprimer le fichier.");
            }
        }
    };

    const isImage = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '');
    };

    const isPdf = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ext === 'pdf';
    };

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Header Navigation */}
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={onBack}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Dossier Justificatifs
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${severity.type === 'Alarme' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                            {severity.type}
                        </span>
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gestion des documents liés à l'infraction</p>
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                            <AlertOctagon size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Type d'infraction</p>
                            <p className="font-semibold text-slate-900 dark:text-white">{infraction.type_infraction}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl">
                            <User size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Conducteur</p>
                            <p className="font-semibold text-slate-900 dark:text-white">{driverName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Date du constat</p>
                            <p className="font-semibold text-slate-900 dark:text-white">{new Date(infraction.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Files Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Upload Card */}
                {!isReadOnly && (
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group relative min-h-[200px]">
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileUpload} disabled={isUploading} />
                        <div className="w-16 h-16 bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            {isUploading ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
                        </div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-200">{isUploading ? 'Envoi en cours...' : 'Ajouter un document'}</h3>
                        <p className="text-xs text-slate-500 mt-1">PDF, Image, Word...</p>
                    </div>
                )}

                {/* Loading Skeleton */}
                {isLoadingFiles && (
                    <div className="col-span-full text-center py-12 text-slate-400">
                        <Loader2 size={32} className="animate-spin mx-auto mb-2" />
                        Chargement des fichiers...
                    </div>
                )}

                {/* Existing Files */}
                {!isLoadingFiles && files.map(file => {
                    const isImg = isImage(file.file);
                    return (
                        <div key={file.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex flex-col group hover:shadow-md transition-all relative animate-zoom-in">
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-slate-800/80 p-1 rounded-lg backdrop-blur-sm z-10">
                                <button onClick={() => setViewingFile(file)} className="p-1.5 text-slate-500 hover:text-blue-600 transition-colors" title="Voir"><Eye size={16} /></button>
                                {!isReadOnly && <button onClick={() => handleDeleteFile(file.id)} className="p-1.5 text-slate-500 hover:text-red-600 transition-colors" title="Supprimer"><Trash2 size={16} /></button>}
                            </div>

                            <div 
                                className="flex items-center justify-center h-36 bg-slate-50 dark:bg-slate-900/50 rounded-xl mb-4 text-slate-400 overflow-hidden cursor-pointer"
                                onClick={() => setViewingFile(file)}
                            >
                                {isImg && file.url ? (
                                    <img src={file.url} alt={file.file} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                ) : (
                                    <FileText size={48} className={isPdf(file.file) ? 'text-red-400' : 'text-blue-400'} />
                                )}
                            </div>

                            <div className="mt-auto">
                                <h4 className="font-semibold text-slate-800 dark:text-white truncate text-sm" title={file.file}>{file.file}</h4>
                                <p className="text-xs text-slate-500 mt-1 truncate">{file.description || "Justificatif"}</p>
                                <a 
                                    href={file.url} 
                                    download={file.file}
                                    className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Download size={14} /> Télécharger
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {!isLoadingFiles && files.length === 0 && (
                <div className="text-center py-12">
                    <div className="inline-flex p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 mb-3">
                        <FolderOpen size={32} />
                    </div>
                    <p className="text-slate-500">Aucun document dans ce dossier pour le moment.</p>
                </div>
            )}

            {/* Modal de Visualisation */}
            <Modal 
                isOpen={!!viewingFile} 
                onClose={() => setViewingFile(null)} 
                title={viewingFile?.file || "Visualisation"}
                size="large"
                footer={
                    <div className="flex justify-between w-full">
                        <button onClick={() => setViewingFile(null)} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Fermer</button>
                        {viewingFile?.url && (
                            <a href={viewingFile.url} download={viewingFile.file} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                                <Download size={16} /> Télécharger le fichier
                            </a>
                        )}
                    </div>
                }
            >
                {viewingFile && (
                    <div className="w-full h-[75vh] bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden flex flex-col items-center justify-center relative">
                        {isImage(viewingFile.file) ? (
                            <div className="w-full h-full flex items-center justify-center p-4 bg-slate-900/5 dark:bg-black/20">
                                <img 
                                    src={viewingFile.url} 
                                    alt={viewingFile.file} 
                                    className="max-w-full max-h-full object-contain rounded shadow-lg" 
                                />
                            </div>
                        ) : isPdf(viewingFile.file) ? (
                            <iframe 
                                src={viewingFile.url} 
                                className="w-full h-full border-none" 
                                title="Lecteur PDF"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 p-8 text-center">
                                <div className="p-4 bg-slate-200 dark:bg-slate-800 rounded-full">
                                    <FileText size={48} className="text-slate-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg text-slate-700 dark:text-slate-200">Aperçu non disponible</p>
                                    <p className="text-sm mt-1">Ce type de fichier ({viewingFile.type}) ne peut pas être prévisualisé directement.</p>
                                </div>
                                <a href={viewingFile.url} download={viewingFile.file} className="mt-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors shadow-lg shadow-blue-900/20">
                                    Télécharger pour voir
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};
