import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const resolvePrivateKey = () => {
  const fromBase64 = process.env.FIREBASE_PRIVATE_KEY_BASE64?.trim();
  if (fromBase64) {
    try {
      return Buffer.from(fromBase64, "base64").toString("utf8");
    } catch {
      return "";
    }
  }

  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) return "";
  const unquoted =
    raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
  return unquoted.replace(/\\n/g, "\n").trim();
};

export const getFirebaseAuth = () => {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = resolvePrivateKey();

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      initializeApp();
    }
  }
  return getAuth();
};
