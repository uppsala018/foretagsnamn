import "server-only";

import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

type FirebaseAdminConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

let firestore: Firestore | null = null;

function getFirebaseAdminConfig(): FirebaseAdminConfig | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

export function hasFirebaseAdminConfig(): boolean {
  return getFirebaseAdminConfig() !== null;
}

function getFirebaseApp(): App {
  const existingApp = getApps()[0];

  if (existingApp) {
    return existingApp;
  }

  const config = getFirebaseAdminConfig();

  if (!config) {
    throw new Error("Firebase Admin configuration is missing.");
  }

  return initializeApp({
    credential: cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    }),
  });
}

export function getAdminFirestore(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
    firestore.settings({ ignoreUndefinedProperties: true });
  }

  return firestore;
}
