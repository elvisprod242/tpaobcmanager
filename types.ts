
// Définition des types basée sur le schéma fourni

export type UserRole = 'admin' | 'obc' | 'directeur';

export interface User {
    id: string;
    username: string;
    nom: string;
    prenom: string;
    role: UserRole;
    email: string;
    avatarUrl?: string;
}

export interface Partenaire {
    id: string;
    nom: string;
    actif: boolean;
}

export interface CleObc {
    id: string;
    partenaire_id: string;
    cle_obc: string;
}

export interface Conducteur {
    id: string;
    nom: string;
    prenom: string;
    numero_permis: string;
    categorie_permis: string;
    lieu_travail: string;
    cle_obc_ids?: string[]; // Tableau d'IDs pour gérer une clé par partenaire
    vehicule_actuel?: string; // ID
}

export interface Vehicule {
    id: string;
    partenaire_id: string;
    nom: string;
    immatriculation: string;
}

export interface Equipement {
    id: string;
    partenaire_id: string;
    date: string;
    vehicule_id: string; // ref:vehicules/id
    
    balise: boolean;
    balise_detail?: string; // "585KO"
    
    camera: boolean;
    camera_detail?: string; // "585KO"
    
    detecteur_fatigue: boolean; // detecteur_de_fatigue mapped to clean var name
    detecteur_fatigue_detail?: string; // "DRT556"
}

export interface Invariant {
    id: string;
    partenaire_id: string;
    titre: string;
    description: string;
}

export interface ScpConfiguration {
    id: string;
    partenaire_id: string;
    invariants_id: string; // ref:invariants/id
    sanction: string;
    type: 'Alerte' | 'Alarme';
    value: number; // Points perdus
}

export interface CommunicationPlan {
    id: string;
    partenaire_id: string;
    periode: string; // "Janvier 2025"
    theme: string; // "Sécurité routière"
    animateur: string; // "Pierre Dubois"
}

export interface CommunicationExecution {
    id: string;
    partenaire_id: string;
    planning_communication_id: string; // ref:planning_communication/id
    video: string; // "assets/video/formation_securite.mp4"
    canal: string; // "Teams", "Zoom", "Présentiel"
}

export interface Objectif {
    id: string;
    partenaire_id: string;
    invariant_id: string;
    chapitre: string;
    user_id?: string;
    cible: number;
    unite: string;
    mode: 'Préventif' | 'Curatif' | string;
    frequence: 'Hebdomadaire' | 'Mensuel' | 'Trimestriel' | 'Annuel' | string;
}

export interface Procedure {
    id: string;
    partenaire_id: string;
    nom: string;
    file: string; // nom du fichier
    date: string;
    type: string; // extension
    url?: string;
}

export interface Rapport {
    id: string;
    date: string;
    jour: string;
    partenaire_id: string;
    conducteur_id: string;
    invariant_id?: string; // Ajouté
    vehicule_id?: string;
    heure_debut: string; // première heure de début du trajet
    heure_fin: string; // heure de fin du dernier trajet
    temps_conduite: string; // temps de conduite (hh:mm:ss)
    temps_attente: string; // temps d'attente (hh:mm:ss)
    duree: string; // durée (hh:mm:ss)
    duree_ralenti: string; // Durée de ralenti (hh:mm:ss)
    distance_km: number; // Distance (km)
    vitesse_moyenne: number; // Vitesse moy. (km/h)
    vitesse_max: number; // vitesse maximale (km/h)
}

export interface TempsTravail {
    id: string;
    partenaire_id: string;
    rapports_id: string; // ref:rapports/id
    analyse_cause: string; // "Trafic dense"
    action_prise: string; // "Optimisation du planning"
    suivi: string; // "Amélioration constatée"
}

export interface TempsConduite {
    id: string;
    partenaire_id: string;
    rapports_id: string; // ref:rapports/id
    objectifs_id?: string; // ref:objectifs/id
    analyse_cause: string; // "Livraison urgente"
    action_prise: string; // "Répartition des tâches"
    suivi: string; // "Temps respecté depuis"
}

export interface TempsRepos {
    id: string;
    partenaire_id: string;
    rapports_id: string; // ref:rapports/id
    objectifs_id?: string; // ref:objectifs/id
    analyse_cause: string; // "Non respect coupure"
    action_prise: string; // "Rappel réglementation"
    suivi: string; // "Pas de récidive"
}

export interface InfractionFile {
    id: string;
    infractions_id: string;
    file: string; // Nom du fichier ou chemin
    description?: string;
    url?: string; // URL pour visualisation
    type?: string; // extension
}

export interface Infraction {
    id: string;
    partenaire_id: string;
    date: string;
    rapports_id: string; // Lien vers le rapport
    type_infraction: string;
    nombre: number;
    mesure_disciplinaire: string;
    autres_mesures_disciplinaire?: string; // Mappé depuis "Autres mesures disciplinaire"
    suivi: boolean;
    amelioration: boolean; 
    date_suivi?: string; 
    files?: InfractionFile[]; // Liste des justificatifs
}

export interface ControleCabine {
    id: string;
    partenaire_id: string;
    date: string;
    file: string;
    url?: string;
    commentaire: string;
}

export interface Kpi {
    id: string;
    partenaire_id: string;
    rapports_id?: string; // Optionnel dans le contexte global
    nom_element: string; // Ajouté pour identifier la ligne (ex: "Kms parcourus")
    objectif: number | string;
    objectif_annuel?: number | string; // Nouveau champ pour la vue annuelle
    unite: string;
    commentaire: string;
    // Nouveaux champs pour la vue annuelle
    analyse_cause?: string;
    action_prise?: string;
    // Champs calculés/UI
    valeur_actuelle?: number | string;
    valeur_annuelle?: number | string; // Calculé pour l'année
    is_infraction?: boolean; // Pour le style rouge
}

export enum AppView {
    DASHBOARD = 'DASHBOARD',
    PARTNERS = 'PARTNERS',
    OBC_KEYS = 'OBC_KEYS',
    INVARIANTS = 'INVARIANTS',
    OBJECTIVES = 'OBJECTIVES',
    KPI = 'KPI', 
    DRIVERS = 'DRIVERS',
    VEHICLES = 'VEHICLES',
    REPORTS = 'REPORTS',
    WORK_TIME = 'WORK_TIME',
    DRIVING_TIME = 'DRIVING_TIME',
    REST_TIME = 'REST_TIME',
    INFRACTIONS = 'INFRACTIONS',
    INFRACTION_FILES = 'INFRACTION_FILES',
    SCP = 'SCP',
    SCP_ATTRIBUTION = 'SCP_ATTRIBUTION',
    PROCEDURES = 'PROCEDURES',
    CABIN_CONTROL = 'CABIN_CONTROL',
    COMMUNICATION = 'COMMUNICATION',
    COMMUNICATION_DETAILS = 'COMMUNICATION_DETAILS',
    SETTINGS = 'SETTINGS'
}
