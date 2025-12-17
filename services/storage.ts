
/**
 * Service de gestion des fichiers (Simulation Locale / Assets).
 * 
 * Puisque nous ne pouvons pas écrire physiquement dans un dossier "assets" du serveur 
 * depuis le navigateur (sécurité), nous convertissons les fichiers en Base64.
 * 
 * Cela permet de :
 * 1. "Stocker" le fichier sous forme de chaîne de caractères.
 * 2. Sauvegarder cette chaîne dans Firestore (qui stocke les données texte).
 * 3. Afficher l'image directement dans l'application comme si elle était locale.
 */
export const storageService = {
    
    /**
     * Simule un upload vers un dossier local "assets".
     * Convertit le fichier en Data URL (Base64) pour le stockage en base de données.
     * @param file Le fichier à uploader
     * @param folder Le nom du dossier virtuel (ex: 'avatars')
     */
    async uploadFile(file: File, folder: string): Promise<string> {
        console.log(`[Simulation] Upload du fichier ${file.name} vers le dossier local : /assets/${folder}/`);
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // On retourne le contenu du fichier encodé (qui agira comme l'URL)
                resolve(reader.result as string);
            };
            reader.onerror = (error) => {
                console.error("Erreur de lecture fichier local:", error);
                reject(error);
            };
        });
    },

    /**
     * Simule la suppression d'un fichier.
     */
    async deleteFile(url: string): Promise<void> {
        console.log("[Simulation] Fichier supprimé du dossier local (lien rompu).");
        // Rien à faire techniquement car la donnée est supprimée quand le champ du document Firestore est vidé
        return Promise.resolve();
    }
};
