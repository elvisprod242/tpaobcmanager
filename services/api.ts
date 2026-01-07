
import { Partenaire, Conducteur, Vehicule, Rapport, Infraction, CleObc, Invariant, Equipement, Procedure, ControleCabine, CommunicationPlan, CommunicationExecution, TempsTravail, TempsConduite, TempsRepos, ScpConfiguration, Objectif, User, Message, InfractionFile } from '../types';
import { db } from './firebase'; 
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, onSnapshot, where, writeBatch, getDoc, addDoc } from 'firebase/firestore';

// --- UTILS ---

const cleanPayload = <T>(data: T): T => {
    const clean = JSON.parse(JSON.stringify(data));
    return clean;
};

const chunkArray = <T>(array: T[], size: number): T[][] => {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
};

// Type pour le callback de notification
type NotifyCallback<T> = (type: 'added' | 'modified' | 'removed', item: T) => void;

// Helper générique pour les interactions Firestore optimisées
const firestoreHelper = {
    getAll: async <T>(collectionName: string): Promise<T[]> => {
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as T);
        } catch (error) {
            console.error(`Erreur lecture Firestore [${collectionName}]:`, error);
            return [];
        }
    },

    // Optimisation Temps Réel & Cache avec Notification de changement
    subscribe: <T>(
        collectionName: string, 
        callback: (data: T[]) => void, 
        notify?: NotifyCallback<T>
    ) => {
        const q = query(collection(db, collectionName));
        let isFirstRun = true;

        return onSnapshot(q, (snapshot) => {
            // 1. Mise à jour de l'état global (Liste complète)
            const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as T);
            callback(items);

            // 2. Gestion des notifications granulaires (Diff)
            if (!isFirstRun && notify) {
                snapshot.docChanges().forEach((change) => {
                    const item = { id: change.doc.id, ...change.doc.data() } as T;
                    // On ne notifie que les changements pertinents provenant du serveur ou d'autres clients
                    // (snapshot.metadata.hasPendingWrites est true si c'est notre propre écriture locale en attente)
                    if (!snapshot.metadata.hasPendingWrites) {
                        notify(change.type, item);
                    }
                });
            }
            
            isFirstRun = false;
        }, (error) => {
            console.error(`Erreur subscription [${collectionName}]:`, error);
        });
    },

    save: async <T extends { id: string }>(collectionName: string, item: T): Promise<void> => {
        try {
            const payload = cleanPayload(item);
            await setDoc(doc(db, collectionName, item.id), payload, { merge: true });
        } catch (error) {
            console.error(`Erreur écriture Firestore [${collectionName}]:`, error);
            throw error;
        }
    },

    saveAll: async <T extends { id: string }>(collectionName: string, items: T[]): Promise<void> => {
        try {
            const chunks = chunkArray(items, 450);
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(item => {
                    const ref = doc(db, collectionName, item.id);
                    batch.set(ref, cleanPayload(item), { merge: true });
                });
                await batch.commit();
            }
        } catch (error) {
            console.error(`Erreur batch Firestore [${collectionName}]:`, error);
            throw error;
        }
    },

    delete: async (collectionName: string, id: string): Promise<void> => {
        try {
            await deleteDoc(doc(db, collectionName, id));
        } catch (error) {
            console.error(`Erreur suppression Firestore [${collectionName}]:`, error);
            throw error;
        }
    },

    // Suppression en masse optimisée (Batch)
    deleteBatch: async (collectionName: string, ids: string[]): Promise<void> => {
        try {
            // Firestore limite les batchs à 500 opérations
            const chunks = chunkArray(ids, 500);
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(id => {
                    const ref = doc(db, collectionName, id);
                    batch.delete(ref);
                });
                await batch.commit();
            }
        } catch (error) {
            console.error(`Erreur suppression batch Firestore [${collectionName}]:`, error);
            throw error;
        }
    },

    // --- GESTION SOUS-COLLECTIONS ---
    getSubCollection: async <T>(parentCollection: string, parentId: string, subCollectionName: string): Promise<T[]> => {
        try {
            const q = query(collection(db, parentCollection, parentId, subCollectionName));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as T);
        } catch (error) {
            console.error(`Erreur lecture sous-collection:`, error);
            return [];
        }
    },

    saveSubCollectionDoc: async <T extends { id: string }>(parentCollection: string, parentId: string, subCollectionName: string, item: T): Promise<void> => {
        try {
            const payload = cleanPayload(item);
            await setDoc(doc(db, parentCollection, parentId, subCollectionName, item.id), payload, { merge: true });
        } catch (error) {
            console.error(`Erreur écriture sous-collection:`, error);
            throw error;
        }
    },

    deleteSubCollectionDoc: async (parentCollection: string, parentId: string, subCollectionName: string, docId: string): Promise<void> => {
        try {
            await deleteDoc(doc(db, parentCollection, parentId, subCollectionName, docId));
        } catch (error) {
            console.error(`Erreur suppression sous-collection:`, error);
            throw error;
        }
    }
};

