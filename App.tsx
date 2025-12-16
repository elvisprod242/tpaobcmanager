
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { Header } from './components/Header';
import { useDarkMode } from './hooks/useDarkMode';
import { usePersistedState } from './hooks/usePersistedState'; 
import { AppView, Partenaire, Conducteur, CleObc, Vehicule, Rapport, Infraction, Invariant, Equipement, User } from './types';
import { Menu, Database } from 'lucide-react';
import { api } from './services/api'; 

// Import Pages
import { Dashboard } from './pages/Dashboard';
import { Auth } from './pages/Auth'; 
import { Partners } from './pages/Partners';
import { ObcKeys } from './pages/ObcKeys';
import { Drivers } from './pages/Drivers';
import { Vehicles } from './pages/Vehicles';
import { Invariants } from './pages/Invariants';
import { Objectives } from './pages/Objectives';
import { Reports } from './pages/Reports';
import { WorkTime } from './pages/WorkTime';
import { DrivingTime } from './pages/DrivingTime';
import { RestTime } from './pages/RestTime';
import { Infractions } from './pages/Infractions';
import { Procedures } from './pages/Procedures';
import { CabinControl } from './pages/CabinControl';
import { InfractionFiles } from './pages/InfractionFiles'; 
import { Kpis } from './pages/Kpis'; 
import { Scp } from './pages/Scp'; 
import { ScpAttribution } from './pages/ScpAttribution';
import { Communication } from './pages/Communication'; 
import { CommunicationDetails } from './pages/CommunicationDetails';
import { Settings } from './pages/Settings';

