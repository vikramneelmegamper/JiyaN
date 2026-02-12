import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyA8UX_4UEjThwT8vGhXQ1xYCoS_ETNDPKo",
    authDomain: "to-do-board-9cbe5.firebaseapp.com",
    projectId: "to-do-board-9cbe5",
    storageBucket: "to-do-board-9cbe5.firebasestorage.app",
    messagingSenderId: "645956637958",
    appId: "1:645956637958:web:3123589b873def61f07a87"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
