
import { Partenaire, Conducteur, Vehicule, Rapport, Infraction, CleObc, Invariant, Equipement, Procedure, ControleCabine, CommunicationPlan, CommunicationExecution, TempsTravail, TempsConduite, TempsRepos, ScpConfiguration, Objectif, User } from '../types';
import { 
    mockPartenairesList, mockConducteurs, mockVehicules, mockRapports, mockInfractions, mockCleObcList, mockInvariants, mockEquipements,
    mockProcedures, mockControleCabine, mockCommunicationPlans, mockCommunicationExecutions, mockTempsTravail, mockTempsConduite, mockTempsRepos, mockScpConfigurations, mockObjectifs
} from './mockData';
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, writeBatch, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

// Collections Firestore
const COLLECTIONS = {
    PARTNERS: 'partenaires',
    DRIVERS: 'conducteurs',
    VEHICLES: 'vehicules',
    REPORTS: 'rapports',
    INFRACTIONS: 'infractions',
    KEYS: 'cles_obc',
    INVARIANTS: 'invariants',
    EQUIPMENTS: 'equipements',
    PROCEDURES: 'procedures',
    CABIN_CONTROLS: 'controles_cabine',
    COMM_PLANS: 'communication_plans',
    COMM_EXECS: 'communication_executions',
    WORK_ANALYSIS: 'analyse_temps_travail',
    DRIVE_ANALYSIS: 'analyse_temps_conduite',
    REST_ANALYSIS: 'analyse_temps_repos',
    SCP_CONFIGS: 'scp_configurations',
    OBJECTIVES: 'objectifs',
    USERS: 'users' // Nouvelle collection pour les profils utilisateurs
};

// Variable globale pour désactiver Firebase si les permissions sont insuffisantes
let isFirebaseAvailable = true;

/**
 * Charge une collection depuis Firestore.
 * Si la collection est vide ou inaccessible, retourne les données mock.
 */
async function fetchCollection<T>(collectionName: string, mockData: T[]): Promise<T[]> {
    if (!db || !isFirebaseAvailable) {
        return mockData;
    }

    try {
        const colRef = collection(db, collectionName);
        const snapshot = await getDocs(colRef);

        if (snapshot.empty && mockData.length > 0) {
            console.log(`Collection ${collectionName} vide. Tentative d'initialisation (Seeding)...`);
            try {
                await seedCollection(collectionName, mockData);
                return mockData;
            } catch (seedError: any) {
                console.warn(`Impossible d'initialiser ${collectionName}:`, seedError.message);
                return mockData;
            }
        }

        const data: T[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
        return data;
    } catch (error: any) {
        if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
            if (isFirebaseAvailable) {
                console.warn(`⚠️ ACCÈS FIREBASE REFUSÉ pour ${collectionName}. Passage en mode DÉMO.`);
                isFirebaseAvailable = false;
            }
        } else {
            console.error(`Erreur chargement ${collectionName}:`, error);
        }
        return mockData;
    }
}

/**
 * Sauvegarde une liste complète d'éléments dans Firestore (Legacy / Bulk).
 */
async function saveCollection<T extends { id: string }>(collectionName: string, data: T[]): Promise<void> {
    if (!db || !isFirebaseAvailable) return;

    try {
        const batch = writeBatch(db);
        // Limite Firestore batch: 500 ops.
        const safeData = data.slice(0, 450); 
        
        safeData.forEach(item => {
            const docRef = doc(db, collectionName, item.id);
            batch.set(docRef, item, { merge: true });
        });

        await batch.commit();
        console.log(`Sauvegarde ${collectionName} réussie.`);
    } catch (error: any) {
        console.error(`Erreur sauvegarde ${collectionName}:`, error);
    }
}

/**
 * Fonction utilitaire pour remplir la base initiale
 */
async function seedCollection(collectionName: string, data: any[]) {
    if (!db) return;
    const batch = writeBatch(db);
    data.slice(0, 450).forEach(item => {
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, item);
    });
    await batch.commit();
}

// --- API Service Firestore ---

