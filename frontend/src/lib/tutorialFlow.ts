"use client";

export type TutorialFlowSection = "tenant" | "landlord";

const STORAGE_KEY = "gar:new-account-tutorial-flow";

export const markTutorialFlow = (section: TutorialFlowSection) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, section);
};

export const getTutorialFlow = (): TutorialFlowSection | null => {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(STORAGE_KEY);
  return value === "tenant" || value === "landlord" ? value : null;
};

export const clearTutorialFlow = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
};
