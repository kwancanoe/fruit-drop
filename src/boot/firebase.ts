// Firebase Boot File: Initialize Firebase App, Auth, Firestore with multi-tab offline cache, and Storage
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  type Auth
} from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { defineBoot } from '#q-app';

// Verified Firebase project config for fruit-drop-aon (fetched via firebase apps:sdkconfig)
const firebaseConfig = {
  apiKey: 'AIzaSyBOuMmeEjp3uyTLRzox8q2SHONS3agbQog',
  authDomain: 'fruit-drop-aon.firebaseapp.com',
  projectId: 'fruit-drop-aon',
  storageBucket: 'fruit-drop-aon.firebasestorage.app',
  messagingSenderId: '660120514549',
  appId: '1:660120514549:web:d5eae93b24dc81392fbabc',
  measurementId: 'G-Z5B02G22E6'
};

// Singleton instances
export const firebaseApp: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// Configure Firestore with persistent multi-tab cache for tailgate offline operation
export const db: Firestore = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Configure Auth with browser local persistence (retains admin session across browser restarts)
export const auth: Auth = getAuth(firebaseApp);
void setPersistence(auth, browserLocalPersistence);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Configure Cloud Storage for slip uploads
export const storage: FirebaseStorage = getStorage(firebaseApp);

// Quasar Boot integration
export default defineBoot(({ app }) => {
  app.config.globalProperties.$firebase = firebaseApp;
  app.config.globalProperties.$db = db;
  app.config.globalProperties.$auth = auth;
});
