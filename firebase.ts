
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, setDoc, getDoc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Export firestore functions for use in components
export { collection, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc, onAuthStateChanged };

const firebaseConfig = {
  apiKey: "AIzaSyCARmPr7M2bKTSgSsagEzYSZWK_OTvqqJA",
  authDomain: "kitapdinle-5f4d1.firebaseapp.com",
  projectId: "kitapdinle-5f4d1",
  storageBucket: "kitapdinle-5f4d1.firebasestorage.app",
  messagingSenderId: "499962765432",
  appId: "1:499962765432:web:2a31f744b1c9f2c579cd8d",
  measurementId: "G-5TFY9ES3Y0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Auth Functions
export const signUp = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const signIn = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const logout = () => signOut(auth);

// User Profile Initialization
export const createUserProfile = async (userId: string, email: string) => {
  const userDocRef = doc(db, "users", userId);
  try {
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      await setDoc(userDocRef, {
        username: email.split('@')[0],
        favorites: [],
        progress: {},
        playbackSpeed: 1,
        createdAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error("Error creating profile:", err);
  }
};

// User Data Sync
export const syncUserData = (userId: string, callback: (data: any) => void) => {
  const userDocRef = doc(db, "users", userId);
  return onSnapshot(userDocRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      // Create profile if missing but user is logged in
      const email = auth.currentUser?.email || "Kullanıcı";
      setDoc(userDocRef, { username: email.split('@')[0], favorites: [], progress: {}, playbackSpeed: 1 }, { merge: true });
    }
  }, (error) => {
    console.error("Sync error:", error);
  });
};

export const updateUsernameInFirebase = async (userId: string, username: string) => {
  const userDocRef = doc(db, "users", userId);
  return updateDoc(userDocRef, { username });
};

export const updateFavoritesInFirebase = async (userId: string, favorites: string[]) => {
  const userDocRef = doc(db, "users", userId);
  return updateDoc(userDocRef, { favorites });
};

export const updatePlaybackSpeedInFirebase = async (userId: string, speed: number) => {
  const userDocRef = doc(db, "users", userId);
  return updateDoc(userDocRef, { playbackSpeed: speed });
};

export const updateProgressInFirebase = async (userId: string, bookId: string, progress: any) => {
  const userDocRef = doc(db, "users", userId);
  return updateDoc(userDocRef, {
    [`progress.${bookId}`]: progress
  });
};

export const deleteProgressFromFirebase = async (userId: string, bookId: string) => {
  const userDocRef = doc(db, "users", userId);
  return updateDoc(userDocRef, {
    [`progress.${bookId}`]: deleteField()
  });
};

export const subscribeToBooks = (callback: (books: any[]) => void) => {
  const q = query(collection(db, "books"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(books);
  }, (error) => {
    console.error("Books subscription error:", error);
  });
};