const App: React.FC = () => {
    // --- GESTION UTILISATEUR & AUTHENTIFICATION ---
    // On stocke l'objet User complet (avec rôle) plutôt qu'un booléen
    const [currentUser, setCurrentUser] = usePersistedState<User | null>('current_user', null);

    const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { isDarkMode, toggleTheme } = useDarkMode();
    
    // --- STATE CENTRALISÉ (Chargé via API/SQLite) ---
    const [isLoading, setIsLoading] = useState(true);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    const [drivers, setDrivers] = useState<Conducteur[]>([]);
    const [obcKeys, setObcKeys] = useState<CleObc[]>([]);
    const [vehicles, setVehicles] = useState<Vehicule[]>([]);
    const [equipements, setEquipements] = useState<Equipement[]>([]);
    const [invariants, setInvariants] = useState<Invariant[]>([]);
    const [reports, setReports] = useState<Rapport[]>([]);
    const [infractions, setInfractions] = useState<Infraction[]>([]);
    
    // Chargement initial des données depuis le Service API
    useEffect(() => {
        // On ne charge les données que si l'utilisateur est authentifié
        if (!currentUser) {
            setIsLoading(false);
            return;
        }

        const loadData = async () => {
            setIsLoading(true);
            try {
                const [p, d, k, v, e, i, r, inf] = await Promise.all([
                    api.getPartenaires(),
                    api.getConducteurs(),
                    api.getCleObc(),
                    api.getVehicules(),
                    api.getEquipements(),
                    api.getInvariants(),
                    api.getRapports(),
                    api.getInfractions()
                ]);
                
                setPartners(p);
                setDrivers(d);
                setObcKeys(k);
                setVehicles(v);
                setEquipements(e);
                setInvariants(i);
                setReports(r);
                setInfractions(inf);
            } catch (error) {
                console.error("Erreur chargement données:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [currentUser]); 

    // Wrappers pour sauvegarder via l'API lors des modifications
    const updatePartners = (newData: Partenaire[] | ((prev: Partenaire[]) => Partenaire[])) => {
        setPartners(prev => {
            const resolved = typeof newData === 'function' ? newData(prev) : newData;
            api.savePartenaires(resolved);
            return resolved;
        });
    };
    const updateDrivers = (newData: Conducteur[] | ((prev: Conducteur[]) => Conducteur[])) => {
        setDrivers(prev => {
            const resolved = typeof newData === 'function' ? newData(prev) : newData;
            api.saveConducteurs(resolved);
            return resolved;
        });
    };
    const updateKeys = (newData: CleObc[] | ((prev: CleObc[]) => CleObc[])) => {
        setObcKeys(prev => {
            const resolved = typeof newData === 'function' ? newData(prev) : newData;
            api.saveCleObc(resolved);
            return resolved;
        });
    };
    const updateVehicles = (newData: Vehicule[] | ((prev: Vehicule[]) => Vehicule[])) => {
        setVehicles(prev => {
            const resolved = typeof newData === 'function' ? newData(prev) : newData;
            api.saveVehicules(resolved);
            return resolved;
        });
    };
    const updateEquipements = (newData: Equipement[] | ((prev: Equipement[]) => Equipement[])) => {
        setEquipements(prev => {
            const resolved = typeof newData === 'function' ? newData(prev) : newData;
            api.saveEquipements(resolved);
            return resolved;
        });
    };
    const updateReports = (newData: Rapport[] | ((prev: Rapport[]) => Rapport[])) => {
        setReports(prev => {
            const resolved = typeof newData === 'function' ? newData(prev) : newData;
            api.saveRapports(resolved);
            return resolved;
        });
    };
    const updateInfractions = (newData: Infraction[] | ((prev: Infraction[]) => Infraction[])) => {
        setInfractions(prev => {
            const resolved = typeof newData === 'function' ? newData(prev) : newData;
            api.saveInfractions(resolved);
            return resolved;
        });
    };

    // États de navigation / filtres
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedInfractionId, setSelectedInfractionId] = useState<string | null>(null);
    const [selectedCommunicationPlanId, setSelectedCommunicationPlanId] = useState<string | null>(null);

    const handleGlobalPartnerSelect = (id: string) => {
        setSelectedPartnerId(id);
        if (id !== 'all') {
            updatePartners(prevPartners => prevPartners.map(p => ({ ...p, actif: p.id === id })));
        } else {
            updatePartners(prevPartners => prevPartners.map(p => ({ ...p, actif: false })));
        }
    };

    const handleViewInfractionFiles = (infractionId: string) => {
        setSelectedInfractionId(infractionId);
        setCurrentView(AppView.INFRACTION_FILES);
    };

    const handleViewCommunicationDetails = (planId: string) => {
        setSelectedCommunicationPlanId(planId);
        setCurrentView(AppView.COMMUNICATION_DETAILS);
    };

    const getViewTitle = () => {
        switch(currentView) {
            case AppView.DASHBOARD: return 'Tableau de bord';
            case AppView.PARTNERS: return 'Partenaires';
            case AppView.OBC_KEYS: return 'Clés OBC';
            case AppView.INVARIANTS: return 'Invariants';
            case AppView.OBJECTIVES: return 'Objectifs';
            case AppView.KPI: return 'Tableau KPI'; 
            case AppView.SCP: return 'SCP - Sanctions'; 
            case AppView.SCP_ATTRIBUTION: return 'Configuration des Sanctions (SCP)';
            case AppView.DRIVERS: return 'Conducteurs';
            case AppView.VEHICLES: return 'Véhicules';
            case AppView.REPORTS: return 'Rapports';
            case AppView.WORK_TIME: return 'Gestion Temps de Travail';
            case AppView.DRIVING_TIME: return 'Gestion Temps de Conduite';
            case AppView.REST_TIME: return 'Gestion Temps de Repos';
            case AppView.INFRACTIONS: return 'Infractions';
            case AppView.INFRACTION_FILES: return 'Justificatifs Infraction';
            case AppView.PROCEDURES: return 'Procédures';
            case AppView.CABIN_CONTROL: return 'Contrôle Cabine';
            case AppView.COMMUNICATION: return 'Planning de Communication';
            case AppView.COMMUNICATION_DETAILS: return 'Détail Communication';
            case AppView.SETTINGS: return 'Paramètres';
            default: return 'TPA';
        }
    }

    const renderContent = () => {
        // Rôle par défaut : directeur (lecture seule) si non défini pour éviter les fuites
        const role = currentUser?.role || 'directeur';

        switch (currentView) {
            case AppView.DASHBOARD: return <Dashboard selectedPartnerId={selectedPartnerId} globalYear={selectedYear} />;
            case AppView.PARTNERS: return <Partners partners={partners} setPartners={updatePartners} userRole={role} />;
            
            case AppView.OBC_KEYS: return <ObcKeys selectedPartnerId={selectedPartnerId} partners={partners} keys={obcKeys} setKeys={updateKeys} drivers={drivers} setDrivers={updateDrivers} userRole={role} />;
            case AppView.DRIVERS: return <Drivers selectedPartnerId={selectedPartnerId} drivers={drivers} setDrivers={updateDrivers} obcKeys={obcKeys} userRole={role} />;
            
            case AppView.INVARIANTS: return <Invariants selectedPartnerId={selectedPartnerId} partners={partners} userRole={role} />;
            case AppView.OBJECTIVES: return <Objectives selectedPartnerId={selectedPartnerId} partners={partners} invariants={invariants} userRole={role} />;
            case AppView.KPI: return <Kpis selectedPartnerId={selectedPartnerId} partners={partners} globalYear={selectedYear} />;
            case AppView.SCP: return <Scp selectedPartnerId={selectedPartnerId} partners={partners} globalYear={selectedYear} onChangeView={setCurrentView} userRole={role} />;
            case AppView.SCP_ATTRIBUTION: return <ScpAttribution selectedPartnerId={selectedPartnerId} partners={partners} onBack={() => setCurrentView(AppView.SCP)} userRole={role} />;
            
            case AppView.VEHICLES: return <Vehicles selectedPartnerId={selectedPartnerId} partners={partners} vehiclesData={vehicles} setVehiclesData={updateVehicles} equipementsData={equipements} setEquipementsData={updateEquipements} userRole={role} />;
            
            case AppView.REPORTS: return <Reports selectedPartnerId={selectedPartnerId} partners={partners} invariants={invariants} reportsData={reports} setReportsData={updateReports} infractionsData={infractions} setInfractionsData={updateInfractions} userRole={role} />;
            
            case AppView.WORK_TIME: return <WorkTime selectedPartnerId={selectedPartnerId} partners={partners} globalYear={selectedYear} />;
            case AppView.DRIVING_TIME: return <DrivingTime selectedPartnerId={selectedPartnerId} partners={partners} globalYear={selectedYear} />;
            case AppView.REST_TIME: return <RestTime selectedPartnerId={selectedPartnerId} partners={partners} globalYear={selectedYear} />;
            
            case AppView.INFRACTIONS: return <Infractions selectedPartnerId={selectedPartnerId} partners={partners} reports={reports} invariants={invariants} infractionsData={infractions} setInfractionsData={updateInfractions} onViewFiles={handleViewInfractionFiles} userRole={role} />;
            
            case AppView.INFRACTION_FILES: return selectedInfractionId ? <InfractionFiles infractionId={selectedInfractionId} onBack={() => setCurrentView(AppView.INFRACTIONS)} userRole={role} /> : <Infractions selectedPartnerId={selectedPartnerId} partners={partners} reports={reports} invariants={invariants} infractionsData={infractions} setInfractionsData={updateInfractions} onViewFiles={handleViewInfractionFiles} userRole={role} />;
            case AppView.PROCEDURES: return <Procedures selectedPartnerId={selectedPartnerId} userRole={role} />;
            case AppView.CABIN_CONTROL: return <CabinControl selectedPartnerId={selectedPartnerId} partners={partners} globalYear={selectedYear} userRole={role} />;
            case AppView.COMMUNICATION: return <Communication selectedPartnerId={selectedPartnerId} partners={partners} onViewDetails={handleViewCommunicationDetails} userRole={role} />;
            case AppView.COMMUNICATION_DETAILS: return selectedCommunicationPlanId ? <CommunicationDetails planId={selectedCommunicationPlanId} onBack={() => setCurrentView(AppView.COMMUNICATION)} userRole={role} /> : <Communication selectedPartnerId={selectedPartnerId} partners={partners} onViewDetails={handleViewCommunicationDetails} userRole={role} />;
            case AppView.SETTINGS: return <Settings isDarkMode={isDarkMode} toggleTheme={toggleTheme} currentUser={currentUser} onLogout={() => setCurrentUser(null)} />;
            default: return <Dashboard selectedPartnerId={selectedPartnerId} globalYear={selectedYear} />;
        }
    };

    // --- Si non authentifié, afficher la page Auth ---
    if (!currentUser) {
        return <Auth onLogin={(user) => setCurrentUser(user)} />;
    }

    // --- Si authentifié mais en chargement ---
    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4 animate-fade-in">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium text-lg">Chargement de TPA...</p>
                </div>
            </div>
        );
    }

    // --- Application Principale ---
    return (
        <div className={`flex h-screen overflow-hidden font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-blue-100 dark:selection:bg-blue-900/50`}>
            <Sidebar currentView={currentView} onChangeView={setCurrentView} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} currentUser={currentUser} />
            
            <div className="flex-1 flex flex-col min-w-0 h-full transition-all duration-300">
                <Header title={getViewTitle()} toggleSidebar={() => setIsMobileMenuOpen(true)} isDarkMode={isDarkMode} toggleTheme={toggleTheme} partners={partners} selectedPartnerId={selectedPartnerId} onSelectPartner={handleGlobalPartnerSelect} selectedYear={selectedYear} onSelectYear={setSelectedYear} currentUser={currentUser} />
                <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden pb-24 lg:pb-8">
                    <div className="w-full max-w-7xl mx-auto xl:max-w-none animate-fade-in">
                        {renderContent()}
                    </div>
                </main>
            </div>

            {/* Mobile Floating Action Button (FAB) for Menu */}
            {!isMobileMenuOpen && (
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="lg:hidden fixed bottom-6 right-6 z-40 bg-blue-600 text-white p-4 rounded-full shadow-xl shadow-blue-900/30 hover:bg-blue-700 active:scale-90 transition-all duration-300 animate-fade-in"
                    aria-label="Ouvrir le menu"
                >
                    <Menu size={28} strokeWidth={2.5} />
                </button>
            )}
        </div>
    );
};

export default App;
