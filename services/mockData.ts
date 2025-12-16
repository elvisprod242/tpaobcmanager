
import { Conducteur, Vehicule, Rapport, Infraction, Kpi, Partenaire, CleObc, Invariant, Objectif, Procedure, Equipement, TempsTravail, TempsConduite, TempsRepos, ControleCabine, ScpConfiguration, CommunicationPlan, CommunicationExecution } from '../types';

// Utilitaires de génération
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);
const randomFloat = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toFixed(1));

// --- 1. PARTENAIRES RÉALISTES ---
export const mockPartenairesList: Partenaire[] = [
    { id: "p_idf", nom: "Transports Logistique IDF", actif: true },
    { id: "p_sud", nom: "Sud-Est Fret", actif: true },
    { id: "p_green", nom: "Green Delivery Solutions", actif: true },
];

// --- 2. CLÉS OBC (Téléamatique) ---
export const mockCleObcList: CleObc[] = [
    // IDF
    { id: "k_idf_01", partenaire_id: "p_idf", cle_obc: "OBC-IDF-77895" },
    { id: "k_idf_02", partenaire_id: "p_idf", cle_obc: "OBC-IDF-77896" },
    { id: "k_idf_03", partenaire_id: "p_idf", cle_obc: "OBC-IDF-77897" },
    // Sud-Est
    { id: "k_sud_01", partenaire_id: "p_sud", cle_obc: "OBC-SUD-13001" },
    { id: "k_sud_02", partenaire_id: "p_sud", cle_obc: "OBC-SUD-13002" },
    // Green
    { id: "k_green_01", partenaire_id: "p_green", cle_obc: "OBC-ECO-44005" },
    { id: "k_green_02", partenaire_id: "p_green", cle_obc: "OBC-ECO-44006" },
];

// --- 3. CONDUCTEURS ---
export const mockConducteurs: Conducteur[] = [
    // IDF
    { id: "c_idf_1", nom: "Dubois", prenom: "Thomas", numero_permis: "12AA34567", categorie_permis: "CE", lieu_travail: "Gennevilliers", cle_obc_ids: ["k_idf_01"] },
    { id: "c_idf_2", nom: "Kowalski", prenom: "Anna", numero_permis: "98BB65432", categorie_permis: "C", lieu_travail: "Rungis", cle_obc_ids: ["k_idf_02"] },
    { id: "c_idf_3", nom: "Benali", prenom: "Karim", numero_permis: "45CC12345", categorie_permis: "CE", lieu_travail: "Roissy CDG", cle_obc_ids: ["k_idf_03"] },
    // Sud-Est
    { id: "c_sud_1", nom: "Garcia", prenom: "Nicolas", numero_permis: "77DD88899", categorie_permis: "CE", lieu_travail: "Lyon Corbas", cle_obc_ids: ["k_sud_01"] },
    { id: "c_sud_2", nom: "Muller", prenom: "Hans", numero_permis: "11EE22233", categorie_permis: "C", lieu_travail: "Marseille Port", cle_obc_ids: ["k_sud_02"] },
    // Green
    { id: "c_green_1", nom: "Petit", prenom: "Julie", numero_permis: "55FF66677", categorie_permis: "C", lieu_travail: "Nantes", cle_obc_ids: ["k_green_01"] },
    { id: "c_green_2", nom: "Leroy", prenom: "Marc", numero_permis: "99GG00011", categorie_permis: "C", lieu_travail: "Bordeaux", cle_obc_ids: ["k_green_02"] },
];

// --- 4. VÉHICULES ---
export const mockVehicules: Vehicule[] = [
    // IDF (Flotte Renault/Mercedes)
    { id: "v_idf_1", partenaire_id: "p_idf", nom: "Renault Trucks T-High", immatriculation: "GF-123-HJ" },
    { id: "v_idf_2", partenaire_id: "p_idf", nom: "Mercedes Actros 5", immatriculation: "FH-456-KL" },
    { id: "v_idf_3", partenaire_id: "p_idf", nom: "Renault D-Wide", immatriculation: "GJ-789-MN" },
    // Sud-Est (Flotte Scania/Volvo)
    { id: "v_sud_1", partenaire_id: "p_sud", nom: "Scania R500 V8", immatriculation: "EX-111-YZ" },
    { id: "v_sud_2", partenaire_id: "p_sud", nom: "Volvo FH16", immatriculation: "ER-222-WX" },
    // Green (Flotte Eco/Gaz)
    { id: "v_green_1", partenaire_id: "p_green", nom: "Iveco S-Way GNC", immatriculation: "GB-333-AZ" },
    { id: "v_green_2", partenaire_id: "p_green", nom: "Renault E-Tech D", immatriculation: "GC-444-ZE" },
];

