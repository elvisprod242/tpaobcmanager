
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Configuration Firebase
// Note: Vite remplace statiquement `import.meta.env.VITE_...` lors du build.
// Nous utilisons une fonction helper pour accéder proprement aux variables tout en gardant les valeurs par défaut.

const getEnv = (key: string, fallback: string) => {
  try {
    // @ts-ignore - Permet d'éviter les erreurs de linter si les types Vite ne sont pas globaux
    return import.meta.env[key] || fallback;
  } catch (e) {
    return fallback;
  }
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyALumUTxGdJjBUhckjd5WdnzSQir-vgBcM"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "studio-1683237550-f9c96.firebaseapp.com"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "studio-1683237550-f9c96"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "studio-1683237550-f9c96.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "222695022322"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:222695022322:web:0fb84d9fe8475b44cd3a6b")
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase (Auth, Firestore) initialisé avec succès.");
} catch (error) {
    console.error("Erreur d'initialisation Firebase:", error);
}

export { db, auth };
