
import { Partenaire, Conducteur, Vehicule, Rapport, Infraction, CleObc, Invariant, Equipement, Procedure, ControleCabine, CommunicationPlan, CommunicationExecution, TempsTravail, TempsConduite, TempsRepos, ScpConfiguration, Objectif, User } from '../types';
import { 
    mockPartenairesList, mockConducteurs, mockVehicules, mockRapports, mockInfractions, mockCleObcList, mockInvariants, mockEquipements,
    mockProcedures, mockControleCabine, mockCommunicationPlans, mockCommunicationExecutions, mockTempsTravail, mockTempsConduite, mockTempsRepos, mockScpConfigurations, mockObjectifs
} from './mockData';

// Clés de stockage LocalStorage (Simulation de tables DB)
const COLLECTIONS = {
    PARTNERS: 'db_partenaires',
    DRIVERS: 'db_conducteurs',
    VEHICLES: 'db_vehicules',
    REPORTS: 'db_rapports',
    INFRACTIONS: 'db_infractions',
    KEYS: 'db_cles_obc',
    INVARIANTS: 'db_invariants',
    EQUIPMENTS: 'db_equipements',
    PROCEDURES: 'db_procedures',
    CABIN_CONTROLS: 'db_controles_cabine',
    COMM_PLANS: 'db_communication_plans',
    COMM_EXECS: 'db_communication_executions',
    WORK_ANALYSIS: 'db_analyse_temps_travail',
    DRIVE_ANALYSIS: 'db_analyse_temps_conduite',
    REST_ANALYSIS: 'db_analyse_temps_repos',
    SCP_CONFIGS: 'db_scp_configurations',
    OBJECTIVES: 'db_objectifs',
    USERS: 'db_users'
};

// --- Moteur de Base de Données Locale (LocalStorage Wrapper) ---

