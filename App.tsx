
import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { Header } from './components/Header';
import { useDarkMode } from './hooks/useDarkMode';
import { usePersistedState } from './hooks/usePersistedState'; 
import { AppView, Partenaire, Conducteur, CleObc, Vehicule, Rapport, Infraction, Invariant, Equipement, User, Procedure, ControleCabine, CommunicationPlan, CommunicationExecution, TempsTravail, TempsConduite, TempsRepos, ScpConfiguration, Objectif } from './types';
import { Menu } from 'lucide-react';
import { api } from './services/api'; 
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { ToastContainer } from './components/ui/Toast';
import { auth } from './services/firebase';
import * as FirebaseAuth from 'firebase/auth';

// --- Lazy Loading des Pages ---
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Auth = React.lazy(() => import('./pages/Auth').then(m => ({ default: m.Auth })));
const Partners = React.lazy(() => import('./pages/Partners').then(m => ({ default: m.Partners })));
const ObcKeys = React.lazy(() => import('./pages/ObcKeys').then(m => ({ default: m.ObcKeys })));
const Drivers = React.lazy(() => import('./pages/Drivers').then(m => ({ default: m.Drivers })));
const DriverDetails = React.lazy(() => import('./pages/DriverDetails').then(m => ({ default: m.DriverDetails })));
const Vehicles = React.lazy(() => import('./pages/Vehicles').then(m => ({ default: m.Vehicles })));
const Invariants = React.lazy(() => import('./pages/Invariants').then(m => ({ default: m.Invariants })));
const Objectives = React.lazy(() => import('./pages/Objectives').then(m => ({ default: m.Objectives })));
const Reports = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const WorkTime = React.lazy(() => import('./pages/WorkTime').then(m => ({ default: m.WorkTime })));
const DrivingTime = React.lazy(() => import('./pages/DrivingTime').then(m => ({ default: m.DrivingTime })));
const RestTime = React.lazy(() => import('./pages/RestTime').then(m => ({ default: m.RestTime })));
const Infractions = React.lazy(() => import('./pages/Infractions').then(m => ({ default: m.Infractions })));
const InfractionFiles = React.lazy(() => import('./pages/InfractionFiles').then(m => ({ default: m.InfractionFiles })));
const Procedures = React.lazy(() => import('./pages/Procedures').then(m => ({ default: m.Procedures })));
const CabinControl = React.lazy(() => import('./pages/CabinControl').then(m => ({ default: m.CabinControl })));
const Kpis = React.lazy(() => import('./pages/Kpis').then(m => ({ default: m.Kpis })));
const Scp = React.lazy(() => import('./pages/Scp').then(m => ({ default: m.Scp })));
const ScpAttribution = React.lazy(() => import('./pages/ScpAttribution').then(m => ({ default: m.ScpAttribution })));
const Communication = React.lazy(() => import('./pages/Communication').then(m => ({ default: m.Communication })));
const CommunicationDetails = React.lazy(() => import('./pages/CommunicationDetails').then(m => ({ default: m.CommunicationDetails })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Chat = React.lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));

// Composant de chargement
const PageLoader = () => (
    <div className="flex h-full w-full items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium text-sm animate-pulse">Chargement...</p>
        </div>
    </div>
);