// --- 5. ÉQUIPEMENTS ---
export const mockEquipements: Equipement[] = [
    { id: "eq_1", vehicule_id: "v_idf_1", partenaire_id: "p_idf", date: "2023-05-10", balise: true, balise_detail: "GPS-TRK-01", camera: true, camera_detail: "CAM-DASH-01", detecteur_fatigue: true, detecteur_fatigue_detail: "FAT-SENS-01" },
    { id: "eq_2", vehicule_id: "v_idf_2", partenaire_id: "p_idf", date: "2023-06-15", balise: true, balise_detail: "GPS-TRK-02", camera: false, detecteur_fatigue: false },
    { id: "eq_3", vehicule_id: "v_sud_1", partenaire_id: "p_sud", date: "2023-08-20", balise: true, balise_detail: "GPS-SAT-99", camera: true, camera_detail: "CAM-REAR-02", detecteur_fatigue: true, detecteur_fatigue_detail: "EYE-TRK-X" },
    { id: "eq_4", vehicule_id: "v_green_1", partenaire_id: "p_green", date: "2024-01-10", balise: true, balise_detail: "ECO-GPS-05", camera: true, camera_detail: "CAM-360-01", detecteur_fatigue: false },
];

// --- 6. INVARIANTS (CONSERVÉS) ---
const invariantTemplates = [
    { titre: "Respect du repos journalier", description: "Le conducteur doit respecter impérativement le temps de repos journalier réglementaire." },
    { titre: "Respect du repos hebdomadaire", description: "Le repos hebdomadaire doit être pris conformément à la législation en vigueur." },
    { titre: "Respect du temps de conduite journalier", description: "Interdiction de dépasser le plafond d'heures de conduite journalières autorisées." },
    { titre: "Respect du temps de conduite hebdomadaire", description: "Surveillance stricte du cumul des heures de conduite sur la semaine." },
    { titre: "Respect du temps de travail", description: "Conformité aux règles concernant le temps de travail journalier et hebdomadaire." },
    { titre: "Conduite souple (Eco-conduite)", description: "Adopter une conduite fluide : éviter les accélérations brusques et les freinages d'urgence non justifiés." },
    { titre: "Intégrité du matériel (Caméra)", description: "Interdiction formelle d'obstruer ou de manipuler les caméras embarquées (Tripotage caméra)." },
    { titre: "Limitation de la conduite de nuit", description: "Restreindre au maximum la conduite sur les plages horaires nocturnes." },
    { titre: "Intégrité de l'OBC", description: "Tolérance zéro concernant le sabotage de l'ordinateur de bord." },
    { titre: "Interdiction de la Roue Libre", description: "Le véhicule doit toujours être maintenu en prise (pas de point mort en roulant)." },
    { titre: "Respect des pauses (Conduite continue)", description: "Interdiction de dépasser le temps de conduite continue sans pause réglementaire." },
    { titre: "Respect des limitations de vitesse", description: "Aucun excès de vitesse toléré (Alertes et Alarmes)." },
    { titre: "Identification Conducteur (Clé OBC)", description: "Utilisation stricte de sa propre clé conducteur. Interdiction d'usurpation." },
    { titre: "Conduite Préventive", description: "Adopter un comportement routier sûr pour éviter toute conduite qualifiée de dangereuse." }
];

export const mockInvariants: Invariant[] = [];
mockPartenairesList.forEach(part => {
    invariantTemplates.forEach((tpl, index) => {
        mockInvariants.push({
            id: `inv_${part.id}_${index}`,
            partenaire_id: part.id,
            titre: tpl.titre,
            description: tpl.description
        });
    });
});

