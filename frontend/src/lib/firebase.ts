"use client";

import { getApp, initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const hasFirebaseConfig = () =>
  Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );

const getFirebaseAuthClient = () => {
  if (!hasFirebaseConfig()) {
    throw new Error("Firebase auth is not configured");
  }
  const appName = "get-a-roof-web";
  const app = getApps().some((candidate) => candidate.name === appName)
    ? getApp(appName)
    : initializeApp(firebaseConfig, appName);
  return getAuth(app);
};

const isMobile = () =>
  typeof navigator !== "undefined" &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

/**
 * Desktop: opens a popup, resolves with the ID token immediately.
 * Mobile:  triggers a full-page redirect; resolves with `null`.
 *          Call `getRedirectResultToken()` on page load to get the token.
 */
export const getGoogleIdToken = async (): Promise<string | null> => {
  const auth = getFirebaseAuthClient();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  if (isMobile()) {
    await signInWithRedirect(auth, provider);
    // Page will redirect — this line is never reached
    return null;
  }

  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
};

/**
 * Called on page load to check if the user is returning from a
 * mobile Google redirect. Returns the ID token or null.
 */
export const getRedirectResultToken = async (): Promise<string | null> => {
  try {
    const auth = getFirebaseAuthClient();
    const result = await getRedirectResult(auth);
    if (result?.user) {
      return result.user.getIdToken();
    }
  } catch {
    // No redirect result or error — ignore
  }
  return null;
};