const AppContent: React.FC<{
    currentUser: User | null,
    onLogout: () => void,
    isLoading: boolean,
    setIsLoading: (val: boolean) => void,
    selectedPartnerId: string,
    setSelectedPartnerId: (id: string) => void,
    selectedYear: string,
    setSelectedYear: (year: string) => void,
    partners: Partenaire[],
    setPartners: (p: Partenaire[]) => void,
    unreadMessagesCount: number,
    setUnreadMessagesCount: (count: number) => void
}> = ({ currentUser, onLogout, isLoading, setIsLoading, selectedPartnerId, setSelectedPartnerId, selectedYear, setSelectedYear, partners, setPartners, unreadMessagesCount, setUnreadMessagesCount }) => {
    const { addNotification } = useNotification();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { isDarkMode, toggleTheme } = useDarkMode();
    const location = useLocation();

    // Chargement global Partenaires & Messages (Temps réel)
    useEffect(() => {
        if (!currentUser) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        const unsubPartners = api.subscribeToPartners((data) => {
            setPartners(data);
            setIsLoading(false);
            if (selectedPartnerId !== 'all' && !data.find(p => p.id === selectedPartnerId)) {
                setSelectedPartnerId('all');
            }
        });

        // Notifications de Messages
        const unsubMessages = api.subscribeToMessages(
            (msgs) => {
                const count = msgs.filter(m => m.receiverId === currentUser.id && !m.read).length;
                setUnreadMessagesCount(count);
            },
            (type, msg) => {
                if (type === 'added' && msg.receiverId === currentUser.id) {
                    addNotification('info', `Nouveau message de l'utilisateur ${msg.senderId}`);
                }
            }
        );

        return () => {
            unsubPartners();
            unsubMessages();
        };
    }, [currentUser]); 

    const handleGlobalPartnerSelect = (id: string) => setSelectedPartnerId(id);

    const getViewTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Tableau de bord';
        if (path.startsWith('/partners')) return 'Partenaires';
        if (path.startsWith('/chat')) return 'Messagerie';
        if (path.startsWith('/settings')) return 'Paramètres';
        return 'TPA Manager';
    };

    if (!currentUser) return <Navigate to="/login" replace />;
    if (isLoading) return <PageLoader />;

    return (
        <div className={`flex h-screen overflow-hidden font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300`}>
            <Sidebar 
                isOpen={isMobileMenuOpen} 
                onClose={() => setIsMobileMenuOpen(false)} 
                currentUser={currentUser} 
                unreadCount={unreadMessagesCount}
            />
            <div className="flex-1 flex flex-col min-w-0 h-full transition-all duration-300">
                <Header 
                    title={getViewTitle()} 
                    toggleSidebar={() => setIsMobileMenuOpen(true)} 
                    isDarkMode={isDarkMode} 
                    toggleTheme={toggleTheme} 
                    partners={partners} 
                    selectedPartnerId={selectedPartnerId} 
                    onSelectPartner={handleGlobalPartnerSelect} 
                    selectedYear={selectedYear} 
                    onSelectYear={setSelectedYear} 
                    currentUser={currentUser}
                    unreadCount={unreadMessagesCount}
                />
                <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden pb-24 lg:pb-8">
                    <div className="w-full max-w-7xl mx-auto xl:max-w-none animate-fade-in">
                        <Suspense fallback={<PageLoader />}>
                            <Routes>
                                <Route path="/" element={<DashboardWrapper partnerId={selectedPartnerId} year={selectedYear} />} />
                                <Route path="/partners" element={<PartnersWrapper userRole={currentUser.role} />} />
                                <Route path="/obc-keys" element={<ObcKeysWrapper partnerId={selectedPartnerId} userRole={currentUser.role} />} />
                                <Route path="/drivers" element={<DriversWrapper partnerId={selectedPartnerId} userRole={currentUser.role} />} />
                                <Route path="/drivers/:id" element={<DriverDetailsWrapper year={selectedYear} />} />
                                <Route path="/vehicles" element={<VehiclesWrapper partnerId={selectedPartnerId} userRole={currentUser.role} />} />
                                <Route path="/reports" element={<ReportsWrapper partnerId={selectedPartnerId} userRole={currentUser.role} />} />
                                <Route path="/invariants" element={<InvariantsWrapper partnerId={selectedPartnerId} userRole={currentUser.role} />} />
                                <Route path="/objectives" element={<ObjectivesWrapper partnerId={selectedPartnerId} userRole={currentUser.role} />} />
                                <Route path="/kpi" element={<KpisWrapper partnerId={selectedPartnerId} year={selectedYear} />} />
                                <Route path="/work-time" element={<WorkTimeWrapper partnerId={selectedPartnerId} year={selectedYear} />} />
                                <Route path="/driving-time" element={<DrivingTimeWrapper partnerId={selectedPartnerId} year={selectedYear} />} />
                                <Route path="/rest-time" element={<RestTimeWrapper partnerId={selectedPartnerId} year={selectedYear} />} />
                                <Route path="/infractions" element={<InfractionsWrapper partnerId={selectedPartnerId} userRole={currentUser.role} />} />
                                <Route path="/infractions/files/:id" element={<InfractionFilesWrapper userRole={currentUser.role} />} />
                                <Route path="/procedures" element={<ProceduresWrapper partnerId={selectedPartnerId} userRole={currentUser.role} />} />
                                <Route path="/cabin-control" element={<CabinControlWrapper partnerId={selectedPartnerId} year={selectedYear} userRole={currentUser.role} />} />
                                <Route path="/scp" element={<ScpWrapper partnerId={selectedPartnerId} year={selectedYear} userRole={currentUser.role} />} />
                                <Route path="/scp-attribution" element={<ScpAttributionWrapper partnerId={selectedPartnerId} userRole={currentUser.role} />} />
                                <Route path="/communication" element={<CommunicationWrapper partnerId={selectedPartnerId} userRole={currentUser.role} />} />
                                <Route path="/communication/:id" element={<CommunicationDetailsWrapper userRole={currentUser.role} />} />
                                
                                <Route path="/chat" element={<Chat currentUser={currentUser} />} />
                                <Route path="/settings" element={<Settings isDarkMode={isDarkMode} toggleTheme={toggleTheme} currentUser={currentUser} onLogout={onLogout} />} />
                                
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Suspense>
                    </div>
                </main>
            </div>
            {!isMobileMenuOpen && (
                <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-xl">
                    <Menu size={28} />
                    {unreadMessagesCount > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-blue-600"></span>}
                </button>
            )}
            <ToastContainer />
        </div>
    );
};

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = usePersistedState<User | null>('current_user', null);
    const [isLoading, setIsLoading] = useState(true);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribeAuth = FirebaseAuth.onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    let userProfile = await api.getUserProfile(firebaseUser.uid);
                    if (!userProfile) {
                        userProfile = {
                            id: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            username: firebaseUser.email?.split('@')[0] || 'user',
                            nom: 'Utilisateur',
                            prenom: '',
                            role: 'obc',
                            avatarUrl: ''
                        };
                        await api.createUserProfile(userProfile);
                    }
                    setCurrentUser(userProfile);
                } catch (e) {
                    console.error("Erreur récupération profil:", e);
                }
            } else {
                setCurrentUser(null);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const handleLogout = () => {
        auth.signOut();
        setCurrentUser(null);
        localStorage.removeItem('current_user');
        navigate('/login');
    };

    return (
        <NotificationProvider>
            <Routes>
                <Route path="/login" element={
                    currentUser ? <Navigate to="/" replace /> : (
                        <Suspense fallback={<PageLoader />}>
                            <Auth onLogin={(user) => setCurrentUser(user)} />
                        </Suspense>
                    )
                } />
                <Route path="/*" element={
                    <AppContent 
                        currentUser={currentUser}
                        onLogout={handleLogout}
                        isLoading={isLoading}
                        setIsLoading={setIsLoading}
                        selectedPartnerId={selectedPartnerId}
                        setSelectedPartnerId={setSelectedPartnerId}
                        selectedYear={selectedYear}
                        setSelectedYear={setSelectedYear}
                        partners={partners}
                        setPartners={setPartners}
                        unreadMessagesCount={unreadMessagesCount}
                        setUnreadMessagesCount={setUnreadMessagesCount}
                    />
                } />
            </Routes>
        </NotificationProvider>
    );
};