export const api = {
    // --- GESTION UTILISATEURS (Auth Profile) ---
    getUserProfile: async (uid: string): Promise<User | null> => {
        if (!db) return null;
        try {
            const docRef = doc(db, COLLECTIONS.USERS, uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as User;
            } else {
                console.warn("Utilisateur authentifié mais profil introuvable dans 'users'.");
                return null;
            }
        } catch (error) {
            console.error("Erreur récupération profil utilisateur:", error);
            return null;
        }
    },

    createUserProfile: async (user: User) => {
        if (!db) return;
        try {
            await setDoc(doc(db, COLLECTIONS.USERS, user.id), user);
            console.log("Profil utilisateur créé/mis à jour:", user.id);
        } catch (error) {
            console.error("Erreur création profil utilisateur:", error);
            throw error;
        }
    },

    updateUserProfile: async (user: Partial<User>) => {
        if (!db || !user.id) return;
        try {
            const userRef = doc(db, COLLECTIONS.USERS, user.id);
            // @ts-ignore
            await updateDoc(userRef, user);
            console.log("Profil mis à jour avec succès");
        } catch (error) {
            console.error("Erreur mise à jour profil:", error);
            throw error;
        }
    },

    // --- Données Principales ---
    getPartenaires: () => fetchCollection<Partenaire>(COLLECTIONS.PARTNERS, mockPartenairesList),
    savePartenaires: (data: Partenaire[]) => saveCollection(COLLECTIONS.PARTNERS, data),
    
    // Optimisation CRUD Partenaires
    addPartenaire: async (partenaire: Partenaire) => {
        if (!db || !isFirebaseAvailable) return;
        try {
            await setDoc(doc(db, COLLECTIONS.PARTNERS, partenaire.id), partenaire);
            console.log("Partenaire ajouté avec succès");
        } catch (e) { console.error("Erreur ajout partenaire", e); throw e; }
    },
    updatePartenaire: async (partenaire: Partenaire) => {
        if (!db || !isFirebaseAvailable) return;
        try {
            // @ts-ignore
            await updateDoc(doc(db, COLLECTIONS.PARTNERS, partenaire.id), partenaire);
            console.log("Partenaire mis à jour avec succès");
        } catch (e) { console.error("Erreur update partenaire", e); throw e; }
    },
    deletePartenaire: async (id: string) => {
        if (!db || !isFirebaseAvailable) return;
        try {
            await deleteDoc(doc(db, COLLECTIONS.PARTNERS, id));
            console.log("Partenaire supprimé avec succès");
        } catch (e) { console.error("Erreur suppression partenaire", e); throw e; }
    },

    getConducteurs: () => fetchCollection<Conducteur>(COLLECTIONS.DRIVERS, mockConducteurs),
    saveConducteurs: (data: Conducteur[]) => saveCollection(COLLECTIONS.DRIVERS, data),

    getVehicules: () => fetchCollection<Vehicule>(COLLECTIONS.VEHICLES, mockVehicules),
    saveVehicules: (data: Vehicule[]) => saveCollection(COLLECTIONS.VEHICLES, data),

    getRapports: () => fetchCollection<Rapport>(COLLECTIONS.REPORTS, mockRapports),
    saveRapports: (data: Rapport[]) => saveCollection(COLLECTIONS.REPORTS, data),

    getInfractions: () => fetchCollection<Infraction>(COLLECTIONS.INFRACTIONS, mockInfractions),
    saveInfractions: (data: Infraction[]) => saveCollection(COLLECTIONS.INFRACTIONS, data),

    getCleObc: () => fetchCollection<CleObc>(COLLECTIONS.KEYS, mockCleObcList),
    saveCleObc: (data: CleObc[]) => saveCollection(COLLECTIONS.KEYS, data),

    getInvariants: () => fetchCollection<Invariant>(COLLECTIONS.INVARIANTS, mockInvariants),
    saveInvariants: (data: Invariant[]) => saveCollection(COLLECTIONS.INVARIANTS, data),

    getEquipements: () => fetchCollection<Equipement>(COLLECTIONS.EQUIPMENTS, mockEquipements),
    saveEquipements: (data: Equipement[]) => saveCollection(COLLECTIONS.EQUIPMENTS, data),

    // --- Nouvelles Collections ---
    
    getProcedures: () => fetchCollection<Procedure>(COLLECTIONS.PROCEDURES, mockProcedures),
    saveProcedures: (data: Procedure[]) => saveCollection(COLLECTIONS.PROCEDURES, data),

    getControleCabine: () => fetchCollection<ControleCabine>(COLLECTIONS.CABIN_CONTROLS, mockControleCabine),
    saveControleCabine: (data: ControleCabine[]) => saveCollection(COLLECTIONS.CABIN_CONTROLS, data),

    getCommunicationPlans: () => fetchCollection<CommunicationPlan>(COLLECTIONS.COMM_PLANS, mockCommunicationPlans),
    saveCommunicationPlans: (data: CommunicationPlan[]) => saveCollection(COLLECTIONS.COMM_PLANS, data),

    getCommunicationExecutions: () => fetchCollection<CommunicationExecution>(COLLECTIONS.COMM_EXECS, mockCommunicationExecutions),
    saveCommunicationExecutions: (data: CommunicationExecution[]) => saveCollection(COLLECTIONS.COMM_EXECS, data),

    // Analyses Temps
    getTempsTravail: () => fetchCollection<TempsTravail>(COLLECTIONS.WORK_ANALYSIS, mockTempsTravail),
    saveTempsTravail: (data: TempsTravail[]) => saveCollection(COLLECTIONS.WORK_ANALYSIS, data),

    getTempsConduite: () => fetchCollection<TempsConduite>(COLLECTIONS.DRIVE_ANALYSIS, mockTempsConduite),
    saveTempsConduite: (data: TempsConduite[]) => saveCollection(COLLECTIONS.DRIVE_ANALYSIS, data),

    getTempsRepos: () => fetchCollection<TempsRepos>(COLLECTIONS.REST_ANALYSIS, mockTempsRepos),
    saveTempsRepos: (data: TempsRepos[]) => saveCollection(COLLECTIONS.REST_ANALYSIS, data),

    // Configs
    getScpConfigurations: () => fetchCollection<ScpConfiguration>(COLLECTIONS.SCP_CONFIGS, mockScpConfigurations),
    saveScpConfigurations: (data: ScpConfiguration[]) => saveCollection(COLLECTIONS.SCP_CONFIGS, data),

    getObjectifs: () => fetchCollection<Objectif>(COLLECTIONS.OBJECTIVES, mockObjectifs),
    saveObjectifs: (data: Objectif[]) => saveCollection(COLLECTIONS.OBJECTIVES, data),
};
