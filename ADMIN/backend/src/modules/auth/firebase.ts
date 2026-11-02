import fs from 'fs';
import admin, { ServiceAccount } from 'firebase-admin';
import { env } from '../../config/env';

/**
 * Lazy-initialised Firebase Admin SDK used to verify Firebase ID tokens
 * from the mobile app when AUTH_MODE=firebase. Skip initialisation when
 * no credentials are configured so the backend runs without Firebase.
 */
let firebaseApp: admin.app.App | null = null;

function loadServiceAccount(): ServiceAccount {
  const envAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envAccount) {
    try {
      return JSON.parse(Buffer.from(envAccount, 'base64').toString('utf8')) as ServiceAccount;
    } catch (error) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid base64 of a service account JSON', {
        cause: error,
      });
    }
  }

  const path =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ?? 'firebase-service-account.json';
  if (fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path, 'utf8')) as ServiceAccount;
  }

  throw new Error(
    'Firebase credentials are not configured. Provide FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS.',
  );
}

export function getFirebaseApp(): admin.app.App {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccount = loadServiceAccount();
    firebaseApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (error) {
    if (env.authMode === 'firebase') {
      throw error;
    }
    // Graceful fallback: Firebase not used when AUTH_MODE=jwt.
  }
  if (!firebaseApp) {
    throw new Error('Firebase admin app is not initialised');
  }
  return firebaseApp;
}

/**
 * Verify a Firebase ID token and return its claims. Throws on invalid/expired.
 */
export async function verifyFirebaseToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  const app = getFirebaseApp();
  return app.auth().verifyIdToken(idToken);
}