// --- WRAPPERS OPTIMISÉS (Temps Réel) ---

const DashboardWrapper = ({ partnerId, year }: { partnerId: string, year: string }) => {
    const [data, setData] = useState<any>({ partners: [], drivers: [], vehicles: [], reports: [], infractions: [], keys: [], invariants: [], scpConfigs: [] });
    // On utilise Promise.all pour le dashboard car il agrège tout, mais pour optimiser, on pourrait passer en temps réel.
    // Pour l'instant, on garde le chargement unique pour éviter trop de re-renders simultanés, mais on profite du cache Firestore.
    useEffect(() => {
        const load = async () => {
            const [p, d, v, r, i, k, inv, scp] = await Promise.all([
                api.getPartenaires(), api.getConducteurs(), api.getVehicules(), api.getRapports(), 
                api.getInfractions(), api.getCleObc(), api.getInvariants(), api.getScpConfigurations()
            ]);
            setData({ partners: p, drivers: d, vehicles: v, reports: r, infractions: i, keys: k, invariants: inv, scpConfigs: scp });
        };
        load();
    }, []);
    return <Dashboard selectedPartnerId={partnerId} globalYear={year} {...data} />;
};

const PartnersWrapper = ({ userRole }: any) => {
    const { addNotification } = useNotification();
    const [partners, setPartners] = useState<Partenaire[]>([]);
    useEffect(() => api.subscribeToPartners(setPartners, (type) => {
        if(type === 'added') addNotification('info', 'Nouveau partenaire ajouté');
    }), []);
    return <Partners partners={partners} setPartners={setPartners} userRole={userRole} />;
};

