
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Limite augmentée pour les images en base64

// Base de données
const db = new Database('safefleet.db'); // Persistante sur le disque
db.pragma('journal_mode = WAL'); // Optimisation performance

// --- Initialisation Schéma ---
const initDb = () => {
    console.log("Initialisation de la base de données...");
    
    // Tables principales
    db.exec(`
        CREATE TABLE IF NOT EXISTS partenaires (id TEXT PRIMARY KEY, nom TEXT, actif INTEGER);
        CREATE TABLE IF NOT EXISTS conducteurs (id TEXT PRIMARY KEY, nom TEXT, prenom TEXT, numero_permis TEXT, categorie_permis TEXT, lieu_travail TEXT, cle_obc_ids TEXT, vehicule_actuel TEXT);
        CREATE TABLE IF NOT EXISTS vehicules (id TEXT PRIMARY KEY, partenaire_id TEXT, nom TEXT, immatriculation TEXT);
        CREATE TABLE IF NOT EXISTS cle_obc (id TEXT PRIMARY KEY, partenaire_id TEXT, cle_obc TEXT);
        CREATE TABLE IF NOT EXISTS rapports (id TEXT PRIMARY KEY, date TEXT, jour TEXT, partenaire_id TEXT, conducteur_id TEXT, vehicule_id TEXT, invariant_id TEXT, heure_debut TEXT, heure_fin TEXT, temps_conduite TEXT, temps_attente TEXT, duree TEXT, duree_ralenti TEXT, distance_km REAL, vitesse_moyenne REAL, vitesse_max REAL);
        CREATE TABLE IF NOT EXISTS infractions (id TEXT PRIMARY KEY, partenaire_id TEXT, date TEXT, rapports_id TEXT, type_infraction TEXT, nombre INTEGER, mesure_disciplinaire TEXT, autres_mesures_disciplinaire TEXT, suivi INTEGER, amelioration INTEGER, date_suivi TEXT, files TEXT);
        CREATE TABLE IF NOT EXISTS invariants (id TEXT PRIMARY KEY, partenaire_id TEXT, titre TEXT, description TEXT);
        CREATE TABLE IF NOT EXISTS equipements (id TEXT PRIMARY KEY, partenaire_id TEXT, vehicule_id TEXT, date TEXT, balise INTEGER, balise_detail TEXT, camera INTEGER, camera_detail TEXT, detecteur_fatigue INTEGER, detecteur_fatigue_detail TEXT);
        CREATE TABLE IF NOT EXISTS procedures (id TEXT PRIMARY KEY, partenaire_id TEXT, nom TEXT, file TEXT, date TEXT, type TEXT, url TEXT);
        CREATE TABLE IF NOT EXISTS controles_cabine (id TEXT PRIMARY KEY, partenaire_id TEXT, date TEXT, file TEXT, url TEXT, commentaire TEXT);
        CREATE TABLE IF NOT EXISTS communication_plans (id TEXT PRIMARY KEY, partenaire_id TEXT, periode TEXT, theme TEXT, animateur TEXT);
        CREATE TABLE IF NOT EXISTS communication_executions (id TEXT PRIMARY KEY, partenaire_id TEXT, planning_communication_id TEXT, video TEXT, canal TEXT);
        CREATE TABLE IF NOT EXISTS temps_travail (id TEXT PRIMARY KEY, partenaire_id TEXT, rapports_id TEXT, analyse_cause TEXT, action_prise TEXT, suivi TEXT);
        CREATE TABLE IF NOT EXISTS temps_conduite (id TEXT PRIMARY KEY, partenaire_id TEXT, rapports_id TEXT, objectifs_id TEXT, analyse_cause TEXT, action_prise TEXT, suivi TEXT);
        CREATE TABLE IF NOT EXISTS temps_repos (id TEXT PRIMARY KEY, partenaire_id TEXT, rapports_id TEXT, objectifs_id TEXT, analyse_cause TEXT, action_prise TEXT, suivi TEXT);
        CREATE TABLE IF NOT EXISTS scp_configurations (id TEXT PRIMARY KEY, partenaire_id TEXT, invariants_id TEXT, sanction TEXT, type TEXT, value INTEGER);
        CREATE TABLE IF NOT EXISTS objectifs (id TEXT PRIMARY KEY, partenaire_id TEXT, invariant_id TEXT, chapitre TEXT, cible REAL, unite TEXT, mode TEXT, frequence TEXT);
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, nom TEXT, prenom TEXT, role TEXT, email TEXT, avatarUrl TEXT);
        CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, senderId TEXT, receiverId TEXT, content TEXT, timestamp TEXT, read INTEGER);
    `);
    console.log("Tables vérifiées/créées.");
};

initDb();

// --- Helpers Génériques ---

// Route pour récupérer tout le contenu d'une table
const createGetRoute = (endpoint, tableName, jsonFields = []) => {
    app.get(`/api/${endpoint}`, (req, res) => {
        try {
            const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
            // Parsing des champs JSON stockés en TEXT (ex: tableaux d'IDs)
            const parsedRows = rows.map(row => {
                jsonFields.forEach(field => {
                    if (row[field]) {
                        try { row[field] = JSON.parse(row[field]); } catch(e) {}
                    }
                });
                // Conversion booléens SQLite (0/1 -> false/true)
                for (const key in row) {
                    if (row[key] === 0 || row[key] === 1) {
                        // Détection heuristique simple : si ça ressemble à un booléen dans le contexte de l'app
                        if (['actif', 'balise', 'camera', 'detecteur_fatigue', 'suivi', 'amelioration', 'read'].includes(key)) {
                            row[key] = Boolean(row[key]);
                        }
                    }
                }
                return row;
            });
            res.json(parsedRows);
        } catch (error) {
            console.error(`Erreur GET ${endpoint}:`, error);
            res.status(500).json({ error: error.message });
        }
    });
};

