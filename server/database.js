
const Database = require('better-sqlite3');
const path = require('path');

// Initialisation de la base de données (fichier local safefleet.db)
const db = new Database('safefleet.db', { verbose: console.log });

// --- 1. INITIALISATION DU SCHÉMA (MIGRATIONS) ---
function initDatabase() {
    // Table Partenaires
    db.exec(`
        CREATE TABLE IF NOT EXISTS partenaires (
            id TEXT PRIMARY KEY,
            nom TEXT NOT NULL,
            actif INTEGER DEFAULT 1
        );
    `);

    // Table Conducteurs
    db.exec(`
        CREATE TABLE IF NOT EXISTS conducteurs (
            id TEXT PRIMARY KEY,
            nom TEXT NOT NULL,
            prenom TEXT NOT NULL,
            numero_permis TEXT,
            categorie_permis TEXT,
            lieu_travail TEXT,
            vehicule_actuel TEXT
        );
    `);

    // Table Véhicules
    db.exec(`
        CREATE TABLE IF NOT EXISTS vehicules (
            id TEXT PRIMARY KEY,
            partenaire_id TEXT,
            nom TEXT NOT NULL,
            immatriculation TEXT NOT NULL,
            FOREIGN KEY(partenaire_id) REFERENCES partenaires(id)
        );
    `);

    // Table Clés OBC (Liaison Many-to-Many implicite via ID)
    db.exec(`
        CREATE TABLE IF NOT EXISTS cle_obc (
            id TEXT PRIMARY KEY,
            partenaire_id TEXT,
            cle_obc TEXT UNIQUE NOT NULL,
            conducteur_id TEXT,
            FOREIGN KEY(partenaire_id) REFERENCES partenaires(id),
            FOREIGN KEY(conducteur_id) REFERENCES conducteurs(id)
        );
    `);

    // Table Invariants
    db.exec(`
        CREATE TABLE IF NOT EXISTS invariants (
            id TEXT PRIMARY KEY,
            partenaire_id TEXT,
            titre TEXT NOT NULL,
            description TEXT,
            FOREIGN KEY(partenaire_id) REFERENCES partenaires(id)
        );
    `);

    // Table Rapports
    db.exec(`
        CREATE TABLE IF NOT EXISTS rapports (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            jour TEXT,
            partenaire_id TEXT,
            conducteur_id TEXT,
            vehicule_id TEXT,
            invariant_id TEXT,
            heure_debut TEXT,
            heure_fin TEXT,
            temps_conduite TEXT,
            temps_attente TEXT,
            duree TEXT,
            duree_ralenti TEXT,
            distance_km REAL,
            vitesse_moyenne REAL,
            vitesse_max REAL,
            FOREIGN KEY(partenaire_id) REFERENCES partenaires(id),
            FOREIGN KEY(conducteur_id) REFERENCES conducteurs(id)
        );
    `);

    // Table Infractions
    db.exec(`
        CREATE TABLE IF NOT EXISTS infractions (
            id TEXT PRIMARY KEY,
            partenaire_id TEXT,
            date TEXT NOT NULL,
            rapports_id TEXT,
            type_infraction TEXT,
            nombre INTEGER,
            mesure_disciplinaire TEXT,
            autres_mesures_disciplinaire TEXT,
            suivi INTEGER DEFAULT 0,
            amelioration INTEGER DEFAULT 0,
            date_suivi TEXT,
            FOREIGN KEY(rapports_id) REFERENCES rapports(id)
        );
    `);

    console.log("Base de données SQLite initialisée avec succès.");
}

// --- 2. MÉTHODES D'ACCÈS AUX DONNÉES (DAO) ---

const DB = {
    // --- Partenaires ---
    getAllPartners: () => db.prepare('SELECT * FROM partenaires').all(),
    createPartner: (p) => db.prepare('INSERT INTO partenaires (id, nom, actif) VALUES (@id, @nom, @actif)').run(p),
    updatePartner: (p) => db.prepare('UPDATE partenaires SET nom = @nom, actif = @actif WHERE id = @id').run(p),
    deletePartner: (id) => db.prepare('DELETE FROM partenaires WHERE id = ?').run(id),

    // --- Conducteurs ---
    getAllDrivers: () => {
        const drivers = db.prepare('SELECT * FROM conducteurs').all();
        // Récupérer les clés OBC associées pour chaque conducteur
        return drivers.map(d => {
            const keys = db.prepare('SELECT id FROM cle_obc WHERE conducteur_id = ?').all(d.id);
            return { ...d, cle_obc_ids: keys.map(k => k.id) };
        });
    },
    createDriver: (d) => db.prepare('INSERT INTO conducteurs (id, nom, prenom, numero_permis, categorie_permis, lieu_travail) VALUES (@id, @nom, @prenom, @numero_permis, @categorie_permis, @lieu_travail)').run(d),
    
    // --- Véhicules ---
    getAllVehicles: () => db.prepare('SELECT * FROM vehicules').all(),
    createVehicle: (v) => db.prepare('INSERT INTO vehicules (id, partenaire_id, nom, immatriculation) VALUES (@id, @partenaire_id, @nom, @immatriculation)').run(v),

    // --- Rapports ---
    getAllReports: () => db.prepare('SELECT * FROM rapports ORDER BY date DESC').all(),
    createReport: (r) => db.prepare(`
        INSERT INTO rapports (id, date, jour, partenaire_id, conducteur_id, vehicule_id, invariant_id, heure_debut, heure_fin, temps_conduite, temps_attente, duree, duree_ralenti, distance_km, vitesse_moyenne, vitesse_max)
        VALUES (@id, @date, @jour, @partenaire_id, @conducteur_id, @vehicule_id, @invariant_id, @heure_debut, @heure_fin, @temps_conduite, @temps_attente, @duree, @duree_ralenti, @distance_km, @vitesse_moyenne, @vitesse_max)
    `).run(r),

    // --- Infractions ---
    getAllInfractions: () => db.prepare('SELECT * FROM infractions ORDER BY date DESC').all(),
    createInfraction: (i) => db.prepare(`
        INSERT INTO infractions (id, partenaire_id, date, rapports_id, type_infraction, nombre, mesure_disciplinaire, autres_mesures_disciplinaire, suivi, amelioration, date_suivi)
        VALUES (@id, @partenaire_id, @date, @rapports_id, @type_infraction, @nombre, @mesure_disciplinaire, @autres_mesures_disciplinaire, @suivi ? 1 : 0, @amelioration ? 1 : 0, @date_suivi)
    `).run(i),
};

// Initialisation au chargement
initDatabase();

module.exports = DB;