const ObcKeysWrapper = (props: any) => {
    const [keys, setKeys] = useState<CleObc[]>([]);
    const [drivers, setDrivers] = useState<Conducteur[]>([]);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    useEffect(() => {
        const u1 = api.subscribeToObcKeys(setKeys);
        const u2 = api.subscribeToDrivers(setDrivers);
        const u3 = api.subscribeToPartners(setPartners);
        return () => { u1(); u2(); u3(); };
    }, []);
    return <ObcKeys selectedPartnerId={props.partnerId} partners={partners} keys={keys} setKeys={setKeys} drivers={drivers} setDrivers={setDrivers} userRole={props.userRole} />;
};

const DriversWrapper = (props: any) => {
    const [drivers, setDrivers] = useState<Conducteur[]>([]);
    const [keys, setKeys] = useState<CleObc[]>([]);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    useEffect(() => {
        const u1 = api.subscribeToDrivers(setDrivers);
        const u2 = api.subscribeToObcKeys(setKeys);
        const u3 = api.subscribeToPartners(setPartners);
        return () => { u1(); u2(); u3(); };
    }, []);
    return <Drivers selectedPartnerId={props.partnerId} drivers={drivers} setDrivers={setDrivers} obcKeys={keys} partners={partners} userRole={props.userRole} />;
};

const VehiclesWrapper = (props: any) => {
    const [vehicles, setVehicles] = useState<Vehicule[]>([]);
    const [equipements, setEquipements] = useState<Equipement[]>([]);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    useEffect(() => {
        const u1 = api.subscribeToVehicles(setVehicles);
        const u2 = api.subscribeToEquipements(setEquipements);
        const u3 = api.subscribeToPartners(setPartners);
        return () => { u1(); u2(); u3(); };
    }, []);
    return <Vehicles selectedPartnerId={props.partnerId} partners={partners} vehiclesData={vehicles} setVehiclesData={setVehicles} equipementsData={equipements} setEquipementsData={setEquipements} userRole={props.userRole} />;
};

