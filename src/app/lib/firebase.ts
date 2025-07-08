// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBKs3wZfHGUATB-qp0DkZrsyEaxihIZRac",
  authDomain: "horas-extras-agr.firebaseapp.com",
  projectId: "horas-extras-agr",
  storageBucket: "horas-extras-agr.firebasestorage.app",
  messagingSenderId: "800567066620",
  appId: "1:800567066620:web:608c9bc1ec9eb5bb9cbc79"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };