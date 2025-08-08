import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  "projectId": "taskmaster-l7cq0",
  "appId": "1:874541974876:web:8613d99f5404eb36d16d99",
  "storageBucket": "taskmaster-l7cq0.firebasestorage.app",
  "apiKey": "AIzaSyA46wzvXE6djeLRVSr3BatbSCly43n0oVk",
  "authDomain": "taskmaster-l7cq0.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "874541974876"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

let analytics;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, db, analytics };