const ReportsWrapper = (props: any) => {
    const { addNotification } = useNotification();
    const [reports, setReports] = useState<Rapport[]>([]);
    const [infractions, setInfractions] = useState<Infraction[]>([]);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    const [invariants, setInvariants] = useState<Invariant[]>([]);
    const [drivers, setDrivers] = useState<Conducteur[]>([]);
    const [vehicles, setVehicles] = useState<Vehicule[]>([]);
    const [keys, setKeys] = useState<CleObc[]>([]);

    useEffect(() => {
        const unsubs = [
            api.subscribeToReports(setReports, (type) => {
                if(type === 'added') addNotification('info', 'Nouveau rapport disponible');
            }),
            api.subscribeToInfractions(setInfractions, (type) => {
                if(type === 'added') addNotification('warning', 'Nouvelle infraction détectée');
            }),
            api.subscribeToPartners(setPartners),
            api.subscribeToInvariants(setInvariants),
            api.subscribeToDrivers(setDrivers),
            api.subscribeToVehicles(setVehicles),
            api.subscribeToObcKeys(setKeys)
        ];
        return () => unsubs.forEach(u => u());
    }, []);
    return <Reports selectedPartnerId={props.partnerId} partners={partners} invariants={invariants} reportsData={reports} setReportsData={setReports} infractionsData={infractions} setInfractionsData={setInfractions} drivers={drivers} vehicles={vehicles} keys={keys} userRole={props.userRole} />;
};

const InvariantsWrapper = (props: any) => {
    const [invariants, setInvariants] = useState<Invariant[]>([]);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    useEffect(() => {
        const u1 = api.subscribeToInvariants(setInvariants);
        const u2 = api.subscribeToPartners(setPartners);
        return () => { u1(); u2(); };
    }, []);
    return <Invariants selectedPartnerId={props.partnerId} partners={partners} invariants={invariants} setInvariants={setInvariants} userRole={props.userRole} />;
};

const ObjectivesWrapper = (props: any) => {
    const [objectives, setObjectives] = useState<Objectif[]>([]);
    const [invariants, setInvariants] = useState<Invariant[]>([]);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    useEffect(() => {
        const u1 = api.subscribeToObjectifs(setObjectives);
        const u2 = api.subscribeToInvariants(setInvariants);
        const u3 = api.subscribeToPartners(setPartners);
        return () => { u1(); u2(); u3(); };
    }, []);
    return <Objectives selectedPartnerId={props.partnerId} partners={partners} invariants={invariants} objectives={objectives} setObjectives={setObjectives} userRole={props.userRole} />;
};

const KpisWrapper = (props: any) => {
    const [data, setData] = useState<any>({ partners: [], reports: [], infractions: [], invariants: [], objectives: [] });
    useEffect(() => {
        Promise.all([api.getPartenaires(), api.getRapports(), api.getInfractions(), api.getInvariants(), api.getObjectifs()])
            .then(([p, r, i, inv, o]) => setData({ partners: p, reports: r, infractions: i, invariants: inv, objectives: o }));
    }, []);
    return <Kpis selectedPartnerId={props.partnerId} globalYear={props.year} {...data} />;
};

const WorkTimeWrapper = (props: any) => {
    const [analyses, setAnalyses] = useState<TempsTravail[]>([]);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    const [drivers, setDrivers] = useState<Conducteur[]>([]);
    const [keys, setKeys] = useState<CleObc[]>([]);
    const [reports, setReports] = useState<Rapport[]>([]);
    useEffect(() => {
        const unsubs = [
            api.subscribeToTempsTravail(setAnalyses),
            api.subscribeToPartners(setPartners),
            api.subscribeToDrivers(setDrivers),
            api.subscribeToObcKeys(setKeys),
            api.subscribeToReports(setReports)
        ];
        return () => unsubs.forEach(u => u());
    }, []);
    return <WorkTime selectedPartnerId={props.partnerId} partners={partners} globalYear={props.year} analyses={analyses} setAnalyses={setAnalyses} drivers={drivers} keys={keys} reports={reports} />;
};

