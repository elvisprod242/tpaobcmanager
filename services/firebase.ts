
import { initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Configuration Firebase pour l'application Web
const firebaseConfig = {
  apiKey: "AIzaSyDm39XqSm5uKBLjI3xbu0vuJoi7tuwA-Ds",
  authDomain: "studio-9659749963-8bc08.firebaseapp.com",
  projectId: "studio-9659749963-8bc08",
  storageBucket: "studio-9659749963-8bc08.firebasestorage.app",
  messagingSenderId: "69599039803",
  appId: "1:69599039803:web:bb46e725b0a864c895a71e"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);

// Exportation des instances
export const auth = FirebaseAuth.getAuth(app);
export const db = getFirestore(app);

// Activation de la persistance hors ligne (Optimisation Firestore)
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("La persistance Firestore a échoué : Plusieurs onglets ouverts.");
    } else if (err.code == 'unimplemented') {
        console.warn("Le navigateur ne supporte pas la persistance Firestore.");
    }
});