// Route pour sauvegarde en masse (Sync/Replace)
const createSyncRoute = (endpoint, tableName, jsonFields = []) => {
    app.post(`/api/${endpoint}/sync`, (req, res) => {
        const data = req.body; // Array of items
        if (!Array.isArray(data)) return res.status(400).send("Tableau attendu");

        const transaction = db.transaction((items) => {
            db.prepare(`DELETE FROM ${tableName}`).run();
            if (items.length > 0) {
                const keys = Object.keys(items[0]);
                const placeholders = keys.map(k => `@${k}`).join(', ');
                const insert = db.prepare(`INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`);
                
                for (const item of items) {
                    const row = { ...item };
                    // Stringify JSON fields & Convert Booleans to 0/1
                    jsonFields.forEach(field => {
                        if (row[field]) row[field] = JSON.stringify(row[field]);
                    });
                    for (const key in row) {
                        if (typeof row[key] === 'boolean') row[key] = row[key] ? 1 : 0;
                    }
                    insert.run(row);
                }
            }
        });

        try {
            transaction(data);
            res.json({ success: true, count: data.length });
        } catch (error) {
            console.error(`Erreur SYNC ${endpoint}:`, error);
            res.status(500).json({ error: error.message });
        }
    });
};

// Route CRUD Unitaire (Create/Update)
const createUpsertRoute = (endpoint, tableName, jsonFields = []) => {
    app.post(`/api/${endpoint}`, (req, res) => {
        try {
            const item = req.body;
            const keys = Object.keys(item);
            const placeholders = keys.map(k => `@${k}`).join(', ');
            
            const row = { ...item };
            jsonFields.forEach(field => {
                if (row[field]) row[field] = JSON.stringify(row[field]);
            });
            for (const key in row) {
                if (typeof row[key] === 'boolean') row[key] = row[key] ? 1 : 0;
            }

            const query = `INSERT OR REPLACE INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
            db.prepare(query).run(row);
            res.json({ success: true, id: item.id });
        } catch (error) {
            console.error(`Erreur UPSERT ${endpoint}:`, error);
            res.status(500).json({ error: error.message });
        }
    });
};

// Route Delete
const createDeleteRoute = (endpoint, tableName) => {
    app.delete(`/api/${endpoint}/:id`, (req, res) => {
        try {
            db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(req.params.id);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
};

// --- Routes Spécifiques Messagerie ---
app.post('/api/messages/mark-read', (req, res) => {
    const { senderId, receiverId } = req.body;
    try {
        const info = db.prepare('UPDATE messages SET read = 1 WHERE senderId = ? AND receiverId = ?').run(senderId, receiverId);
        res.json({ success: true, updated: info.changes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Définition des Routes ---

// 1. Partenaires
createGetRoute('partenaires', 'partenaires');
createSyncRoute('partenaires', 'partenaires');
createUpsertRoute('partenaires', 'partenaires');
createDeleteRoute('partenaires', 'partenaires');

// 2. Conducteurs
createGetRoute('conducteurs', 'conducteurs', ['cle_obc_ids']);
createSyncRoute('conducteurs', 'conducteurs', ['cle_obc_ids']);
createUpsertRoute('conducteurs', 'conducteurs', ['cle_obc_ids']);

// 3. Véhicules
createGetRoute('vehicules', 'vehicules');
createSyncRoute('vehicules', 'vehicules');

// 4. Clés OBC
createGetRoute('cle_obc', 'cle_obc');
createSyncRoute('cle_obc', 'cle_obc');

// 5. Rapports
createGetRoute('rapports', 'rapports');
createSyncRoute('rapports', 'rapports');

// 6. Infractions
createGetRoute('infractions', 'infractions', ['files']);
createSyncRoute('infractions', 'infractions', ['files']);

// 7. Invariants
createGetRoute('invariants', 'invariants');
createSyncRoute('invariants', 'invariants');

// 8. Equipements
createGetRoute('equipements', 'equipements');
createSyncRoute('equipements', 'equipements');

// 9. Procédures
createGetRoute('procedures', 'procedures');
createSyncRoute('procedures', 'procedures');

// 10. Contrôle Cabine
createGetRoute('controles_cabine', 'controles_cabine');
createSyncRoute('controles_cabine', 'controles_cabine');

// 11. Communication
createGetRoute('communication_plans', 'communication_plans');
createSyncRoute('communication_plans', 'communication_plans');
createGetRoute('communication_executions', 'communication_executions');
createSyncRoute('communication_executions', 'communication_executions');

// 12. Analyses
createGetRoute('temps_travail', 'temps_travail');
createSyncRoute('temps_travail', 'temps_travail');
createGetRoute('temps_conduite', 'temps_conduite');
createSyncRoute('temps_conduite', 'temps_conduite');
createGetRoute('temps_repos', 'temps_repos');
createSyncRoute('temps_repos', 'temps_repos');

// 13. Configs & Objectifs
createGetRoute('scp_configurations', 'scp_configurations');
createSyncRoute('scp_configurations', 'scp_configurations');
createGetRoute('objectifs', 'objectifs');
createSyncRoute('objectifs', 'objectifs');

// 14. Utilisateurs & Messagerie
createGetRoute('users', 'users');
createUpsertRoute('users', 'users');
createGetRoute('messages', 'messages');
createUpsertRoute('messages', 'messages'); // Pour envoyer un message

// Démarrage
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur TPA Manager démarré sur http://localhost:${PORT}`);
    console.log(`📲 Accessible sur le réseau via l'adresse IP de cette machine.`);
});
