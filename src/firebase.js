// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYe8cgrYMFAwQpbe1Uqokt26_M9JxxGPs",
  authDomain: "icebox-2025.firebaseapp.com",
  projectId: "icebox-2025",
  storageBucket: "icebox-2025.firebasestorage.app",
  messagingSenderId: "649582886625",
  appId: "1:649582886625:web:55b2204601f33a91c2c1a0",
  measurementId: "G-ML73MQF316"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
