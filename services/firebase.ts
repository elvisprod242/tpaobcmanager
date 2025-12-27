
// Firebase est désactivé pour fonctionner en mode 100% local (SQLite/LocalStorage Simulation).
// Ce fichier est conservé pour éviter de casser les imports existants, mais auth et db sont nuls.

const db = null;
const auth = null;

console.log("Application en mode LOCAL (Déconnectée de Firebase). Stockage via LocalStorage.");

export { db, auth };
