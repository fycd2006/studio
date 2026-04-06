import type { FirebaseOptions } from 'firebase/app';

const jsonFirebaseConfig = parseFirebaseJsonConfig();

const parseFirebaseJsonConfig = (): Partial<FirebaseOptions> => {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG || process.env.FIREBASE_WEBAPP_CONFIG || process.env.FIREBASE_CONFIG;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Partial<FirebaseOptions>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    console.warn('[Firebase Config Debug] Failed to parse JSON firebase config env');
    return {};
  }
};

const normalizeConfig = (config: Partial<FirebaseOptions>): Partial<FirebaseOptions> => {
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
  ) as Partial<FirebaseOptions>;
};

const envFirebaseConfig: Partial<FirebaseOptions> = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// In production we prefer Hosting injected JSON config (source deploy) to avoid mismatched repositories.
// In development we prefer local NEXT_PUBLIC_* env vars.
const mergedConfig = normalizeConfig({
  ...(process.env.NODE_ENV === 'production' ? envFirebaseConfig : jsonFirebaseConfig),
  ...(process.env.NODE_ENV === 'production' ? jsonFirebaseConfig : envFirebaseConfig),
});

export const firebaseConfig: FirebaseOptions = mergedConfig as FirebaseOptions;

export const hasUsableFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.appId && firebaseConfig.projectId
);

const configSource = jsonFirebaseConfig.projectId
  ? 'hosting-json'
  : envFirebaseConfig.projectId
    ? 'next-public-env'
    : 'none';

console.log('[Firebase Config Debug] projectId:', firebaseConfig.projectId || '(empty)', '| source:', configSource, '| usable:', hasUsableFirebaseConfig, '| NODE_ENV:', process.env.NODE_ENV);