// --- 7. CONFIGURATION SCP (Sanctions) ---
export const mockScpConfigurations: ScpConfiguration[] = [
    { id: "scp_1", partenaire_id: "p_idf", invariants_id: "inv_p_idf_11", sanction: "Mise à pied conservatoire", type: "Alarme", value: 6 }, // Vitesse
    { id: "scp_2", partenaire_id: "p_idf", invariants_id: "inv_p_idf_0", sanction: "Avertissement écrit", type: "Alerte", value: 1 }, // Repos
    { id: "scp_3", partenaire_id: "p_sud", invariants_id: "inv_p_sud_6", sanction: "Retenue sur prime", type: "Alarme", value: 3 }, // Caméra
    { id: "scp_4", partenaire_id: "p_green", invariants_id: "inv_p_green_5", sanction: "Formation Eco-Conduite", type: "Alerte", value: 1 }, // Eco-conduite
    // Config pour l'exemple utilisateur (Non-respect des pauses = inv index 10)
    { id: "scp_user_ex", partenaire_id: "p_idf", invariants_id: "inv_p_idf_10", sanction: "Avertissement", type: "Alerte", value: 1 } 
];

// --- 8. OBJECTIFS ---
export const mockObjectifs: Objectif[] = [
    // IDF: Focus Sécurité
    { id: "obj_idf_1", partenaire_id: "p_idf", invariant_id: "inv_p_idf_11", chapitre: "Sécurité Routière", cible: 0, unite: "Excès > 90km/h", mode: "Préventif", frequence: "Hebdomadaire" },
    { id: "obj_idf_2", partenaire_id: "p_idf", invariant_id: "inv_p_idf_0", chapitre: "RSE / Légal", cible: 0, unite: "Infractions", mode: "Préventif", frequence: "Mensuel" },
    // Sud-Est: Focus Matériel
    { id: "obj_sud_1", partenaire_id: "p_sud", invariant_id: "inv_p_sud_6", chapitre: "Intégrité Matériel", cible: 100, unite: "% Disponibilité", mode: "Curatif", frequence: "Trimestriel" },
    // Green: Focus Écologie
    { id: "obj_green_1", partenaire_id: "p_green", invariant_id: "inv_p_green_5", chapitre: "Environnement", cible: 24, unite: "L/100km", mode: "Préventif", frequence: "Hebdomadaire" },
];

// --- 9. RAPPORTS (Générés + Statiques pour cohérence) ---

// Rapports statiques pour supporter les scénarios d'infraction spécifiques
const staticRapports: Rapport[] = [
    {
        id: "rep_static_1",
        date: "2024-03-10",
        jour: "Lundi",
        partenaire_id: "p_idf",
        conducteur_id: "c_idf_1", // Thomas Dubois
        vehicule_id: "v_idf_1",
        invariant_id: "inv_p_idf_11", // Vitesse
        heure_debut: "06:00:00",
        heure_fin: "15:30:00",
        temps_conduite: "08:15:00",
        temps_attente: "00:45:00",
        duree: "09:30:00",
        duree_ralenti: "00:30:00",
        distance_km: 650,
        vitesse_moyenne: 78,
        vitesse_max: 96 // Violation !
    },
    {
        id: "rep_static_2",
        date: "2024-03-12",
        jour: "Mercredi",
        partenaire_id: "p_sud",
        conducteur_id: "c_sud_1", // Nicolas Garcia
        vehicule_id: "v_sud_1",
        invariant_id: "inv_p_sud_0", // Repos
        heure_debut: "05:00:00",
        heure_fin: "18:00:00", // Amplitude trop large sans repos suffisant
        temps_conduite: "09:45:00",
        temps_attente: "00:15:00",
        duree: "13:00:00",
        duree_ralenti: "00:10:00",
        distance_km: 720,
        vitesse_moyenne: 72,
        vitesse_max: 88
    },
    {
        id: "rep_user_ex", // Pour l'exemple utilisateur
        date: "2024-01-15",
        jour: "Lundi",
        partenaire_id: "p_idf",
        conducteur_id: "c_idf_1",
        vehicule_id: "v_idf_1",
        invariant_id: "inv_p_idf_10", // Pauses
        heure_debut: "08:00:00",
        heure_fin: "18:00:00",
        temps_conduite: "09:00:00",
        temps_attente: "00:00:00",
        duree: "10:00:00",
        duree_ralenti: "00:00:00",
        distance_km: 500,
        vitesse_moyenne: 50,
        vitesse_max: 80
    }
];

