
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuration Firebase optimisée pour le déploiement
// Utilise les variables d'environnement VITE_ si disponibles, sinon utilise les valeurs de développement
// Cast de import.meta en any pour éviter les erreurs TS si les types Vite ne sont pas détectés
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyALumUTxGdJjBUhckjd5WdnzSQir-vgBcM",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "studio-1683237550-f9c96.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "studio-1683237550-f9c96",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "studio-1683237550-f9c96.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "222695022322",
  appId: env.VITE_FIREBASE_APP_ID || "1:222695022322:web:0fb84d9fe8475b44cd3a6b"
};

let app;
let db;
let auth;

try {
    // Vérification basique pour éviter les erreurs si les env vars sont manquantes en prod
    if (!firebaseConfig.apiKey) {
        console.warn("Firebase Config: API Key manquante. Vérifiez vos variables d'environnement.");
    }
    
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase (Auth, Firestore) initialisé avec succès.");
} catch (error) {
    console.error("Erreur d'initialisation Firebase:", error);
}

export { db, auth };
