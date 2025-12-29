import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCO3ybDZLqrphevvfzWNnb-7fHU-EFK3Ls",
  authDomain: "aureus-money.firebaseapp.com",
  projectId: "aureus-money",
  storageBucket: "aureus-money.appspot.com",
  messagingSenderId: "732676537783",
  appId: "1:732676537783:web:39c26fb75d1a8e25a1bc32"
};

// Initialize Firebase only if not already initialized
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export { app, db };