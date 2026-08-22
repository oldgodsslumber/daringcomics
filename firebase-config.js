// Firebase web config for the daringcomics-98cea project.
//
// This file IS committed. A static app has no server to hide a config behind —
// every visitor's browser needs these values to reach the database at all, so
// secrecy was never the control here. What protects the project is:
//   • the Realtime Database rules (MULTIPLAYER.md §2), and
//   • the restrictions on this API key: an HTTP-referrer allowlist and an API
//     allowlist, set in Google Cloud console → APIs & Services → Credentials.
//
// Keep both in place. Never add the Generative Language API to this key — this
// app also calls Gemini, and an unrestricted key becomes someone else's
// billable quota. See MULTIPLAYER.md §1.

window.FIREBASE_CONFIG={
  apiKey:'AIzaSyBxFwijckSx7mo3W79Psw8JGZVklrPjJmA',
  authDomain:'daringcomics-98cea.firebaseapp.com',
  // Confirmed reachable (returns 401 to an unauthenticated read, which is the
  // rules working). us-central1 instance.
  databaseURL:'https://daringcomics-98cea-default-rtdb.firebaseio.com',
  projectId:'daringcomics-98cea',
  storageBucket:'daringcomics-98cea.firebasestorage.app',
  messagingSenderId:'983400075405',
  appId:'1:983400075405:web:a8b59128afb39c4b95d2c4'
};
