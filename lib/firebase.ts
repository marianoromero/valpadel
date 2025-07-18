import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBp_q1LRxKwN9OCFnKoY3WfjPoqZfhnZf4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "valparapadel.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "valparapadel",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "valparapadel.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "426690958826",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:426690958826:web:5a8084e4b79a121be10e93",
  measurementId: "G-CENLEBMNDL"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
export const db = getFirestore(app)

// Initialize Analytics (only in browser and if supported)
export let analytics: ReturnType<typeof getAnalytics> | null = null
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app)
    }
  })
}

export default app