const DrivingTimeWrapper = (props: any) => {
    const [analyses, setAnalyses] = useState<TempsConduite[]>([]);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    const [drivers, setDrivers] = useState<Conducteur[]>([]);
    const [keys, setKeys] = useState<CleObc[]>([]);
    const [reports, setReports] = useState<Rapport[]>([]);
    useEffect(() => {
        const unsubs = [
            api.subscribeToTempsConduite(setAnalyses),
            api.subscribeToPartners(setPartners),
            api.subscribeToDrivers(setDrivers),
            api.subscribeToObcKeys(setKeys),
            api.subscribeToReports(setReports)
        ];
        return () => unsubs.forEach(u => u());
    }, []);
    return <DrivingTime selectedPartnerId={props.partnerId} partners={partners} globalYear={props.year} analyses={analyses} setAnalyses={setAnalyses} drivers={drivers} keys={keys} reports={reports} />;
};

const RestTimeWrapper = (props: any) => {
    const [analyses, setAnalyses] = useState<TempsRepos[]>([]);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    const [drivers, setDrivers] = useState<Conducteur[]>([]);
    const [keys, setKeys] = useState<CleObc[]>([]);
    const [reports, setReports] = useState<Rapport[]>([]);
    useEffect(() => {
        const unsubs = [
            api.subscribeToTempsRepos(setAnalyses),
            api.subscribeToPartners(setPartners),
            api.subscribeToDrivers(setDrivers),
            api.subscribeToObcKeys(setKeys),
            api.subscribeToReports(setReports)
        ];
        return () => unsubs.forEach(u => u());
    }, []);
    return <RestTime selectedPartnerId={props.partnerId} partners={partners} globalYear={props.year} analyses={analyses} setAnalyses={setAnalyses} drivers={drivers} keys={keys} reports={reports} />;
};

const InfractionsWrapper = (props: any) => {
    const { addNotification } = useNotification();
    const [infractions, setInfractions] = useState<Infraction[]>([]);
    const [reports, setReports] = useState<Rapport[]>([]);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    const [invariants, setInvariants] = useState<Invariant[]>([]);
    const [drivers, setDrivers] = useState<Conducteur[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubs = [
            api.subscribeToInfractions(setInfractions, (type) => {
                if(type === 'added') addNotification('warning', 'Nouvelle infraction détectée');
            }),
            api.subscribeToReports(setReports),
            api.subscribeToPartners(setPartners),
            api.subscribeToInvariants(setInvariants),
            api.subscribeToDrivers(setDrivers)
        ];
        return () => unsubs.forEach(u => u());
    }, []);

    const handleViewFiles = (id: string) => navigate(`/infractions/files/${id}`);

    return <Infractions selectedPartnerId={props.partnerId} partners={partners} reports={reports} invariants={invariants} infractionsData={infractions} setInfractionsData={setInfractions} onViewFiles={handleViewFiles} userRole={props.userRole} drivers={drivers} />;
};

const ProceduresWrapper = (props: any) => {
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    useEffect(() => api.subscribeToProcedures(setProcedures), []);
    return <Procedures selectedPartnerId={props.partnerId} procedures={procedures} setProcedures={setProcedures} userRole={props.userRole} />;
};

const CabinControlWrapper = (props: any) => {
    const [controls, setControls] = useState<ControleCabine[]>([]);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    useEffect(() => { 
        const u1 = api.subscribeToControleCabine(setControls);
        const u2 = api.subscribeToPartners(setPartners);
        return () => { u1(); u2(); };
    }, []);
    return <CabinControl selectedPartnerId={props.partnerId} partners={partners} globalYear={props.year} controls={controls} setControls={setControls} userRole={props.userRole} />;
};

const ScpWrapper = (props: any) => {
    const [data, setData] = useState<any>({ infractions: [], reports: [], drivers: [], invariants: [], scpConfigs: [], keys: [], partners: [] });
    const navigate = useNavigate();
    useEffect(() => {
        Promise.all([
            api.getInfractions(), api.getRapports(), api.getConducteurs(), api.getInvariants(), 
            api.getScpConfigurations(), api.getCleObc(), api.getPartenaires()
        ]).then(([i, r, d, inv, s, k, p]) => setData({ infractions: i, reports: r, drivers: d, invariants: inv, scpConfigs: s, keys: k, partners: p }));
    }, []);
    
    return <Scp selectedPartnerId={props.partnerId} partners={data.partners} globalYear={props.year} onChangeView={(view) => { if(view === AppView.SCP_ATTRIBUTION) navigate('/scp-attribution'); }} userRole={props.userRole} {...data} />;
};

