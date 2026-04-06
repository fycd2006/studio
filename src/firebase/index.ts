'use client';

import { firebaseConfig, hasUsableFirebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

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
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
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
