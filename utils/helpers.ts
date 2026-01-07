
import { Conducteur, CleObc, Infraction, Rapport, Invariant, ScpConfiguration } from '../types';

export const isDriverLinkedToPartner = (driver: Conducteur, partnerId: string, obcKeys: CleObc[]): boolean => {
    if (partnerId === 'all') return true;
    if (!driver.cle_obc_ids || driver.cle_obc_ids.length === 0) return false;
    
    // Vérifie si UNE des clés du conducteur appartient au partenaire
    return driver.cle_obc_ids.some(keyId => {
        const key = obcKeys.find(k => k.id === keyId);
        return key?.partenaire_id === partnerId;
    });
};

/**
 * Dérive la catégorie (Alerte/Alarme) et les points d'une infraction
 * en se basant sur le type d'infraction déclaré et la configuration SCP de l'invariant.
 * 
 * Logique de priorité :
 * 1. Config spécifique au Partenaire pour cet Invariant et ce Type.
 * 2. Config Globale ('all') pour cet Invariant et ce Type.
 * 3. Valeurs par défaut (Alarme = 3, Alerte = 1).
 */
export const getInfractionSeverity = (
    infraction: Infraction, 
    reports: Rapport[], 
    invariants: Invariant[], 
    scpConfigs: ScpConfiguration[]
): { type: 'Alerte' | 'Alarme', points: number } => {
    
    // 1. Déterminer le type (Alerte ou Alarme) basé sur l'infraction enregistrée
    // On normalise la casse pour éviter des erreurs de saisie
    const infractionType = (infraction.type_infraction || 'Alerte') as 'Alerte' | 'Alarme';

    // 2. Trouver l'Invariant lié via le Rapport
    const report = reports.find(r => r.id === infraction.rapports_id);
    const invariantId = report?.invariant_id;

    // Valeurs par défaut si pas de config trouvée
    const defaultPoints = infractionType === 'Alarme' ? 3 : 1;

    if (!invariantId) {
        return { type: infractionType, points: defaultPoints };
    }

    // 3. Chercher une configuration spécifique pour le PARTENAIRE
    const specificConfig = scpConfigs.find(c => 
        c.invariants_id === invariantId && 
        c.type === infractionType && 
        c.partenaire_id === infraction.partenaire_id
    );

    if (specificConfig) {
        return { type: infractionType, points: specificConfig.value };
    }

    // 4. Si pas de config spécifique, chercher une configuration GLOBALE ('all')
    const globalConfig = scpConfigs.find(c => 
        c.invariants_id === invariantId && 
        c.type === infractionType && 
        c.partenaire_id === 'all'
    );

    if (globalConfig) {
        return { type: infractionType, points: globalConfig.value };
    }

    // 5. Fallback
    return { type: infractionType, points: defaultPoints };
};
