'use client';

import { firebaseConfig, hasUsableFirebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import {
  connectAuthToEmulator,
  connectFirestoreToEmulator,
  isEmulatorEnabled,
} from '@/firebase/emulator';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;

    if (hasUsableFirebaseConfig) {
      firebaseApp = initializeApp(firebaseConfig);
      console.log('[Firebase Init] Initialized with explicit firebaseConfig');
      return getSdks(firebaseApp);
    }

    // Fallback for Firebase App Hosting source deployment where initializeApp() can auto-resolve config.
    if (process.env.NODE_ENV === "production") {
      try {
        firebaseApp = initializeApp();
        console.log('[Firebase Init] Production: auto-init succeeded');
      } catch (e) {
        console.error('Automatic initialization failed and no usable firebaseConfig was found. Please configure NEXT_PUBLIC_FIREBASE_* env vars or FIREBASE_WEBAPP_CONFIG.', e);
        throw e;
      }
    } else {
      console.error('[Firebase Init] Development env missing required firebase config (apiKey/appId/projectId).');
      throw new Error('Missing Firebase configuration in development environment');
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  // 本機 E2E（Cypress）走 emulator —— 見 src/firebase/emulator.ts 的說明。
  // 刻意**不開離線持久化**：persistentLocalCache 會把資料存進 IndexedDB，
  // 於是「清空 emulator」之後畫面仍可能先畫出上一支測試的舊資料（同一個
  // 瀏覽器 profile 跨 cy.visit 共用 IndexedDB），讓已經修好的東西看起來還是壞的。
  const useEmulator = isEmulatorEnabled();

  let firestore;
  if (useEmulator) {
    firestore = getFirestore(firebaseApp);
    connectFirestoreToEmulator(firestore, connectFirestoreEmulator);
  } else {
    try {
      // Enable offline persistence for faster initial loads
      firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      });
      console.log('[Firebase Init] Firestore persistence enabled');
    } catch (e) {
      // Fallback if already initialized (common during Fast Refresh)
      firestore = getFirestore(firebaseApp);
    }
  }

  const auth = getAuth(firebaseApp);
  if (useEmulator) {
    connectAuthToEmulator(auth, connectAuthEmulator);
  }

  return {
    firebaseApp,
    auth,
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
