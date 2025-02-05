/****************************************************
 * firebase-config.js
 ****************************************************/

// Replace these with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyBgGoJ2s9KN3YNtS3ZY9sb3GlwoPQp8kak",
  authDomain: "pulsewise-ff8e7.firebaseapp.com",
  projectId: "pulsewise-ff8e7",
  storageBucket: "pulsewise-ff8e7.appspot.com",
  messagingSenderId: "595991869636",
  appId: "1:595991869636:web:d496baec48a18460773191"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Set up an auth provider for Google
const provider = new firebase.auth.GoogleAuthProvider();