export const generateRapports = (): Rapport[] => {
    const rapports: Rapport[] = [...staticRapports];
    const today = new Date();
    
    mockConducteurs.forEach(c => {
        // Retrouver le partenaire du conducteur via sa première clé disponible (pour la génération auto)
        const keyId = c.cle_obc_ids && c.cle_obc_ids.length > 0 ? c.cle_obc_ids[0] : null;
        const key = keyId ? mockCleObcList.find(k => k.id === keyId) : null;
        const partenaireId = key ? key.partenaire_id : "p_idf"; 
        
        // Invariants pertinents
        const relevantInvariants = mockInvariants.filter(i => i.partenaire_id === partenaireId);
        
        // Véhicules pertinents
        const relevantVehicules = mockVehicules.filter(v => v.partenaire_id === partenaireId);

        for (let i = 1; i < 30; i++) { // 30 jours d'historique
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            if (date.getDay() === 0 || date.getDay() === 6) continue; // Pas de weekend

            const drivingHours = randomInt(5, 9);
            const drivingMinutes = randomInt(0, 59);
            const distance = randomFloat(200, 700);
            
            const randomInvariant = Math.random() > 0.8 && relevantInvariants.length > 0
                ? relevantInvariants[randomInt(0, relevantInvariants.length - 1)].id 
                : undefined;

            const randomVehicule = relevantVehicules.length > 0 
                ? relevantVehicules[randomInt(0, relevantVehicules.length - 1)].id 
                : "v_idf_1";

            rapports.push({
                id: `rep_gen_${c.id}_${i}`,
                date: date.toISOString().split('T')[0],
                jour: date.toLocaleDateString('fr-FR', { weekday: 'long' }).charAt(0).toUpperCase() + date.toLocaleDateString('fr-FR', { weekday: 'long' }).slice(1),
                partenaire_id: partenaireId,
                conducteur_id: c.id,
                invariant_id: randomInvariant,
                vehicule_id: randomVehicule,
                heure_debut: `0${randomInt(6, 8)}:${randomInt(10, 59)}:00`,
                heure_fin: `${randomInt(16, 19)}:${randomInt(10, 59)}:00`,
                temps_conduite: `0${drivingHours}:${drivingMinutes < 10 ? '0'+drivingMinutes : drivingMinutes}:00`,
                temps_attente: `00:${randomInt(15, 59)}:00`,
                duree: `0${drivingHours+1}:${drivingMinutes}:00`,
                duree_ralenti: `00:${randomInt(5, 45)}:00`,
                distance_km: distance,
                vitesse_moyenne: randomFloat(60, 80),
                vitesse_max: randomInt(80, 92)
            });
        }
    });
    return rapports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const mockRapports = generateRapports();

// --- 10. INFRACTIONS ---
export const mockInfractions: Infraction[] = [
    {
        id: "inf_1",
        partenaire_id: "p_idf",
        date: "2024-03-10",
        rapports_id: "rep_static_1",
        type_infraction: "Alarme", // Modifié : type_infraction est maintenant la sévérité
        nombre: 1,
        mesure_disciplinaire: "Mise à pied conservatoire",
        autres_mesures_disciplinaire: "Convocation RH",
        suivi: true,
        amelioration: false,
        date_suivi: "2024-03-12",
        files: [
            {
                id: "f_inf_1",
                infractions_id: "inf_1",
                file: "rapport_vitesse_tacho.pdf",
                description: "Extraction données tachygraphe",
                url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                type: "pdf"
            }
        ]
    },
    {
        id: "inf_2",
        partenaire_id: "p_sud",
        date: "2024-03-12",
        rapports_id: "rep_static_2",
        type_infraction: "Alerte",
        nombre: 1,
        mesure_disciplinaire: "Avertissement écrit",
        autres_mesures_disciplinaire: "",
        suivi: false,
        amelioration: false
    },
    // Exemple utilisateur spécifique
    {
        id: "auto_id",
        partenaire_id: "p_idf", // Mapped to existing partner
        date: "2024-01-15",
        rapports_id: "rep_user_ex",
        type_infraction: "Alarme",
        nombre: 1,
        mesure_disciplinaire: "Avertissement",
        autres_mesures_disciplinaire: "Formation complémentaire",
        suivi: false,
        amelioration: false,
        date_suivi: "2024-01-25"
    }
];

// --- 11. COMMUNICATION ---
export const mockCommunicationPlans: CommunicationPlan[] = [
    {
        id: "cp_1",
        partenaire_id: "p_idf",
        periode: "Mars 2024",
        theme: "Sécurité : Angles morts",
        animateur: "Jean-Pierre Foucault (Responsable Sécurité)"
    },
    {
        id: "cp_2",
        partenaire_id: "p_green",
        periode: "Avril 2024",
        theme: "Optimisation batterie et éco-conduite",
        animateur: "Sophie Marceau (Formatrice)"
    }
];

export const mockCommunicationExecutions: CommunicationExecution[] = [
    {
        id: "ce_1",
        partenaire_id: "p_idf",
        planning_communication_id: "cp_1",
        video: "https://www.w3schools.com/html/mov_bbb.mp4",
        canal: "Réunion Mensuelle"
    }
];

// --- 12. PROCÉDURES ---
export const mockProcedures: Procedure[] = [
    { id: "proc_1", partenaire_id: "p_idf", nom: "Protocole Accident 2024", file: "protocole_accident_v2.pdf", date: "2024-01-01", type: "pdf" },
    { id: "proc_2", partenaire_id: "p_sud", nom: "Charte Qualité Froid", file: "charte_froid.pdf", date: "2023-11-15", type: "pdf" },
    { id: "proc_3", partenaire_id: "p_green", nom: "Guide Recharge Électrique", file: "guide_recharge.pdf", date: "2024-02-01", type: "pdf" },
];

// --- 13. CONTRÔLE CABINE ---
export const mockControleCabine: ControleCabine[] = [
    { id: "cc_1", partenaire_id: "p_idf", date: "2024-03-01", file: "check_idf_v1.jpg", commentaire: "Cabine propre, gilet jaune présent.", url: "https://images.unsplash.com/photo-1598553250780-60b3780775d0?q=80&w=1000&auto=format&fit=crop" },
    { id: "cc_2", partenaire_id: "p_green", date: "2024-03-05", file: "check_green_v2.jpg", commentaire: "Nettoyage nécessaire coté passager.", url: "https://images.unsplash.com/photo-1625231790926-72c219602332?q=80&w=1000&auto=format&fit=crop" },
];

// --- 14. KPIS ET ANALYSES ---
export const mockTempsTravail: TempsTravail[] = [
    { id: "tt_1", partenaire_id: "p_idf", rapports_id: "rep_static_1", analyse_cause: "Trafic exceptionnel A6", action_prise: "Ajustement itinéraire", suivi: "RAS" }
];

export const mockTempsConduite: TempsConduite[] = [
    { id: "tc_1", partenaire_id: "p_sud", rapports_id: "rep_static_2", analyse_cause: "Retard chargement client", action_prise: "Appel client pour rappel procédure", suivi: "En attente retour" }
];

export const mockTempsRepos: TempsRepos[] = [];

// Configuration KPI (Identique structure, valeurs par défaut)
export const mockKpis: Kpi[] = [
    { id: "kpi_1", partenaire_id: "p_idf", nom_element: "Kms parcourus", objectif: "N/A", unite: "km", commentaire: "" },
    { id: "kpi_2", partenaire_id: "p_idf", nom_element: "Temps de conduite", objectif: "8580h/max", unite: "heures", commentaire: "" },
    { id: "kpi_23", partenaire_id: "p_idf", nom_element: "Conduite dangereuse", objectif: 0, unite: "nb", commentaire: "", is_infraction: true }
    // ... Les autres KPIs sont générés dynamiquement dans l'UI
];
