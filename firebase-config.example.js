// Copy this file to `firebase-config.js` and fill in your project's values.
// The committed firebase-config.js points at the maintainer's project; replace
// it with your own if you are running a fork. It is a separate file precisely
// so that swapping projects is a one-file change.
//
// Get these from the Firebase console:
//   Project settings → Your apps → Web (</>)
// `databaseURL` is NOT in the snippet Firebase shows you until the Realtime
// Database exists — copy it from the top of the Realtime Database page. The
// region changes the domain, e.g.
//   https://PROJECT-default-rtdb.firebaseio.com                      (us-central1)
//   https://PROJECT-default-rtdb.europe-west1.firebasedatabase.app   (europe-west1)
//
// Before deploying this file anywhere public, restrict the key in the Google
// Cloud console (APIs & Services → Credentials): set an HTTP-referrer
// restriction to your own domains, and an API restriction listing only the
// APIs this app uses. An unrestricted key can call any API enabled on the
// project. See MULTIPLAYER.md §1.

window.FIREBASE_CONFIG={
  apiKey:'',
  authDomain:'YOURPROJECT.firebaseapp.com',
  databaseURL:'https://YOURPROJECT-default-rtdb.firebaseio.com',
  projectId:'YOURPROJECT',
  storageBucket:'YOURPROJECT.firebasestorage.app',
  messagingSenderId:'',
  appId:''
};
