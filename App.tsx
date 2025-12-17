
import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { Header } from './components/Header';
import { useDarkMode } from './hooks/useDarkMode';
import { usePersistedState } from './hooks/usePersistedState'; 
import { AppView, Partenaire, Conducteur, CleObc, Vehicule, Rapport, Infraction, Invariant, Equipement, User, Procedure, ControleCabine, CommunicationPlan, CommunicationExecution, TempsTravail, TempsConduite, TempsRepos, ScpConfiguration, Objectif } from './types';
import { Menu } from 'lucide-react';
import { api } from './services/api'; 
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastContainer } from './components/ui/Toast';

// --- Lazy Loading des Pages (Optimisation Build) ---
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Auth = React.lazy(() => import('./pages/Auth').then(m => ({ default: m.Auth })));
const Partners = React.lazy(() => import('./pages/Partners').then(m => ({ default: m.Partners })));
const ObcKeys = React.lazy(() => import('./pages/ObcKeys').then(m => ({ default: m.ObcKeys })));
const Drivers = React.lazy(() => import('./pages/Drivers').then(m => ({ default: m.Drivers })));
const Vehicles = React.lazy(() => import('./pages/Vehicles').then(m => ({ default: m.Vehicles })));
const Invariants = React.lazy(() => import('./pages/Invariants').then(m => ({ default: m.Invariants })));
const Objectives = React.lazy(() => import('./pages/Objectives').then(m => ({ default: m.Objectives })));
const Reports = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const WorkTime = React.lazy(() => import('./pages/WorkTime').then(m => ({ default: m.WorkTime })));
const DrivingTime = React.lazy(() => import('./pages/DrivingTime').then(m => ({ default: m.DrivingTime })));
const RestTime = React.lazy(() => import('./pages/RestTime').then(m => ({ default: m.RestTime })));
const Infractions = React.lazy(() => import('./pages/Infractions').then(m => ({ default: m.Infractions })));
const Procedures = React.lazy(() => import('./pages/Procedures').then(m => ({ default: m.Procedures })));
const CabinControl = React.lazy(() => import('./pages/CabinControl').then(m => ({ default: m.CabinControl })));
const InfractionFiles = React.lazy(() => import('./pages/InfractionFiles').then(m => ({ default: m.InfractionFiles })));
const Kpis = React.lazy(() => import('./pages/Kpis').then(m => ({ default: m.Kpis })));
const Scp = React.lazy(() => import('./pages/Scp').then(m => ({ default: m.Scp })));
const ScpAttribution = React.lazy(() => import('./pages/ScpAttribution').then(m => ({ default: m.ScpAttribution })));
const Communication = React.lazy(() => import('./pages/Communication').then(m => ({ default: m.Communication })));
const CommunicationDetails = React.lazy(() => import('./pages/CommunicationDetails').then(m => ({ default: m.CommunicationDetails })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

// Composant de chargement pour Suspense
const PageLoader = () => (
    <div className="flex h-full w-full items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium text-sm animate-pulse">Chargement...</p>
        </div>
    </div>
);

const App: React.FC = () => {
    // --- GESTION UTILISATEUR & AUTHENTIFICATION ---
    const [currentUser, setCurrentUser] = usePersistedState<User | null>('current_user', null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { isDarkMode, toggleTheme } = useDarkMode();
    
    // --- STATE CENTRALISÉ ---
    const [isLoading, setIsLoading] = useState(true);
    
    // Données
    const [partners, setPartners] = useState<Partenaire[]>([]);
    const [drivers, setDrivers] = useState<Conducteur[]>([]);
    const [obcKeys, setObcKeys] = useState<CleObc[]>([]);
    const [vehicles, setVehicles] = useState<Vehicule[]>([]);
    const [equipements, setEquipements] = useState<Equipement[]>([]);
    const [invariants, setInvariants] = useState<Invariant[]>([]);
    const [reports, setReports] = useState<Rapport[]>([]);
    const [infractions, setInfractions] = useState<Infraction[]>([]);
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [cabinControls, setCabinControls] = useState<ControleCabine[]>([]);
    const [commPlans, setCommPlans] = useState<CommunicationPlan[]>([]);
    const [commExecs, setCommExecs] = useState<CommunicationExecution[]>([]);
    const [workAnalysis, setWorkAnalysis] = useState<TempsTravail[]>([]);
    const [driveAnalysis, setDriveAnalysis] = useState<TempsConduite[]>([]);
    const [restAnalysis, setRestAnalysis] = useState<TempsRepos[]>([]);
    const [scpConfigs, setScpConfigs] = useState<ScpConfiguration[]>([]);
    const [objectives, setObjectives] = useState<Objectif[]>([]);

    // États de filtre global
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

    // Navigation Hooks
    const location = useLocation();
    const navigate = useNavigate();

    // Chargement initial
    useEffect(() => {
        if (!currentUser) {
            setIsLoading(false);
            return;
        }

        const loadData = async () => {
            setIsLoading(true);
            try {
                const results = await Promise.all([
                    api.getPartenaires(), api.getConducteurs(), api.getCleObc(), api.getVehicules(), 
                    api.getEquipements(), api.getInvariants(), api.getRapports(), api.getInfractions(),
                    api.getProcedures(), api.getControleCabine(), api.getCommunicationPlans(), 
                    api.getCommunicationExecutions(), api.getTempsTravail(), api.getTempsConduite(), 
                    api.getTempsRepos(), api.getScpConfigurations(), api.getObjectifs()
                ]);
                
                setPartners(results[0]); setDrivers(results[1]); setObcKeys(results[2]); setVehicles(results[3]);
                setEquipements(results[4]); setInvariants(results[5]); setReports(results[6]); setInfractions(results[7]);
                setProcedures(results[8]); setCabinControls(results[9]); setCommPlans(results[10]); 
                setCommExecs(results[11]); setWorkAnalysis(results[12]); setDriveAnalysis(results[13]); 
                setRestAnalysis(results[14]); setScpConfigs(results[15]); setObjectives(results[16]);

            } catch (error) {
                console.error("Erreur chargement données:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [currentUser]); 

    // --- WRAPPERS DE SAUVEGARDE ---
    const createUpdater = <T extends any>(setter: React.Dispatch<React.SetStateAction<T[]>>, apiSaver: (data: T[]) => Promise<void>) => {
        return (newData: T[] | ((prev: T[]) => T[])) => {
            setter(prev => {
                const resolved = typeof newData === 'function' ? newData(prev) : newData;
                apiSaver(resolved);
                return resolved;
            });
        };
    };

    const updateDrivers = createUpdater(setDrivers, api.saveConducteurs);
    const updateKeys = createUpdater(setObcKeys, api.saveCleObc);
    const updateVehicles = createUpdater(setVehicles, api.saveVehicules);
    const updateEquipements = createUpdater(setEquipements, api.saveEquipements);
    const updateInvariants = createUpdater(setInvariants, api.saveInvariants);
    const updateReports = createUpdater(setReports, api.saveRapports);
    const updateInfractions = createUpdater(setInfractions, api.saveInfractions);
    const updateProcedures = createUpdater(setProcedures, api.saveProcedures);
    const updateCabinControls = createUpdater(setCabinControls, api.saveControleCabine);
    const updateCommPlans = createUpdater(setCommPlans, api.saveCommunicationPlans);
    const updateCommExecs = createUpdater(setCommExecs, api.saveCommunicationExecutions);
    const updateWorkAnalysis = createUpdater(setWorkAnalysis, api.saveTempsTravail);
    const updateDriveAnalysis = createUpdater(setDriveAnalysis, api.saveTempsConduite);
    const updateRestAnalysis = createUpdater(setRestAnalysis, api.saveTempsRepos);
    const updateScpConfigs = createUpdater(setScpConfigs, api.saveScpConfigurations);
    const updateObjectives = createUpdater(setObjectives, api.saveObjectifs);

    const handleGlobalPartnerSelect = (id: string) => {
        setSelectedPartnerId(id);
        if (id !== 'all') {
            setPartners(prev => prev.map(p => ({ ...p, actif: p.id === id })));
        } else {
            setPartners(prev => prev.map(p => ({ ...p, actif: false })));
        }
    };

    const getViewTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Tableau de bord';
        if (path.startsWith('/partners')) return 'Partenaires';
        if (path.startsWith('/obc-keys')) return 'Clés OBC';
        if (path.startsWith('/drivers')) return 'Conducteurs';
        if (path.startsWith('/vehicles')) return 'Véhicules';
        if (path.startsWith('/reports')) return 'Rapports';
        if (path.startsWith('/infractions')) return 'Infractions';
        if (path.startsWith('/scp')) return 'SCP - Sanctions';
        if (path.startsWith('/communication')) return 'Communication';
        if (path.startsWith('/settings')) return 'Paramètres';
        // ... Ajouter d'autres correspondances si nécessaire
        return 'TPA Manager';
    };

    if (!currentUser) return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}>
            <Auth onLogin={(user) => setCurrentUser(user)} />
        </Suspense>
    );

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

    const role = currentUser.role || 'directeur';

    return (
        <NotificationProvider>
            <div className={`flex h-screen overflow-hidden font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-blue-100 dark:selection:bg-blue-900/50`}>
                <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} currentUser={currentUser} />
                <div className="flex-1 flex flex-col min-w-0 h-full transition-all duration-300">
                    <Header title={getViewTitle()} toggleSidebar={() => setIsMobileMenuOpen(true)} isDarkMode={isDarkMode} toggleTheme={toggleTheme} partners={partners} selectedPartnerId={selectedPartnerId} onSelectPartner={handleGlobalPartnerSelect} selectedYear={selectedYear} onSelectYear={setSelectedYear} currentUser={currentUser} />
                    <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden pb-24 lg:pb-8">
                        <div className="w-full max-w-7xl mx-auto xl:max-w-none animate-fade-in">
                            <Suspense fallback={<PageLoader />}>
                                <Routes>
                                    <Route path="/" element={<Dashboard selectedPartnerId={selectedPartnerId} globalYear={selectedYear} partners={partners} drivers={drivers} vehicles={vehicles} reports={reports} infractions={infractions} keys={obcKeys} invariants={invariants} scpConfigs={scpConfigs} />} />
                                    
                                    <Route path="/partners" element={<Partners partners={partners} setPartners={setPartners} userRole={role} />} />
                                    <Route path="/obc-keys" element={<ObcKeys selectedPartnerId={selectedPartnerId} partners={partners} keys={obcKeys} setKeys={updateKeys} drivers={drivers} setDrivers={updateDrivers} userRole={role} />} />
                                    <Route path="/drivers" element={<Drivers selectedPartnerId={selectedPartnerId} drivers={drivers} setDrivers={updateDrivers} obcKeys={obcKeys} partners={partners} userRole={role} />} />
                                    <Route path="/vehicles" element={<Vehicles selectedPartnerId={selectedPartnerId} partners={partners} vehiclesData={vehicles} setVehiclesData={updateVehicles} equipementsData={equipements} setEquipementsData={updateEquipements} userRole={role} />} />
                                    
                                    <Route path="/invariants" element={<Invariants selectedPartnerId={selectedPartnerId} partners={partners} invariants={invariants} setInvariants={updateInvariants} userRole={role} />} />
                                    <Route path="/objectives" element={<Objectives selectedPartnerId={selectedPartnerId} partners={partners} invariants={invariants} objectives={objectives} setObjectives={updateObjectives} userRole={role} />} />
                                    <Route path="/kpi" element={<Kpis selectedPartnerId={selectedPartnerId} partners={partners} globalYear={selectedYear} reports={reports} infractions={infractions} invariants={invariants} objectives={objectives} />} />
                                    
                                    <Route path="/scp" element={<Scp selectedPartnerId={selectedPartnerId} partners={partners} globalYear={selectedYear} onChangeView={(view) => navigate(view === AppView.SCP_ATTRIBUTION ? '/scp/attribution' : '/scp')} userRole={role} infractions={infractions} reports={reports} drivers={drivers} invariants={invariants} scpConfigs={scpConfigs} keys={obcKeys} />} />
                                    <Route path="/scp/attribution" element={<ScpAttribution selectedPartnerId={selectedPartnerId} partners={partners} scpConfigs={scpConfigs} setScpConfigs={updateScpConfigs} onBack={() => navigate('/scp')} userRole={role} />} />
                                    
                                    <Route path="/reports" element={<Reports selectedPartnerId={selectedPartnerId} partners={partners} invariants={invariants} reportsData={reports} setReportsData={updateReports} infractionsData={infractions} setInfractionsData={updateInfractions} drivers={drivers} vehicles={vehicles} keys={obcKeys} userRole={role} />} />
                                    <Route path="/work-time" element={<WorkTime selectedPartnerId={selectedPartnerId} partners={partners} globalYear={selectedYear} analyses={workAnalysis} setAnalyses={updateWorkAnalysis} />} />
                                    <Route path="/driving-time" element={<DrivingTime selectedPartnerId={selectedPartnerId} partners={partners} globalYear={selectedYear} analyses={driveAnalysis} setAnalyses={updateDriveAnalysis} />} />
                                    <Route path="/rest-time" element={<RestTime selectedPartnerId={selectedPartnerId} partners={partners} globalYear={selectedYear} analyses={restAnalysis} setAnalyses={updateRestAnalysis} />} />
                                    
                                    <Route path="/infractions" element={<Infractions selectedPartnerId={selectedPartnerId} partners={partners} reports={reports} invariants={invariants} infractionsData={infractions} setInfractionsData={updateInfractions} onViewFiles={(id) => navigate(`/infractions/files/${id}`)} drivers={drivers} userRole={role} />} />
                                    {/* Route Paramétrée pour les fichiers d'infraction */}
                                    <Route path="/infractions/files/:id" element={<InfractionFilesWrapper infractions={infractions} setInfractions={updateInfractions} userRole={role} />} />
                                    
                                    <Route path="/procedures" element={<Procedures selectedPartnerId={selectedPartnerId} procedures={procedures} setProcedures={updateProcedures} userRole={role} />} />
                                    <Route path="/cabin-control" element={<CabinControl selectedPartnerId={selectedPartnerId} partners={partners} globalYear={selectedYear} controls={cabinControls} setControls={updateCabinControls} userRole={role} />} />
                                    
                                    <Route path="/communication" element={<Communication selectedPartnerId={selectedPartnerId} partners={partners} plans={commPlans} setPlans={updateCommPlans} onViewDetails={(id) => navigate(`/communication/${id}`)} userRole={role} />} />
                                    <Route path="/communication/:id" element={<CommunicationDetailsWrapper plans={commPlans} executions={commExecs} setExecutions={updateCommExecs} userRole={role} />} />
                                    
                                    <Route path="/settings" element={<Settings isDarkMode={isDarkMode} toggleTheme={toggleTheme} currentUser={currentUser} onLogout={() => setCurrentUser(null)} />} />
                                    
                                    {/* Redirection par défaut */}
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </Suspense>
                        </div>
                    </main>
                </div>
                {!isMobileMenuOpen && (
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="lg:hidden fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-xl shadow-blue-900/40 hover:bg-blue-700 active:scale-95 transition-all duration-300 animate-bounce-in ring-4 ring-white/20 dark:ring-slate-900/20"
                        aria-label="Ouvrir le menu"
                    >
                        <Menu size={28} strokeWidth={2.5} />
                    </button>
                )}
                <ToastContainer />
            </div>
        </NotificationProvider>
    );
};

// Wrappers pour extraire les params d'URL (puisque useParams ne marche pas directement dans le render prop si le composant n'est pas un enfant direct de Route ou ne l'utilise pas)
// Note: React Router v6 passe les params via le hook useParams() dans le composant enfant.
import { useParams } from 'react-router-dom';

const InfractionFilesWrapper = ({ infractions, setInfractions, userRole }: any) => {
    const { id } = useParams();
    const navigate = useNavigate();
    if (!id) return <Navigate to="/infractions" />;
    return <InfractionFiles infractionId={id} infractions={infractions} setInfractions={setInfractions} onBack={() => navigate('/infractions')} userRole={userRole} />;
};

const CommunicationDetailsWrapper = ({ plans, executions, setExecutions, userRole }: any) => {
    const { id } = useParams();
    const navigate = useNavigate();
    if (!id) return <Navigate to="/communication" />;
    return <CommunicationDetails planId={id} plans={plans} executions={executions} setExecutions={setExecutions} onBack={() => navigate('/communication')} userRole={userRole} />;
};

export default App;
