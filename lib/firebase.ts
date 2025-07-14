import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD3jPngPFhZ7Q-p4MH_KrO89RPhM5tP23s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "valpadel-a19ab.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "valpadel-a19ab",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "valpadel-a19ab.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "364284448974",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:364284448974:web:ac3c23f1cfc788ca5a009f",
  measurementId: "G-KN3KVGBWX8"
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