const ScpAttributionWrapper = (props: any) => {
    const [configs, setConfigs] = useState<ScpConfiguration[]>([]);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    const [invariants, setInvariants] = useState<Invariant[]>([]);
    const navigate = useNavigate();
    useEffect(() => {
        const u1 = api.subscribeToScpConfigurations(setConfigs);
        const u2 = api.subscribeToPartners(setPartners);
        const u3 = api.subscribeToInvariants(setInvariants);
        return () => { u1(); u2(); u3(); };
    }, []);
    return <ScpAttribution selectedPartnerId={props.partnerId} partners={partners} invariants={invariants} onBack={() => navigate('/scp')} userRole={props.userRole} scpConfigs={configs} setScpConfigs={setConfigs} />;
};

const CommunicationWrapper = (props: any) => {
    const [plans, setPlans] = useState<CommunicationPlan[]>([]);
    const [executions, setExecutions] = useState<CommunicationExecution[]>([]);
    const [partners, setPartners] = useState<Partenaire[]>([]);
    useEffect(() => {
        const u1 = api.subscribeToCommunicationPlans(setPlans);
        const u2 = api.subscribeToCommunicationExecutions(setExecutions);
        const u3 = api.subscribeToPartners(setPartners);
        return () => { u1(); u2(); u3(); };
    }, []);
    return <Communication selectedPartnerId={props.partnerId} partners={partners} plans={plans} setPlans={setPlans} executions={executions} setExecutions={setExecutions} userRole={props.userRole} />;
};

import { useParams } from 'react-router-dom';

const DriverDetailsWrapper = ({ year }: any) => {
    const { id } = useParams();
    const [data, setData] = useState<any>({ drivers: [], reports: [], infractions: [], vehicles: [], keys: [], partners: [], invariants: [], scpConfigs: [] });
    useEffect(() => {
        const load = async () => {
            const [d, r, i, v, k, p, inv, scp] = await Promise.all([
                api.getConducteurs(), api.getRapports(), api.getInfractions(), api.getVehicules(), api.getCleObc(), api.getPartenaires(), api.getInvariants(), api.getScpConfigurations()
            ]);
            setData({ drivers: d, reports: r, infractions: i, vehicles: v, keys: k, partners: p, invariants: inv, scpConfigs: scp });
        };
        load();
    }, []);

    if (!id) return <Navigate to="/drivers" />;
    return <DriverDetails {...data} selectedYear={year} />;
};

const InfractionFilesWrapper = ({ userRole }: any) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [infractions, setInfractions] = useState<Infraction[]>([]);
    
    useEffect(() => {
        api.getInfractions().then(setInfractions);
    }, []);

    if (!id || infractions.length === 0) return <PageLoader />; 
    return <InfractionFiles infractionId={id} infractions={infractions} setInfractions={setInfractions} onBack={() => navigate('/infractions')} userRole={userRole} />;
};

const CommunicationDetailsWrapper = ({ userRole }: any) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [plans, setPlans] = useState<CommunicationPlan[]>([]);
    const [executions, setExecutions] = useState<CommunicationExecution[]>([]);

    useEffect(() => {
        Promise.all([api.getCommunicationPlans(), api.getCommunicationExecutions()])
            .then(([p, e]) => { setPlans(p); setExecutions(e); });
    }, []);

    if (!id || plans.length === 0) return <PageLoader />;
    return <CommunicationDetails planId={id} plans={plans} executions={executions} setExecutions={setExecutions} onBack={() => navigate('/communication')} userRole={userRole} />;
};

export default App;
