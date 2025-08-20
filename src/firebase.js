// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCis5yYuh-rFvEcBbMDcqoM0eksSaCagvc",
    authDomain: "gold-18ea4.firebaseapp.com",
    projectId: "gold-18ea4",
    storageBucket: "gold-18ea4.firebasestorage.app",
    messagingSenderId: "802568938489",
    appId: "1:802568938489:web:0a5d98272ac04921ac9328",
    measurementId: "G-GRTH07VG3Z"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; 