
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Video, Radio, Calendar, User, BookOpen, Save } from 'lucide-react';
import { CommunicationPlan, CommunicationExecution, UserRole } from '../types';
import { mockCommunicationPlans, mockCommunicationExecutions } from '../services/mockData';
import { FormInput, FormSelect } from '../components/ui/FormElements';

interface CommunicationDetailsProps {
    planId: string;
    onBack: () => void;
    userRole: UserRole;
}

export const CommunicationDetails = ({ planId, onBack, userRole }: CommunicationDetailsProps) => {
    const plan = mockCommunicationPlans.find(p => p.id === planId);
    
    // Récupérer l'exécution liée ou créer une structure vide
    const [execution, setExecution] = useState<Partial<CommunicationExecution>>({
        planning_communication_id: planId,
        partenaire_id: plan?.partenaire_id || '',
        video: '',
        canal: ''
    });

    const [isEditing, setIsEditing] = useState(false);
    const isReadOnly = userRole === 'directeur';

    useEffect(() => {
        const existingExecution = mockCommunicationExecutions.find(e => e.planning_communication_id === planId);
        if (existingExecution) {
            setExecution(existingExecution);
        } else if (plan) {
            setExecution({
                planning_communication_id: planId,
                partenaire_id: plan.partenaire_id,
                video: '',
                canal: ''
            });
        }
    }, [planId, plan]);

    const handleSave = () => {
        // Simulation de sauvegarde
        // Dans une vraie app, on ferait un appel API ou on mettrait à jour le store global
        alert("Détails de la communication enregistrés !");
        setIsEditing(false);
    };

    if (!plan) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <p>Plan de communication introuvable.</p>
                <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">Retour</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Détails de la Communication</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Informations détaillées et support média</p>
                    </div>
                </div>
                {!isReadOnly && (
                    !isEditing ? (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                        >
                            Modifier Détails
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Save size={18} /> Enregistrer
                            </button>
                        </div>
                    )
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Colonne Gauche : Infos du Plan (Lecture seule) */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                            Planning
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                                    <BookOpen size={16} /> Thème
                                </div>
                                <p className="font-semibold text-slate-800 dark:text-white">{plan.theme}</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                                    <Calendar size={16} /> Période
                                </div>
                                <p className="font-semibold text-slate-800 dark:text-white">{plan.periode}</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                                    <User size={16} /> Animateur
                                </div>
                                <p className="font-semibold text-slate-800 dark:text-white">{plan.animateur}</p>
                            </div>
                        </div>
                    </div>

                    {/* Bloc Canal */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                                <Radio size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Canal de Diffusion</h3>
                        </div>
                        
                        {isEditing ? (
                            <FormSelect 
                                label=""
                                value={execution.canal} 
                                onChange={(e: any) => setExecution({...execution, canal: e.target.value})}
                                options={[
                                    {value: '', label: 'Sélectionner...'},
                                    {value: 'Teams', label: 'Teams'},
                                    {value: 'Zoom', label: 'Zoom'},
                                    {value: 'Email', label: 'Email / Newsletter'},
                                    {value: 'Présentiel', label: 'Présentiel'},
                                    {value: 'Affichage', label: 'Affichage sur site'}
                                ]}
                            />
                        ) : (
                            <div className="text-center py-4">
                                {execution.canal ? (
                                    <span className="inline-block px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg font-medium">
                                        {execution.canal}
                                    </span>
                                ) : (
                                    <span className="text-slate-400 italic">Non défini</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Colonne Droite : Support Média (Video/Image) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                <Video size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Support de Formation</h3>
                        </div>

                        <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-700 min-h-[400px] flex items-center justify-center">
                            {isEditing ? (
                                <div className="w-full max-w-md p-6">
                                    <FormInput 
                                        label="URL de la vidéo / support" 
                                        value={execution.video} 
                                        onChange={(e: any) => setExecution({...execution, video: e.target.value})} 
                                        placeholder="https://..."
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Collez ici le lien vers la vidéo ou le document de présentation.</p>
                                </div>
                            ) : (
                                execution.video ? (
                                    <video controls className="w-full h-full max-h-[500px]" src={execution.video}>
                                        Votre navigateur ne supporte pas la lecture de vidéos.
                                    </video>
                                ) : (
                                    <div className="text-slate-400 flex flex-col items-center">
                                        <Video size={48} className="mb-2 opacity-50" />
                                        <p>Aucun support vidéo associé.</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
