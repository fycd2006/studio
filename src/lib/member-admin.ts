import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { firebaseConfig } from "@/firebase/config";
import {
  emulatorHost,
  emulatorFirestorePort,
  emulatorAuthPort,
  isEmulatorEnabled,
} from "@/firebase/emulator";

export function memberAdmin() {
  const usingEmulator = isEmulatorEnabled();
  if (usingEmulator) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST =
      emulatorHost + ":" + emulatorAuthPort;
    process.env.FIRESTORE_EMULATOR_HOST =
      emulatorHost + ":" + emulatorFirestorePort;
  }
  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  const app =
    getApps()[0] ??
    initializeApp({
      projectId: firebaseConfig.projectId,
      ...(serviceAccount
        ? { credential: cert(JSON.parse(serviceAccount)) }
        : {}),
    });
  return {
    auth: getAuth(app),
    db: getFirestore(app),
    async checkCredentials() {
      if (!usingEmulator) await app.options.credential?.getAccessToken();
    },
  };
}
