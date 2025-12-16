
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
 * en se basant sur le rapport lié et la configuration SCP de l'invariant.
 */
export const getInfractionSeverity = (
    infraction: Infraction, 
    reports: Rapport[], 
    invariants: Invariant[], 
    scpConfigs: ScpConfiguration[]
): { type: 'Alerte' | 'Alarme', points: number } => {
    // 1. Trouver le rapport lié
    const report = reports.find(r => r.id === infraction.rapports_id);
    if (!report || !report.invariant_id) {
        // Fallback par défaut si lien manquant
        return { type: 'Alerte', points: 1 };
    }

    // 2. Trouver la configuration SCP pour cet invariant et ce partenaire
    // Note: Il peut y avoir plusieurs configs (Alerte et Alarme) pour un même invariant.
    // Sans info précise dans l'infraction, on prend la config la plus sévère ou la première trouvée par défaut.
    // Idéalement, type_infraction devrait matcher ScpConfiguration.sanction ou autre, mais ici on simplifie.
    const configs = scpConfigs.filter(c => c.invariants_id === report.invariant_id && c.partenaire_id === infraction.partenaire_id);
    
    if (configs.length > 0) {
        // Priorité à l'Alarme si multiple configs, pour ne pas sous-estimer le risque
        const alarmConfig = configs.find(c => c.type === 'Alarme');
        if (alarmConfig) return { type: 'Alarme', points: alarmConfig.value };
        return { type: configs[0].type, points: configs[0].value };
    }

    return { type: 'Alerte', points: 1 };
};