const LocalDB = {
    // Lecture
    get: <T>(key: string, defaultData: T[] = []): T[] => {
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                return JSON.parse(stored);
            }
            // Initialisation avec Mock Data si vide (Seeding)
            localStorage.setItem(key, JSON.stringify(defaultData));
            return defaultData;
        } catch (e) {
            console.error(`Erreur lecture DB locale [${key}]`, e);
            return defaultData;
        }
    },

    // Écriture complète (pour les saves en masse ou updates)
    set: <T>(key: string, data: T[]): void => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Erreur écriture DB locale [${key}]`, e);
        }
    },

    // Ajout unitaire
    add: <T>(key: string, item: T): void => {
        const items = LocalDB.get<T>(key);
        items.push(item);
        LocalDB.set(key, items);
    },

    // Mise à jour unitaire (par ID)
    update: <T extends { id: string }>(key: string, item: T): void => {
        const items = LocalDB.get<T>(key);
        const index = items.findIndex(i => i.id === item.id);
        if (index !== -1) {
            items[index] = item;
            LocalDB.set(key, items);
        }
    },

    // Suppression unitaire (par ID)
    delete: <T extends { id: string }>(key: string, id: string): void => {
        const items = LocalDB.get<T>(key);
        const newItems = items.filter(i => i.id !== id);
        LocalDB.set(key, newItems);
    }
};

// --- API Service (Interface unifiée) ---

export const api = {
    // --- GESTION UTILISATEURS ---
    getUserProfile: async (uid: string): Promise<User | null> => {
        const users = LocalDB.get<User>(COLLECTIONS.USERS);
        return users.find(u => u.id === uid) || null;
    },

    createUserProfile: async (user: User) => {
        // Vérifie si existe déjà pour éviter doublons lors de l'inscription simulée
        const users = LocalDB.get<User>(COLLECTIONS.USERS);
        if (!users.find(u => u.id === user.id)) {
            LocalDB.add(COLLECTIONS.USERS, user);
        }
    },

    updateUserProfile: async (user: Partial<User>) => {
        if (!user.id) return;
        const users = LocalDB.get<User>(COLLECTIONS.USERS);
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
            users[index] = { ...users[index], ...user };
            LocalDB.set(COLLECTIONS.USERS, users);
        }
    },

    // --- Partenaires ---
    getPartenaires: async () => LocalDB.get<Partenaire>(COLLECTIONS.PARTNERS, mockPartenairesList),
    savePartenaires: async (data: Partenaire[]) => LocalDB.set(COLLECTIONS.PARTNERS, data),
    addPartenaire: async (p: Partenaire) => LocalDB.add(COLLECTIONS.PARTNERS, p),
    updatePartenaire: async (p: Partenaire) => LocalDB.update(COLLECTIONS.PARTNERS, p),
    deletePartenaire: async (id: string) => LocalDB.delete(COLLECTIONS.PARTNERS, id),

    // --- Conducteurs ---
    getConducteurs: async () => LocalDB.get<Conducteur>(COLLECTIONS.DRIVERS, mockConducteurs),
    saveConducteurs: async (data: Conducteur[]) => LocalDB.set(COLLECTIONS.DRIVERS, data),

    // --- Véhicules ---
    getVehicules: async () => LocalDB.get<Vehicule>(COLLECTIONS.VEHICLES, mockVehicules),
    saveVehicules: async (data: Vehicule[]) => LocalDB.set(COLLECTIONS.VEHICLES, data),

    // --- Rapports ---
    getRapports: async () => LocalDB.get<Rapport>(COLLECTIONS.REPORTS, mockRapports),
    saveRapports: async (data: Rapport[]) => LocalDB.set(COLLECTIONS.REPORTS, data),

    // --- Infractions ---
    getInfractions: async () => LocalDB.get<Infraction>(COLLECTIONS.INFRACTIONS, mockInfractions),
    saveInfractions: async (data: Infraction[]) => LocalDB.set(COLLECTIONS.INFRACTIONS, data),

    // --- Clés OBC ---
    getCleObc: async () => LocalDB.get<CleObc>(COLLECTIONS.KEYS, mockCleObcList),
    saveCleObc: async (data: CleObc[]) => LocalDB.set(COLLECTIONS.KEYS, data),

    // --- Invariants ---
    getInvariants: async () => LocalDB.get<Invariant>(COLLECTIONS.INVARIANTS, mockInvariants),
    saveInvariants: async (data: Invariant[]) => LocalDB.set(COLLECTIONS.INVARIANTS, data),

    // --- Equipements ---
    getEquipements: async () => LocalDB.get<Equipement>(COLLECTIONS.EQUIPMENTS, mockEquipements),
    saveEquipements: async (data: Equipement[]) => LocalDB.set(COLLECTIONS.EQUIPMENTS, data),

    // --- Procedures ---
    getProcedures: async () => LocalDB.get<Procedure>(COLLECTIONS.PROCEDURES, mockProcedures),
    saveProcedures: async (data: Procedure[]) => LocalDB.set(COLLECTIONS.PROCEDURES, data),

    // --- Contrôle Cabine ---
    getControleCabine: async () => LocalDB.get<ControleCabine>(COLLECTIONS.CABIN_CONTROLS, mockControleCabine),
    saveControleCabine: async (data: ControleCabine[]) => LocalDB.set(COLLECTIONS.CABIN_CONTROLS, data),

    // --- Communication ---
    getCommunicationPlans: async () => LocalDB.get<CommunicationPlan>(COLLECTIONS.COMM_PLANS, mockCommunicationPlans),
    saveCommunicationPlans: async (data: CommunicationPlan[]) => LocalDB.set(COLLECTIONS.COMM_PLANS, data),

    getCommunicationExecutions: async () => LocalDB.get<CommunicationExecution>(COLLECTIONS.COMM_EXECS, mockCommunicationExecutions),
    saveCommunicationExecutions: async (data: CommunicationExecution[]) => LocalDB.set(COLLECTIONS.COMM_EXECS, data),

    // --- Analyses Temps ---
    getTempsTravail: async () => LocalDB.get<TempsTravail>(COLLECTIONS.WORK_ANALYSIS, mockTempsTravail),
    saveTempsTravail: async (data: TempsTravail[]) => LocalDB.set(COLLECTIONS.WORK_ANALYSIS, data),

    getTempsConduite: async () => LocalDB.get<TempsConduite>(COLLECTIONS.DRIVE_ANALYSIS, mockTempsConduite),
    saveTempsConduite: async (data: TempsConduite[]) => LocalDB.set(COLLECTIONS.DRIVE_ANALYSIS, data),

    getTempsRepos: async () => LocalDB.get<TempsRepos>(COLLECTIONS.REST_ANALYSIS, mockTempsRepos),
    saveTempsRepos: async (data: TempsRepos[]) => LocalDB.set(COLLECTIONS.REST_ANALYSIS, data),

    // --- Configs & Objectifs ---
    getScpConfigurations: async () => LocalDB.get<ScpConfiguration>(COLLECTIONS.SCP_CONFIGS, mockScpConfigurations),
    saveScpConfigurations: async (data: ScpConfiguration[]) => LocalDB.set(COLLECTIONS.SCP_CONFIGS, data),

    getObjectifs: async () => LocalDB.get<Objectif>(COLLECTIONS.OBJECTIVES, mockObjectifs),
    saveObjectifs: async (data: Objectif[]) => LocalDB.set(COLLECTIONS.OBJECTIVES, data),
};
