"use client";

import { useEffect, useMemo, useState } from "react";
import Joyride, { type CallBackProps, STATUS, type Step } from "react-joyride";
import { useAppStore } from "@/store/useAppStore";

type ExploreTutorialProps = {
  ready: boolean;
};

export default function ExploreTutorial({ ready }: ExploreTutorialProps) {
  const user = useAppStore((state) => state.user);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const [run, setRun] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasSeenTutorial = Boolean(
    user?.preferences?.tenant &&
      typeof user.preferences.tenant === "object" &&
      "hasSeenExploreTutorial" in user.preferences.tenant &&
      user.preferences.tenant.hasSeenExploreTutorial
  );

  const steps = useMemo<Step[]>(
    () => [
      {
        target: "body",
        placement: "center",
        disableBeacon: true,
        title: "Welcome to Explore",
        content: "This is where you browse listings that fit your preferences.",
      },
      {
        target: '[data-tour="explore-pass"]',
        title: "Pass",
        content: "Skip a listing with one tap or swipe left.",
        disableBeacon: true,
      },
      {
        target: '[data-tour="explore-like"]',
        title: "Interested",
        content: "Tap Interested or swipe right to keep a listing in your match flow.",
        disableBeacon: true,
      },
      {
        target: '[data-tour="explore-filters"]',
        title: "Refine results",
        content: "Update budget, distance, and listing type here whenever you want.",
        disableBeacon: true,
      },
    ],
    []
  );

  useEffect(() => {
    if (!ready || hasSeenTutorial || isSaving) {
      setRun(false);
      return;
    }
    const timer = window.setTimeout(() => setRun(true), 250);
    return () => window.clearTimeout(timer);
  }, [hasSeenTutorial, isSaving, ready]);

  const markSeen = async () => {
    if (hasSeenTutorial || isSaving) return;
    setIsSaving(true);
    try {
      await updatePreferences({
        tenant: {
          ...(user?.preferences?.tenant ?? {}),
          hasSeenExploreTutorial: true,
        },
      });
    } finally {
      setIsSaving(false);
      setRun(false);
    }
  };

  const handleCallback = (data: CallBackProps) => {
    const status = data.status;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      void markSeen();
    }
  };

  if (!ready || hasSeenTutorial) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      disableScrolling
      callback={handleCallback}
      locale={{ back: "Back", close: "Close", last: "Done", next: "Next", skip: "Skip" }}
      styles={{
        options: {
          primaryColor: "#0a44b8",
          textColor: "#0f172a",
          backgroundColor: "#ffffff",
          overlayColor: "rgba(15, 23, 42, 0.5)",
          arrowColor: "#ffffff",
          zIndex: 1100,
        },
        tooltip: {
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
        },
        buttonNext: {
          borderRadius: 9999,
          fontWeight: 700,
          padding: "10px 18px",
        },
        buttonBack: {
          color: "#475569",
          marginRight: 12,
        },
        buttonSkip: {
          color: "#64748b",
        },
      }}
    />
  );
}
