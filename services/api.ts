
import { Partenaire, Conducteur, Vehicule, Rapport, Infraction, CleObc, Invariant, Equipement } from '../types';
import { mockPartenairesList, mockConducteurs, mockVehicules, mockRapports, mockInfractions, mockCleObcList, mockInvariants, mockEquipements } from './mockData';

// Configuration
const USE_BACKEND_API = false; // Mettre à TRUE si le serveur Node.js (better-sqlite3) est lancé
const API_URL = 'http://localhost:3001/api';

// Helper générique pour simuler ou appeler l'API
async function fetchOrMock<T>(key: string, mockData: T): Promise<T> {
    if (USE_BACKEND_API) {
        try {
            const response = await fetch(`${API_URL}/${key}`);
            if (!response.ok) throw new Error('API Error');
            return await response.json();
        } catch (e) {
            console.error(`Erreur connexion API pour ${key}, fallback LocalStorage`, e);
        }
    }
    
    // Fallback LocalStorage (Simulation Persistance)
    const stored = localStorage.getItem(`db_${key}`);
    if (stored) {
        return JSON.parse(stored);
    }
    // Si rien en storage, on init avec les mocks et on sauvegarde
    localStorage.setItem(`db_${key}`, JSON.stringify(mockData));
    return mockData;
}

// Helper sauvegarde générique
async function saveOrMock<T>(key: string, data: T): Promise<void> {
    if (USE_BACKEND_API) {
        try {
            await fetch(`${API_URL}/${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return;
        } catch (e) {
            console.error(`Erreur sauvegarde API pour ${key}`, e);
        }
    }
    localStorage.setItem(`db_${key}`, JSON.stringify(data));
}

// --- API Service ---

export const api = {
    // Partenaires
    getPartenaires: () => fetchOrMock<Partenaire[]>('partners', mockPartenairesList),
    savePartenaires: (data: Partenaire[]) => saveOrMock('partners', data),

    // Conducteurs
    getConducteurs: () => fetchOrMock<Conducteur[]>('drivers', mockConducteurs),
    saveConducteurs: (data: Conducteur[]) => saveOrMock('drivers', data),

    // Véhicules
    getVehicules: () => fetchOrMock<Vehicule[]>('vehicles', mockVehicules),
    saveVehicules: (data: Vehicule[]) => saveOrMock('vehicles', data),

    // Rapports
    getRapports: () => fetchOrMock<Rapport[]>('reports', mockRapports),
    saveRapports: (data: Rapport[]) => saveOrMock('reports', data),

    // Infractions
    getInfractions: () => fetchOrMock<Infraction[]>('infractions', mockInfractions),
    saveInfractions: (data: Infraction[]) => saveOrMock('infractions', data),

    // Autres données statiques (pour l'instant)
    getCleObc: () => fetchOrMock<CleObc[]>('keys', mockCleObcList),
    saveCleObc: (data: CleObc[]) => saveOrMock('keys', data),

    getInvariants: () => fetchOrMock<Invariant[]>('invariants', mockInvariants),
    saveInvariants: (data: Invariant[]) => saveOrMock('invariants', data),

    getEquipements: () => fetchOrMock<Equipement[]>('equipements', mockEquipements),
    saveEquipements: (data: Equipement[]) => saveOrMock('equipements', data),
};