export const api = {
    // --- GESTION UTILISATEURS ---
    getUserProfile: async (uid: string): Promise<User | null> => {
        try {
            const docRef = doc(db, "users", uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as User;
            }
            return null;
        } catch (error) {
            console.error("Erreur getUserProfile:", error);
            return null;
        }
    },
    getAllUsers: () => firestoreHelper.getAll<User>('users'),
    createUserProfile: (user: User) => firestoreHelper.save('users', user),
    updateUserProfile: (user: Partial<User>) => user.id ? firestoreHelper.save('users', user as User) : Promise.resolve(),

    // --- Messagerie ---
    getMessages: () => firestoreHelper.getAll<Message>('messages'),
    subscribeToMessages: (callback: (messages: Message[]) => void, notify?: NotifyCallback<Message>) => {
        const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
        let isFirstRun = true;
        return onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as Message);
            callback(msgs);
            
            if (!isFirstRun && notify) {
                snapshot.docChanges().forEach(change => {
                    // Pour les messages, on ne notifie que les AJOUTS
                    if(change.type === 'added' && !snapshot.metadata.hasPendingWrites) {
                        notify('added', { id: change.doc.id, ...change.doc.data() } as Message);
                    }
                });
            }
            isFirstRun = false;
        });
    },
    sendMessage: (msg: Message) => firestoreHelper.save('messages', msg),
    markMessagesAsRead: async (senderId: string, receiverId: string) => {
        const q = query(collection(db, "messages"), where("senderId", "==", senderId), where("receiverId", "==", receiverId), where("read", "==", false));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
    },

    // --- Entités Métier (Avec Abonnements et Notifs) ---
    
    // Partenaires
    getPartenaires: () => firestoreHelper.getAll<Partenaire>('partenaires'),
    subscribeToPartners: (cb: (d: Partenaire[]) => void, notify?: NotifyCallback<Partenaire>) => firestoreHelper.subscribe('partenaires', cb, notify),
    addPartenaire: (p: Partenaire) => firestoreHelper.save('partenaires', p),
    updatePartenaire: (p: Partenaire) => firestoreHelper.save('partenaires', p),
    deletePartenaire: (id: string) => firestoreHelper.delete('partenaires', id),

    // Conducteurs
    getConducteurs: () => firestoreHelper.getAll<Conducteur>('conducteurs'),
    subscribeToDrivers: (cb: (d: Conducteur[]) => void, notify?: NotifyCallback<Conducteur>) => firestoreHelper.subscribe('conducteurs', cb, notify),
    addConducteur: (c: Conducteur) => firestoreHelper.save('conducteurs', c),
    updateConducteur: (c: Conducteur) => firestoreHelper.save('conducteurs', c),
    deleteConducteur: (id: string) => firestoreHelper.delete('conducteurs', id),

    // Véhicules
    getVehicules: () => firestoreHelper.getAll<Vehicule>('vehicules'),
    subscribeToVehicles: (cb: (d: Vehicule[]) => void, notify?: NotifyCallback<Vehicule>) => firestoreHelper.subscribe('vehicules', cb, notify),
    addVehicule: (v: Vehicule) => firestoreHelper.save('vehicules', v),
    updateVehicule: (v: Vehicule) => firestoreHelper.save('vehicules', v),
    deleteVehicule: (id: string) => firestoreHelper.delete('vehicules', id),

    // Rapports
    getRapports: () => firestoreHelper.getAll<Rapport>('rapports'),
    subscribeToReports: (cb: (d: Rapport[]) => void, notify?: NotifyCallback<Rapport>) => firestoreHelper.subscribe('rapports', cb, notify),
    saveRapports: (data: Rapport[]) => firestoreHelper.saveAll('rapports', data),
    addRapport: (r: Rapport) => firestoreHelper.save('rapports', r),
    deleteRapport: (id: string) => firestoreHelper.delete('rapports', id),

    // Infractions
    getInfractions: () => firestoreHelper.getAll<Infraction>('infractions'),
    subscribeToInfractions: (cb: (d: Infraction[]) => void, notify?: NotifyCallback<Infraction>) => firestoreHelper.subscribe('infractions', cb, notify),
    addInfraction: (i: Infraction) => firestoreHelper.save('infractions', i),
    deleteInfraction: (id: string) => firestoreHelper.delete('infractions', id),
    deleteInfractionsBulk: (ids: string[]) => firestoreHelper.deleteBatch('infractions', ids),

    // Fichiers Infractions
    getInfractionFiles: (infractionId: string) => firestoreHelper.getSubCollection<InfractionFile>('infractions', infractionId, 'files'),
    addInfractionFile: (infractionId: string, file: InfractionFile) => firestoreHelper.saveSubCollectionDoc('infractions', infractionId, 'files', file),
    deleteInfractionFile: (infractionId: string, fileId: string) => firestoreHelper.deleteSubCollectionDoc('infractions', infractionId, 'files', fileId),

    // Clés OBC
    getCleObc: () => firestoreHelper.getAll<CleObc>('cle_obc'),
    subscribeToObcKeys: (cb: (d: CleObc[]) => void) => firestoreHelper.subscribe('cle_obc', cb),
    addCleObc: (k: CleObc) => firestoreHelper.save('cle_obc', k),
    deleteCleObc: (id: string) => firestoreHelper.delete('cle_obc', id),

    // Invariants
    getInvariants: () => firestoreHelper.getAll<Invariant>('invariants'),
    subscribeToInvariants: (cb: (d: Invariant[]) => void) => firestoreHelper.subscribe('invariants', cb),
    addInvariant: (i: Invariant) => firestoreHelper.save('invariants', i),
    deleteInvariant: (id: string) => firestoreHelper.delete('invariants', id),

    // Equipements
    getEquipements: () => firestoreHelper.getAll<Equipement>('equipements'),
    subscribeToEquipements: (cb: (d: Equipement[]) => void) => firestoreHelper.subscribe('equipements', cb),
    addEquipement: (e: Equipement) => firestoreHelper.save('equipements', e),
    deleteEquipement: (id: string) => firestoreHelper.delete('equipements', id),

    // Procédures
    getProcedures: () => firestoreHelper.getAll<Procedure>('procedures'),
    subscribeToProcedures: (cb: (d: Procedure[]) => void, notify?: NotifyCallback<Procedure>) => firestoreHelper.subscribe('procedures', cb, notify),
    addProcedure: (p: Procedure) => firestoreHelper.save('procedures', p),
    deleteProcedure: (id: string) => firestoreHelper.delete('procedures', id),

    // Contrôle Cabine
    getControleCabine: () => firestoreHelper.getAll<ControleCabine>('controles_cabine'),
    subscribeToControleCabine: (cb: (d: ControleCabine[]) => void, notify?: NotifyCallback<ControleCabine>) => firestoreHelper.subscribe('controles_cabine', cb, notify),
    addControleCabine: (c: ControleCabine) => firestoreHelper.save('controles_cabine', c),
    deleteControleCabine: (id: string) => firestoreHelper.delete('controles_cabine', id),

    // Communication
    getCommunicationPlans: () => firestoreHelper.getAll<CommunicationPlan>('communication_plans'),
    subscribeToCommunicationPlans: (cb: (d: CommunicationPlan[]) => void, notify?: NotifyCallback<CommunicationPlan>) => firestoreHelper.subscribe('communication_plans', cb, notify),
    addCommunicationPlan: (p: CommunicationPlan) => firestoreHelper.save('communication_plans', p),
    deleteCommunicationPlan: (id: string) => firestoreHelper.delete('communication_plans', id),

    getCommunicationExecutions: () => firestoreHelper.getAll<CommunicationExecution>('communication_executions'),
    subscribeToCommunicationExecutions: (cb: (d: CommunicationExecution[]) => void) => firestoreHelper.subscribe('communication_executions', cb),
    addCommunicationExecution: (e: CommunicationExecution) => firestoreHelper.save('communication_executions', e),

    // Analyses Temps
    getTempsTravail: () => firestoreHelper.getAll<TempsTravail>('temps_travail'),
    subscribeToTempsTravail: (cb: (d: TempsTravail[]) => void) => firestoreHelper.subscribe('temps_travail', cb),
    addTempsTravail: (t: TempsTravail) => firestoreHelper.save('temps_travail', t),
    getTempsTravailFiles: (id: string) => firestoreHelper.getSubCollection<InfractionFile>('temps_travail', id, 'files'),
    addTempsTravailFile: (id: string, file: InfractionFile) => firestoreHelper.saveSubCollectionDoc('temps_travail', id, 'files', file),
    deleteTempsTravailFile: (id: string, fileId: string) => firestoreHelper.deleteSubCollectionDoc('temps_travail', id, 'files', fileId),

    getTempsConduite: () => firestoreHelper.getAll<TempsConduite>('temps_conduite'),
    subscribeToTempsConduite: (cb: (d: TempsConduite[]) => void) => firestoreHelper.subscribe('temps_conduite', cb),
    addTempsConduite: (t: TempsConduite) => firestoreHelper.save('temps_conduite', t),
    getTempsConduiteFiles: (id: string) => firestoreHelper.getSubCollection<InfractionFile>('temps_conduite', id, 'files'),
    addTempsConduiteFile: (id: string, file: InfractionFile) => firestoreHelper.saveSubCollectionDoc('temps_conduite', id, 'files', file),
    deleteTempsConduiteFile: (id: string, fileId: string) => firestoreHelper.deleteSubCollectionDoc('temps_conduite', id, 'files', fileId),

    getTempsRepos: () => firestoreHelper.getAll<TempsRepos>('temps_repos'),
    subscribeToTempsRepos: (cb: (d: TempsRepos[]) => void) => firestoreHelper.subscribe('temps_repos', cb),
    addTempsRepos: (t: TempsRepos) => firestoreHelper.save('temps_repos', t),
    getTempsReposFiles: (id: string) => firestoreHelper.getSubCollection<InfractionFile>('temps_repos', id, 'files'),
    addTempsReposFile: (id: string, file: InfractionFile) => firestoreHelper.saveSubCollectionDoc('temps_repos', id, 'files', file),
    deleteTempsReposFile: (id: string, fileId: string) => firestoreHelper.deleteSubCollectionDoc('temps_repos', id, 'files', fileId),

    // SCP & Objectifs
    getScpConfigurations: () => firestoreHelper.getAll<ScpConfiguration>('scp_configurations'),
    subscribeToScpConfigurations: (cb: (d: ScpConfiguration[]) => void) => firestoreHelper.subscribe('scp_configurations', cb),
    saveScpConfigurations: (data: ScpConfiguration[]) => firestoreHelper.saveAll('scp_configurations', data),
    addScpConfiguration: (c: ScpConfiguration) => firestoreHelper.save('scp_configurations', c),
    deleteScpConfiguration: (id: string) => firestoreHelper.delete('scp_configurations', id),

    getObjectifs: () => firestoreHelper.getAll<Objectif>('objectifs'),
    subscribeToObjectifs: (cb: (d: Objectif[]) => void) => firestoreHelper.subscribe('objectifs', cb),
    addObjectif: (o: Objectif) => firestoreHelper.save('objectifs', o),
    deleteObjectif: (id: string) => firestoreHelper.delete('objectifs', id),
};
